import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  ActionSheetItem,
  BlindProposal,
  BlindRevision,
  DetailedProposal,
  Evaluation,
  EvaluationCriterionScore,
  Evaluator,
  EvaluatorAssignment,
  EvaluatorRecommendation,
  ProposalFile,
  ProposalRevision,
  RevisionResponse,
} from '../types';
import {
  DEMO_EVALUATOR_ID,
  INITIAL_ASSIGNMENTS,
  INITIAL_DETAILED_PROPOSALS,
  INITIAL_EVALUATIONS,
  INITIAL_REVISIONS,
  MOCK_EVALUATORS,
} from '../data/pipelineMockData';
import {
  DEFAULT_EVALUATION_DAYS,
  MAX_EVALUATORS_PER_PROPOSAL,
  STATUS_META,
  anonymizeProposal,
  anonymizeRevision,
  canAssignEvaluator,
  capStoredFile,
  canUnassignEvaluator,
  canUploadRevision,
  computeTotalScore,
  findEvaluation,
  getEvaluatorLoad as computeEvaluatorLoad,
  nextBlindLabel,
  resetPanelDueDates,
  resolveRoundOutcome,
  transitionProposal,
  validateEvaluation,
  type RuleCheck,
} from '../lib/proposalPipeline';
import {
  fieldsForStorageEvent,
  hasStoredVersion,
  parsePersistedArray,
  readPersistedArray,
  writePersisted,
  type ItemValidator,
} from '../lib/persistedState';
import { isOverdue } from '../lib/format';
import { useAuth } from './AuthContext';
import { useCallForProposals } from './CallForProposalsContext';

const KEYS = {
  proposals: 'wmsu_pipeline_proposals',
  assignments: 'wmsu_pipeline_assignments',
  evaluations: 'wmsu_pipeline_evaluations',
  revisions: 'wmsu_pipeline_revisions',
} as const;

/** Bump when the persisted shape changes; a stored version that differs discards all four keys. */
const PIPELINE_STORAGE_VERSION = 1;
const VERSION_KEY = 'wmsu_pipeline_version';

const SYSTEM_ACTOR = 'System';
/** Recorded actors when no signed-in profile or email is available (e.g. the dev auth bypass). */
const RPDU_ACTOR = 'RPDU Staff';
const PROPONENT_ACTOR = 'Proponent';
/** Shown for an action item whose evaluator has since been removed from the panel. */
const FORMER_MEMBER_LABEL = 'Former panel member';

export interface SubmitEvaluationInput {
  assignmentId: string;
  scores: EvaluationCriterionScore[];
  remarks: string;
  actionSheet: Omit<ActionSheetItem, 'id'>[];
  recommendation: EvaluatorRecommendation;
}

export interface UploadRevisionInput {
  proposalId: string;
  file: Omit<ProposalFile, 'uploadedAt'>;
  changeSummary: string;
  responses: RevisionResponse[];
}

/**
 * Everything an evaluator view may show for one assignment, already anonymized.
 * Evaluator views consume only this; they must not call getRevisionsFor/getEvaluationsFor.
 */
export interface MyAssignment {
  assignment: EvaluatorAssignment;
  proposal: BlindProposal;
  evaluation?: Evaluation; // the current-round evaluation, if submitted
  /** True only while the proposal is under review, unevaluated this round, and past its due date. */
  isOverdue: boolean;
  /** True when the evaluator can submit now: status is under_review and nothing submitted this round. */
  canEvaluate: boolean;
  /** The proposal's revisions, ascending by revisionNumber, without uploadedBy. */
  revisions: BlindRevision[];
  /**
   * Every action-sheet item from round currentRound - 1 (empty in round 1), tagged with the blind
   * label of the panel seat that raised it ("Former panel member" if that seat was removed).
   */
  previousRoundActionSheet: (ActionSheetItem & { blindLabel: string })[];
}

/**
 * Detailed-proposal pipeline state and actions.
 *
 * Actions read the latest state synchronously; calling several actions in one handler is safe.
 * (Each action reads from a ref that every action updates as soon as it computes the next
 * arrays, so e.g. assigning three evaluators in a loop yields A, B, C and the panel-complete
 * transition.) The plain arrays and selectors reflect the last render, for display.
 */
