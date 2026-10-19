import type { SuccessionReadiness, SuccessionRisk } from '@/lib/types'

// Pure config + logic only, no DB access — same split as lib/ninebox.ts and
// lib/scorecard.ts. Readiness answers "how soon could this person actually
// step into THIS role" — deliberately separate from 9-box potential/
// performance, which answers "how good are they in general". Someone can be
// High Potential/High Performance on the 9-box and still be Ready 1-2 Years
// for a specific critical role.

export const READINESS_ORDER: SuccessionReadiness[] = [
  'ready_now',
  'ready_12mo',
  'ready_1_2yr',
  'ready_2_3yr',
  'not_ready',
]

export const READINESS_LABEL: Record<SuccessionReadiness, string> = {
  ready_now: 'Ready Now',
  ready_12mo: 'Ready < 12 Months',
  ready_1_2yr: 'Ready 1–2 Years',
  ready_2_3yr: 'Ready 2–3 Years',
  not_ready: 'No Ready Successor',
}

export const READINESS_COLOR: Record<SuccessionReadiness, string> = {
  ready_now: '#15803d',
  ready_12mo: '#22c55e',
  ready_1_2yr: '#f59e0b',
  ready_2_3yr: '#f97316',
  not_ready: '#9ca3af',
}

export const RISK_LABEL: Record<SuccessionRisk, string> = {
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
}

export const RISK_COLOR: Record<SuccessionRisk, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

// Transparent rule, not a black-box score — proposed and approved before
// building. "Viable" excludes 'not_ready' candidates entirely (someone
// explicitly marked not ready isn't part of the depth story).
//   no viable candidate at all                     -> HIGH
//   any candidate at ready_now                      -> LOW
//   >=2 candidates at ready_now/ready_12mo (depth)   -> LOW (even without a
//     literal Ready Now — this is what lets the Overview answer "where is
//     there strong depth", not just "who is #1")
//   exactly one candidate at ready_12mo, nothing better -> MEDIUM
//   otherwise (only 1-2yr/2-3yr candidates)          -> HIGH
export function computeRoleRisk(readinessList: SuccessionReadiness[]): SuccessionRisk {
  const viable = readinessList.filter((r) => r !== 'not_ready')
  if (viable.length === 0) return 'high'
  if (viable.includes('ready_now')) return 'low'
  const nearReady = viable.filter((r) => r === 'ready_now' || r === 'ready_12mo')
  if (nearReady.length >= 2) return 'low'
  if (viable.includes('ready_12mo')) return 'medium'
  return 'high'
}

// Best (soonest) readiness among a role's candidates — used to bucket a role
// into one of the Overview's headline stat tiles. 'none' when there are no
// candidates, or all are 'not_ready'.
export function bestReadiness(readinessList: SuccessionReadiness[]): SuccessionReadiness | 'none' {
  for (const r of READINESS_ORDER) {
    if (r === 'not_ready') continue
    if (readinessList.includes(r)) return r
  }
  return 'none'
}

export interface RiskCandidateInput {
  readiness: SuccessionReadiness
  personStatus: 'active' | 'archived'
}

export interface RoleRiskInput {
  isCritical: boolean
  candidates: RiskCandidateInput[]
}

export interface OverviewStats {
  totalCriticalRoles: number
  readyNowCount: number
  readyUnder12moCount: number
  ready1to3yrCount: number // merges ready_1_2yr + ready_2_3yr for this one headline tile only
  noViableSuccessorCount: number
  depthCount: number // critical roles with >=2 viable (non-'not_ready') candidates
  singlePointOfFailureCount: number // critical roles with exactly 1 viable candidate
}

// Shared by getSuccessionOverview (app/succession/actions.ts) — takes the
// minimal shape needed rather than the full RoleSummary, so this stays a
// pure function testable without a DB round-trip.
export function computeOverviewStats(
  roles: { isCritical: boolean; effectiveRisk: SuccessionRisk | null; readinessList: SuccessionReadiness[] }[],
): OverviewStats {
  const critical = roles.filter((r) => r.isCritical)
  const stats: OverviewStats = {
    totalCriticalRoles: critical.length,
    readyNowCount: 0,
    readyUnder12moCount: 0,
    ready1to3yrCount: 0,
    noViableSuccessorCount: 0,
    depthCount: 0,
    singlePointOfFailureCount: 0,
  }

  for (const role of critical) {
    const best = bestReadiness(role.readinessList)
    if (best === 'ready_now') stats.readyNowCount++
    else if (best === 'ready_12mo') stats.readyUnder12moCount++
    else if (best === 'ready_1_2yr' || best === 'ready_2_3yr') stats.ready1to3yrCount++
    else stats.noViableSuccessorCount++

    const viableCount = role.readinessList.filter((r) => r !== 'not_ready').length
    if (viableCount >= 2) stats.depthCount++
    else if (viableCount === 1) stats.singlePointOfFailureCount++
  }

  return stats
}
