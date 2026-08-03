import type { DevelopmentAction, DevelopmentPlan, DevelopmentReview } from '@/lib/types'

// The assessment says WHAT to develop. The IDP says what will be DONE about
// it, and when it gets checked. This module owns the "when it gets checked"
// half — specifically the user's requirement that review intervals depend on
// the time required for each development area, rather than every plan
// getting an identical schedule.
//
// WLEA's engine emits reviewTimelineDays [30,60,90,180,365] for every plan
// regardless of size, plus an estimatedTimeToCompetency string banded by the
// score gap. Putting a 365-day review on a 1-3 month gap is noise, so the
// timeline is filtered to the plan's actual horizon below.
//
// Horizon by gap, mirroring the bands WLEA's engine already uses:
//   gap >= 2  -> 6-12 months  -> 365-day horizon
//   gap == 1  -> 3-6 months   -> 180-day horizon
//   gap  < 1  -> 1-3 months   ->  90-day horizon
// This is a JUDGEMENT CALL about scheduling, not a fact from the framework.
export function horizonDaysForGap(gap: number): number {
  if (gap >= 2) return 365
  if (gap >= 1) return 180
  return 90
}

export function reviewOffsetsFor(gap: number, timeline: number[] = [30, 60, 90, 180, 365]): number[] {
  const horizon = horizonDaysForGap(gap)
  const within = timeline.filter((d) => d <= horizon)
  // Always keep at least one checkpoint — a plan with no review isn't a plan.
  return within.length > 0 ? within : [timeline[0] ?? 30]
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export const ACTION_CATEGORY_LABEL: Record<DevelopmentAction['category'], string> = {
  workplace: 'Workplace (70%)',
  coaching: 'Coaching (20%)',
  formal_learning: 'Formal learning (10%)',
}

export const ACTION_STATUS_LABEL: Record<DevelopmentAction['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  blocked: 'Blocked',
}

// Semantic, not brand — same discipline as the RAG colours elsewhere.
export const ACTION_STATUS_COLOR: Record<DevelopmentAction['status'], string> = {
  not_started: '#9ca3af',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  blocked: '#ef4444',
}

export const REVIEW_OUTCOME_LABEL: Record<NonNullable<DevelopmentReview['outcome']>, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  behind: 'Behind',
  achieved: 'Achieved',
}

export const REVIEW_OUTCOME_COLOR: Record<NonNullable<DevelopmentReview['outcome']>, string> = {
  on_track: '#22c55e',
  at_risk: '#f59e0b',
  behind: '#ef4444',
  achieved: '#15803d',
}

export interface PlanProgress {
  completed: number
  total: number
  percent: number
}

// Measurable, per the user's framing: an IDP you can't quantify progress on
// isn't monitorable. Counts completed actions against the total.
export function planProgress(actions: DevelopmentAction[]): PlanProgress {
  const total = actions.length
  const completed = actions.filter((a) => a.status === 'completed').length
  return { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) }
}

// The next checkpoint that hasn't been completed yet — what the person and
// their manager should actually be looking at now.
export function nextReview(reviews: DevelopmentReview[]): DevelopmentReview | null {
  const outstanding = reviews
    .filter((r) => !r.completedAt)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  return outstanding[0] ?? null
}

export function isOverdue(review: DevelopmentReview, today = new Date().toISOString().slice(0, 10)): boolean {
  return !review.completedAt && review.scheduledDate < today
}

export interface PlanView {
  plan: DevelopmentPlan
  actions: DevelopmentAction[]
  reviews: DevelopmentReview[]
}
