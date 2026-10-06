# Detailed Proposal Evaluation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the evaluator-assignment dashboard (RPDU), the double-blind evaluation portal (Evaluator), the revision-history loop (Proponent), and the automatic status pipeline that ties them together.

**Architecture:** A new `ProposalPipelineContext` (seeded from `data/pipelineMockData.ts`, persisted in `localStorage`) owns detailed proposals, the evaluator roster, assignments, evaluations, and revisions. Every business rule (3-evaluator cap, conflict checks, anonymisation, scoring, round outcome, legal transitions) is a pure function in `lib/proposalPipeline.ts` with Node tests; the context applies the rules and the three role dashboards only render context state. Shared `components/ui/` primitives keep the dashboards visually consistent.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS v4, lucide-react, react-router-dom v7, Node 22 `node --test` with `--experimental-strip-types` (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-10-06-evaluation-pipeline-design.md`

## Global Constraints

- Work only inside `wmsu-rdec/`. Do not add npm dependencies. Do not run `git commit`; the user handles git.
- `npm run build` (type-check + bundle), `npm run lint`, and `npm test` must all pass at the end of every task. Lint: the repository already has 17 errors in pre-existing files; new or edited files must contribute zero errors. `react-hooks/set-state-in-effect` is enabled: never call a state setter synchronously inside `useEffect` (derive state, reset via `key`, or set state in handlers).
- `tsconfig.app.json` has `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`: use `import type` for types, no `enum`, no unused imports.
- `MAX_EVALUATORS_PER_PROPOSAL = 3`. The Assign button is `disabled` (with the reason as `title`) when `canAssignEvaluator().ok` is false, and `assignEvaluator()` in the context re-runs the same check.
- Status labels, verbatim: `pending_assignment` → "Awaiting Evaluators", `under_review` → "Under Review", `revision_requested` → "Revision Requested", `approved` → "Approved", `rejected` → "Rejected".
- Status tones: slate = pending_assignment, blue = under_review, amber = revision_requested, emerald = approved, red = rejected.
- Double-blind: nothing under `src/pages/evaluator/` or `src/components/evaluatorComponent/` may reference `DetailedProposal`, `leadInvestigator`, `leadInvestigatorEmail`, `coInvestigators`, `proponentId`, `college`, or `department`. Proponent-facing feedback shows `blindLabel` only.
- Brand: WMSU crimson `#C8102E` (hover `#A00D26`) via `text-[#C8102E]` / `bg-[#C8102E]`; neutrals `slate`; cards `bg-white border border-slate-200 rounded-sm shadow-xs`; fonts already global. Match `RpduDashboard.tsx` metric cards and `PreliminaryScreeningManager.tsx` filter bars. Mobile-first responsive (`sm:`/`lg:` breakpoints as the existing pages do).
- All timestamps are ISO strings produced with `new Date().toISOString()`; display them only through `lib/format.ts`.
- Peso formatting: `₱485,000` via `formatCurrency`.

## Review Focus

1. Stale UI: a panel filled elsewhere (second tab) while the modal is open — `assignEvaluator` must return `ok:false` instead of creating a 4th assignment (Task 1 test `assign: rejects when panel full`).
2. Double submission: an evaluator submits twice for the same round — `submitEvaluation` must reject (Task 1 test `findEvaluation` + context guard; Task 3 portal shows read-only after submit).
3. Out-of-state upload: proponent uploads while status is not `revision_requested` — `uploadRevision` returns `ok:false`, no round increment (Task 1 test `canUploadRevision`).
4. Unassign after submission: RPDU removes an evaluator who already submitted this round — blocked (Task 1 test `canUnassignEvaluator`).
5. Corrupted `localStorage`: a non-array or invalid JSON value under a `wmsu_pipeline_*` key — `readPersisted` falls back to seed (Task 1 test in `persistedState.test.ts`).

---

### Task 1: Pipeline foundation — types, rules, seed data, context, UI primitives

**Files:**
- Modify: `src/types/index.ts` (append)
- Create: `src/lib/proposalPipeline.ts`
- Create: `src/lib/proposalPipeline.test.ts`
- Create: `src/lib/persistedState.ts`
- Create: `src/lib/persistedState.test.ts`
- Create: `src/lib/format.ts`
- Create: `src/data/pipelineMockData.ts`
- Create: `src/context/ProposalPipelineContext.tsx`
- Create: `src/components/ui/StatusBadge.tsx`, `StatCard.tsx`, `EmptyState.tsx`, `ModalShell.tsx`, `ConfirmDialog.tsx`, `PipelineStepper.tsx`
- Modify: `src/context/CallForProposalsContext.tsx` (add `hideToast`)
- Modify: `src/App.tsx` (provider nesting, global toast)
- Modify: `src/components/ProtectedRoute.tsx` (dev bypass)
- Modify: `package.json` (`test` script), `.env.example` (`VITE_AUTH_BYPASS`)

**Interfaces:**
- Produces everything in the code blocks below. Later tasks import these names verbatim.

- [ ] **Step 1: Add the `test` script and env example**

In `package.json` `scripts` add:

```json
"test": "node --experimental-strip-types --test \"src/**/*.test.ts\""
```

Append to `.env.example`:

```env
# Development only: set to true to open portal routes without a Supabase session
VITE_AUTH_BYPASS=false
```

- [ ] **Step 2: Append the pipeline types to `src/types/index.ts`**

```ts
// ============================================================================
// Detailed Proposal Evaluation Pipeline (Phase 2–3)
// ============================================================================

export type DetailedProposalStatus =
  | 'pending_assignment'
  | 'under_review'
  | 'revision_requested'
  | 'approved'
  | 'rejected';

export type EvaluatorRecommendation = 'approve' | 'revise' | 'reject';

export type ProposalSection =
  | 'title'
  | 'abstract'
  | 'rationale'
  | 'objectives'
  | 'methodology'
  | 'timeline'
  | 'budget'
  | 'outputs'
  | 'general';

export type ActionItemSeverity = 'required' | 'suggested';

export interface ProposalFile {
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
  uploadedAt: string;
}

export interface ProposalTimelineItem {
  phase: string;
  months: string;
  deliverable: string;
}

export interface StatusHistoryEntry {
  status: DetailedProposalStatus;
  at: string;
  by: string;
  note?: string;
  round: number;
}

export interface DetailedProposal {
  id: string;
  code: string;
  conceptProposalId?: string;
  callId: string;
  callTitle: string;
  title: string;
  // Identity — stripped by anonymizeProposal()
  proponentId: string;
  leadInvestigator: string;
  leadInvestigatorEmail: string;
  coInvestigators: string[];
  college: string;
  department: string;
  // Content
  thematicArea: string;
  durationMonths: number;
  budgetRequested: number;
  abstract: string;
  rationale: string;
  objectives: string[];
  methodology: string;
  expectedOutputs: ConceptProposalOutputs;
  timeline: ProposalTimelineItem[];
  manuscript: ProposalFile;
  submittedAt: string;
  // Pipeline
  status: DetailedProposalStatus;
  currentRound: number;
  statusHistory: StatusHistoryEntry[];
}

export type ProponentIdentityField =
  | 'proponentId'
  | 'leadInvestigator'
  | 'leadInvestigatorEmail'
  | 'coInvestigators'
  | 'college'
  | 'department';

export type BlindProposal = Omit<DetailedProposal, ProponentIdentityField> & { blind: true };

export interface Evaluator {
  id: string;
  name: string;
  email: string;
  title: string;
  college: string;
  department: string;
  expertise: string[];
  isExternal: boolean;
}

export interface EvaluatorAssignment {
  id: string;
  proposalId: string;
  evaluatorId: string;
  blindLabel: string;
  assignedAt: string;
  assignedBy: string;
  dueDate: string;
}

export interface EvaluationCriterionScore {
  criterionId: string;
  score: number;
}

export interface ActionSheetItem {
  id: string;
  section: ProposalSection;
  severity: ActionItemSeverity;
  comment: string;
}

export interface Evaluation {
  id: string;
  proposalId: string;
  assignmentId: string;
  evaluatorId: string;
  round: number;
  scores: EvaluationCriterionScore[];
  totalScore: number;
  remarks: string;
  actionSheet: ActionSheetItem[];
  recommendation: EvaluatorRecommendation;
  submittedAt: string;
}

export interface RevisionResponse {
  actionItemId: string;
  response: string;
}

export interface ProposalRevision {
  id: string;
  proposalId: string;
  revisionNumber: number;
  respondsToRound: number;
  file: ProposalFile;
  changeSummary: string;
  responses: RevisionResponse[];
  uploadedAt: string;
  uploadedBy: string;
}
```

- [ ] **Step 3: Write the failing rules tests `src/lib/proposalPipeline.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  DetailedProposal,
  Evaluation,
  Evaluator,
  EvaluatorAssignment,
} from '../types/index.ts';
import {
  MAX_EVALUATORS_PER_PROPOSAL,
  EVALUATION_CRITERIA,
  STATUS_META,
  canTransition,
  transitionProposal,
  canAssignEvaluator,
  isPanelFull,
  remainingSlots,
  nextBlindLabel,
  anonymizeProposal,
  computeTotalScore,
  validateEvaluation,
  resolveRoundOutcome,
  findEvaluation,
  canUnassignEvaluator,
  canUploadRevision,
  averageScore,
  getEvaluatorLoad,
  addDays,
} from './proposalPipeline.ts';

const makeProposal = (overrides: Partial<DetailedProposal> = {}): DetailedProposal => ({
  id: 'dp-test',
  code: 'DP-2027-CSM-99',
  callId: 'call-2027-01',
  callTitle: 'Call 2027',
  title: 'Test Proposal',
  proponentId: 'user-researcher-1',
  leadInvestigator: 'Prof. Juan Dela Cruz',
  leadInvestigatorEmail: 'juan.delacruz@wmsu.edu.ph',
  coInvestigators: ['Dr. Ana Reyes'],
  college: 'College of Science & Mathematics',
  department: 'Department of Computer Science',
  thematicArea: 'Artificial Intelligence & Digital Transformation',
  durationMonths: 12,
  budgetRequested: 485000,
  abstract: 'Abstract',
  rationale: 'Rationale',
  objectives: ['Objective 1'],
  methodology: 'Methodology',
  expectedOutputs: { publications: '1 paper' },
  timeline: [{ phase: 'Phase 1', months: '1-3', deliverable: 'Dataset' }],
  manuscript: { name: 'manuscript.pdf', size: '1 MB', type: 'PDF', uploadedAt: '2026-10-01T00:00:00.000Z' },
  submittedAt: '2026-10-01T00:00:00.000Z',
  status: 'pending_assignment',
  currentRound: 1,
  statusHistory: [{ status: 'pending_assignment', at: '2026-10-01T00:00:00.000Z', by: 'System', round: 1 }],
  ...overrides,
});

const makeEvaluator = (overrides: Partial<Evaluator> = {}): Evaluator => ({
  id: 'ev-x',
  name: 'Dr. Elena Ramirez',
  email: 'elena.ramirez@wmsu.edu.ph',
  title: 'Professor',
  college: 'College of Agriculture & Forestry',
  department: 'Department of Agronomy',
  expertise: ['Agriculture, Food Security & Sustainable Farming'],
  isExternal: false,
  ...overrides,
});

const makeAssignment = (n: number, overrides: Partial<EvaluatorAssignment> = {}): EvaluatorAssignment => ({
  id: `asg-${n}`,
  proposalId: 'dp-test',
  evaluatorId: `ev-${n}`,
  blindLabel: ['Evaluator A', 'Evaluator B', 'Evaluator C'][n - 1],
  assignedAt: '2026-10-02T00:00:00.000Z',
  assignedBy: 'RPDU Staff',
  dueDate: '2026-10-16',
  ...overrides,
});

const makeEvaluation = (n: number, recommendation: Evaluation['recommendation'], round = 1): Evaluation => ({
  id: `ev-eval-${n}-${round}`,
  proposalId: 'dp-test',
  assignmentId: `asg-${n}`,
  evaluatorId: `ev-${n}`,
  round,
  scores: EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 8 })),
  totalScore: 80,
  remarks: 'Solid methodology with minor gaps in sampling.',
  actionSheet: recommendation === 'approve' ? [] : [{ id: 'ai-1', section: 'methodology', severity: 'required', comment: 'Clarify sampling.' }],
  recommendation,
  submittedAt: '2026-10-05T00:00:00.000Z',
});

test('criteria weights sum to 100 and max evaluators is 3', () => {
  assert.equal(EVALUATION_CRITERIA.reduce((s, c) => s + c.weight, 0), 100);
  assert.equal(MAX_EVALUATORS_PER_PROPOSAL, 3);
  assert.equal(STATUS_META.under_review.label, 'Under Review');
  assert.equal(STATUS_META.revision_requested.label, 'Revision Requested');
});

test('assign: allowed with 0, 1, 2 assignments; blocked at exactly 3', () => {
  const p = makeProposal();
  const ev = makeEvaluator({ id: 'ev-9' });
  assert.equal(canAssignEvaluator(p, [], ev).ok, true);
  assert.equal(canAssignEvaluator(p, [makeAssignment(1)], ev).ok, true);
  assert.equal(canAssignEvaluator(p, [makeAssignment(1), makeAssignment(2)], ev).ok, true);
  const full = [makeAssignment(1), makeAssignment(2), makeAssignment(3)];
  const check = canAssignEvaluator(p, full, ev);
  assert.equal(check.ok, false);
  assert.match(check.reason ?? '', /Maximum of 3 evaluators/);
  assert.equal(isPanelFull(full), true);
  assert.equal(remainingSlots(full), 0);
  assert.equal(remainingSlots([makeAssignment(1)]), 2);
});

test('assign: rejects duplicates, conflicts of interest, and terminal proposals', () => {
  const p = makeProposal();
  assert.match(canAssignEvaluator(p, [makeAssignment(1, { evaluatorId: 'ev-1' })], makeEvaluator({ id: 'ev-1' })).reason ?? '', /Already assigned/);
  assert.match(canAssignEvaluator(p, [], makeEvaluator({ email: 'JUAN.DELACRUZ@wmsu.edu.ph' })).reason ?? '', /lead proponent/);
  assert.match(canAssignEvaluator(p, [], makeEvaluator({ name: 'Dr. Ana Reyes' })).reason ?? '', /co-investigator/);
  assert.match(canAssignEvaluator(makeProposal({ status: 'approved' }), [], makeEvaluator()).reason ?? '', /closed/i);
  const sameDept = canAssignEvaluator(p, [], makeEvaluator({ department: 'Department of Computer Science' }));
  assert.equal(sameDept.ok, true);
  assert.match(sameDept.warning ?? '', /Same department/);
});

test('nextBlindLabel hands out A, B, C then throws', () => {
  assert.equal(nextBlindLabel([]), 'Evaluator A');
  assert.equal(nextBlindLabel([makeAssignment(1)]), 'Evaluator B');
  assert.equal(nextBlindLabel([makeAssignment(1), makeAssignment(3)]), 'Evaluator B');
  assert.throws(() => nextBlindLabel([makeAssignment(1), makeAssignment(2), makeAssignment(3)]));
});

test('anonymizeProposal strips every identity field', () => {
  const blind = anonymizeProposal(makeProposal());
  assert.equal(blind.blind, true);
  assert.equal(blind.title, 'Test Proposal');
  for (const key of ['proponentId', 'leadInvestigator', 'leadInvestigatorEmail', 'coInvestigators', 'college', 'department']) {
    assert.equal(key in blind, false, `${key} leaked`);
  }
});

test('computeTotalScore weights and clamps', () => {
  const all10 = EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 10 }));
  const all5 = EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 5 }));
  assert.equal(computeTotalScore(all10), 100);
  assert.equal(computeTotalScore(all5), 50);
  assert.equal(computeTotalScore([]), 0);
  assert.equal(computeTotalScore(EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 99 }))), 100);
});

test('validateEvaluation lists what is missing', () => {
  const good = validateEvaluation({
    scores: EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 7 })),
    remarks: 'Clear objectives but the sampling plan needs work.',
    recommendation: 'revise',
    actionSheet: [{ id: 'a', section: 'methodology', severity: 'required', comment: 'Fix sampling' }],
  });
  assert.equal(good.ok, true);
  const bad = validateEvaluation({ scores: [], remarks: 'short', recommendation: null, actionSheet: [] });
  assert.equal(bad.ok, false);
  assert.ok(bad.missing.some((m) => /criteri/i.test(m)));
  assert.ok(bad.missing.some((m) => /remarks/i.test(m)));
  assert.ok(bad.missing.some((m) => /recommendation/i.test(m)));
  const reviseNoItems = validateEvaluation({
    scores: EVALUATION_CRITERIA.map((c) => ({ criterionId: c.id, score: 7 })),
    remarks: 'Clear objectives but the sampling plan needs work.',
    recommendation: 'revise',
    actionSheet: [],
  });
  assert.equal(reviseNoItems.ok, false);
  assert.ok(reviseNoItems.missing.some((m) => /action sheet/i.test(m)));
});

test('resolveRoundOutcome waits for all evaluations then decides', () => {
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve')], 3), null);
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve'), makeEvaluation(2, 'approve'), makeEvaluation(3, 'approve')], 3), 'approved');
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'reject'), makeEvaluation(2, 'reject'), makeEvaluation(3, 'approve')], 3), 'rejected');
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve'), makeEvaluation(2, 'revise'), makeEvaluation(3, 'approve')], 3), 'revision_requested');
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve'), makeEvaluation(2, 'reject'), makeEvaluation(3, 'approve')], 3), 'revision_requested');
  assert.equal(resolveRoundOutcome([makeEvaluation(1, 'approve'), makeEvaluation(2, 'approve')], 2), null, 'panel smaller than 3 never resolves');
});

test('transitions: legal ones append history, illegal ones throw', () => {
  const p = makeProposal();
  const next = transitionProposal(p, 'under_review', 'RPDU Staff', 'Panel complete', '2026-10-03T00:00:00.000Z');
  assert.equal(next.status, 'under_review');
  assert.equal(next.statusHistory.length, 2);
  assert.deepEqual(next.statusHistory[1], { status: 'under_review', at: '2026-10-03T00:00:00.000Z', by: 'RPDU Staff', note: 'Panel complete', round: 1 });
  assert.equal(p.statusHistory.length, 1, 'input not mutated');
  assert.equal(canTransition('revision_requested', 'under_review'), true);
  assert.equal(canTransition('approved', 'under_review'), false);
  assert.throws(() => transitionProposal(makeProposal({ status: 'approved' }), 'under_review', 'x'));
  assert.throws(() => transitionProposal(p, 'approved', 'x'));
});

test('findEvaluation, canUnassignEvaluator, canUploadRevision guard the loop', () => {
  const evals = [makeEvaluation(1, 'approve', 1)];
  assert.ok(findEvaluation(evals, 'asg-1', 1));
  assert.equal(findEvaluation(evals, 'asg-1', 2), undefined);
  assert.equal(canUnassignEvaluator(makeAssignment(1), evals, 1).ok, false);
  assert.equal(canUnassignEvaluator(makeAssignment(2), evals, 1).ok, true);
  assert.equal(canUnassignEvaluator(makeAssignment(2), evals, 1, 'approved').ok, false);
  assert.equal(canUploadRevision('revision_requested').ok, true);
  assert.equal(canUploadRevision('under_review').ok, false);
});

test('averageScore, getEvaluatorLoad, addDays', () => {
  assert.equal(averageScore([]), null);
  assert.equal(averageScore([{ ...makeEvaluation(1, 'approve'), totalScore: 80 }, { ...makeEvaluation(2, 'approve'), totalScore: 70 }]), 75);
  const proposals = [makeProposal({ id: 'a', status: 'under_review' }), makeProposal({ id: 'b', status: 'approved' })];
  const assignments = [makeAssignment(1, { proposalId: 'a', evaluatorId: 'ev-1' }), makeAssignment(2, { proposalId: 'b', evaluatorId: 'ev-1' })];
  assert.equal(getEvaluatorLoad('ev-1', assignments, proposals), 1);
  assert.equal(addDays('2026-10-06', 14), '2026-10-20');
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find module `./proposalPipeline.ts`.

- [ ] **Step 5: Implement `src/lib/proposalPipeline.ts`**

```ts
import type {
  ActionSheetItem,
  BlindProposal,
  DetailedProposal,
  DetailedProposalStatus,
  Evaluation,
  EvaluationCriterionScore,
  Evaluator,
  EvaluatorAssignment,
  EvaluatorRecommendation,
} from '../types/index.ts';

export const MAX_EVALUATORS_PER_PROPOSAL = 3;
export const MIN_CRITERION_SCORE = 1;
export const MAX_CRITERION_SCORE = 10;
export const PASSING_TOTAL_SCORE = 75;
export const MIN_REMARKS_LENGTH = 20;
export const DEFAULT_EVALUATION_DAYS = 14;

export const BLIND_LABELS = ['Evaluator A', 'Evaluator B', 'Evaluator C'] as const;
export type BlindLabel = (typeof BLIND_LABELS)[number];

export type StatusTone = 'slate' | 'blue' | 'amber' | 'emerald' | 'red';

export interface StatusMeta {
  label: string;
  description: string;
  tone: StatusTone;
}

export const STATUS_META: Record<DetailedProposalStatus, StatusMeta> = {
  pending_assignment: { label: 'Awaiting Evaluators', description: 'Fewer than three evaluators assigned', tone: 'slate' },
  under_review: { label: 'Under Review', description: 'Double-blind technical evaluation in progress', tone: 'blue' },
  revision_requested: { label: 'Revision Requested', description: 'Proponent must upload a revised manuscript', tone: 'amber' },
  approved: { label: 'Approved', description: 'Cleared by the technical review panel', tone: 'emerald' },
  rejected: { label: 'Rejected', description: 'Not endorsed by the technical review panel', tone: 'red' },
};

export const PIPELINE_STAGES: DetailedProposalStatus[] = ['pending_assignment', 'under_review', 'revision_requested', 'approved'];

export interface EvaluationCriterion {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export const EVALUATION_CRITERIA: EvaluationCriterion[] = [
  { id: 'relevance', label: 'Relevance & Significance', description: 'Alignment with the WMSU research agenda and regional priorities; contribution to knowledge or practice.', weight: 20 },
  { id: 'objectives', label: 'Clarity of Objectives', description: 'Objectives are specific, measurable, and logically derived from the problem statement.', weight: 15 },
  { id: 'methodology', label: 'Scientific Soundness of Methodology', description: 'Design, sampling, instruments, and analysis are appropriate and rigorous.', weight: 25 },
  { id: 'feasibility', label: 'Feasibility & Timeline', description: 'Work plan is realistic for the proposed duration, team, and facilities.', weight: 15 },
  { id: 'budget', label: 'Budget Appropriateness', description: 'Line items are justified, within the call ceiling, and proportionate to activities.', weight: 10 },
  { id: 'outputs', label: 'Expected Outputs & Impact', description: 'Publications, products, people, places, and policy outputs are credible and well-targeted.', weight: 15 },
];

export const SECTION_LABELS: Record<ActionSheetItem['section'], string> = {
  title: 'Title',
  abstract: 'Abstract',
  rationale: 'Rationale & Significance',
  objectives: 'Objectives',
  methodology: 'Methodology',
  timeline: 'Timeline & Work Plan',
  budget: 'Budget',
  outputs: 'Expected Outputs',
  general: 'General',
};

export const RECOMMENDATION_META: Record<EvaluatorRecommendation, { label: string; tone: StatusTone; description: string }> = {
  approve: { label: 'Approve', tone: 'emerald', description: 'Technically sound; no mandatory revisions.' },
  revise: { label: 'Revise & Resubmit', tone: 'amber', description: 'Acceptable after the action sheet items are addressed.' },
  reject: { label: 'Reject', tone: 'red', description: 'Fundamental flaws; not recommended for funding.' },
};

export const ALLOWED_TRANSITIONS: Record<DetailedProposalStatus, DetailedProposalStatus[]> = {
  pending_assignment: ['under_review'],
  under_review: ['revision_requested', 'approved', 'rejected', 'pending_assignment'],
  revision_requested: ['under_review'],
  approved: [],
  rejected: [],
};

export const isTerminalStatus = (status: DetailedProposalStatus): boolean =>
  ALLOWED_TRANSITIONS[status].length === 0;

export const canTransition = (from: DetailedProposalStatus, to: DetailedProposalStatus): boolean =>
  ALLOWED_TRANSITIONS[from].includes(to);

export function transitionProposal(
  proposal: DetailedProposal,
  next: DetailedProposalStatus,
  by: string,
  note?: string,
  at: string = new Date().toISOString()
): DetailedProposal {
  if (!canTransition(proposal.status, next)) {
    throw new Error(`Illegal status transition: ${proposal.status} → ${next}`);
  }
  return {
    ...proposal,
    status: next,
    statusHistory: [...proposal.statusHistory, { status: next, at, by, note, round: proposal.currentRound }],
  };
}

export interface RuleCheck {
  ok: boolean;
  reason?: string;
  warning?: string;
}

const normalize = (s: string) => s.trim().toLowerCase();

export function canAssignEvaluator(
  proposal: DetailedProposal,
  existingAssignments: EvaluatorAssignment[],
  evaluator: Evaluator
): RuleCheck {
  if (isTerminalStatus(proposal.status)) {
    return { ok: false, reason: `Assignment is closed: this proposal is already ${STATUS_META[proposal.status].label.toLowerCase()}` };
  }
  if (existingAssignments.length >= MAX_EVALUATORS_PER_PROPOSAL) {
    return { ok: false, reason: `Maximum of ${MAX_EVALUATORS_PER_PROPOSAL} evaluators already assigned` };
  }
  if (existingAssignments.some((a) => a.evaluatorId === evaluator.id)) {
    return { ok: false, reason: 'Already assigned to this proposal' };
  }
  if (normalize(evaluator.email) === normalize(proposal.leadInvestigatorEmail)) {
    return { ok: false, reason: 'Conflict of interest: evaluator is the lead proponent' };
  }
  if (proposal.coInvestigators.some((c) => normalize(c) === normalize(evaluator.name))) {
    return { ok: false, reason: 'Conflict of interest: evaluator is a co-investigator' };
  }
  if (normalize(evaluator.department) === normalize(proposal.department)) {
    return { ok: true, warning: 'Same department as the proponent — consider an external reviewer' };
  }
  return { ok: true };
}

export const isPanelFull = (assignments: EvaluatorAssignment[]): boolean =>
  assignments.length >= MAX_EVALUATORS_PER_PROPOSAL;

export const remainingSlots = (assignments: EvaluatorAssignment[]): number =>
  Math.max(0, MAX_EVALUATORS_PER_PROPOSAL - assignments.length);

export function nextBlindLabel(assignments: EvaluatorAssignment[]): BlindLabel {
  const used = new Set(assignments.map((a) => a.blindLabel));
  const label = BLIND_LABELS.find((l) => !used.has(l));
  if (!label) throw new Error('Evaluator panel is full');
  return label;
}

export function anonymizeProposal(proposal: DetailedProposal): BlindProposal {
  const {
    proponentId: _proponentId,
    leadInvestigator: _leadInvestigator,
    leadInvestigatorEmail: _leadInvestigatorEmail,
    coInvestigators: _coInvestigators,
    college: _college,
    department: _department,
    ...rest
  } = proposal;
  void _proponentId; void _leadInvestigator; void _leadInvestigatorEmail; void _coInvestigators; void _college; void _department;
  return { ...rest, blind: true };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function computeTotalScore(scores: EvaluationCriterionScore[]): number {
  const total = EVALUATION_CRITERIA.reduce((sum, criterion) => {
    const raw = scores.find((s) => s.criterionId === criterion.id)?.score ?? 0;
    const score = clamp(raw, 0, MAX_CRITERION_SCORE);
    return sum + (score / MAX_CRITERION_SCORE) * criterion.weight;
  }, 0);
  return Math.round(total * 10) / 10;
}

export interface EvaluationDraft {
  scores: EvaluationCriterionScore[];
  remarks: string;
  recommendation: EvaluatorRecommendation | null;
  actionSheet: ActionSheetItem[];
}

export function validateEvaluation(draft: EvaluationDraft): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const unscored = EVALUATION_CRITERIA.filter((c) => {
    const s = draft.scores.find((x) => x.criterionId === c.id)?.score;
    return s === undefined || s < MIN_CRITERION_SCORE || s > MAX_CRITERION_SCORE;
  });
  if (unscored.length > 0) {
    missing.push(`Score every criterion (${unscored.length} unscored: ${unscored.map((c) => c.label).join(', ')})`);
  }
  if (draft.remarks.trim().length < MIN_REMARKS_LENGTH) {
    missing.push(`Remarks must be at least ${MIN_REMARKS_LENGTH} characters`);
  }
  if (!draft.recommendation) {
    missing.push('Select a recommendation');
  } else if (draft.recommendation !== 'approve' && draft.actionSheet.length === 0) {
    missing.push('Add at least one action sheet item when requesting revisions or rejecting');
  }
  if (draft.actionSheet.some((item) => item.comment.trim().length === 0)) {
    missing.push('Every action sheet item needs a comment');
  }
  return { ok: missing.length === 0, missing };
}

export function resolveRoundOutcome(roundEvaluations: Evaluation[], panelSize: number): DetailedProposalStatus | null {
  if (panelSize < MAX_EVALUATORS_PER_PROPOSAL) return null;
  if (roundEvaluations.length < panelSize) return null;
  const rejects = roundEvaluations.filter((e) => e.recommendation === 'reject').length;
  if (rejects >= 2) return 'rejected';
  if (roundEvaluations.every((e) => e.recommendation === 'approve')) return 'approved';
  return 'revision_requested';
}

export const findEvaluation = (evaluations: Evaluation[], assignmentId: string, round: number): Evaluation | undefined =>
  evaluations.find((e) => e.assignmentId === assignmentId && e.round === round);

export function canUnassignEvaluator(
  assignment: EvaluatorAssignment,
  evaluations: Evaluation[],
  currentRound: number,
  status: DetailedProposalStatus = 'under_review'
): RuleCheck {
  if (isTerminalStatus(status)) return { ok: false, reason: 'Panel is locked: the proposal has a final decision' };
  if (findEvaluation(evaluations, assignment.id, currentRound)) {
    return { ok: false, reason: 'This evaluator has already submitted an evaluation for the current round' };
  }
  return { ok: true };
}

export function canUploadRevision(status: DetailedProposalStatus): RuleCheck {
  if (status !== 'revision_requested') {
    return { ok: false, reason: `Revisions can only be uploaded while the status is "${STATUS_META.revision_requested.label}"` };
  }
  return { ok: true };
}

export function averageScore(evaluations: Evaluation[]): number | null {
  if (evaluations.length === 0) return null;
  const avg = evaluations.reduce((s, e) => s + e.totalScore, 0) / evaluations.length;
  return Math.round(avg * 10) / 10;
}

export function getEvaluatorLoad(
  evaluatorId: string,
  assignments: EvaluatorAssignment[],
  proposals: DetailedProposal[]
): number {
  return assignments.filter((a) => {
    if (a.evaluatorId !== evaluatorId) return false;
    const proposal = proposals.find((p) => p.id === a.proposalId);
    return proposal ? !isTerminalStatus(proposal.status) : false;
  }).length;
}

/** Adds whole days to a YYYY-MM-DD string and returns YYYY-MM-DD (UTC-safe). */
export function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso.slice(0, 10)}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests in `proposalPipeline.test.ts` PASS.

- [ ] **Step 7: Write `src/lib/persistedState.test.ts` (failing) then `src/lib/persistedState.ts`**

Test:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPersistedArray } from './persistedState.ts';

