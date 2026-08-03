'use server'

import { requireAllowedUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { buildScorecard, type ScorecardResult } from '@/lib/scorecard'
import type { ObjectiveWithProgress, Person, Quarter } from '@/lib/types'

function personFromRow(r: Record<string, unknown>): Person {
  return {
    id: r.id as string,
    name: r.name as string,
    email: (r.email as string) ?? null,
    roleTitle: (r.role_title as string) ?? null,
    roleLevel: (r.role_level as Person['roleLevel']) ?? null,
    team: (r.team as string) ?? null,
    managerId: (r.manager_id as string) ?? null,
    associateNo: (r.associate_no as string) ?? null,
    division: (r.division as string) ?? null,
    status: r.status as Person['status'],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

// Shared fetch: objectives (with their quarterly progress attached) for a set
// of trackers. Both the division rollup and the per-person view use this, so
// the two views can never diverge on what "this person's objectives" means.
async function objectivesForTrackers(
  db: ReturnType<typeof createServiceClient>,
  trackerIds: string[],
): Promise<ObjectiveWithProgress[]> {
  if (trackerIds.length === 0) return []

  const objectivesRes = await db.from('perf_objectives').select('*').in('tracker_id', trackerIds)
  if (objectivesRes.error) throw objectivesRes.error
  const objectiveIds = (objectivesRes.data ?? []).map((o) => o.id as string)

  const progressRes = objectiveIds.length
    ? await db.from('perf_objective_progress').select('*').in('objective_id', objectiveIds)
    : { data: [] as Record<string, unknown>[], error: null }
  if (progressRes.error) throw progressRes.error

  const progressByObjective = new Map<string, Partial<Record<Quarter, string>>>()
  for (const row of progressRes.data ?? []) {
    const map = progressByObjective.get(row.objective_id as string) ?? {}
    map[row.quarter as Quarter] = row.status as string
    progressByObjective.set(row.objective_id as string, map)
  }

  return (objectivesRes.data ?? []).map((row) => ({
    id: row.id as string,
    trackerId: row.tracker_id as string,
    section: row.section as ObjectiveWithProgress['section'],
    divisionSubObjective: (row.division_sub_objective as string) ?? null,
    objective: row.objective as string,
    dueDate: (row.due_date as string) ?? null,
    weighting: Number(row.weighting),
    measuresOfSuccess: (row.measures_of_success as string) ?? null,
    finalRating: (row.final_rating as ObjectiveWithProgress['finalRating']) ?? null,
    associateComment: (row.associate_comment as string) ?? null,
    managerComment: (row.manager_comment as string) ?? null,
    sortOrder: Number(row.sort_order),
    perspective: (row.perspective as ObjectiveWithProgress['perspective']) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    progress: (progressByObjective.get(row.id as string) ?? {}) as ObjectiveWithProgress['progress'],
  }))
}

export interface PersonScorecardSummary {
  person: Person
  scorecard: ScorecardResult
}

export interface DivisionScorecardResult {
  division: ScorecardResult
  // Per-person breakdown, so the division average never hides who's carrying
  // it and who's stalled — the main weakness of any team rollup.
  byPerson: PersonScorecardSummary[]
}

export async function getDivisionScorecard(fyStartYear: number): Promise<DivisionScorecardResult> {
  await requireAllowedUser()
  const db = createServiceClient()

  const peopleRes = await db.from('perf_people').select('*').eq('status', 'active').order('name')
  if (peopleRes.error) throw peopleRes.error
  const people = (peopleRes.data ?? []).map(personFromRow)
  if (people.length === 0) return { division: buildScorecard([]), byPerson: [] }

  const trackersRes = await db
    .from('perf_trackers')
    .select('id, person_id')
    .in(
      'person_id',
      people.map((p) => p.id),
    )
    .eq('fy_start_year', fyStartYear)
  if (trackersRes.error) throw trackersRes.error

  const trackerIdByPerson = new Map<string, string>(
    (trackersRes.data ?? []).map((t) => [t.person_id as string, t.id as string]),
  )
  const allTrackerIds = [...trackerIdByPerson.values()]

  const allObjectives = await objectivesForTrackers(db, allTrackerIds)

  // Group once, in memory, rather than re-querying per person.
  const objectivesByTracker = new Map<string, ObjectiveWithProgress[]>()
  for (const o of allObjectives) {
    const list = objectivesByTracker.get(o.trackerId) ?? []
    list.push(o)
    objectivesByTracker.set(o.trackerId, list)
  }

  const byPerson: PersonScorecardSummary[] = people.map((person) => {
    const trackerId = trackerIdByPerson.get(person.id)
    const objectives = trackerId ? objectivesByTracker.get(trackerId) ?? [] : []
    return { person, scorecard: buildScorecard(objectives) }
  })

  return { division: buildScorecard(allObjectives), byPerson }
}

export async function getPersonScorecard(
  personId: string,
  fyStartYear: number,
): Promise<PersonScorecardSummary | null> {
  await requireAllowedUser()
  const db = createServiceClient()

  const personRes = await db.from('perf_people').select('*').eq('id', personId).maybeSingle()
  if (personRes.error) throw personRes.error
  if (!personRes.data) return null
  const person = personFromRow(personRes.data)

  const trackerRes = await db
    .from('perf_trackers')
    .select('id')
    .eq('person_id', personId)
    .eq('fy_start_year', fyStartYear)
    .maybeSingle()
  if (trackerRes.error) throw trackerRes.error

  const objectives = trackerRes.data ? await objectivesForTrackers(db, [trackerRes.data.id as string]) : []
  return { person, scorecard: buildScorecard(objectives) }
}
