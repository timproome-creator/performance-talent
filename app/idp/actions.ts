'use server'

import { requireAllowedUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { reviewOffsetsFor, addDays, type PlanView } from '@/lib/idp'
import type {
  ActionStatus,
  DevelopmentAction,
  DevelopmentPlan,
  DevelopmentReview,
  Person,
  ReviewOutcome,
} from '@/lib/types'

function planFromRow(r: Record<string, unknown>): DevelopmentPlan {
  return {
    id: r.id as string,
    personId: r.person_id as string,
    sourceAssessmentId: (r.source_assessment_id as string) ?? null,
    competencyKey: r.competency_key as string,
    competencyName: r.competency_name as string,
    currentScore: r.current_score === null ? null : Number(r.current_score),
    targetScore: r.target_score === null ? null : Number(r.target_score),
    expectedChange: (r.expected_change as string) ?? null,
    successMeasure: (r.success_measure as string) ?? null,
    evidenceRequired: (r.evidence_required as string[]) ?? [],
    timeToCompetency: (r.time_to_competency as string) ?? null,
    status: r.status as DevelopmentPlan['status'],
    startedOn: r.started_on as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function actionFromRow(r: Record<string, unknown>): DevelopmentAction {
  return {
    id: r.id as string,
    planId: r.plan_id as string,
    category: r.category as DevelopmentAction['category'],
    description: r.description as string,
    status: r.status as ActionStatus,
    dueDate: (r.due_date as string) ?? null,
    completedAt: (r.completed_at as string) ?? null,
    notes: (r.notes as string) ?? null,
    source: (r.source as DevelopmentAction['source']) ?? 'agreed',
    sortOrder: Number(r.sort_order),
  }
}

function reviewFromRow(r: Record<string, unknown>): DevelopmentReview {
  return {
    id: r.id as string,
    planId: r.plan_id as string,
    dayOffset: Number(r.day_offset),
    scheduledDate: r.scheduled_date as string,
    completedAt: (r.completed_at as string) ?? null,
    outcome: (r.outcome as ReviewOutcome) ?? null,
    notes: (r.notes as string) ?? null,
  }
}

// Shape of a development plan as WLEA persists it into result_summary
// (see toStoredRecommendations in that app's lib/recommendations/engine.ts).
interface StoredPlan {
  competencyKey: string
  competencyName: string
  currentScore: number
  targetScore: number
  gap: number
  expectedBehaviouralChange: string
  workplaceAssignments: string[]
  coaching: string[]
  formalLearning: string[]
  successMeasure: string
  evidenceRequired: string[]
  reviewTimelineDays: number[]
  estimatedTimeToCompetency: string
}

export interface SeedSummary {
  plansCreated: number
  plansSkipped: number
  message: string
}

// Reads the person's latest completed WLEA assessment and creates one
// development plan (plus its actions and review checkpoints) per identified
// gap. Idempotent per assessment: re-running won't duplicate, thanks to the
// unique (person_id, source_assessment_id, competency_key) constraint —
// so this is safe to call whenever the IDP page is opened.
export async function seedPlansFromAssessment(personId: string): Promise<SeedSummary> {
  await requireAllowedUser()
  const db = createServiceClient()

  const personRes = await db.from('perf_people').select('name').eq('id', personId).maybeSingle()
  if (personRes.error) throw personRes.error
  if (!personRes.data) return { plansCreated: 0, plansSkipped: 0, message: 'Person not found.' }

  // Cross-app read, matched by name — same approach as the 9-box.
  const assessmentRes = await db
    .from('wlea_assessments')
    .select('id, result_summary, completed_at')
    .ilike('subject_name', (personRes.data.name as string).trim())
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (assessmentRes.error) throw assessmentRes.error
  if (!assessmentRes.data) {
    return { plansCreated: 0, plansSkipped: 0, message: 'No completed assessment for this person yet.' }
  }

  const summary = assessmentRes.data.result_summary as { developmentPlans?: StoredPlan[] } | null
  const storedPlans = summary?.developmentPlans ?? []
  if (storedPlans.length === 0) {
    return {
      plansCreated: 0,
      plansSkipped: 0,
      message:
        'The assessment is complete but has no stored development plan yet. Run the IDP backfill in the assessment app.',
    }
  }

  const assessmentId = assessmentRes.data.id as string
  const existingRes = await db
    .from('perf_development_plans')
    .select('competency_key')
    .eq('person_id', personId)
    .eq('source_assessment_id', assessmentId)
  if (existingRes.error) throw existingRes.error
  const existingKeys = new Set((existingRes.data ?? []).map((r) => r.competency_key as string))

  let created = 0
  for (const sp of storedPlans) {
    if (existingKeys.has(sp.competencyKey)) continue

    const startedOn = new Date().toISOString().slice(0, 10)
    const { data: planRow, error: planError } = await db
      .from('perf_development_plans')
      .insert({
        person_id: personId,
        source_assessment_id: assessmentId,
        competency_key: sp.competencyKey,
        competency_name: sp.competencyName,
        current_score: sp.currentScore,
        target_score: sp.targetScore,
        expected_change: sp.expectedBehaviouralChange,
        success_measure: sp.successMeasure,
        evidence_required: sp.evidenceRequired ?? [],
        time_to_competency: sp.estimatedTimeToCompetency,
        started_on: startedOn,
      })
      .select('*')
      .single()
    if (planError) throw planError

    const actions = [
      ...(sp.workplaceAssignments ?? []).map((d, i) => ({ category: 'workplace', description: d, sort_order: i })),
      ...(sp.coaching ?? []).map((d, i) => ({ category: 'coaching', description: d, sort_order: 100 + i })),
      ...(sp.formalLearning ?? []).map((d, i) => ({ category: 'formal_learning', description: d, sort_order: 200 + i })),
      // Everything the seeder creates is a SUGGESTION from the assessment
      // engine, not something anyone has committed to yet.
    ].map((a) => ({ ...a, plan_id: planRow.id, source: 'suggested' }))

    if (actions.length > 0) {
      const { error: actionsError } = await db.from('perf_development_actions').insert(actions)
      if (actionsError) throw actionsError
    }

    // Review cadence scaled to this area's horizon — see lib/idp.ts.
    const offsets = reviewOffsetsFor(sp.gap ?? sp.targetScore - sp.currentScore, sp.reviewTimelineDays)
    const reviews = offsets.map((dayOffset) => ({
      plan_id: planRow.id,
      day_offset: dayOffset,
      scheduled_date: addDays(startedOn, dayOffset),
    }))
    if (reviews.length > 0) {
      const { error: reviewsError } = await db.from('perf_development_reviews').insert(reviews)
      if (reviewsError) throw reviewsError
    }

    created++
  }

  return {
    plansCreated: created,
    plansSkipped: storedPlans.length - created,
    message: created > 0 ? `Created ${created} development plan(s).` : 'Development plans already up to date.',
  }
}

export interface PersonIdpView {
  person: Person
  plans: PlanView[]
  seedMessage: string | null
}

export async function getPersonIdp(personId: string): Promise<PersonIdpView | null> {
  await requireAllowedUser()

  // Seed first so opening the page for someone newly assessed just works.
  let seedMessage: string | null = null
  try {
    const seed = await seedPlansFromAssessment(personId)
    if (seed.plansCreated === 0 && seed.plansSkipped === 0) seedMessage = seed.message
  } catch {
    seedMessage = 'Could not check for new development plans.'
  }

  const db = createServiceClient()
  const personRes = await db.from('perf_people').select('*').eq('id', personId).maybeSingle()
  if (personRes.error) throw personRes.error
  if (!personRes.data) return null
  const p = personRes.data
  const person: Person = {
    id: p.id as string,
    name: p.name as string,
    email: (p.email as string) ?? null,
    roleTitle: (p.role_title as string) ?? null,
    roleLevel: (p.role_level as Person['roleLevel']) ?? null,
    team: (p.team as string) ?? null,
    managerId: (p.manager_id as string) ?? null,
    associateNo: (p.associate_no as string) ?? null,
    division: (p.division as string) ?? null,
    status: p.status as Person['status'],
    createdAt: p.created_at as string,
    updatedAt: p.updated_at as string,
  }

  const plansRes = await db
    .from('perf_development_plans')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: true })
  if (plansRes.error) throw plansRes.error
  const planIds = (plansRes.data ?? []).map((r) => r.id as string)

  const [actionsRes, reviewsRes] = await Promise.all([
    planIds.length
      ? db.from('perf_development_actions').select('*').in('plan_id', planIds).order('sort_order')
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    planIds.length
      ? db.from('perf_development_reviews').select('*').in('plan_id', planIds).order('day_offset')
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ])
  if (actionsRes.error) throw actionsRes.error
  if (reviewsRes.error) throw reviewsRes.error

  const actionsByPlan = new Map<string, DevelopmentAction[]>()
  for (const row of actionsRes.data ?? []) {
    const a = actionFromRow(row)
    const list = actionsByPlan.get(a.planId) ?? []
    list.push(a)
    actionsByPlan.set(a.planId, list)
  }
  const reviewsByPlan = new Map<string, DevelopmentReview[]>()
  for (const row of reviewsRes.data ?? []) {
    const r = reviewFromRow(row)
    const list = reviewsByPlan.get(r.planId) ?? []
    list.push(r)
    reviewsByPlan.set(r.planId, list)
  }

  const plans: PlanView[] = (plansRes.data ?? []).map((row) => {
    const plan = planFromRow(row)
    return {
      plan,
      actions: actionsByPlan.get(plan.id) ?? [],
      reviews: reviewsByPlan.get(plan.id) ?? [],
    }
  })

  return { person, plans, seedMessage }
}

export async function updateActionStatus(
  actionId: string,
  status: ActionStatus,
  notes?: string | null,
): Promise<DevelopmentAction> {
  await requireAllowedUser()
  const db = createServiceClient()
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    // Stamp completion the moment it's marked done, clear it if reopened —
    // so "when did this actually get finished" is answerable later.
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  }
  if (notes !== undefined) patch.notes = notes
  const { data, error } = await db
    .from('perf_development_actions')
    .update(patch)
    .eq('id', actionId)
    .select('*')
    .single()
  if (error) throw error
  return actionFromRow(data)
}