const storageWith = (value: string | null) => ({ getItem: () => value, setItem: () => {} });

test('readPersistedArray returns the seed when the key is missing, invalid JSON, or not an array', () => {
  const seed = [{ id: 1 }];
  assert.deepEqual(readPersistedArray(storageWith(null), 'k', seed), seed);
  assert.deepEqual(readPersistedArray(storageWith('{not json'), 'k', seed), seed);
  assert.deepEqual(readPersistedArray(storageWith('{"a":1}'), 'k', seed), seed);
  assert.deepEqual(readPersistedArray(storageWith('[{"id":2}]'), 'k', seed), [{ id: 2 }]);
});
```

Implementation:

```ts
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Reads a JSON array from storage; any failure or non-array value yields the seed. */
export function readPersistedArray<T>(storage: StorageLike, key: string, seed: T[]): T[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return seed;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : seed;
  } catch {
    return seed;
  }
}

export function writePersisted(storage: StorageLike, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or disabled; the in-memory state still works.
  }
}
```

Run `npm test`: both test files PASS.

- [ ] **Step 8: Create `src/lib/format.ts`**

```ts
export const formatCurrency = (amount: number): string =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const isOverdue = (dueDateIso: string, now: Date = new Date()): boolean =>
  new Date(`${dueDateIso.slice(0, 10)}T23:59:59`) < now;