interface ProposalPipelineContextType {
  proposals: DetailedProposal[];
  evaluators: Evaluator[];
  assignments: EvaluatorAssignment[];
  evaluations: Evaluation[];
  revisions: ProposalRevision[];
  currentEvaluator: Evaluator;
  /** Signed-in profile name, else auth email, else null (actions then record a role default). */
  actorName: string | null;
  getProposal: (id: string) => DetailedProposal | undefined;
  getAssignmentsFor: (proposalId: string) => EvaluatorAssignment[];
  getEvaluationsFor: (proposalId: string, round?: number) => Evaluation[];
  getRevisionsFor: (proposalId: string) => ProposalRevision[];
  getEvaluatorLoad: (evaluatorId: string) => number;
  getMyProposals: () => { proposals: DetailedProposal[]; isDemoFallback: boolean };
  getMyAssignments: () => MyAssignment[];
  assignEvaluator: (proposalId: string, evaluatorId: string, dueDate: string) => RuleCheck;
  unassignEvaluator: (assignmentId: string) => RuleCheck;
  submitEvaluation: (input: SubmitEvaluationInput) => { ok: boolean; missing: string[] };
  uploadRevision: (input: UploadRevisionInput) => RuleCheck & { revision?: ProposalRevision };
  resetPipeline: () => void;
}

interface PipelineState {
  proposals: DetailedProposal[];
  assignments: EvaluatorAssignment[];
  evaluations: Evaluation[];
  revisions: ProposalRevision[];
}

type PipelineField = keyof PipelineState;

const SEEDS: PipelineState = {
  proposals: INITIAL_DETAILED_PROPOSALS,
  assignments: INITIAL_ASSIGNMENTS,
  evaluations: INITIAL_EVALUATIONS,
  revisions: INITIAL_REVISIONS,
};

const FIELDS = Object.keys(KEYS) as PipelineField[];

const hasStringId = (item: unknown): boolean => typeof (item as { id?: unknown } | null)?.id === 'string';

/** Minimal per-element checks so a stale or hand-edited shape falls back to seeds instead of crashing. */
const VALIDATORS: Record<PipelineField, ItemValidator> = {
  proposals: (item) => {
    const p = item as { id?: unknown; status?: unknown } | null;
    return typeof p?.id === 'string' && typeof p?.status === 'string' && p.status in STATUS_META;
  },
  assignments: hasStringId,
  evaluations: hasStringId,
  revisions: hasStringId,
};

const readField = <F extends PipelineField>(field: F, fallback: PipelineState[F]): PipelineState[F] =>
  readPersistedArray<unknown>(localStorage, KEYS[field], fallback, VALIDATORS[field]) as PipelineState[F];

/**
 * Initial state: the persisted arrays when the stored schema version matches; otherwise the seeds,
 * with `versionMismatch` set so the provider overwrites the stale keys once mounted.
 */
const loadInitialState = (): { state: PipelineState; versionMismatch: boolean } => {
  if (!hasStoredVersion(localStorage, VERSION_KEY, PIPELINE_STORAGE_VERSION)) {
    return { state: SEEDS, versionMismatch: true };
  }
  return {
    state: {
      proposals: readField('proposals', SEEDS.proposals),
      assignments: readField('assignments', SEEDS.assignments),
      evaluations: readField('evaluations', SEEDS.evaluations),
      revisions: readField('revisions', SEEDS.revisions),
    },
    versionMismatch: false,
  };
};

const writeVersion = () => writePersisted(localStorage, VERSION_KEY, PIPELINE_STORAGE_VERSION);

const replaceById = <T extends { id: string }>(list: T[], next: T): T[] =>
  list.map((item) => (item.id === next.id ? next : item));

/** Opaque runtime id; never embeds evaluator, assignment, or proposal ids (double-blind). */
const newId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ProposalPipelineContext = createContext<ProposalPipelineContextType | undefined>(undefined);

