// Redefined locally rather than imported from leadership-excellence-assessment's
// lib/framework/types.ts — separate Next.js deployments, no shared package.
// Kept in sync by convention, not by import.
export type RoleLevelKey = 'jpm' | 'pm' | 'dcm' | 'exec' | 'fm'

export type EntityStatus = 'active' | 'archived'

export interface Person {
  id: string
  name: string
  email: string | null
  roleTitle: string | null
  roleLevel: RoleLevelKey | null
  team: string | null
  managerId: string | null
  associateNo: string | null
  division: string | null
  status: EntityStatus
  createdAt: string
  updatedAt: string
}

// Connect 2.0 model — Mr Price's own KPI tracker structure, not invented
// here. Two sections, each weighted to its own 100% independently (per
// Mr Price's "Use Guide" tab: "Because Leadership effectiveness is as
// important as our KPI Delivery, this section has a 100% weighting as well").
export type Section = 'kpi_delivery' | 'leadership_effectiveness'

export const SECTIONS: { key: Section; label: string }[] = [
  { key: 'kpi_delivery', label: 'KPI Delivery' },
  { key: 'leadership_effectiveness', label: 'Leadership Effectiveness' },
]

// V1 four-state set from Connect 2.0's Legend tab, marked "preferred" there
// over the 7-state alternative.
export type ObjectiveStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold'

export const STATUSES: { key: ObjectiveStatus; label: string }[] = [
  { key: 'not_started', label: 'Not Started' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'on_hold', label: 'On Hold' },
]

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

// Agreed at FY close, blending KPI delivery and leadership behaviour —
// Connect 2.0's own performance rating scale.
export type FinalRating = 'exceeded' | 'full' | 'partial' | 'none'

export const FINAL_RATINGS: { key: FinalRating; label: string }[] = [
  { key: 'exceeded', label: 'Exceeded Achievement' },
  { key: 'full', label: 'Full Achievement' },
  { key: 'partial', label: 'Partial Achievement' },
  { key: 'none', label: 'None Achievement' },
]

export interface Tracker {
  id: string
  personId: string
  fyStartYear: number // calendar year FY begins in (April); FY27 = 2026
  associateComment: string | null
  managerComment: string | null
  createdAt: string
  updatedAt: string
}

// Balanced Scorecard frame — the four classic Kaplan & Norton perspectives.
// A TAG on an objective, not a separate metric: the scorecard is a lens over
// Connect 2.0 data, not a second place to enter numbers. Nullable at the
// objective level (see lib/schema.ts) so untagged objectives don't silently
// vanish from the roster, they just don't count toward any perspective yet.
export type Perspective = 'financial' | 'customer' | 'internal_process' | 'learning_growth'

export const PERSPECTIVES: { key: Perspective; label: string }[] = [
  { key: 'financial', label: 'Financial' },
  { key: 'customer', label: 'Customer' },
  { key: 'internal_process', label: 'Internal Process' },
  { key: 'learning_growth', label: 'Learning & Growth' },
]

export interface Objective {
  id: string
  trackerId: string
  section: Section
  divisionSubObjective: string | null
  objective: string
  dueDate: string | null
  weighting: number // 0..1
  measuresOfSuccess: string | null
  finalRating: FinalRating | null
  associateComment: string | null
  managerComment: string | null
  sortOrder: number
  perspective: Perspective | null
  createdAt: string
  updatedAt: string
}

export interface ObjectiveProgress {
  id: string
  objectiveId: string
  quarter: Quarter
  status: ObjectiveStatus
  updatedAt: string
}

export interface ObjectiveWithProgress extends Objective {
  progress: Partial<Record<Quarter, ObjectiveStatus>>
}

export interface TrackerView {
  tracker: Tracker
  objectives: ObjectiveWithProgress[]
}

// ── Individual Development Plan ─────────────────────────────────
// Seeded from WLEA's assessment output, then tracked independently here.
// The assessment diagnoses; the IDP records what was done about it.

export type PlanStatus = 'active' | 'achieved' | 'paused' | 'abandoned'
export type ActionCategory = 'workplace' | 'coaching' | 'formal_learning'
export type ActionStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked'
export type ReviewOutcome = 'on_track' | 'at_risk' | 'behind' | 'achieved'