export const daysUntil = (dueDateIso: string, now: Date = new Date()): number =>
  Math.ceil((new Date(`${dueDateIso.slice(0, 10)}T23:59:59`).getTime() - now.getTime()) / 86_400_000);
```

- [ ] **Step 9: Create the seed data `src/data/pipelineMockData.ts`**

Export `MOCK_EVALUATORS`, `INITIAL_DETAILED_PROPOSALS`, `INITIAL_ASSIGNMENTS`, `INITIAL_EVALUATIONS`, `INITIAL_REVISIONS`, `DEMO_EVALUATOR_ID = 'ev-001'`. Content must be realistic WMSU/Zamboanga research text (reuse the tone of `data/mockData.ts`). Exact relationships:

Evaluators (8): `ev-001` Dr. Elena Ramirez, `elena.ramirez@wmsu.edu.ph`, College of Agriculture & Forestry, expertise Agriculture + Health/Bio-prospecting; `ev-002` Dr. Rafael Montenegro, College of Computing Studies, expertise AI & Digital Transformation; `ev-003` Engr. Lourdes Bautista, College of Engineering & Technology, expertise Renewable Energy & Green Technology + AI; `ev-004` Dr. Nadia Abubakar, College of Liberal Arts, expertise Community Empowerment & Social Innovation; `ev-005` Dr. Marco Villanueva, College of Nursing, expertise Health, Wellness & Bio-prospecting; `ev-006` Dr. Priscilla Enriquez, College of Science & Mathematics, Department of Computer Science (same department as dp-001's proponent → used to show the warning), expertise AI; `ev-007` Dr. Samuel Dizon, external (DOST-IX), `isExternal: true`, expertise Agriculture + Renewable Energy; `ev-008` Dr. Corazon Lim, College of Teacher Education, expertise Community Empowerment.

Detailed proposals (6), all `callId: 'call-2027-01'`, `callTitle: 'Institutional Research & Innovation Call 2027'`, each with 3–4 objectives, a 4-row timeline, full `expectedOutputs`, and a `manuscript` PDF:

| id | code | status | round | proponent (email) | college / department | thematic | assignments | evaluations | revisions |
|---|---|---|---|---|---|---|---|---|---|
| dp-001 | DP-2027-CSM-01 | pending_assignment | 1 | Dr. Arnel Alvarez (arnel.alvarez@wmsu.edu.ph), coInvestigators ['Engr. Fatima Hassan','Prof. Reynaldo Cruz'] | CSM / Department of Computer Science | AI & Digital Transformation | none | none | none |
| dp-002 | DP-2027-CAF-02 | pending_assignment | 1 | Prof. Jocelyn Tan (jocelyn.tan@wmsu.edu.ph) | CAF / Department of Agronomy & Soil Science | Agriculture | asg-002a ev-001 (A), asg-002b ev-007 (B) | none | none |
| dp-003 | DP-2027-COE-03 | under_review | 1 | Engr. Benjamin Salazar (benjamin.salazar@wmsu.edu.ph) | College of Engineering & Technology / Dept. of Electrical Engineering | Renewable Energy | asg-003a ev-003 (A), asg-003b ev-007 (B), asg-003c ev-001 (C) | eval-003a by ev-003 round 1 approve (total 84.5) | none |
| dp-004 | DP-2027-CLA-04 | revision_requested | 1 | Prof. Juan Dela Cruz (juan.delacruz@wmsu.edu.ph) | College of Liberal Arts / Dept. of Social Sciences | Community Empowerment | asg-004a ev-004 (A), asg-004b ev-008 (B), asg-004c ev-005 (C) | three round-1 evaluations: approve (78), revise (66, 3 action items: methodology required, budget required, timeline suggested), revise (71, 2 action items) | none |
| dp-005 | DP-2027-CN-05 | approved | 2 | Dr. Maricel Ocampo (maricel.ocampo@wmsu.edu.ph) | College of Nursing / Dept. of Community Health | Health, Wellness & Bio-prospecting | asg-005a ev-005 (A), asg-005b ev-001 (B), asg-005c ev-004 (C) | round 1: approve, revise, revise; round 2: approve ×3 (88, 85, 90) | rev-005-1 (Revision 1, respondsToRound 1, 3 responses) |
| dp-006 | DP-2027-CSM-06 | under_review | 2 | Dr. Arnel Alvarez (arnel.alvarez@wmsu.edu.ph) | CSM / Department of Computer Science | AI & Digital Transformation | asg-006a ev-002 (A), asg-006b ev-001 (B), asg-006c ev-003 (C) | round 1: revise ×2, approve; round 2: eval by ev-002 approve only (ev-001 and ev-003 pending) | rev-006-1 (Revision 1, respondsToRound 1) |

`statusHistory` for each must be complete and chronological (e.g. dp-005: pending_assignment → under_review → revision_requested → under_review → approved, with ISO timestamps in Sept–Oct 2026). Assignment `dueDate`s: 14 days after `assignedAt`; make dp-003's `asg-003c` due date in the past (e.g. `2026-10-01`) so the evaluator dashboard shows one overdue item. All `assignedBy: 'Dr. Maria Santos (RPDU Director)'`.

- [ ] **Step 10: Add `hideToast` to `CallForProposalsContext`**

In `src/context/CallForProposalsContext.tsx`: add `hideToast: () => void;` to the interface, implement `const hideToast = () => setToastMessage(null);`, include it in the provider value.

- [ ] **Step 11: Create `src/context/ProposalPipelineContext.tsx`**

```tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  ActionSheetItem,
  BlindProposal,
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
  MAX_EVALUATORS_PER_PROPOSAL,
  anonymizeProposal,
  canAssignEvaluator,
  canUnassignEvaluator,
  canUploadRevision,
  computeTotalScore,
  findEvaluation,
  getEvaluatorLoad as computeEvaluatorLoad,
  nextBlindLabel,
  resolveRoundOutcome,
  transitionProposal,
  validateEvaluation,
  type RuleCheck,
} from '../lib/proposalPipeline';
import { readPersistedArray, writePersisted } from '../lib/persistedState';
import { useAuth } from './AuthContext';
import { useCallForProposals } from './CallForProposalsContext';

