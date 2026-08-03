import type { ObjectiveWithProgress, Quarter } from '@/lib/types'
import { lastClosedQuarter } from '@/lib/kpi'

// Both axes are scored on the SAME 1-5 scale WLEA already uses (3 = meets
// the bar) — one intuitive story instead of two different scales bolted
// together. Potential comes verbatim from WLEA's overall_manager. Performance
// is derived here from Connect 2.0 objective progress, since Connect 2.0 has
// no single "how am I doing" number of its own.

// Maps a quarterly status to a 0..1 completion score. This is a judgement
// call, not a fact read off any spreadsheet — flagged to the user, not
// silently assumed. on_hold scores low but non-zero: something is blocked,
// not abandoned.
const STATUS_SCORE: Record<string, number> = {
  completed: 1,
  in_progress: 0.6,
  on_hold: 0.3,
  not_started: 0,
}

export interface PerformanceScoreResult {
  score: number | null // 1..5, or null if there's nothing to score yet
  quarter: Quarter | null // which quarter this reflects
  objectivesScored: number
  objectivesTotal: number
}

// Scores against the most recently CLOSED quarter — see lastClosedQuarter()
// in lib/kpi.ts for why this deliberately isn't "whatever quarter has the
// most recent data": that heuristic was tried and broke on real imported
// data, where every person's Connect 2.0 tracker carries a leftover
// template artifact with Q4 status already filled in, mid-Q2. Scoring off
// "latest with any data" would have pulled that stale Q4 value for
// everyone and shown a false, identical, maxed-out performance score
// across the whole team.
export function computePerformanceScore(objectives: ObjectiveWithProgress[]): PerformanceScoreResult {
  const active = objectives // both sections combined — the 9-box asks "how is this person doing overall", not per-section
  const quarter = lastClosedQuarter()
  if (!quarter) {
    return { score: null, quarter: null, objectivesScored: 0, objectivesTotal: active.length }
  }

  let weightedSum = 0
  let weightTotal = 0
  let scored = 0
  for (const o of active) {
    const status = o.progress[quarter]
    if (!status) continue // no update yet this quarter — excluded, not scored as 0
    weightedSum += STATUS_SCORE[status] * o.weighting
    weightTotal += o.weighting
    scored++
  }

  if (weightTotal === 0) {
    return { score: null, quarter, objectivesScored: 0, objectivesTotal: active.length }
  }

  const fraction = weightedSum / weightTotal // 0..1
  const score = 1 + fraction * 4 // map onto the same 1-5 scale as WLEA
  return { score, quarter, objectivesScored: scored, objectivesTotal: active.length }
}

export type NineBoxBand = 'low' | 'medium' | 'high'

// Same 3 as WLEA's "meets expectation" — a tight band either side of it,
// wide bands beyond. Keeps "meets the bar on both axes" landing in the
// center cell, which is the story people expect a 9-box to tell.
export function bandFor(score: number): NineBoxBand {
  if (score < 2.5) return 'low'
  if (score <= 3.5) return 'medium'
  return 'high'
}

export const NINEBOX_LABEL: Record<NineBoxBand, Record<NineBoxBand, string>> = {
  high: {
    low: 'Enigma',
    medium: 'High Potential',
    high: 'Future Leader',
  },
  medium: {
    low: 'Inconsistent',
    medium: 'Core Player',
    high: 'High Performer',
  },
  low: {
    low: 'Risk',
    medium: 'Effective',
    high: 'Trusted Professional',
  },
}
