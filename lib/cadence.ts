// The People year as data, not as a picture. Each moment carries a live
// completion count pulled from the tools that already own that data, so this
// screen answers "what's due, what's done, what's late" without anyone
// entering anything twice.
//
// Cadence itself is Mr Price's People team's design (see the
// mrpg-people-annual-cadence memory), not invented here. FY runs April-March,
// so fyMonth is indexed from April: Apr=0 ... Mar=11.

export interface CadenceMoment {
  key: string
  label: string
  monthLabel: string
  fyMonth: number
  /** What "done" means for this moment, shown under the count. */
  measure: string
  /** What's being counted. Quarterly moments count OBJECTIVES, not people:
   *  counting people marks someone "updated" off a single objective, which
   *  on real imported data meant the leftover Connect 2.0 engagement-row
   *  artifact (it ships with Q1-Q4 pre-filled) made every quarter look 6/6
   *  complete. Counting objectives gives an honest fraction. */
  unit: 'people' | 'objectives'
  href: string
  /** Some moments (engagement survey) happen outside this platform — we can
   *  show them on the timeline but honestly can't report status for them. */
  tracked: boolean
}

export const CADENCE_MOMENTS: CadenceMoment[] = [
  {
    key: 'wlea',
    label: 'Leadership Assessment',
    monthLabel: 'April',
    fyMonth: 0,
    measure: 'assessed',
    unit: 'people',
    href: '/leadership',
    tracked: true,
  },
  {
    key: 'kpis_set',
    label: 'KPIs Set',
    monthLabel: 'April',
    fyMonth: 0,
    measure: 'have objectives',
    unit: 'people',
    href: '/trackers',
    tracked: true,
  },
  {
    key: 'q1',
    label: 'Q1 Close',
    monthLabel: 'June',
    fyMonth: 2,
    measure: 'updated',
    unit: 'objectives',
    href: '/trackers',
    tracked: true,
  },
  {
    key: 'ninebox',
    label: '9-Box',
    monthLabel: 'July',
    fyMonth: 3,
    measure: 'positioned',
    unit: 'people',
    href: '/ninebox',
    tracked: true,
  },
  {
    key: 'q2',
    label: 'Q2 Close + Connect Conversation',
    monthLabel: 'September',
    fyMonth: 5,
    measure: 'updated',
    unit: 'objectives',
    href: '/trackers',
    tracked: true,
  },
  {
    key: 'q3',
    label: 'Q3 Close',
    monthLabel: 'December',
    fyMonth: 8,
    measure: 'updated',
    unit: 'objectives',
    href: '/trackers',
    tracked: true,
  },
  {
    key: 'fy_close',
    label: 'FY Close + Final Rating',
    monthLabel: 'March',
    fyMonth: 11,
    measure: 'rated',
    unit: 'objectives',
    href: '/trackers',
    tracked: true,
  },
]

export type MomentState = 'done' | 'due_now' | 'overdue' | 'upcoming'

export interface MomentStatus extends CadenceMoment {
  completed: number
  total: number
  state: MomentState
}

// Calendar month (0-indexed) -> FY month index, April-based.
export function fyMonthIndex(date = new Date()): number {
  const m = date.getMonth()
  return m >= 3 ? m - 3 : m + 9
}

export function stateFor(moment: CadenceMoment, completed: number, total: number, nowFyMonth: number): MomentState {
  const complete = total > 0 && completed >= total
  if (moment.fyMonth > nowFyMonth) return 'upcoming'
  if (complete) return 'done'
  // Its month is here or gone and it isn't finished. "due_now" while we're
  // still in the month, "overdue" once it's passed — the distinction matters
  // because one is a prompt and the other is a miss.
  return moment.fyMonth === nowFyMonth ? 'due_now' : 'overdue'
}

export const STATE_LABEL: Record<MomentState, string> = {
  done: 'Done',
  due_now: 'Due now',
  overdue: 'Overdue',
  upcoming: 'Upcoming',
}

// Semantic, not brand — same rule as the RAG colours: these mean the same
// thing regardless of which brand is rendering.
export const STATE_COLOR: Record<MomentState, { text: string; bg: string; border: string; bar: string }> = {
  done: { text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', bar: '#22c55e' },
  due_now: { text: '#b45309', bg: '#fffbeb', border: '#fde68a', bar: '#f59e0b' },
  overdue: { text: '#b91c1c', bg: '#fef2f2', border: '#fecaca', bar: '#ef4444' },
  upcoming: { text: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', bar: '#d1d5db' },
}

export interface CadenceSummary {
  moments: MomentStatus[]
  overdueCount: number
  dueNowCount: number
  currentMomentKey: string | null
}

export function summarise(moments: MomentStatus[], nowFyMonth: number): CadenceSummary {
  const current = moments.find((m) => m.fyMonth === nowFyMonth) ?? null
  return {
    moments,
    overdueCount: moments.filter((m) => m.state === 'overdue').length,
    dueNowCount: moments.filter((m) => m.state === 'due_now').length,
    currentMomentKey: current?.key ?? null,
  }
}