const KEYS = {
  proposals: 'wmsu_pipeline_proposals',
  assignments: 'wmsu_pipeline_assignments',
  evaluations: 'wmsu_pipeline_evaluations',
  revisions: 'wmsu_pipeline_revisions',
} as const;

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

export interface MyAssignment {
  assignment: EvaluatorAssignment;
  proposal: BlindProposal;
  evaluation?: Evaluation; // the current-round evaluation, if submitted
  isOverdue: boolean;
}

interface ProposalPipelineContextType {
  proposals: DetailedProposal[];
  evaluators: Evaluator[];
  assignments: EvaluatorAssignment[];
  evaluations: Evaluation[];
  revisions: ProposalRevision[];
  currentEvaluator: Evaluator;
  actorName: string;
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
```

Implementation requirements (write the full provider):
- Initialise each of the four arrays with `useState(() => readPersistedArray(localStorage, KEYS.x, SEED))`; persist each with its own `useEffect` calling `writePersisted`.
- `evaluators` is the constant `MOCK_EVALUATORS`.
- `actorName`: from `useAuth().profile` (`first_name last_name`) if present, else `user?.email`, else `useCallForProposals().currentUser.name`.
- `currentEvaluator`: evaluator whose email equals the auth email (case-insensitive) else the one with `DEMO_EVALUATOR_ID`.
- Selectors are `useCallback`s over state; `getRevisionsFor` sorts by `revisionNumber` ascending; `getEvaluationsFor(id, round)` filters by round when given.
- `getMyProposals`: proposals whose `leadInvestigatorEmail` equals the auth email; if none, `{ proposals: all, isDemoFallback: true }`.
- `getMyAssignments`: assignments for `currentEvaluator.id` whose proposal exists, mapped to `MyAssignment` with `proposal: anonymizeProposal(p)`, `evaluation: findEvaluation(evaluations, a.id, p.currentRound)`, `isOverdue: !evaluation && isOverdue(a.dueDate)`; sorted: pending first, then by dueDate.
- `assignEvaluator`: look up proposal + evaluator; `const check = canAssignEvaluator(proposal, getAssignmentsFor(proposalId), evaluator)`; if `!check.ok` → `showToast(check.reason)` and return check. Otherwise create `{ id: \`asg-${Date.now()}-${evaluatorId}\`, proposalId, evaluatorId, blindLabel: nextBlindLabel(existing), assignedAt: now, assignedBy: actorName, dueDate }`, append; if `existing.length + 1 === MAX_EVALUATORS_PER_PROPOSAL` and status is `pending_assignment`, `transitionProposal(p, 'under_review', actorName, 'Evaluator panel complete (3/3)')` and toast "Panel complete — DP-… moved to Under Review"; else toast "Assigned {name} as {blindLabel}". Return `check` (carrying any warning).
- `unassignEvaluator`: `canUnassignEvaluator(assignment, evaluations, proposal.currentRound, proposal.status)`; on ok remove the assignment; if status was `under_review` and the panel now has < 3, transition to `pending_assignment` with note "Evaluator removed; panel incomplete". Toast either way.
- `submitEvaluation`: find assignment + proposal; if `proposal.status !== 'under_review'` → `{ ok:false, missing:['Evaluations are closed for this proposal'] }`; if `findEvaluation(evaluations, assignmentId, proposal.currentRound)` exists → `{ ok:false, missing:['An evaluation for this round was already submitted'] }`; run `validateEvaluation`; on ok build the `Evaluation` (`id: \`eval-${Date.now()}\``, `totalScore: computeTotalScore(scores)`, action items get ids `\`ai-${Date.now()}-${index}\``, `submittedAt: now`), append, then `const outcome = resolveRoundOutcome([...roundEvals, newEval], panel.length)`; if outcome → `transitionProposal(p, outcome, 'System', \`Round ${p.currentRound} complete: ${label}\`)` and toast "Round N complete — status is now {label}"; else toast "Evaluation submitted (k of 3 received)".
- `uploadRevision`: `canUploadRevision(proposal.status)`; on ok create `{ id: \`rev-${Date.now()}\`, proposalId, revisionNumber: existing.length + 1, respondsToRound: p.currentRound, file: { ...file, uploadedAt: now }, changeSummary, responses, uploadedAt: now, uploadedBy: actorName }`, append, then `transitionProposal({ ...p, currentRound: p.currentRound + 1 }, 'under_review', actorName, \`Revision ${n} uploaded\`)`; toast "Revision N uploaded — status is now Under Review". Return `{ ok: true, revision }`.
- `resetPipeline`: remove the four keys and set all four states back to the seeds; toast "Pipeline data reset to sample data".
- Export `useProposalPipeline()` that throws outside the provider, mirroring `useCallForProposals`.
- Use `useMemo` for the context value.

- [ ] **Step 12: Create the UI primitives in `src/components/ui/`**

`StatusBadge.tsx`:

```tsx
import React from 'react';
import type { DetailedProposalStatus } from '../../types';
import { STATUS_META, type StatusTone } from '../../lib/proposalPipeline';

export const TONE_CLASSES: Record<StatusTone, { badge: string; dot: string; soft: string; text: string; solid: string }> = {
  slate:   { badge: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-400',   soft: 'bg-slate-50',   text: 'text-slate-700',   solid: 'bg-slate-700 text-white' },
  blue:    { badge: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500',    soft: 'bg-blue-50',    text: 'text-blue-700',    solid: 'bg-blue-600 text-white' },
  amber:   { badge: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500',   soft: 'bg-amber-50',   text: 'text-amber-700',   solid: 'bg-amber-600 text-white' },
  emerald: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', solid: 'bg-emerald-600 text-white' },
  red:     { badge: 'bg-red-50 text-red-700 border-red-200',            dot: 'bg-red-500',     soft: 'bg-red-50',     text: 'text-red-700',     solid: 'bg-red-600 text-white' },
};

interface StatusBadgeProps {
  status: DetailedProposalStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', className = '' }) => {
  const meta = STATUS_META[status];
  const tone = TONE_CLASSES[meta.tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border font-bold ${tone.badge} ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} ${className}`}
      title={meta.description}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot} ${status === 'under_review' ? 'animate-pulse' : ''}`} />
      {meta.label}
    </span>
  );
};
```