export const ProposalPipelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { showToast } = useCallForProposals();

  const [initial] = useState(loadInitialState);
  const [proposals, setProposals] = useState<DetailedProposal[]>(initial.state.proposals);
  const [assignments, setAssignments] = useState<EvaluatorAssignment[]>(initial.state.assignments);
  const [evaluations, setEvaluations] = useState<Evaluation[]>(initial.state.evaluations);
  const [revisions, setRevisions] = useState<ProposalRevision[]>(initial.state.revisions);

  // Latest-state ref read by every action. Actions advance it synchronously through commit();
  // the layout effect re-syncs it with committed state after each render. (Writing a ref during
  // render is rejected by react-hooks/refs, and a layout effect runs before any user event.)
  const stateRef = useRef<PipelineState>({ proposals, assignments, evaluations, revisions });
  useLayoutEffect(() => {
    stateRef.current = { proposals, assignments, evaluations, revisions };
  }, [proposals, assignments, evaluations, revisions]);

  // Advances the ref and React state together. This tab's own changes are written to storage
  // synchronously, so storage and stateRef agree before the next action re-reads storage (several
  // actions in one handler stay safe); changes that came from another tab are not written back.
  const commit = useCallback((next: Partial<PipelineState>, persist = true) => {
    stateRef.current = { ...stateRef.current, ...next };
    if (next.proposals) setProposals(next.proposals);
    if (next.assignments) setAssignments(next.assignments);
    if (next.evaluations) setEvaluations(next.evaluations);
    if (next.revisions) setRevisions(next.revisions);
    if (persist) {
      for (const field of FIELDS) {
        if (next[field]) writePersisted(localStorage, KEYS[field], next[field]);
      }
    }
  }, []);

  // After a schema-version mismatch, replace the stale keys with the seeds and stamp the version.
  // (When the version matches nothing is written here, so a tab that opens never overwrites a
  // concurrent write from another tab with what it read a moment earlier.)
  const versionMismatch = initial.versionMismatch;
  useEffect(() => {
    if (!versionMismatch) return;
    for (const field of FIELDS) writePersisted(localStorage, KEYS[field], stateRef.current[field]);
    writeVersion();
  }, [versionMismatch]);

  /**
   * Pulls the given fields from storage into stateRef/state when another tab has changed them, so
   * the rule check that follows runs against the latest data (a stale tab then gets ok:false
   * instead of overwriting the other tab's write).
   */
  const refreshFromStorage = useCallback(
    (fields: PipelineField[]) => {
      const next: Partial<Record<PipelineField, unknown[]>> = {};
      for (const field of fields) {
        let raw: string | null;
        try {
          raw = localStorage.getItem(KEYS[field]);
        } catch {
          continue;
        }
        const current: unknown[] = stateRef.current[field];
        if (raw === null || raw === JSON.stringify(current)) continue;
        next[field] = parsePersistedArray(raw, current, VALIDATORS[field]);
      }
      if (Object.keys(next).length > 0) commit(next as Partial<PipelineState>, false);
    },
    [commit]
  );

  // Cross-tab sync: another tab's write fires a `storage` event here (never in the writing tab).
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      const fields = fieldsForStorageEvent(event.key, KEYS);
      if (fields.length === 0) return;
      const next: Partial<Record<PipelineField, unknown[]>> = {};
      for (const field of fields) next[field] = readField(field, SEEDS[field]);
      commit(next as Partial<PipelineState>, false);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [commit]);

  const authEmail = user?.email?.trim().toLowerCase() ?? '';
  const profileName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '';
  // Never CallForProposalsContext.currentUser: that mock profile is the admin and would
  // misattribute proponent actions. Actions substitute a role default when this is null.
  const actorName: string | null = profileName || user?.email || null;

  const currentEvaluator = useMemo<Evaluator>(
    () =>
      MOCK_EVALUATORS.find((e) => e.email.toLowerCase() === authEmail) ??
      MOCK_EVALUATORS.find((e) => e.id === DEMO_EVALUATOR_ID) ??
      MOCK_EVALUATORS[0],
    [authEmail]
  );

  // ---------------------------------------------------------------------------
  // Selectors (render-time data)
  // ---------------------------------------------------------------------------

  const getProposal = useCallback((id: string) => proposals.find((p) => p.id === id), [proposals]);

  const getAssignmentsFor = useCallback(
    (proposalId: string) => assignments.filter((a) => a.proposalId === proposalId),
    [assignments]
  );

  const getEvaluationsFor = useCallback(
    (proposalId: string, round?: number) =>
      evaluations.filter((e) => e.proposalId === proposalId && (round === undefined || e.round === round)),
    [evaluations]
  );

  const getRevisionsFor = useCallback(
    (proposalId: string) =>
      revisions.filter((r) => r.proposalId === proposalId).sort((a, b) => a.revisionNumber - b.revisionNumber),
    [revisions]
  );

  const getEvaluatorLoad = useCallback(
    (evaluatorId: string) => computeEvaluatorLoad(evaluatorId, assignments, proposals),
    [assignments, proposals]
  );

  const getMyProposals = useCallback(() => {
    const mine = authEmail ? proposals.filter((p) => p.leadInvestigatorEmail.toLowerCase() === authEmail) : [];
    return mine.length > 0 ? { proposals: mine, isDemoFallback: false } : { proposals, isDemoFallback: true };
  }, [authEmail, proposals]);

  const getMyAssignments = useCallback((): MyAssignment[] => {
    const mine: MyAssignment[] = [];
    const labelByAssignment = new Map(assignments.map((a) => [a.id, a.blindLabel]));
    for (const assignment of assignments) {
      if (assignment.evaluatorId !== currentEvaluator.id) continue;
      const proposal = proposals.find((p) => p.id === assignment.proposalId);
      if (!proposal) continue;
      const evaluation = findEvaluation(evaluations, assignment.id, proposal.currentRound);
      const canEvaluate = proposal.status === 'under_review' && !evaluation;
      const previousRound = proposal.currentRound - 1;
      mine.push({
        assignment,
        proposal: anonymizeProposal(proposal),
        evaluation,
        isOverdue: canEvaluate && isOverdue(assignment.dueDate),
        canEvaluate,
        revisions: revisions
          .filter((r) => r.proposalId === proposal.id)
          .sort((a, b) => a.revisionNumber - b.revisionNumber)
          .map(anonymizeRevision),
        previousRoundActionSheet:
          previousRound < 1
            ? []
            : evaluations
                .filter((e) => e.proposalId === proposal.id && e.round === previousRound)
                .flatMap((e) => {
                  const blindLabel = labelByAssignment.get(e.assignmentId) ?? FORMER_MEMBER_LABEL;
                  return e.actionSheet.map((item) => ({ ...item, blindLabel }));
                }),
      });
    }
    return mine.sort((a, b) => {
      const aDone = a.evaluation ? 1 : 0;
      const bDone = b.evaluation ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.assignment.dueDate.localeCompare(b.assignment.dueDate);
    });
  }, [assignments, proposals, evaluations, revisions, currentEvaluator.id]);

  // ---------------------------------------------------------------------------
  // Actions — read stateRef.current (never the render closure) and write through commit()
  // ---------------------------------------------------------------------------

  const assignEvaluator = useCallback(
    (proposalId: string, evaluatorId: string, dueDate: string): RuleCheck => {
      refreshFromStorage(['proposals', 'assignments']);
      const state = stateRef.current;
      const proposal = state.proposals.find((p) => p.id === proposalId);
      const evaluator = MOCK_EVALUATORS.find((e) => e.id === evaluatorId);
      if (!proposal || !evaluator) {
        const missing: RuleCheck = { ok: false, reason: 'Proposal or evaluator not found' };
        showToast(missing.reason ?? '');
        return missing;
      }

      // Re-check against the latest state: the panel may have been filled since the UI rendered.
      const existing = state.assignments.filter((a) => a.proposalId === proposalId);
      const check = canAssignEvaluator(proposal, existing, evaluator);
      if (!check.ok) {
        showToast(check.reason ?? 'Unable to assign this evaluator');
        return check;
      }

      const actor = actorName ?? RPDU_ACTOR;
      const now = new Date().toISOString();
      const assignment: EvaluatorAssignment = {
        id: newId('asg'),
        proposalId,
        evaluatorId,
        blindLabel: nextBlindLabel(existing),
        assignedAt: now,
        assignedBy: actor,
        dueDate,
      };
      const nextAssignments = [...state.assignments, assignment];

      if (existing.length + 1 === MAX_EVALUATORS_PER_PROPOSAL && proposal.status === 'pending_assignment') {
        const next = transitionProposal(
          proposal,
          'under_review',
          actor,
          `Evaluator panel complete (${MAX_EVALUATORS_PER_PROPOSAL}/${MAX_EVALUATORS_PER_PROPOSAL})`,
          now
        );
        commit({ assignments: nextAssignments, proposals: replaceById(state.proposals, next) });
        showToast(`Panel complete — ${proposal.code} moved to ${STATUS_META.under_review.label}`);
      } else {
        commit({ assignments: nextAssignments });
        showToast(`Assigned ${evaluator.name} as ${assignment.blindLabel}`);
      }
      return check;
    },
    [actorName, commit, refreshFromStorage, showToast]
  );

  const unassignEvaluator = useCallback(
    (assignmentId: string): RuleCheck => {
      refreshFromStorage(['proposals', 'assignments', 'evaluations']);
      const state = stateRef.current;
      const assignment = state.assignments.find((a) => a.id === assignmentId);
      const proposal = assignment ? state.proposals.find((p) => p.id === assignment.proposalId) : undefined;
      if (!assignment || !proposal) {
        const missing: RuleCheck = { ok: false, reason: 'Assignment not found' };
        showToast(missing.reason ?? '');
        return missing;
      }

      const check = canUnassignEvaluator(assignment, state.evaluations, proposal.currentRound, proposal.status);
      if (!check.ok) {
        showToast(check.reason ?? 'Unable to remove this evaluator');
        return check;
      }

      const nextAssignments = state.assignments.filter((a) => a.id !== assignmentId);
      const remaining = nextAssignments.filter((a) => a.proposalId === proposal.id);
      const evaluatorName = MOCK_EVALUATORS.find((e) => e.id === assignment.evaluatorId)?.name ?? 'Evaluator';

      if (proposal.status === 'under_review' && remaining.length < MAX_EVALUATORS_PER_PROPOSAL) {
        const next = transitionProposal(
          proposal,
          'pending_assignment',
          actorName ?? RPDU_ACTOR,
          'Evaluator removed; panel incomplete'
        );
        commit({ assignments: nextAssignments, proposals: replaceById(state.proposals, next) });
        showToast(
          `Removed ${evaluatorName} (${assignment.blindLabel}) — ${proposal.code} is back to ${STATUS_META.pending_assignment.label}`
        );
      } else {
        commit({ assignments: nextAssignments });
        showToast(`Removed ${evaluatorName} (${assignment.blindLabel}) from ${proposal.code}`);
      }
      return check;
    },
    [actorName, commit, refreshFromStorage, showToast]
  );

  const submitEvaluation = useCallback(
    (input: SubmitEvaluationInput): { ok: boolean; missing: string[] } => {
      refreshFromStorage(['proposals', 'assignments', 'evaluations']);
      const state = stateRef.current;
      const assignment = state.assignments.find((a) => a.id === input.assignmentId);
      const proposal = assignment ? state.proposals.find((p) => p.id === assignment.proposalId) : undefined;
      if (!assignment || !proposal) {
        return { ok: false, missing: ['Assignment not found'] };
      }
      if (proposal.status !== 'under_review') {
        return { ok: false, missing: ['Evaluations are closed for this proposal'] };
      }
      if (findEvaluation(state.evaluations, assignment.id, proposal.currentRound)) {
        return { ok: false, missing: ['An evaluation for this round was already submitted'] };
      }

      const stamp = Date.now();
      const actionItemBase = newId('ai');
      const actionSheet: ActionSheetItem[] = input.actionSheet.map((item, index) => ({
        ...item,
        id: `${actionItemBase}-${index}`,
      }));
      const validation = validateEvaluation({
        scores: input.scores,
        remarks: input.remarks,
        recommendation: input.recommendation,
        actionSheet,
      });
      if (!validation.ok) return validation;

      const now = new Date(stamp).toISOString();
      const newEvaluation: Evaluation = {
        id: newId('eval'),
        proposalId: proposal.id,
        assignmentId: assignment.id,
        evaluatorId: assignment.evaluatorId,
        round: proposal.currentRound,
        scores: input.scores,
        totalScore: computeTotalScore(input.scores),
        remarks: input.remarks.trim(),
        actionSheet,
        recommendation: input.recommendation,
        submittedAt: now,
      };
      const nextEvaluations = [...state.evaluations, newEvaluation];

      const panel = state.assignments.filter((a) => a.proposalId === proposal.id);
      const roundEvaluations = nextEvaluations.filter(
        (e) => e.round === proposal.currentRound && panel.some((a) => a.id === e.assignmentId)
      );
      const outcome = resolveRoundOutcome(roundEvaluations, panel.length);
      if (outcome) {
        const label = STATUS_META[outcome].label;
        const next = transitionProposal(proposal, outcome, SYSTEM_ACTOR, `Round ${proposal.currentRound} complete: ${label}`, now);
        commit({ evaluations: nextEvaluations, proposals: replaceById(state.proposals, next) });
        showToast(`Round ${proposal.currentRound} complete — status is now ${label}`);
      } else {
        commit({ evaluations: nextEvaluations });
        showToast(`Evaluation submitted (${roundEvaluations.length} of ${MAX_EVALUATORS_PER_PROPOSAL} received)`);
      }
      return { ok: true, missing: [] };
    },
    [commit, refreshFromStorage, showToast]
  );

  const uploadRevision = useCallback(
    (input: UploadRevisionInput): RuleCheck & { revision?: ProposalRevision } => {
      refreshFromStorage(['proposals', 'assignments', 'revisions']);
      const state = stateRef.current;
      const proposal = state.proposals.find((p) => p.id === input.proposalId);
      if (!proposal) {
        return { ok: false, reason: 'Proposal not found' };
      }
      const check = canUploadRevision(proposal.status);
      if (!check.ok) return check;

      const actor = actorName ?? PROPONENT_ACTOR;
      const now = new Date().toISOString();
      const revisionNumber = state.revisions.filter((r) => r.proposalId === proposal.id).length + 1;
      const revision: ProposalRevision = {
        id: newId('rev'),
        proposalId: proposal.id,
        revisionNumber,
        respondsToRound: proposal.currentRound,
        // capStoredFile drops the inline data URL of files over 2 MB (storage quota).
        file: capStoredFile({ ...input.file, uploadedAt: now }),
        changeSummary: input.changeSummary,
        responses: input.responses,
        uploadedAt: now,
        uploadedBy: actor,
      };
      const next = transitionProposal(
        { ...proposal, currentRound: proposal.currentRound + 1 },
        'under_review',
        actor,
        `Revision ${revisionNumber} uploaded`,
        now
      );
      commit({
        revisions: [...state.revisions, revision],
        proposals: replaceById(state.proposals, next),
        // The new round gets a fresh review window instead of the previous round's due dates.
        assignments: resetPanelDueDates(state.assignments, proposal.id, now, DEFAULT_EVALUATION_DAYS),
      });
      showToast(`Revision ${revisionNumber} uploaded — status is now ${STATUS_META.under_review.label}`);
      return { ok: true, revision };
    },
    [actorName, commit, refreshFromStorage, showToast]
  );

  const resetPipeline = useCallback(() => {
    for (const key of Object.values(KEYS)) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Storage may be disabled; the state reset below still applies.
      }
    }
    // commit() writes the seeds back; other tabs pick them up through their storage listener.
    commit(SEEDS);
    writeVersion();
    showToast('Pipeline data reset to sample data');
  }, [commit, showToast]);

  const value = useMemo<ProposalPipelineContextType>(
    () => ({
      proposals,
      evaluators: MOCK_EVALUATORS,
      assignments,
      evaluations,
      revisions,
      currentEvaluator,
      actorName,
      getProposal,
      getAssignmentsFor,
      getEvaluationsFor,
      getRevisionsFor,
      getEvaluatorLoad,
      getMyProposals,
      getMyAssignments,
      assignEvaluator,
      unassignEvaluator,
      submitEvaluation,
      uploadRevision,
      resetPipeline,
    }),
    [
      proposals,
      assignments,
      evaluations,
      revisions,
      currentEvaluator,
      actorName,
      getProposal,
      getAssignmentsFor,
      getEvaluationsFor,
      getRevisionsFor,
      getEvaluatorLoad,
      getMyProposals,
      getMyAssignments,
      assignEvaluator,
      unassignEvaluator,
      submitEvaluation,
      uploadRevision,
      resetPipeline,
    ]
  );

  return <ProposalPipelineContext.Provider value={value}>{children}</ProposalPipelineContext.Provider>;
};

// Exporting the hook beside the provider mirrors CallForProposalsContext; it only costs
// Fast Refresh for this file (full reload on edit).
// eslint-disable-next-line react-refresh/only-export-components
export const useProposalPipeline = () => {
  const context = useContext(ProposalPipelineContext);
  if (!context) {
    throw new Error('useProposalPipeline must be used within a ProposalPipelineProvider');
  }
  return context;
};
