'use server'

import { requireAllowedUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import {
  CADENCE_MOMENTS,
  fyMonthIndex,
  stateFor,
  summarise,
  type CadenceSummary,
  type MomentStatus,
} from '@/lib/cadence'
import type { Quarter } from '@/lib/types'

// Counts, per cadence moment, how many of the active people are "done".
// Everything here is READ-ONLY and derived — this screen owns no data of its
// own, it just reports on what the four tools already hold.
export async function getCadenceStatus(fyStartYear: number): Promise<CadenceSummary> {
  await requireAllowedUser()
  const db = createServiceClient()

  const peopleRes = await db.from('perf_people').select('id, name').eq('status', 'active')
  if (peopleRes.error) throw peopleRes.error
  const people = peopleRes.data ?? []
  const total = people.length
  const personIds = people.map((p) => p.id as string)

  if (total === 0) {
    const nowFyMonth = fyMonthIndex()
    return summarise(
      CADENCE_MOMENTS.map((m) => ({ ...m, completed: 0, total: 0, state: stateFor(m, 0, 0, nowFyMonth) })),
      nowFyMonth,
    )
  }

  // ── Assessments (cross-app, matched by name — same as the 9-box) ──
  const assessmentsRes = await db
    .from('wlea_assessments')
    .select('subject_name')
    .eq('status', 'complete')
  if (assessmentsRes.error) throw assessmentsRes.error
  const assessedNames = new Set(
    (assessmentsRes.data ?? []).map((a) => String(a.subject_name ?? '').trim().toLowerCase()),
  )
  const assessedCount = people.filter((p) => assessedNames.has(String(p.name).trim().toLowerCase())).length

  // ── Trackers + objectives for this FY ──
  const trackersRes = await db
    .from('perf_trackers')
    .select('id, person_id')
    .in('person_id', personIds)
    .eq('fy_start_year', fyStartYear)
  if (trackersRes.error) throw trackersRes.error
  const personByTracker = new Map<string, string>(
    (trackersRes.data ?? []).map((t) => [t.id as string, t.person_id as string]),
  )
  const trackerIds = [...personByTracker.keys()]

  const objectivesRes = trackerIds.length
    ? await db.from('perf_objectives').select('id, tracker_id, final_rating').in('tracker_id', trackerIds)
    : { data: [] as Record<string, unknown>[], error: null }
  if (objectivesRes.error) throw objectivesRes.error
  const objectives = objectivesRes.data ?? []

  const peopleWithObjectives = new Set(
    objectives.map((o) => personByTracker.get(o.tracker_id as string)).filter(Boolean) as string[],
  )
  const objectivesWithFinalRating = objectives.filter((o) => o.final_rating).length

  // ── Quarterly progress ──
  const objectiveIds = objectives.map((o) => o.id as string)

  const progressRes = objectiveIds.length
    ? await db.from('perf_objective_progress').select('objective_id, quarter').in('objective_id', objectiveIds)
    : { data: [] as Record<string, unknown>[], error: null }
  if (progressRes.error) throw progressRes.error

  // Counted per OBJECTIVE, not per person — see the `unit` note in
  // lib/cadence.ts for why person-level counting produced a false 6/6.
  const objectivesByQuarter: Record<Quarter, Set<string>> = { Q1: new Set(), Q2: new Set(), Q3: new Set(), Q4: new Set() }
  for (const row of progressRes.data ?? []) {
    objectivesByQuarter[row.quarter as Quarter].add(row.objective_id as string)
  }

  // ── 9-box positions (plottable = both axes resolved) ──
  const positionsRes = await db
    .from('perf_ninebox_positions')
    .select('person_id, potential_computed, performance_computed, potential_override, performance_override')
    .eq('fy_start_year', fyStartYear)
  if (positionsRes.error) throw positionsRes.error
  const positionedCount = (positionsRes.data ?? []).filter((r) => {
    const pot = r.potential_override ?? r.potential_computed
    const perf = r.performance_override ?? r.performance_computed
    return pot !== null && perf !== null
  }).length

  const objectiveTotal = objectives.length
  const completedBy: Record<string, number> = {
    wlea: assessedCount,
    kpis_set: peopleWithObjectives.size,
    q1: objectivesByQuarter.Q1.size,
    ninebox: positionedCount,
    q2: objectivesByQuarter.Q2.size,
    q3: objectivesByQuarter.Q3.size,
    fy_close: objectivesWithFinalRating,
  }

  const nowFyMonth = fyMonthIndex()
  const moments: MomentStatus[] = CADENCE_MOMENTS.map((m) => {
    const momentTotal = m.unit === 'objectives' ? objectiveTotal : total
    const completed = completedBy[m.key] ?? 0
    return { ...m, completed, total: momentTotal, state: stateFor(m, completed, momentTotal, nowFyMonth) }
  })

  return summarise(moments, nowFyMonth)
}