`StatCard.tsx` — props `{ label: string; value: React.ReactNode; hint?: string; icon: LucideIcon; tone?: StatusTone | 'brand'; onClick?: () => void; active?: boolean }`. Render exactly the metric-card markup of `RpduDashboard.tsx` (`bg-white p-5 rounded-sm border border-slate-200 shadow-xs flex flex-col justify-between space-y-4`, uppercase `text-xs font-bold tracking-wider text-slate-400` label, `w-9 h-9 rounded-sm` icon tile using `TONE_CLASSES[tone].soft/text` or `bg-red-50 text-[#C8102E]` for `brand`, `text-3xl font-extrabold text-slate-900` value, `text-xs text-slate-500 mt-1 font-medium` hint). When `onClick` is set add `cursor-pointer hover:shadow-md hover:border-slate-300 transition-all` and `aria-pressed={active}`; when `active`, add `ring-2 ring-[#C8102E]/30 border-[#C8102E]`.

`EmptyState.tsx` — props `{ icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }`; markup like the "No proposals match your filters" block in `RpduProposalsManager.tsx` (`bg-white p-12 text-center rounded-sm border border-slate-200`).

`ModalShell.tsx` — props `{ isOpen: boolean; onClose: () => void; title: string; subtitle?: string; icon?: LucideIcon; size?: 'md' | 'lg' | 'xl'; children: React.ReactNode; footer?: React.ReactNode; closeDisabled?: boolean }`. Width map: md `max-w-2xl`, lg `max-w-4xl`, xl `max-w-6xl`. Structure and classes copied from `RpduReviewModal.tsx` (fixed `inset-0 z-50 bg-black/75 backdrop-blur-sm`, panel `bg-white rounded-sm shadow-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden`, header `p-4 sm:p-5 border-b border-slate-100`, scrollable body `flex-1 overflow-y-auto p-4 sm:p-6 space-y-5`, footer `p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5`). A `useEffect` adds the Escape listener and sets `document.body.style.overflow` — it must not call any state setter. Return `null` when `!isOpen`.

`ConfirmDialog.tsx` — SweetAlert style like `LogoutModal.tsx` (centred icon disc, title, description, two buttons). Props `{ isOpen; onClose; onConfirm: () => void | Promise<void>; title; description; confirmLabel?: string; cancelLabel?: string; tone?: 'brand' | 'danger' | 'success' | 'warning'; icon?: LucideIcon; loading?: boolean }`. Confirm button colours: brand `bg-[#C8102E] hover:bg-[#A00D26]`, danger `bg-red-600 hover:bg-red-700`, success `bg-emerald-600 hover:bg-emerald-700`, warning `bg-amber-600 hover:bg-amber-700`.

`PipelineStepper.tsx` — props `{ status: DetailedProposalStatus; currentRound: number; compact?: boolean }`. Steps: "Submitted" (always complete), "Evaluators Assigned" (complete unless `pending_assignment`, which shows it active), "Technical Review" (active when `under_review`; complete when approved/rejected or revision_requested), "Revision" (shown as active when `revision_requested`, labelled `Revision · Round N`; complete when `currentRound > 1` and status is not revision_requested; otherwise upcoming), "Decision" (complete + emerald "Approved" when approved, red "Rejected" when rejected, otherwise upcoming). Complete = crimson disc with `Check`, active = white disc with crimson ring and pulsing dot, upcoming = slate. Horizontal with connector lines on `sm:`, stacked vertically on mobile. `compact` renders smaller discs and hides descriptions.

- [ ] **Step 13: Wire the provider, the global toast, and the dev bypass**

`src/App.tsx`: import `ProposalPipelineProvider` and `useCallForProposals`; nest `<AuthProvider><CallForProposalsProvider><ProposalPipelineProvider><BrowserRouter>…`. Replace the local `toast` state and `{toast && <Toast … />}` with a `GlobalToast` component defined in `App.tsx`:

```tsx
function GlobalToast() {
  const { toastMessage, hideToast } = useCallForProposals();
  if (!toastMessage) return null;
  return <Toast message={toastMessage} onClose={hideToast} />;
}
```

