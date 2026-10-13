import type { ChecklistEntry, ProponentFeedbackEvaluation } from '../types/index.ts';
import { ASSESSMENT_GROUPS, pointsInGroup, type AssessmentGroup, type AssessmentPoint } from './proposalPipeline.ts';

export interface PointNote { blindLabel: string; entry: ChecklistEntry }
export interface PointFeedback { point: AssessmentPoint; notes: PointNote[] }
export interface GroupFeedback { group: AssessmentGroup; points: PointFeedback[] }

const isNoteworthy = (entry: ChecklistEntry | undefined): entry is ChecklistEntry => entry !== undefined && (entry.present === 'NA' || entry.comment.trim().length > 0);

/** The left column of the Action Sheet: every point at least one evaluator commented on or marked N/A, in form order. */
export function groupFeedbackByPoint(evaluations: ProponentFeedbackEvaluation[]): GroupFeedback[] {
  return ASSESSMENT_GROUPS.map((group) => ({
    group,
    points: pointsInGroup(group.id)
      .map((point) => ({ point, notes: evaluations.flatMap((evaluation) => { const entry = evaluation.checklist[point.id]; return isNoteworthy(entry) ? [{ blindLabel: evaluation.blindLabel, entry }] : []; }) }))
      .filter((item) => item.notes.length > 0),
  })).filter((item) => item.points.length > 0);
}
