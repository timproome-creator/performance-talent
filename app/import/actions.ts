'use server'

import { requireAllowedUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { parseConnect2Workbook, type ParsedPerson } from '@/lib/importConnect2'

export interface ImportPersonSummary {
  name: string
  action: 'created' | 'matched'
  managerResolved: string | null
  managerUnresolved: string | null
  objectivesImported: number
  objectivesSkipped: boolean // tracker already had objectives - left untouched
  warnings: string[]
}

export interface ImportSummary {
  people: ImportPersonSummary[]
  sheetsSkipped: string[] // e.g. year unparseable
}

export async function importConnect2Workbook(formData: FormData): Promise<ImportSummary> {
  await requireAllowedUser()
  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('No file uploaded')

  const buffer = await file.arrayBuffer()
  const parsed = parseConnect2Workbook(buffer)

  const db = createServiceClient()

  // Load existing people once; this map is extended in-memory as new people
  // are created below, so manager-name resolution works regardless of
  // whether a manager's own tab appears before or after their reports' tabs
  // in the workbook.
  const existingRes = await db.from('perf_people').select('*')
  if (existingRes.error) throw existingRes.error
  const byNameLower = new Map<string, Record<string, unknown>>(
    (existingRes.data ?? []).map((p) => [String(p.name).trim().toLowerCase(), p]),
  )

  const sheetsSkipped: string[] = []
  const validPeople: ParsedPerson[] = []
  for (const p of parsed) {
    if (p.fyStartYear === 0) {
      sheetsSkipped.push(`${p.sheetName}: ${p.warnings[0] ?? 'unparseable financial year'}`)
      continue
    }
    validPeople.push(p)
  }

  // Pass 1: create or fill-in-gaps for every person from the workbook.
  const summaries: ImportPersonSummary[] = []
  for (const p of validPeople) {
    const key = p.name.trim().toLowerCase()
    const existing = byNameLower.get(key)

    if (existing) {
      const patch: Record<string, unknown> = {}
      if (!existing.associate_no && p.associateNo) patch.associate_no = p.associateNo
      if (!existing.division && p.division) patch.division = p.division
      if (!existing.role_title && p.roleTitle) patch.role_title = p.roleTitle
      if (!existing.team && p.team) patch.team = p.team
      if (Object.keys(patch).length > 0) {
        patch.updated_at = new Date().toISOString()
        const { data, error } = await db.from('perf_people').update(patch).eq('id', existing.id).select('*').single()
        if (error) throw error
        byNameLower.set(key, data)
      }
      summaries.push({
        name: p.name, action: 'matched', managerResolved: null, managerUnresolved: null,
        objectivesImported: 0, objectivesSkipped: false, warnings: [...p.warnings],
      })
    } else {
      const { data, error } = await db
        .from('perf_people')
        .insert({
          name: p.name,
          role_title: p.roleTitle,
          team: p.team,
          associate_no: p.associateNo,
          division: p.division,
        })
        .select('*')
        .single()
      if (error) throw error
      byNameLower.set(key, data)
      summaries.push({
        name: p.name, action: 'created', managerResolved: null, managerUnresolved: null,
        objectivesImported: 0, objectivesSkipped: false, warnings: [...p.warnings],
      })
    }
  }

  // Pass 2: resolve manager_id now that every person in this workbook exists.
  for (let i = 0; i < validPeople.length; i++) {
    const p = validPeople[i]
    const summary = summaries[i]
    if (!p.managerName) continue
    const managerRow = byNameLower.get(p.managerName.trim().toLowerCase())
    const personRow = byNameLower.get(p.name.trim().toLowerCase())
    if (!managerRow || !personRow) {
      summary.managerUnresolved = p.managerName
      continue
    }
    if (managerRow.id === personRow.id) continue // don't self-reference
    if (personRow.manager_id !== managerRow.id) {
      const { data, error } = await db
        .from('perf_people')
        .update({ manager_id: managerRow.id, updated_at: new Date().toISOString() })
        .eq('id', personRow.id)
        .select('*')
        .single()
      if (error) throw error
      byNameLower.set(p.name.trim().toLowerCase(), data)
    }
    summary.managerResolved = p.managerName
  }

  // Pass 3: trackers + objectives. Only into empty trackers - re-importing
  // the same workbook twice must not duplicate objectives.
  for (let i = 0; i < validPeople.length; i++) {
    const p = validPeople[i]
    const summary = summaries[i]
    const personRow = byNameLower.get(p.name.trim().toLowerCase())
    if (!personRow) continue

    const trackerRes = await db
      .from('perf_trackers')
      .select('*')
      .eq('person_id', personRow.id)
      .eq('fy_start_year', p.fyStartYear)
      .maybeSingle()
    if (trackerRes.error) throw trackerRes.error

    let trackerId = trackerRes.data?.id as string | undefined
    if (!trackerId) {
      const created = await db
        .from('perf_trackers')
        .insert({ person_id: personRow.id, fy_start_year: p.fyStartYear })
        .select('*')
        .single()
      if (created.error) throw created.error
      trackerId = created.data.id
    } else {
      const countRes = await db
        .from('perf_objectives')
        .select('id', { count: 'exact', head: true })
        .eq('tracker_id', trackerId)
      if (countRes.error) throw countRes.error
      if ((countRes.count ?? 0) > 0) {
        summary.objectivesSkipped = true
        continue
      }
    }

    let imported = 0
    for (const obj of p.objectives) {
      const { data: objRow, error: objError } = await db
        .from('perf_objectives')
        .insert({
          tracker_id: trackerId,
          section: obj.section,
          division_sub_objective: obj.divisionSubObjective,
          objective: obj.objective,
          due_date: obj.dueDate,
          weighting: obj.weighting,
          measures_of_success: obj.measuresOfSuccess,
          final_rating: obj.finalRating,
          associate_comment: obj.associateComment,
          manager_comment: obj.managerComment,
        })
        .select('*')
        .single()
      if (objError) throw objError
      imported++

      const progressEntries = Object.entries(obj.progress) as [string, string][]
      for (const [quarter, status] of progressEntries) {
        const { error: progError } = await db
          .from('perf_objective_progress')
          .insert({ objective_id: objRow.id, quarter, status })
        if (progError) throw progError
      }
    }
    summary.objectivesImported = imported
  }

  return { people: summaries, sheetsSkipped }
}
