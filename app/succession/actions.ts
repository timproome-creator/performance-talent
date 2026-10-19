'use server'

import { requireAllowedUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { currentFyStartYear } from '@/lib/kpi'
import { roleSchema, successionCandidateSchema, riskOverrideSchema } from '@/lib/schema'
import { computeRoleRisk, computeOverviewStats, type OverviewStats } from '@/lib/succession'
import { getPersonScorecard, type PersonScorecardSummary } from '@/app/scorecard/actions'
import { getPersonIdp } from '@/app/idp/actions'
import { getPersonNineBoxPosition } from '@/app/ninebox/actions'
import type { PlanView } from '@/lib/idp'
import type {
  NineBoxPosition,
  Person,
  Role,
  SuccessionCandidate,
  SuccessionReadiness,
  SuccessionRisk,
} from '@/lib/types'

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

function roleFromRow(r: Record<string, unknown>): Role {
  return {
    id: r.id as string,
    title: r.title as string,
    roleLevel: (r.role_level as Role['roleLevel']) ?? null,
    division: (r.division as string) ?? null,
    team: (r.team as string) ?? null,
    incumbentId: (r.incumbent_id as string) ?? null,
    isCritical: r.is_critical as boolean,
    criticalityReason: (r.criticality_reason as string) ?? null,
    riskComputed: (r.risk_computed as SuccessionRisk) ?? null,
    riskOverride: (r.risk_override as SuccessionRisk) ?? null,
    riskNote: (r.risk_note as string) ?? null,
    notes: (r.notes as string) ?? null,
    status: r.status as Role['status'],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function candidateFromRow(r: Record<string, unknown>): SuccessionCandidate {
  return {
    id: r.id as string,
    roleId: r.role_id as string,
    personId: r.person_id as string,
    readiness: r.readiness as SuccessionReadiness,
    priorityRank: Number(r.priority_rank),
    expectedReadinessDate: (r.expected_readiness_date as string) ?? null,
    commentary: (r.commentary as string) ?? null,
    addedAt: r.added_at as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

// Recomputes and persists risk_computed for one role, never touching
// risk_override. Candidates whose person has been archived are excluded
// from the "viable" set — an archived successor isn't actually available,
// so counting them would understate real risk. Called after every
// candidate add/update/remove, and from vacateRolesForPerson.
async function recomputeRoleRisk(db: ReturnType<typeof createServiceClient>, roleId: string): Promise<void> {
  const candidatesRes = await db
    .from('perf_succession_candidates')
    .select('readiness, person_id')
    .eq('role_id', roleId)
  if (candidatesRes.error) throw candidatesRes.error
  const rows = candidatesRes.data ?? []

  const personIds = rows.map((r) => r.person_id as string)
  const statusByPerson = new Map<string, string>()
  if (personIds.length > 0) {
    const peopleRes = await db.from('perf_people').select('id, status').in('id', personIds)
    if (peopleRes.error) throw peopleRes.error
    for (const p of peopleRes.data ?? []) statusByPerson.set(p.id as string, p.status as string)
  }

  const viableReadiness = rows
    .filter((r) => statusByPerson.get(r.person_id as string) === 'active')
    .map((r) => r.readiness as SuccessionReadiness)

  const { error } = await db
    .from('perf_roles')
    .update({ risk_computed: computeRoleRisk(viableReadiness), updated_at: new Date().toISOString() })
    .eq('id', roleId)
  if (error) throw error
}

interface AssessmentMatch {
  row: Record<string, unknown> | null
  matchMethod: 'email' | 'name' | 'none'
}

// Cross-database read, same physical Supabase project as WLEA (confirmed
// live, not assumed — see the succession plan's Context section). Existing
// name-only matching in app/ninebox/actions.ts / app/idp/actions.ts is left
// untouched; succession decisions are higher-stakes than a 9-box placement,
// so this tries the more reliable email match first and only falls back to
// name matching, surfacing which one was used via matchMethod.
// result_summary is fetched alongside the score columns so callers can pull
// WLEA's own development-plan estimates out of it (see longestTimeEstimate
// below) without a second round-trip.
const ASSESSMENT_COLUMNS = 'overall_manager, overall_self, maturity_label, completed_at, result_summary'

async function findAssessmentForPerson(
  db: ReturnType<typeof createServiceClient>,
  person: { name: string; email: string | null },
): Promise<AssessmentMatch> {
  if (person.email) {
    const byEmail = await db
      .from('wlea_assessments')
      .select(ASSESSMENT_COLUMNS)
      .eq('subject_email', person.email)
      .eq('status', 'complete')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (byEmail.error) throw byEmail.error
    if (byEmail.data) return { row: byEmail.data, matchMethod: 'email' }
  }

  const byName = await db
    .from('wlea_assessments')
    .select(ASSESSMENT_COLUMNS)
    .ilike('subject_name', person.name.trim())
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (byName.error) throw byName.error
  if (byName.data) return { row: byName.data, matchMethod: 'name' }

  return { row: null, matchMethod: 'none' }
}

interface StoredPlanGap {
  gap?: number
  estimatedTimeToCompetency?: string
}

// WLEA estimates a "time to competency" per gap, banded against the score
// gap size (see leadership-excellence-assessment's recommendation engine).
// The largest gap sets the pace for the whole picture, so that's the one
// surfaced — a reference for the person entering an expected-readiness
// date, never written back or auto-filled anywhere.
function longestTimeEstimate(resultSummary: unknown): string | null {
  const plans = (resultSummary as { developmentPlans?: StoredPlanGap[] } | null)?.developmentPlans ?? []
  if (plans.length === 0) return null
  const sorted = [...plans].sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
  return sorted[0]?.estimatedTimeToCompetency ?? null
}

// ── View types ─────────────────────────────────────────────────────
// Composite types live here, not lib/types.ts, matching how
// PersonScorecardSummary lives in app/scorecard/actions.ts — they join a
// base entity with evidence from other feature modules.

export interface CandidateWithPerson {
  candidate: SuccessionCandidate
  person: Person
}

export interface RoleSummary {
  role: Role
  incumbent: Person | null
  candidates: CandidateWithPerson[]
  effectiveRisk: SuccessionRisk | null
  riskSource: 'override' | 'computed' | 'none'
}

export interface SuccessionAssessmentEvidence {
  overallManager: number | null
  overallSelf: number | null
  maturityLabel: string | null
  completedAt: string | null
  matchMethod: 'email' | 'name' | 'none'
}

export interface SuccessionEvidence {
  assessment: SuccessionAssessmentEvidence | null
  scorecard: PersonScorecardSummary | null
  ninebox: NineBoxPosition | null
  idp: PlanView[]
}

export interface SuccessorProfileView {
  candidate: SuccessionCandidate
  person: Person
  role: Role
  effectiveRisk: SuccessionRisk | null
  evidence: SuccessionEvidence
}

function summarize(role: Role, peopleById: Map<string, Person>, candidates: SuccessionCandidate[]): RoleSummary {
  const withPeople = candidates
    .map((candidate) => ({ candidate, person: peopleById.get(candidate.personId) }))
    .filter((c): c is CandidateWithPerson => !!c.person)
    .sort((a, b) => a.candidate.priorityRank - b.candidate.priorityRank)

  return {
    role,
    incumbent: role.incumbentId ? peopleById.get(role.incumbentId) ?? null : null,
    candidates: withPeople,
    effectiveRisk: role.riskOverride ?? role.riskComputed,
    riskSource: role.riskOverride ? 'override' : role.riskComputed ? 'computed' : 'none',
  }
}

// ── Reads ──────────────────────────────────────────────────────────

export interface SuccessionFilters {
  division?: string | null
  criticalOnly?: boolean
  readiness?: SuccessionReadiness | null
  risk?: SuccessionRisk | null
  personQuery?: string | null
}

export interface SuccessionOverview {
  roles: RoleSummary[]
  stats: OverviewStats
  divisions: string[]
}

export async function getSuccessionOverview(filters: SuccessionFilters = {}): Promise<SuccessionOverview> {
  await requireAllowedUser()
  const db = createServiceClient()

  let rolesQuery = db.from('perf_roles').select('*').eq('status', 'active').order('title')
  if (filters.division) rolesQuery = rolesQuery.eq('division', filters.division)
  if (filters.criticalOnly) rolesQuery = rolesQuery.eq('is_critical', true)
  const rolesRes = await rolesQuery
  if (rolesRes.error) throw rolesRes.error
  const roles = (rolesRes.data ?? []).map(roleFromRow)

  const peopleRes = await db.from('perf_people').select('*')
  if (peopleRes.error) throw peopleRes.error
  const people = (peopleRes.data ?? []).map(personFromRow)
  const peopleById = new Map(people.map((p) => [p.id, p]))

  const roleIds = roles.map((r) => r.id)
  const candidatesRes = roleIds.length
    ? await db.from('perf_succession_candidates').select('*').in('role_id', roleIds)
    : { data: [] as Record<string, unknown>[], error: null }
  if (candidatesRes.error) throw candidatesRes.error
  const candidates = (candidatesRes.data ?? []).map(candidateFromRow)
  const candidatesByRole = new Map<string, SuccessionCandidate[]>()
  for (const c of candidates) {
    const list = candidatesByRole.get(c.roleId) ?? []
    list.push(c)
    candidatesByRole.set(c.roleId, list)
  }

  let summaries = roles.map((role) => summarize(role, peopleById, candidatesByRole.get(role.id) ?? []))

  if (filters.readiness) {
    const readiness = filters.readiness
    summaries = summaries.filter((s) => s.candidates.some((c) => c.candidate.readiness === readiness))
  }
  if (filters.risk) {
    const risk = filters.risk
    summaries = summaries.filter((s) => s.effectiveRisk === risk)
  }
  if (filters.personQuery) {
    const q = filters.personQuery.trim().toLowerCase()
    summaries = summaries.filter(
      (s) =>
        s.incumbent?.name.toLowerCase().includes(q) || s.candidates.some((c) => c.person.name.toLowerCase().includes(q)),
    )
  }

  // Archived-person candidates are excluded from the readiness list feeding
  // the overview stats, same as recomputeRoleRisk — keeps the headline
  // numbers consistent with each role's own stored risk_computed.
  const statsInput = summaries.map((s) => ({
    isCritical: s.role.isCritical,
    effectiveRisk: s.effectiveRisk,
    readinessList: s.candidates.filter((c) => c.person.status === 'active').map((c) => c.candidate.readiness),
  }))
  const stats = computeOverviewStats(statsInput)

  const divisions = Array.from(
    new Set([...people.map((p) => p.division), ...roles.map((r) => r.division)].filter((d): d is string => !!d)),
  ).sort()

  return { roles: summaries, stats, divisions }
}

export async function getRoleDetail(roleId: string): Promise<RoleSummary | null> {
  await requireAllowedUser()
  const db = createServiceClient()

  const roleRes = await db.from('perf_roles').select('*').eq('id', roleId).maybeSingle()
  if (roleRes.error) throw roleRes.error
  if (!roleRes.data) return null
  const role = roleFromRow(roleRes.data)

  const peopleRes = await db.from('perf_people').select('*')
  if (peopleRes.error) throw peopleRes.error
  const peopleById = new Map((peopleRes.data ?? []).map((r) => [r.id as string, personFromRow(r)]))

  const candidatesRes = await db.from('perf_succession_candidates').select('*').eq('role_id', roleId)
  if (candidatesRes.error) throw candidatesRes.error
  const candidates = (candidatesRes.data ?? []).map(candidateFromRow)

  return summarize(role, peopleById, candidates)
}

export async function getSuccessorProfile(candidateId: string): Promise<SuccessorProfileView | null> {
  await requireAllowedUser()
  const db = createServiceClient()

  const candidateRes = await db.from('perf_succession_candidates').select('*').eq('id', candidateId).maybeSingle()
  if (candidateRes.error) throw candidateRes.error
  if (!candidateRes.data) return null
  const candidate = candidateFromRow(candidateRes.data)

  const [roleRes, personRes] = await Promise.all([
    db.from('perf_roles').select('*').eq('id', candidate.roleId).maybeSingle(),
    db.from('perf_people').select('*').eq('id', candidate.personId).maybeSingle(),
  ])
  if (roleRes.error) throw roleRes.error
  if (personRes.error) throw personRes.error
  if (!roleRes.data || !personRes.data) return null
  const role = roleFromRow(roleRes.data)
  const person = personFromRow(personRes.data)

  const fyStartYear = currentFyStartYear()
  const [scorecard, idpResult, ninebox, assessmentMatch] = await Promise.all([
    getPersonScorecard(person.id, fyStartYear),
    getPersonIdp(person.id),
    getPersonNineBoxPosition(person.id, fyStartYear),
    findAssessmentForPerson(db, { name: person.name, email: person.email }),
  ])

  const assessment: SuccessionAssessmentEvidence | null = assessmentMatch.row
    ? {
        overallManager:
          assessmentMatch.row.overall_manager === null ? null : Number(assessmentMatch.row.overall_manager),
        overallSelf: assessmentMatch.row.overall_self === null ? null : Number(assessmentMatch.row.overall_self),
        maturityLabel: (assessmentMatch.row.maturity_label as string) ?? null,
        completedAt: (assessmentMatch.row.completed_at as string) ?? null,
        matchMethod: assessmentMatch.matchMethod,
      }
    : null

  return {
    candidate,
    person,
    role,
    effectiveRisk: role.riskOverride ?? role.riskComputed,
    evidence: {
      assessment,
      scorecard,
      ninebox,
      idp: idpResult?.plans ?? [],
    },
  }
}

// Reference estimates shown next to the "expected readiness date" field
// when adding/editing a successor — one lookup per person, same N+1
// cross-database pattern app/ninebox/actions.ts already accepts at this
// scale. Deliberately not auto-filled anywhere: the estimate is calculated
// against the person's CURRENT role level, not the target role they'd be
// succeeding into, so treating it as anything more than a reference would
// overstate its precision.
export async function getDevelopmentTimeHints(personIds: string[]): Promise<Record<string, string | null>> {
  await requireAllowedUser()
  if (personIds.length === 0) return {}
  const db = createServiceClient()

  const peopleRes = await db.from('perf_people').select('id, name, email').in('id', personIds)
  if (peopleRes.error) throw peopleRes.error

  const hints: Record<string, string | null> = {}
  for (const p of peopleRes.data ?? []) {
    const match = await findAssessmentForPerson(db, { name: p.name as string, email: (p.email as string) ?? null })
    hints[p.id as string] = longestTimeEstimate(match.row?.result_summary)
  }
  return hints
}

// ── Writes — roles ────────────────────────────────────────────────

export async function createRole(input: unknown): Promise<Role> {
  await requireAllowedUser()
  const parsed = roleSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_roles')
    .insert({
      title: parsed.title,
      role_level: parsed.roleLevel,
      division: parsed.division,
      team: parsed.team,
      incumbent_id: parsed.incumbentId,
      is_critical: parsed.isCritical,
      criticality_reason: parsed.criticalityReason,
      notes: parsed.notes,
      risk_computed: computeRoleRisk([]), // no candidates yet -> high
    })
    .select('*')
    .single()
  if (error) throw error
  return roleFromRow(data)
}

export async function updateRole(id: string, input: unknown): Promise<Role> {
  await requireAllowedUser()
  const parsed = roleSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_roles')
    .update({
      title: parsed.title,
      role_level: parsed.roleLevel,
      division: parsed.division,
      team: parsed.team,
      incumbent_id: parsed.incumbentId,
      is_critical: parsed.isCritical,
      criticality_reason: parsed.criticalityReason,
      notes: parsed.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return roleFromRow(data)
}

export async function setRoleIncumbent(roleId: string, personId: string | null): Promise<Role> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_roles')
    .update({ incumbent_id: personId, updated_at: new Date().toISOString() })
    .eq('id', roleId)
    .select('*')
    .single()
  if (error) throw error
  return roleFromRow(data)
}

export async function archiveRole(id: string): Promise<void> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { error } = await db
    .from('perf_roles')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function setRoleRiskOverride(roleId: string, input: unknown): Promise<Role> {
  await requireAllowedUser()
  const parsed = riskOverrideSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_roles')
    .update({
      risk_override: parsed.riskOverride,
      risk_note: parsed.riskNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roleId)
    .select('*')
    .single()
  if (error) throw error
  return roleFromRow(data)
}

// ── Writes — candidates ──────────────────────────────────────────

const successionCandidateUpdateSchema = successionCandidateSchema.omit({ roleId: true, personId: true })

export async function addSuccessionCandidate(input: unknown): Promise<SuccessionCandidate> {
  await requireAllowedUser()
  const parsed = successionCandidateSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_succession_candidates')
    .insert({
      role_id: parsed.roleId,
      person_id: parsed.personId,
      readiness: parsed.readiness,
      priority_rank: parsed.priorityRank,
      expected_readiness_date: parsed.expectedReadinessDate,
      commentary: parsed.commentary,
    })
    .select('*')
    .single()
  if (error) throw error
  await recomputeRoleRisk(db, parsed.roleId)
  return candidateFromRow(data)
}

export async function updateSuccessionCandidate(id: string, input: unknown): Promise<SuccessionCandidate> {
  await requireAllowedUser()
  const parsed = successionCandidateUpdateSchema.parse(input)
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_succession_candidates')
    .update({
      readiness: parsed.readiness,
      priority_rank: parsed.priorityRank,
      expected_readiness_date: parsed.expectedReadinessDate,
      commentary: parsed.commentary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  await recomputeRoleRisk(db, data.role_id as string)
  return candidateFromRow(data)
}

export async function removeSuccessionCandidate(id: string): Promise<void> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { data: existing, error: fetchError } = await db
    .from('perf_succession_candidates')
    .select('role_id')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw fetchError
  const { error } = await db.from('perf_succession_candidates').delete().eq('id', id)
  if (error) throw error
  if (existing) await recomputeRoleRisk(db, existing.role_id as string)
}

// ── Incumbent departure ───────────────────────────────────────────
// Called from app/actions.ts's archivePerson, AFTER perf_people.status is
// already set to 'archived' — so recomputeRoleRisk below correctly excludes
// this person from any role's viable candidate set.

export async function vacateRolesForPerson(personId: string): Promise<void> {
  await requireAllowedUser()
  const db = createServiceClient()

  const incumbentRolesRes = await db
    .from('perf_roles')
    .select('id, notes')
    .eq('incumbent_id', personId)
    .eq('status', 'active')
  if (incumbentRolesRes.error) throw incumbentRolesRes.error

  const stamp = `Vacated ${new Date().toISOString().slice(0, 10)} — incumbent archived.`
  for (const role of incumbentRolesRes.data ?? []) {
    const notes = [role.notes as string | null, stamp].filter(Boolean).join('\n')
    const { error } = await db
      .from('perf_roles')
      .update({ incumbent_id: null, notes, updated_at: new Date().toISOString() })
      .eq('id', role.id as string)
    if (error) throw error
  }

  // Also recompute risk on every role where this person was a CANDIDATE, not
  // just where they were incumbent — otherwise a stale "Ready Now" from an
  // archived successor keeps masking real risk on roles they weren't
  // running, only queued up to join.
  const candidateRolesRes = await db.from('perf_succession_candidates').select('role_id').eq('person_id', personId)
  if (candidateRolesRes.error) throw candidateRolesRes.error
  const roleIds = new Set((candidateRolesRes.data ?? []).map((r) => r.role_id as string))
  for (const roleId of roleIds) {
    await recomputeRoleRisk(db, roleId)
  }
}
