import { z } from 'zod'

export const roleLevelSchema = z.enum(['jpm', 'pm', 'dcm', 'exec', 'fm'])

export const personSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email().nullable().or(z.literal('')).transform((v) => v || null),
  roleTitle: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
  roleLevel: roleLevelSchema.nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  team: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
  managerId: z.string().uuid().nullable().or(z.literal('')).transform((v) => v || null),
  associateNo: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
  division: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
})

export type PersonInput = z.infer<typeof personSchema>

// Connect 2.0 objective — see lib/types.ts for the section/rating model.
export const objectiveSchema = z.object({
  trackerId: z.string().uuid(),
  section: z.enum(['kpi_delivery', 'leadership_effectiveness']),
  divisionSubObjective: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
  objective: z.string().trim().min(1, 'Objective is required'),
  dueDate: z.string().nullable().or(z.literal('')).transform((v) => v || null),
  weighting: z.coerce.number().min(0).max(1),
  measuresOfSuccess: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
  finalRating: z
    .enum(['exceeded', 'full', 'partial', 'none'])
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  associateComment: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
  managerComment: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
  perspective: z
    .enum(['financial', 'customer', 'internal_process', 'learning_growth'])
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
})

export type ObjectiveInput = z.infer<typeof objectiveSchema>

export const objectiveProgressSchema = z.object({
  objectiveId: z.string().uuid(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']),
})

export type ObjectiveProgressInput = z.infer<typeof objectiveProgressSchema>

export const trackerCommentsSchema = z.object({
  associateComment: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
  managerComment: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
})

export type TrackerCommentsInput = z.infer<typeof trackerCommentsSchema>

// ── Succession Planning ───────────────────────────────────────────

export const roleSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required'),
    roleLevel: roleLevelSchema.nullable().or(z.literal('')).transform((v) => (v ? v : null)),
    division: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
    team: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
    incumbentId: z.string().uuid().nullable().or(z.literal('')).transform((v) => v || null),
    isCritical: z.boolean(),
    criticalityReason: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
    notes: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
  })
  // A role flagged critical without a reason is exactly the kind of
  // unexplained judgement call the whole feature exists to avoid.
  .refine((v) => !v.isCritical || !!v.criticalityReason, {
    message: 'Explain why this role is critical.',
    path: ['criticalityReason'],
  })

export type RoleInput = z.infer<typeof roleSchema>

export const successionReadinessSchema = z.enum([
  'ready_now',
  'ready_12mo',
  'ready_1_2yr',
  'ready_2_3yr',
  'not_ready',
])

export const successionCandidateSchema = z.object({
  roleId: z.string().uuid(),
  personId: z.string().uuid(),
  readiness: successionReadinessSchema,
  priorityRank: z.coerce.number().int().min(1),
  expectedReadinessDate: z.string().nullable().or(z.literal('')).transform((v) => v || null),
  commentary: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
})

export type SuccessionCandidateInput = z.infer<typeof successionCandidateSchema>

export const riskOverrideSchema = z.object({
  riskOverride: z.enum(['high', 'medium', 'low']).nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  riskNote: z.string().trim().nullable().or(z.literal('')).transform((v) => v || null),
})

export type RiskOverrideInput = z.infer<typeof riskOverrideSchema>