export const ACTION_STATUSES: { key: ActionStatus; label: string }[] = [
  { key: 'not_started', label: 'Not started' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'blocked', label: 'Blocked' },
]

export const REVIEW_OUTCOMES: { key: ReviewOutcome; label: string }[] = [
  { key: 'on_track', label: 'On track' },
  { key: 'at_risk', label: 'At risk' },
  { key: 'behind', label: 'Behind' },
  { key: 'achieved', label: 'Achieved' },
]

export interface DevelopmentPlan {
  id: string
  personId: string
  sourceAssessmentId: string | null
  competencyKey: string
  competencyName: string
  currentScore: number | null
  targetScore: number | null
  expectedChange: string | null
  successMeasure: string | null
  evidenceRequired: string[]
  timeToCompetency: string | null
  status: PlanStatus
  startedOn: string
  createdAt: string
  updatedAt: string
}

// 'suggested' = generated by WLEA's engine from the assessment gap.
// 'agreed'    = typed in by a manager/employee in the actual conversation.
// Kept distinct so "what did we commit to and do" is answerable separately
// from "what did the tool propose".
export type ActionSource = 'suggested' | 'agreed'

export interface DevelopmentAction {
  id: string
  planId: string
  category: ActionCategory
  description: string
  status: ActionStatus
  dueDate: string | null
  completedAt: string | null
  notes: string | null
  source: ActionSource
  sortOrder: number
}

export interface DevelopmentReview {
  id: string
  planId: string
  dayOffset: number
  scheduledDate: string
  completedAt: string | null
  outcome: ReviewOutcome | null
  notes: string | null
}

// ── 9-box ──────────────────────────────────────────────────────

export interface NineBoxPosition {
  id: string
  personId: string
  fyStartYear: number
  potentialComputed: number | null
  performanceComputed: number | null
  potentialOverride: number | null
  performanceOverride: number | null
  notes: string | null
  positionedAt: string | null
  updatedAt: string
}

export interface NineBoxEntry {
  person: Person
  position: NineBoxPosition | null
  // Effective = override if set, else computed. What actually gets plotted.
  potential: number | null
  performance: number | null
  potentialSource: 'override' | 'computed' | 'none'
  performanceSource: 'override' | 'computed' | 'none'
  // Provenance, surfaced in the UI so "why is this dot here" is never a mystery.
  assessmentDate: string | null // latest completed WLEA assessment used for potential
  performanceQuarter: Quarter | null // which quarter's progress fed performance
}

// ── Succession Planning ───────────────────────────────────────────
// A Role is a first-class entity independent of perf_people — it can exist
// vacant, and carries its own criticality metadata. perf_people's own
// roleTitle/roleLevel are untouched; this is additive, not a replacement.

export type SuccessionReadiness = 'ready_now' | 'ready_12mo' | 'ready_1_2yr' | 'ready_2_3yr' | 'not_ready'
export type SuccessionRisk = 'high' | 'medium' | 'low'

export interface Role {
  id: string
  title: string
  roleLevel: RoleLevelKey | null
  division: string | null
  team: string | null
  incumbentId: string | null
  isCritical: boolean
  criticalityReason: string | null
  riskComputed: SuccessionRisk | null
  riskOverride: SuccessionRisk | null
  riskNote: string | null
  notes: string | null
  status: EntityStatus
  createdAt: string
  updatedAt: string
}

export interface SuccessionCandidate {
  id: string
  roleId: string
  personId: string
  readiness: SuccessionReadiness
  priorityRank: number
  expectedReadinessDate: string | null
  commentary: string | null
  addedAt: string
  createdAt: string
  updatedAt: string
}

// Composite "view" types that join a Role/Candidate with evidence from other
// modules (scorecard, IDP, 9-box) live in app/succession/actions.ts, the
// same way PersonScorecardSummary lives in app/scorecard/actions.ts and
// PersonIdpView lives in app/idp/actions.ts — not here, to avoid this
// shared, client-importable file depending on server-action-only modules.