// ── Actions the manager and employee actually agree ──────────────
// The seeded 70/20/10 items are suggestions; these are the commitments.
// Both live on the same plan so progress is one number, not two.

export async function createAction(input: {
  planId: string
  category: DevelopmentAction['category']
  description: string
  dueDate: string | null
}): Promise<DevelopmentAction> {
  await requireAllowedUser()
  if (!input.description.trim()) throw new Error('An action needs a description.')
  const db = createServiceClient()

  // Append within its category rather than jumping to the top — the seeded
  // items use 0/100/200 bands, so offset well past those.
  const { data: siblings } = await db
    .from('perf_development_actions')
    .select('sort_order')
    .eq('plan_id', input.planId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextSort = ((siblings?.[0]?.sort_order as number) ?? 0) + 1

  const { data, error } = await db
    .from('perf_development_actions')
    .insert({
      plan_id: input.planId,
      category: input.category,
      description: input.description.trim(),
      due_date: input.dueDate || null,
      source: 'agreed',
      sort_order: nextSort,
    })
    .select('*')
    .single()
  if (error) throw error
  return actionFromRow(data)
}

export async function updateAction(
  actionId: string,
  input: { description: string; dueDate: string | null; notes: string | null },
): Promise<DevelopmentAction> {
  await requireAllowedUser()
  if (!input.description.trim()) throw new Error('An action needs a description.')
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_development_actions')
    .update({
      description: input.description.trim(),
      due_date: input.dueDate || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', actionId)
    .select('*')
    .single()
  if (error) throw error
  return actionFromRow(data)
}

export async function deleteAction(actionId: string): Promise<void> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { error } = await db.from('perf_development_actions').delete().eq('id', actionId)
  if (error) throw error
}

export async function recordReview(
  reviewId: string,
  outcome: ReviewOutcome,
  notes: string | null,
): Promise<DevelopmentReview> {
  await requireAllowedUser()
  const db = createServiceClient()
  const { data, error } = await db
    .from('perf_development_reviews')
    .update({
      outcome,
      notes,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select('*')
    .single()
  if (error) throw error
  return reviewFromRow(data)
}
