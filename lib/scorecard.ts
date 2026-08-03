import type { ObjectiveWithProgress, Perspective } from '@/lib/types'
import { PERSPECTIVES } from '@/lib/types'
import { lastClosedQuarter } from '@/lib/kpi'

// Division Balanced Scorecard — a LENS over Connect 2.0 data, not a second
// place to enter numbers. The four perspectives are just a tag on objectives
// that already exist; this module aggregates across every person's current-FY
// objectives, grouped by that tag. Same completion semantics as the 9-box's
// Performance axis (lib/ninebox.ts) deliberately reused here, not
// reinvented, so "how completed is this objective" means one thing across
// the whole platform: same STATUS_SCORE weights, same lastClosedQuarter()
// rule (never "whatever quarter has the most recent data" — see
// lib/ninebox.ts for why that broke on real imported data).
const STATUS_SCORE: Record<string, number> = {
  completed: 1,
  in_progress: 0.6,
  on_hold: 0.3,
  not_started: 0,
}

export type Rag = 'green' | 'amber' | 'red'

export function ragFor(score: number): Rag {
  if (score >= 3.5) return 'green'
  if (score >= 2.5) return 'amber'
  return 'red'
}

export const RAG_LABEL: Record<Rag, string> = {
  green: 'On track',
  amber: 'At risk',
  red: 'Off track',
}

export const RAG_COLOR: Record<Rag, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
}

export interface PerspectiveRollup {
  perspective: Perspective
  label: string
  score: number | null // 1..5, same scale as everywhere else in the platform
  rag: Rag | null
  objectivesScored: number
  objectivesTagged: number
  quarter: string | null
}

export interface ScorecardResult {
  perspectives: PerspectiveRollup[]
  untaggedCount: number // objectives with no perspective — surfaced, not hidden
  totalObjectives: number
  // Weighted across ALL scored objectives regardless of perspective. Note
  // this is NOT the average of the four perspective scores — perspectives
  // hold different numbers of objectives, so averaging the averages would
  // silently over-weight a perspective that only has one objective in it.
  overall: number | null
  overallRag: Rag | null
}

// Shared weighted-completion maths — one implementation, used for both the
// per-perspective rollups and the overall figure, so they can't drift.
function weightedScore(objectives: ObjectiveWithProgress[], quarter: string): { score: number | null; scored: number } {
  let weightedSum = 0
  let weightTotal = 0
  let scored = 0
  for (const o of objectives) {
    const status = o.progress[quarter as keyof typeof o.progress]
    if (!status) continue
    weightedSum += STATUS_SCORE[status] * o.weighting
    weightTotal += o.weighting
    scored++
  }
  if (weightTotal === 0) return { score: null, scored: 0 }
  return { score: 1 + (weightedSum / weightTotal) * 4, scored }
}

// entries: every objective from every person's current-FY tracker, flat —
// caller (app/scorecard/actions.ts) is responsible for gathering that across
// the whole division; this module only aggregates, it doesn't fetch.
export function buildScorecard(entries: ObjectiveWithProgress[]): ScorecardResult {
  const quarter = lastClosedQuarter()
  const untaggedCount = entries.filter((o) => !o.perspective).length

  const perspectives: PerspectiveRollup[] = PERSPECTIVES.map(({ key, label }) => {
    const tagged = entries.filter((o) => o.perspective === key)
    if (!quarter || tagged.length === 0) {
      return { perspective: key, label, score: null, rag: null, objectivesScored: 0, objectivesTagged: tagged.length, quarter }
    }

    const { score, scored } = weightedScore(tagged, quarter)
    return {
      perspective: key,
      label,
      score,
      rag: score === null ? null : ragFor(score),
      objectivesScored: scored,
      objectivesTagged: tagged.length,
      quarter,
    }
  })

  const overallResult = quarter ? weightedScore(entries.filter((o) => o.perspective), quarter) : { score: null, scored: 0 }

  return {
    perspectives,
    untaggedCount,
    totalObjectives: entries.length,
    overall: overallResult.score,
    overallRag: overallResult.score === null ? null : ragFor(overallResult.score),
  }
}