rendered inside `BrowserRouter` before `<Routes>`. Keep `handleSignIn` and every existing route unchanged in this task.

`src/components/ProtectedRoute.tsx`: add

```tsx
const devBypass = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true';
```

and change the redirect condition to `if (!devBypass && (!session || !user))`.

- [ ] **Step 14: Verify**

Run: `npm test` → all PASS. Run: `npm run build` → success. Run: `npm run lint` → still exactly the pre-existing errors (17), none in files you created or edited (compare file names against `npx eslint . 2>&1 | grep -E "^[A-Z]:"`).

---

### Task 2: RPDU/Admin Evaluator Assignment dashboard

**Files:**
- Create: `src/pages/rpdu/EvaluatorAssignmentPage.tsx`
- Create: `src/components/rpduComponent/EvaluatorAssignmentManager.tsx`
- Create: `src/components/rpduComponent/EvaluatorPanelSlots.tsx`
- Create: `src/components/rpduComponent/modals/AssignEvaluatorModal.tsx`
- Create: `src/components/rpduComponent/modals/ProposalPipelineDetailModal.tsx`
- Modify: `src/App.tsx` (routes), `src/components/Sidebar.tsx` (nav item), `src/layouts/AdminLayout.tsx` (title)

**Interfaces:**
- Consumes: `useProposalPipeline()` (Task 1), `canAssignEvaluator`, `isPanelFull`, `remainingSlots`, `addDays`, `DEFAULT_EVALUATION_DAYS`, `STATUS_META`, `RECOMMENDATION_META`, `SECTION_LABELS`, `averageScore`, `formatCurrency/formatDate/formatDateTime`, `StatusBadge`, `StatCard`, `EmptyState`, `ModalShell`, `ConfirmDialog`, `PipelineStepper`, `TONE_CLASSES`.
- Produces: route `/rpdu/evaluations` and `/admin/evaluations` rendering `<EvaluatorAssignmentPage role="rpdu" | "admin" />`.

- [ ] **Step 1: Routes, nav, and titles**

`App.tsx`: inside the RPDU layout add `<Route path="/rpdu/evaluations" element={<EvaluatorAssignmentPage role="rpdu" />} />`; inside the Admin layout add `<Route path="/admin/evaluations" element={<EvaluatorAssignmentPage role="admin" />} />`.
`Sidebar.tsx`: after "Preliminary Screening" add `{ name: 'Evaluator Assignment', path: \`${basePath}/evaluations\`, icon: Users, disabled: false }` (import `Users` from lucide-react). Active-state check: `location.pathname.startsWith(item.path)` for this item and exact match for the others is fine — simplest is to keep `===` since there are no nested routes.
`AdminLayout.tsx` `getPageTitle`: add `if (location.pathname.startsWith('/admin/evaluations')) return 'Technical Evaluations Pipeline';` (`RpduLayout` already returns this for `/rpdu/evaluations`).

- [ ] **Step 2: `EvaluatorAssignmentPage.tsx`**

Wrapper exactly like `PreliminaryScreeningPage.tsx`: `max-w-7xl mx-auto space-y-6` containing `<EvaluatorAssignmentManager role={role} />`.

- [ ] **Step 3: `EvaluatorAssignmentManager.tsx`**

State: `statusFilter: 'all' | DetailedProposalStatus`, `searchQuery`, `thematicFilter`, `assignTarget: DetailedProposal | null`, `detailTarget: DetailedProposal | null`, `unassignTarget: EvaluatorAssignment | null`.

