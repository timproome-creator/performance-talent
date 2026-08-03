import type { FinalRating, Objective, ObjectiveStatus, Quarter, Section } from '@/lib/types'

// FY runs April-March (confirmed with the user; matches Connect 2.0's own
// tracker convention where "YEAR: 2026" is labelled "FY27" = Apr 2026-Mar
// 2027). fyStartYear is always the calendar year the FY BEGINS in.
export function fyStartYearFor(date: Date): number {
  const month = date.getMonth() // 0-indexed; April = 3
  return month >= 3 ? date.getFullYear() : date.getFullYear() - 1
}

export function currentFyStartYear(): number {
  return fyStartYearFor(new Date())
}

export function fyLabel(fyStartYear: number): string {
  // FY27 = Apr 2026-Mar 2027 -> label is fyStartYear + 1
  return `FY${String(fyStartYear + 1).slice(-2)}`
}

const QUARTER_MONTHS: Record<Quarter, [number, number]> = {
  Q1: [3, 5], // Apr-Jun
  Q2: [6, 8], // Jul-Sep
  Q3: [9, 11], // Oct-Dec
  Q4: [0, 2], // Jan-Mar
}

export function currentQuarter(): Quarter {
  const month = new Date().getMonth()
  for (const [q, [start, end]] of Object.entries(QUARTER_MONTHS) as [Quarter, [number, number]][]) {
    if (month >= start && month <= end) return q
  }
  return 'Q1'
}

const QUARTER_ORDER: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

// The most recently FULLY ELAPSED quarter — one step behind currentQuarter().
// July (mid-Q2) -> Q1, since Q2 hasn't closed yet. This is deliberately
// NOT "the latest quarter with any progress data recorded" — that heuristic
// breaks the moment any objective has stray future-quarter data sitting in
// it (e.g. a leftover template artifact carrying Q4 status in July), which
// would silently score performance off data that isn't real yet. The 9-box
// in particular depends on this being right: it's specced to use "Q1's real
// delivery data" in July, not whatever quarter happens to have a value.
export function lastClosedQuarter(): Quarter | null {
  const idx = QUARTER_ORDER.indexOf(currentQuarter())
  return idx > 0 ? QUARTER_ORDER[idx - 1] : null // null in Q1 itself: nothing has closed yet this FY
}

export const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
}

export const STATUS_COLOR: Record<ObjectiveStatus, string> = {
  not_started: '#9ca3af',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  on_hold: '#6b7280',
}

export const RATING_LABEL: Record<FinalRating, string> = {
  exceeded: 'Exceeded Achievement',
  full: 'Full Achievement',
  partial: 'Partial Achievement',
  none: 'None Achievement',
}

// Each section weights to its own 100% independently (Mr Price's Use Guide:
// "Because Leadership effectiveness is as important as our KPI Delivery,
// this section has a 100% weighting as well") — not one shared pool across
// both sections. Surfaced in the UI, not enforced as a DB constraint (would
// need a cross-row trigger for what's really a soft, user-facing check).
export function weightingTotalForSection(objectives: Objective[], section: Section): number {
  return objectives
    .filter((o) => o.section === section)
    .reduce((sum, o) => sum + o.weighting, 0)
}
