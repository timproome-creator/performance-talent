'use server'

import { requireAllowedUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { computePerformanceScore } from '@/lib/ninebox'
import type { NineBoxEntry, NineBoxPosition, ObjectiveWithProgress, Person, Quarter } from '@/lib/types'

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

function positionFromRow(r: Record<string, unknown>): NineBoxPosition {
  return {
    id: r.id as string,
    personId: r.person_id as string,
    fyStartYear: Number(r.fy_start_year),
    potentialComputed: r.potential_computed === null ? null : Number(r.potential_computed),
    performanceComputed: r.performance_computed === null ? null : Number(r.performance_computed),
    potentialOverride: r.potential_override === null ? null : Number(r.potential_override),
    performanceOverride: r.performance_override === null ? null : Number(r.performance_override),
    notes: (r.notes as string) ?? null,
    positionedAt: (r.positioned_at as string) ?? null,
    updatedAt: r.updated_at as string,
  }
}

// Cross-database read: WLEA's tables live in the SAME Supabase project as of
// the go-live migration, so this is a direct query, not a cross-app API
// call. Matched by name — the two apps don't share a person table, same
// approach the Connect 2.0 importer already uses for resolving managers.
async function latestPotential(
  db: ReturnType<typeof createServiceClient>,
  personName: string,
): Promise<{ score: number | null; assessmentDate: string | null }> {
  const { data, error } = await db
    .from('wlea_assessments')
    .select('overall_manager, completed_at')
    .ilike('subject_name', personName.trim())
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return { score: null, assessmentDate: null }
  return {
    score: data.overall_manager === null ? null : Number(data.overall_manager),
    assessmentDate: data.completed_at as string,
  }
}

async function objectivesFor(
  db: ReturnType<typeof createServiceClient>,
  personId: string,
  fyStartYear: number,
): Promise<ObjectiveWithProgress[]> {
  const trackerRes = await db
    .from('perf_trackers')
    .select('id')
    .eq('person_id', personId)
    .eq('fy_start_year', fyStartYear)
    .maybeSingle()
  if (trackerRes.error) throw trackerRes.error
  if (!trackerRes.data) return []

  const objectivesRes = await db.from('perf_objectives').select('*').eq('tracker_id', trackerRes.data.id)
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

export async function getNineBoxGrid(fyStartYear: number): Promise<NineBoxEntry[]> {
  await requireAllowedUser()
  const db = createServiceClient()

  const peopleRes = await db.from('perf_people').select('*').eq('status', 'active').order('name')
  if (peopleRes.error) throw peopleRes.error
  const people = (peopleRes.data ?? []).map(personFromRow)

  const positionsRes = await db.from('perf_ninebox_positions').select('*').eq('fy_start_year', fyStartYear)
  if (positionsRes.error) throw positionsRes.error
  const positionByPerson = new Map<string, Record<string, unknown>>(
    (positionsRes.data ?? []).map((r) => [r.person_id as string, r]),
  )

  const entries: NineBoxEntry[] = []
  for (const person of people) {
    const [potentialResult, objectives] = await Promise.all([
      latestPotential(db, person.name),
      objectivesFor(db, person.id, fyStartYear),
    ])
    const performanceResult = computePerformanceScore(objectives)

    const existingRow = positionByPerson.get(person.id)
    // Cache the freshly computed values so the position row always reflects
    // the latest WLEA/tracker data, without clobbering a manager's override.
    const { data: savedRow, error: saveError } = await db
      .from('perf_ninebox_positions')
      .upsert(
        {
          person_id: person.id,
          fy_start_year: fyStartYear,
          potential_computed: potentialResult.score,
          performance_computed: performanceResult.score,
          potential_override: existingRow?.potential_override ?? null,
          performance_override: existingRow?.performance_override ?? null,
          notes: existingRow?.notes ?? null,
          positioned_at: existingRow?.positioned_at ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'person_id,fy_start_year' },
      )
      .select('*')
      .single()
    if (saveError) throw saveError

    const position = positionFromRow(savedRow)
    const potential = position.potentialOverride ?? position.potentialComputed
    const performance = position.performanceOverride ?? position.performanceComputed

    entries.push({
      person,
      position,
      potential,
      performance,
      potentialSource: position.potentialOverride !== null ? 'override' : potential !== null ? 'computed' : 'none',
      performanceSource:
        position.performanceOverride !== null ? 'override' : performance !== null ? 'computed' : 'none',
      assessmentDate: potentialResult.assessmentDate,
      performanceQuarter: performanceResult.quarter,
    })
  }

  return entries
}

// Plain read of the already-cached position row — no recompute. The 9-box
// page itself owns freshness (getNineBoxGrid recomputes on every load);
// callers elsewhere (e.g. Succession's evidence panel) just want "what does
// the 9-box currently say", not to trigger a recompute as a side effect of
// opening an unrelated page.
export async function getPersonNineBoxPosition(
  personId: string,
  fyStartYear: number,
): Promise<NineBoxPosition | null> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_ninebox_positions')
    .select('*')
    .eq('person_id', personId)
    .eq('fy_start_year', fyStartYear)
    .maybeSingle()
  if (error) throw error
  return data ? positionFromRow(data) : null
}

export async function upsertNineBoxOverride(input: {
  personId: string
  fyStartYear: number
  potentialOverride: number | null
  performanceOverride: number | null
  notes: string | null
}): Promise<NineBoxPosition> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_ninebox_positions')
    .update({
      potential_override: input.potentialOverride,
      performance_override: input.performanceOverride,
      notes: input.notes,
      positioned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('person_id', input.personId)
    .eq('fy_start_year', input.fyStartYear)
    .select('*')
    .single()
  if (error) throw error
  return positionFromRow(data)
}