Layout, top to bottom:
1. Metric row (`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4`): `StatCard`s for Awaiting Evaluators (tone slate, icon `UserPlus`), Under Review (blue, `Scale`), Revision Requested (amber, `RefreshCw`), Approved (emerald, `CheckCircle2`); clicking toggles `statusFilter` (active highlighting).
2. Filter bar card like `PreliminaryScreeningManager`: status tabs All/Awaiting/Under Review/Revision/Approved/Rejected with counts; search input (title, code, proponent, college); thematic `<select>` from unique `thematicArea`s; a secondary "Reset sample data" ghost button on the right that opens a `ConfirmDialog` (danger) calling `resetPipeline`.
3. Proposal list (`grid gap-4`): one card per filtered proposal (sorted: pending_assignment first, then under_review, revision_requested, approved, rejected; then by submittedAt desc). Card content:
   - Header row: code chip (`text-xs font-mono font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700`), `StatusBadge`, "Round N" chip (`bg-blue-50 text-blue-700` when > 1 else slate), thematic area tag.
   - Title (`text-base font-bold text-slate-900 leading-snug`).
   - Meta row (text-xs slate-600 with icons): proponent, college, `formatCurrency(budget)`, `formatDate(submittedAt)`, `durationMonths` months.
   - `<EvaluatorPanelSlots … />` (Step 4).
   - Progress line when `under_review`: "k of 3 evaluations received for Round N" with a thin progress bar (`h-1.5 bg-slate-100` → `bg-blue-500`). When `revision_requested`: amber note "Waiting for the proponent to upload Revision N". When approved/rejected: average score chip.
   - Action row (right-aligned, `shrink-0`): "View Pipeline" (secondary: `bg-slate-100 text-slate-700 hover:bg-slate-200`) and **Assign Evaluator** (primary `bg-[#C8102E] hover:bg-[#A00D26] text-white`), with:

   ```tsx
   const panel = getAssignmentsFor(proposal.id);
   const full = isPanelFull(panel);
   const closed = isTerminalStatus(proposal.status);
   const assignDisabled = full || closed;
   const assignTitle = closed
     ? `Assignment is closed: proposal is ${STATUS_META[proposal.status].label.toLowerCase()}`
     : full
       ? 'Maximum of 3 evaluators already assigned'
       : `${remainingSlots(panel)} slot${remainingSlots(panel) === 1 ? '' : 's'} remaining`;
   <button type="button" disabled={assignDisabled} title={assignTitle} aria-disabled={assignDisabled}
     className={`… ${assignDisabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#C8102E] hover:bg-[#A00D26] text-white cursor-pointer'}`}>
     {full ? <><CheckCircle2 className="w-4 h-4" /> Panel Complete (3/3)</> : <><UserPlus className="w-4 h-4" /> Assign Evaluator ({panel.length}/3)</>}
   </button>
   ```
4. `EmptyState` when the filtered list is empty.
5. Modals: `AssignEvaluatorModal` (open when `assignTarget`), `ProposalPipelineDetailModal` (when `detailTarget`), `ConfirmDialog` for unassign (danger, "Remove evaluator from panel?").

Import `isTerminalStatus` from the pipeline module. Look up the live proposal object from context by id when rendering modals (`proposals.find`) so the modal reflects state changes immediately after an assignment.

- [ ] **Step 4: `EvaluatorPanelSlots.tsx`**

Props: `{ proposal: DetailedProposal; assignments: EvaluatorAssignment[]; evaluators: Evaluator[]; evaluations: Evaluation[]; onUnassign?: (assignment: EvaluatorAssignment) => void; showNames?: boolean }` (`showNames` true for RPDU). Render three slots in a `grid grid-cols-1 sm:grid-cols-3 gap-2`:
- Filled slot: `border border-slate-200 rounded-sm px-3 py-2 bg-slate-50/60` with blind label (`text-[10px] font-bold uppercase tracking-wider text-slate-400`), evaluator name + college (when `showNames`), due date (`Due {formatDate}`; red text when overdue and not yet submitted), and a status pill: "Submitted · 84.5" (emerald) when `findEvaluation(evaluations, a.id, proposal.currentRound)` exists, else "Pending" (amber). An `X` icon button (`title="Remove from panel"`) calls `onUnassign` — rendered only when `onUnassign` is provided and `canUnassignEvaluator(a, evaluations, proposal.currentRound, proposal.status).ok`.
- Empty slot: `border border-dashed border-slate-300 rounded-sm px-3 py-2 text-xs text-slate-400 flex items-center gap-2` with `UserPlus` icon and "Open slot".
Slots are ordered A, B, C by `blindLabel`.

- [ ] **Step 5: `AssignEvaluatorModal.tsx`**

Props: `{ isOpen: boolean; proposal: DetailedProposal | null; onClose: () => void }`. Uses `useProposalPipeline()` for `evaluators`, `getAssignmentsFor`, `getEvaluatorLoad`, `assignEvaluator`. Local state: `search`, `expertiseFilter: 'all' | 'matching'`, `externalOnly`, `dueDate` (default `addDays(today, DEFAULT_EVALUATION_DAYS)`), `lastWarning: string | null`.

Body:
- Proposal summary strip (code, title, thematic area, proponent department) and a slot meter: three boxes filled/empty + text "Slots used: k / 3".
- When the panel is full: an emerald banner "Panel complete — this proposal already has the maximum of 3 evaluators and is now Under Review." and every row's Assign button disabled.
- Due-date input (`type="date"`, min today) with the label "Evaluation due date".
- Roster controls: search (name, college, expertise), toggle chips "All" / "Matching expertise" (expertise includes `proposal.thematicArea`), checkbox "External only".
- Roster list (`divide-y`): per evaluator a row with avatar initials disc, name, title, college · department, expertise tags (`text-[10px]` chips), "Recommended" emerald chip when expertise matches, "External" slate chip when `isExternal`, load chip "{n} active", and on the right the Assign button. For each row compute `const check = canAssignEvaluator(proposal, panel, evaluator)`; `disabled={!check.ok}`, `title={check.reason ?? check.warning ?? 'Assign to panel'}`; a small amber `AlertTriangle` + warning text under the row when `check.warning`. Clicking calls `assignEvaluator(proposal.id, evaluator.id, dueDate)` and stores `result.warning ?? null` in `lastWarning` (shown as an amber inline note under the slot meter). Assign buttons are re-derived from context state so after the 3rd assignment they all disable without closing the modal.
- Footer: "Done" (secondary). No primary action in the footer — assignment happens per row.
Use `ModalShell` with `size="lg"`, icon `UserPlus`, title "Assign Technical Evaluators", subtitle "Double-blind panel · exactly three evaluators per detailed proposal".

- [ ] **Step 6: `ProposalPipelineDetailModal.tsx`**

Props: `{ isOpen; proposal: DetailedProposal | null; onClose }`. `ModalShell size="xl"` with tab strip (`Overview`, `Evaluations`, `Revisions`, `Status History`) styled like the tab nav in `RpduDashboard.tsx` (`border-b-2 border-[#C8102E] text-[#C8102E]` active).
- Overview: `PipelineStepper`, two-column facts (proponent, email, co-investigators, college/department, thematic area, duration, budget, submitted), abstract, objectives list, manuscript card with `Download` icon (link to `dataUrl` if present else disabled).
- Evaluations: grouped by round (latest first); per evaluation a card: blind label + real evaluator name (RPDU may see both), recommendation chip (`RECOMMENDATION_META`), total score with a horizontal bar (emerald ≥ 75 else amber), per-criterion scores table (label, score/10, weight), remarks, action sheet list (section label via `SECTION_LABELS`, severity chip). Round header shows `averageScore` for that round. Pending assignments in the current round appear as muted "Awaiting submission" cards.
- Revisions: vertical timeline — "Original Submission" then each revision (number, `formatDateTime(uploadedAt)`, file name/size, change summary, count of responses, "responds to Round N").
- Status History: list of `statusHistory` entries newest first with `StatusBadge`, `formatDateTime(at)`, `by`, `note`, round.

- [ ] **Step 7: Verify**

`npm run build`, `npm run lint` (no errors in new/edited files), `npm test`. Then in the browser (`npm run dev`, `.env` with `VITE_AUTH_BYPASS=true`): open `/rpdu/evaluations`; on DP-2027-CAF-02 the button reads "Assign Evaluator (2/3)"; open it, assign one evaluator → the modal shows the panel-complete banner, every Assign button is disabled, the card's button now reads "Panel Complete (3/3)" and is disabled, and the badge reads "Under Review". Confirm DP-2027-CSM-01 shows the amber same-department warning for Dr. Priscilla Enriquez and disabled rows for Engr. Fatima Hassan-type conflicts are not applicable (no evaluator shares that name) — verify the lead-proponent conflict instead by checking the tooltip logic in code. Open "View Pipeline" on DP-2027-CN-05 and check all four tabs render.

---

### Task 3: Double-blind Evaluator portal

**Files:**
- Create: `src/layouts/EvaluatorLayout.tsx`
- Create: `src/components/evaluatorComponent/EvaluatorSidebar.tsx`
- Rewrite: `src/pages/evaluator/evaluatorDashboard.tsx` (keep file name and default export)
- Create: `src/pages/evaluator/EvaluationPortalPage.tsx`
- Create: `src/components/evaluatorComponent/BlindProposalViewer.tsx`
- Create: `src/components/evaluatorComponent/EvaluationScoringForm.tsx`
- Create: `src/components/evaluatorComponent/ActionSheetBuilder.tsx`
- Create: `src/components/evaluatorComponent/EvaluationSummary.tsx`
- Modify: `src/App.tsx` (move `/evaluator` into `EvaluatorLayout`, add `/evaluator/review/:assignmentId`), `src/layouts/Layout.tsx` (remove the evaluator title line)

**Interfaces:**
- Consumes: `useProposalPipeline().getMyAssignments()` → `MyAssignment[]`, `submitEvaluation`, `getRevisionsFor`, `getEvaluationsFor`, `currentEvaluator`; `EVALUATION_CRITERIA`, `MIN_CRITERION_SCORE`, `MAX_CRITERION_SCORE`, `PASSING_TOTAL_SCORE`, `MIN_REMARKS_LENGTH`, `computeTotalScore`, `validateEvaluation`, `SECTION_LABELS`, `RECOMMENDATION_META`; `BlindProposal` type only.
- Produces: nothing consumed later.

- [ ] **Step 1: Layout, sidebar, routes**

`EvaluatorLayout.tsx`: copy the structure of `RpduLayout.tsx` (sidebar + sticky header with the animated crimson chevron + `<main>`), using `EvaluatorSidebar`. `getPageTitle`: `/evaluator/review/` → "Double-Blind Technical Evaluation", else "Technical Evaluator Panel".
`EvaluatorSidebar.tsx`: copy `ProponentSidebar.tsx` structure (branding header, nav, footer user card with `LogoutModal`); section label "Evaluator Panel"; nav items: "Assigned Proposals" (`/evaluator`, icon `ClipboardList`), "Evaluation Guidelines" (disabled, "Coming soon", icon `BookOpen`); footer subtitle "Technical Evaluator · Double-blind". Name resolution identical to `ProponentSidebar` (copy the `fullName` logic), fallback "Evaluator".
`App.tsx`: remove `<Route path="/evaluator" …/>` from the proponent `Layout` group; add

```tsx
<Route element={<EvaluatorLayout />}>
  <Route path="/evaluator" element={<EvaluatorDashboard />} />
  <Route path="/evaluator/review/:assignmentId" element={<EvaluationPortalPage />} />
</Route>
```

inside `ProtectedRoute`. `Layout.tsx`: delete the `/evaluator` line in `getPageTitle`.

- [ ] **Step 2: `evaluatorDashboard.tsx`**

Uses `getMyAssignments()`. Layout:
- Header block like `RpduDashboard`: chip "Evaluator Panel", `h1` "Assigned Proposals", subtitle "Double-blind technical review — proponent identities are withheld."
- Double-blind notice: `bg-slate-900 text-white rounded-sm p-4 flex gap-3` with `ShieldCheck` icon, title "Double-blind review in effect", body "You will not see proponent names, colleges, or departments. Score the manuscript on merit, document required changes in the action sheet, and submit once per round."
- `StatCard` row: Assigned (slate, `ClipboardList`), Pending Submission (amber, `Clock`), Submitted (emerald, `CheckCircle2`), Overdue (red, `AlertTriangle`).
- Assignment cards: code chip, `StatusBadge`, "Round N" chip, blind label chip ("You are Evaluator B"), title, thematic area, duration, budget, due date with `daysUntil` ("Due in 5 days" / "Overdue by 2 days" in red), and the action: `Link` to `/evaluator/review/${assignment.id}` labelled "Open Evaluation" (primary) when no evaluation this round, else "View Submission" (secondary) with the score chip. When the proposal status is not `under_review` and there is no evaluation (e.g. revision pending), show a muted "Waiting for revised manuscript" note instead of the primary button.
- `EmptyState` when there are no assignments.

- [ ] **Step 3: `EvaluationPortalPage.tsx`**

`useParams<{ assignmentId }>()`; find the `MyAssignment`; if missing render `EmptyState` with a link back to `/evaluator`. Page header: back link ("← Assigned Proposals"), code chip, "Round N", blind label ("Evaluating as Evaluator C"), `StatusBadge`. Two-column grid `lg:grid-cols-[minmax(0,1fr)_420px] gap-6`: left `BlindProposalViewer`, right a `lg:sticky lg:top-24` column holding `EvaluationScoringForm` (when not yet submitted and status is `under_review`) or `EvaluationSummary` (read-only) otherwise.

- [ ] **Step 4: `BlindProposalViewer.tsx`**

Props: `{ proposal: BlindProposal; previousActionSheet?: ActionSheetItem[]; latestRevision?: ProposalRevision }`. Sections as cards with uppercase section labels (`text-[11px] font-bold uppercase tracking-wider text-slate-400`): Manuscript (file name, size, `Download` button → `dataUrl` or disabled), Abstract, Rationale & Significance, Objectives (numbered), Methodology, Timeline (table: phase / months / deliverable), Expected Outputs (6P grid: Publications, Patents, Products, People, Places, Policies), Budget & Duration (`formatCurrency`, months). When `latestRevision` exists render first a "What changed in Revision N" panel (amber-tinted): change summary and, for each `previousActionSheet` item, the item comment and the proponent's response (matched by `actionItemId`). Nothing in this file may name a proponent field (the `BlindProposal` type has none).

- [ ] **Step 5: `EvaluationScoringForm.tsx` + `ActionSheetBuilder.tsx`**

`EvaluationScoringForm` props: `{ assignmentId: string; onSubmitted: () => void }`. Local draft state: `scores: Record<string, number>`, `remarks`, `recommendation: EvaluatorRecommendation | null`, `actionSheet: Omit<ActionSheetItem,'id'>[]` (give each a local `key` for React), `confirmOpen`, `errors: string[]`.
- Criteria list: for each `EVALUATION_CRITERIA` row: label, weight chip ("25 pts"), description, and a 1–10 segmented control (ten `button`s, selected one `bg-[#C8102E] text-white`, others `bg-white border-slate-200 hover:border-[#C8102E]`); `aria-label="{label}: {n}"`.
- Live total: `computeTotalScore(...)` rendered as a large number + bar (emerald when ≥ `PASSING_TOTAL_SCORE` else amber) and the caption "Advisory passing line: 75 / 100".
- Remarks textarea with a live counter "{len} / min 20".
- `ActionSheetBuilder` props `{ items; onChange }`: inline add row (section `<select>` of `SECTION_LABELS`, severity toggle Required/Suggested, comment input, Add button) and list of items with severity chip (red-tinted for required, slate for suggested), section label, comment, remove icon.
- Recommendation: three selectable cards from `RECOMMENDATION_META` (same pattern as `RpduReviewModal` status cards).
- Submit button (primary, full width) → runs `validateEvaluation`; on failure show the `missing` list in a red-tinted box; on success open `ConfirmDialog` (tone brand, title "Submit evaluation?", description "Your scores and action sheet will be sent to the RPDU and cannot be edited after submission."). On confirm call `submitEvaluation`; if `ok` call `onSubmitted()`, else set `errors`.

- [ ] **Step 6: `EvaluationSummary.tsx`**

Props `{ evaluation: Evaluation }`: read-only card showing "Submitted on {formatDateTime}", total score + bar, recommendation chip, per-criterion scores, remarks, action sheet. Used after submission and for past rounds.

- [ ] **Step 7: Double-blind grep gate + verify**

Run from `wmsu-rdec/`:

```bash
grep -rnE "DetailedProposal|leadInvestigator|coInvestigators|proponentId|college|department" src/pages/evaluator src/components/evaluatorComponent
```

Expected: no output. Then `npm run build`, `npm run lint` (no errors in new/edited files), `npm test`. Browser: `/evaluator` lists 4 assignments for Dr. Elena Ramirez (DP-2027-CAF-02 awaiting panel, DP-2027-COE-03 overdue pending, DP-2027-CN-05 submitted/approved, DP-2027-CSM-06 round 2 pending with "What changed in Revision 1"). Open DP-2027-COE-03, score all criteria, write remarks, pick Approve, submit → read-only summary; `/rpdu/evaluations` shows "2 of 3 evaluations received".

---

### Task 4: Proponent feedback & revision history loop

**Files:**
- Create: `src/pages/proponents/RevisionHistoryPage.tsx`
- Create: `src/components/proponentComponent/ProposalFeedbackPanel.tsx`
- Create: `src/components/proponentComponent/RevisionUploadForm.tsx`
- Create: `src/components/proponentComponent/RevisionTimeline.tsx`
- Modify: `src/components/proponentComponent/ProponentSidebar.tsx` (nav item), `src/layouts/Layout.tsx` (title), `src/App.tsx` (route)

**Interfaces:**
- Consumes: `useProposalPipeline().getMyProposals()`, `getAssignmentsFor`, `getEvaluationsFor`, `getRevisionsFor`, `uploadRevision`; `canUploadRevision`, `STATUS_META`, `RECOMMENDATION_META`, `SECTION_LABELS`, `averageScore`; `StatusBadge`, `PipelineStepper`, `EmptyState`, `ConfirmDialog`, `StatCard`.

- [ ] **Step 1: Route, nav, title**

`App.tsx`: inside the proponent `Layout` group add `<Route path="/proponent/revisions" element={<RevisionHistoryPage />} />`.
`ProponentSidebar.tsx`: add a third nav link "Evaluation & Revisions" → `/proponent/revisions`, icon `History`, active when `location.pathname === '/proponent/revisions'`, same classes as the other links.
`Layout.tsx` `getPageTitle`: `if (location.pathname === '/proponent/revisions') return 'Technical Review Feedback & Revision History';`.

- [ ] **Step 2: `RevisionHistoryPage.tsx`**

`const { proposals, isDemoFallback } = getMyProposals()`; `selectedId` state defaulting to the first proposal needing action (`revision_requested`) else the first proposal. Layout `max-w-7xl mx-auto space-y-6`:
- Header block (chip "Proponent", `h1` "Technical Review & Revisions", subtitle). If `isDemoFallback`, a slate info line with `Info` icon: "Showing sample proposals — none are linked to your account yet."
- `StatCard` row: Awaiting Action (amber, count `revision_requested`), Under Review (blue), Approved (emerald), Total Revisions Uploaded (slate).
- Grid `lg:grid-cols-[320px_minmax(0,1fr)] gap-6`: left = selectable list of the proponent's proposals (code, title, `StatusBadge`, "Round N", a red dot + "Action required" when `revision_requested`; selected item has `border-[#C8102E] bg-red-50/40`); right = the detail for `selectedId`:
  1. Title card with `StatusBadge`, round, submitted date, and `PipelineStepper`.
  2. Status banner by status: `revision_requested` → amber card "Revision N required — address the action items below and upload your revised manuscript."; `under_review` → blue card "Your manuscript is with the evaluation panel (k of 3 evaluations received)."; `pending_assignment` → slate "Awaiting evaluator assignment by the RPDU."; `approved` → emerald "Approved by the technical review panel on {date}."; `rejected` → red.
  3. `<ProposalFeedbackPanel …/>` (Step 3).
  4. `<RevisionUploadForm …/>` only when `canUploadRevision(status).ok`.
  5. `<RevisionTimeline …/>`.
- `EmptyState` if there are no proposals.

- [ ] **Step 3: `ProposalFeedbackPanel.tsx`**

Props: `{ proposal: DetailedProposal; assignments: EvaluatorAssignment[]; evaluations: Evaluation[] }`. Group evaluations by round (latest first; rounds collapsible, latest expanded). Per round: header "Round N · Panel average {averageScore}" and the three evaluator cards ordered by `blindLabel`, showing only the blind label (never a name or email), recommendation chip, total score with bar, remarks, and action sheet items with section + severity chips. Evaluators who have not submitted for the round show a muted "Evaluator B · Pending" card. Above the latest round when status is `revision_requested`: a consolidated "Action items to address (Round N)" checklist merging every item from that round, each with its blind label origin — the proponent ticks items locally as a reading aid (`useState<Set<string>>`), nothing persisted.

- [ ] **Step 4: `RevisionUploadForm.tsx`**

Props: `{ proposal: DetailedProposal; actionItems: (ActionSheetItem & { blindLabel: string })[]; nextRevisionNumber: number; onUploaded: () => void }`. State: `file: { name; size; type; dataUrl? } | null`, `changeSummary`, `responses: Record<string, string>`, `errors: string[]`, `confirmOpen`, `dragActive`.
- Card title "Upload Revision {nextRevisionNumber}" with subtitle "Attach the revised manuscript and explain how each required action item was addressed."
- Drop zone (like the concept form's upload area): accepts `.pdf,.doc,.docx`, max 10 MB; on select read with `FileReader.readAsDataURL` (store `dataUrl`), show file chip with size (`(bytes/1024/1024).toFixed(2) + ' MB'`) and a remove button.
- Change summary textarea (min 20 chars, counter).
- Responses: one textarea per action item (label: blind label · section · severity); required for `severity === 'required'`.
- Validation on submit: file present, summary ≥ 20, every required item has a non-empty response → otherwise list errors in a red box. Then `ConfirmDialog` (tone brand, "Upload Revision N?", "This will send your revised manuscript back to the evaluation panel for Round N+1."). On confirm: `uploadRevision({ proposalId, file, changeSummary, responses })`; on ok reset the form and call `onUploaded()`.

- [ ] **Step 5: `RevisionTimeline.tsx`**

Props: `{ proposal: DetailedProposal; revisions: ProposalRevision[] }`. Vertical timeline with a crimson rail: first node "Original Submission" (`formatDateTime(submittedAt)`, manuscript file), then each revision ascending: "Revision N" badge, `formatDateTime(uploadedAt)`, "Responds to Round N", file chip (download via `dataUrl` when present), change summary, and an expandable "Responses (k)" list. Footer hint: "Revisions continue until the panel approves the proposal; there is no limit on the number of revisions."

- [ ] **Step 6: Verify**

`npm run build`, `npm run lint` (no errors in new/edited files), `npm test`. Browser: `/proponent/revisions` → DP-2027-CLA-04 is preselected with the amber banner; the feedback shows Evaluator A/B/C only (no names); upload a PDF with a summary and responses → toast, status becomes Under Review, round 2, Revision 1 appears in the timeline; the upload form disappears. `/rpdu/evaluations` shows the same proposal as Under Review · Round 2; `/evaluator` (Dr. Ramirez is not on that panel) is unaffected.

---

### Task 5: RPDU dashboard integration and pipeline visibility

**Files:**
- Create: `src/components/rpduComponent/PipelineSummaryPanel.tsx`
- Create: `src/components/rpduComponent/EvaluatorRosterTable.tsx`
- Modify: `src/pages/rpdu/RpduDashboard.tsx`

**Interfaces:**
- Consumes: `useProposalPipeline()` (`proposals`, `evaluators`, `getAssignmentsFor`, `getEvaluationsFor`, `getEvaluatorLoad`), `STATUS_META`, `StatusBadge`, `StatCard`, `EmptyState`, `formatDate`.

- [ ] **Step 1: `PipelineSummaryPanel.tsx`**

Replaces the "Proposals Review" placeholder panel. Content: a five-column status strip (`grid grid-cols-2 sm:grid-cols-5 gap-3`) with one mini card per `DetailedProposalStatus` (label, count, tone dot), then "Needs RPDU attention" list: proposals with `pending_assignment` (show "k/3 evaluators") and `under_review` where every evaluation is in but status did not resolve (should not happen — skip) plus `revision_requested` older than 7 days (show "Waiting N days"); each row has code, title, `StatusBadge`, and a `Link` "Open" to `/rpdu/evaluations`. Footer `Link` button "Go to Evaluator Assignment →".

- [ ] **Step 2: `EvaluatorRosterTable.tsx`**

Replaces the "Evaluators Roster" placeholder. Responsive table (cards on mobile via `sm:table`): evaluator initials disc, name + title, college · department, expertise chips, "External" chip, active load (`getEvaluatorLoad`) with a small bar (max 5), and count of submitted evaluations. Sorted by load desc. Search box above the table.

- [ ] **Step 3: `RpduDashboard.tsx` changes**

- Add a fifth metric card "Technical Review Queue" (tone blue, icon `Scale`, value = count of `under_review` + `pending_assignment`, hint "{n} awaiting evaluators · {m} under review", clickable → `/rpdu/evaluations`); change the metrics grid to `grid-cols-1 sm:grid-cols-2 xl:grid-cols-5`.
- Tab counts: "Proposals Review" badge = `proposals.length` (detailed proposals), "Evaluators Roster" badge = `evaluators.length`.
- Render `<PipelineSummaryPanel />` and `<EvaluatorRosterTable />` in their tabs. Keep the calls tab untouched.

- [ ] **Step 4: Verify**

`npm run build`, `npm run lint` (no errors in new/edited files), `npm test`. Browser: `/rpdu` shows the five cards; the Proposals Review tab lists the status strip and attention items; the Evaluators Roster tab lists 8 evaluators with loads (Dr. Elena Ramirez highest).
