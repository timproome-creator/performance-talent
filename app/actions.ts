'use server'

import { requireAllowedUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { personSchema, objectiveSchema, objectiveProgressSchema, trackerCommentsSchema } from '@/lib/schema'
import type { Person, Tracker, Objective, ObjectiveProgress, ObjectiveWithProgress, TrackerView, Quarter } from '@/lib/types'

// perf_people / perf_trackers / perf_objectives / perf_objective_progress all
// have RLS enabled with NO client policies (see supabase/schema.sql) — the
// browser never queries them directly. Every function here gates on
// requireAllowedUser() (signed in AND on the ALLOWED_EMAILS allowlist — see
// lib/auth.ts), then does the actual read/write with the service-role
// client, which bypasses RLS.
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

function trackerFromRow(r: Record<string, unknown>): Tracker {
  return {
    id: r.id as string,
    personId: r.person_id as string,
    fyStartYear: Number(r.fy_start_year),
    associateComment: (r.associate_comment as string) ?? null,
    managerComment: (r.manager_comment as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function objectiveFromRow(r: Record<string, unknown>): Objective {
  return {
    id: r.id as string,
    trackerId: r.tracker_id as string,
    section: r.section as Objective['section'],
    divisionSubObjective: (r.division_sub_objective as string) ?? null,
    objective: r.objective as string,
    dueDate: (r.due_date as string) ?? null,
    weighting: Number(r.weighting),
    measuresOfSuccess: (r.measures_of_success as string) ?? null,
    finalRating: (r.final_rating as Objective['finalRating']) ?? null,
    associateComment: (r.associate_comment as string) ?? null,
    managerComment: (r.manager_comment as string) ?? null,
    sortOrder: Number(r.sort_order),
    perspective: (r.perspective as Objective['perspective']) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function progressFromRow(r: Record<string, unknown>): ObjectiveProgress {
  return {
    id: r.id as string,
    objectiveId: r.objective_id as string,
    quarter: r.quarter as Quarter,
    status: r.status as ObjectiveProgress['status'],
    updatedAt: r.updated_at as string,
  }
}

// ── People ──────────────────────────────────────────────────────

export async function listPeople(): Promise<Person[]> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_people')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(personFromRow)
}

export async function createPerson(input: unknown): Promise<Person> {
  await requireAllowedUser()
  const parsed = personSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_people')
    .insert({
      name: parsed.name,
      email: parsed.email,
      role_title: parsed.roleTitle,
      role_level: parsed.roleLevel,
      team: parsed.team,
      manager_id: parsed.managerId,
      associate_no: parsed.associateNo,
      division: parsed.division,
    })
    .select('*')
    .single()
  if (error) throw error
  return personFromRow(data)
}

export async function updatePerson(id: string, input: unknown): Promise<Person> {
  await requireAllowedUser()
  const parsed = personSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_people')
    .update({
      name: parsed.name,
      email: parsed.email,
      role_title: parsed.roleTitle,
      role_level: parsed.roleLevel,
      team: parsed.team,
      manager_id: parsed.managerId,
      associate_no: parsed.associateNo,
      division: parsed.division,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return personFromRow(data)
}

export async function archivePerson(id: string): Promise<void> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { error } = await db
    .from('perf_people')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Trackers (one per person per FY) ────────────────────────────

// Connect 2.0 is per-person, per-FY — there's no separate "create a
// tracker" step in the spreadsheet, a person just has one. Auto-create on
// first access rather than requiring an explicit setup flow.
async function getOrCreateTracker(personId: string, fyStartYear: number): Promise<Tracker> {
  const db = createServiceClient()
  const existing = await db
    .from('perf_trackers')
    .select('*')
    .eq('person_id', personId)
    .eq('fy_start_year', fyStartYear)
    .maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return trackerFromRow(existing.data)

  const created = await db
    .from('perf_trackers')
    .insert({ person_id: personId, fy_start_year: fyStartYear })
    .select('*')
    .single()
  if (created.error) throw created.error
  return trackerFromRow(created.data)
}

export async function getTrackerView(personId: string, fyStartYear: number): Promise<TrackerView> {
  await requireAllowedUser()
  const tracker = await getOrCreateTracker(personId, fyStartYear)
  const db = createServiceClient()

  const objectivesRes = await db
    .from('perf_objectives')
    .select('*')
    .eq('tracker_id', tracker.id)
    .order('sort_order', { ascending: true })
  if (objectivesRes.error) throw objectivesRes.error

  const objectiveIds = (objectivesRes.data ?? []).map((o) => o.id as string)
  const progressRes = objectiveIds.length
    ? await db.from('perf_objective_progress').select('*').in('objective_id', objectiveIds)
    : { data: [] as Record<string, unknown>[], error: null }
  if (progressRes.error) throw progressRes.error

  const progressByObjective = new Map<string, Partial<Record<Quarter, ObjectiveProgress['status']>>>()
  for (const row of progressRes.data ?? []) {
    const p = progressFromRow(row)
    const map = progressByObjective.get(p.objectiveId) ?? {}
    map[p.quarter] = p.status
    progressByObjective.set(p.objectiveId, map)
  }

  const objectives: ObjectiveWithProgress[] = (objectivesRes.data ?? []).map((row) => {
    const o = objectiveFromRow(row)
    return { ...o, progress: progressByObjective.get(o.id) ?? {} }
  })

  return { tracker, objectives }
}

export async function updateTrackerComments(trackerId: string, input: unknown): Promise<Tracker> {
  await requireAllowedUser()
  const parsed = trackerCommentsSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_trackers')
    .update({
      associate_comment: parsed.associateComment,
      manager_comment: parsed.managerComment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackerId)
    .select('*')
    .single()
  if (error) throw error
  return trackerFromRow(data)
}

// ── Objectives ───────────────────────────────────────────────────

export async function createObjective(input: unknown): Promise<Objective> {
  await requireAllowedUser()
  const parsed = objectiveSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_objectives')
    .insert({
      tracker_id: parsed.trackerId,
      section: parsed.section,
      division_sub_objective: parsed.divisionSubObjective,
      objective: parsed.objective,
      due_date: parsed.dueDate,
      weighting: parsed.weighting,
      measures_of_success: parsed.measuresOfSuccess,
      final_rating: parsed.finalRating,
      associate_comment: parsed.associateComment,
      manager_comment: parsed.managerComment,
      perspective: parsed.perspective,
    })
    .select('*')
    .single()
  if (error) throw error
  return objectiveFromRow(data)
}

export async function updateObjective(id: string, input: unknown): Promise<Objective> {
  await requireAllowedUser()
  const parsed = objectiveSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_objectives')
    .update({
      section: parsed.section,
      division_sub_objective: parsed.divisionSubObjective,
      objective: parsed.objective,
      due_date: parsed.dueDate,
      weighting: parsed.weighting,
      measures_of_success: parsed.measuresOfSuccess,
      final_rating: parsed.finalRating,
      associate_comment: parsed.associateComment,
      manager_comment: parsed.managerComment,
      perspective: parsed.perspective,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return objectiveFromRow(data)
}

export async function deleteObjective(id: string): Promise<void> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { error } = await db.from('perf_objectives').delete().eq('id', id)
  if (error) throw error
}

export async function upsertObjectiveProgress(input: unknown): Promise<ObjectiveProgress> {
  await requireAllowedUser()
  const parsed = objectiveProgressSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_objective_progress')
    .upsert(
      { objective_id: parsed.objectiveId, quarter: parsed.quarter, status: parsed.status, updated_at: new Date().toISOString() },
      { onConflict: 'objective_id,quarter' },
    )
    .select('*')
    .single()
  if (error) throw error
  return progressFromRow(data)
}
