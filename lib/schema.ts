import { z } from 'zod'

export const roleLevelSchema = z.enum(['jpm', 'pm', 'dcm', 'exec'])

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
