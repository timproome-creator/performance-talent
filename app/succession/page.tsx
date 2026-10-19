import Link from 'next/link'
import { getSuccessionOverview } from '@/app/succession/actions'
import { listPeople } from '@/app/actions'
import { AccessPrompt } from '@/components/AccessPrompt'
import { isNotAuthorised } from '@/lib/auth'
import { StatTile } from '@/components/succession/StatTile'
import { SuccessionFilterBar } from '@/components/succession/SuccessionFilterBar'
import { SuccessionMapTable } from '@/components/succession/SuccessionMapTable'
import { AddRoleButton } from '@/components/succession/AddRoleButton'
import type { SuccessionReadiness, SuccessionRisk } from '@/lib/types'

export default async function SuccessionPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string; readiness?: string; risk?: string; q?: string; critical?: string }>
}) {
  const sp = await searchParams

  let overview
  let people
  try {
    ;[overview, people] = await Promise.all([
      getSuccessionOverview({
        division: sp.division || null,
        criticalOnly: sp.critical !== 'off',
        readiness: (sp.readiness as SuccessionReadiness) || null,
        risk: (sp.risk as SuccessionRisk) || null,
        personQuery: sp.q || null,
      }),
      listPeople(),
    ])
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? 'not_authorised' : 'signed_out'} />
  }

  const { roles, stats, divisions } = overview
  const highestRisk = roles.filter((r) => r.effectiveRisk === 'high').slice(0, 5)

  return (
    <main className="min-h-screen bg-gray-50">
      <section style={{ backgroundColor: 'var(--brand-header)', color: 'var(--brand-on-header)' }}>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--brand-accent)' }}>
            Succession Planning
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight max-w-3xl">
            Who could step in, how ready are they, and where are the gaps.
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--brand-accent-soft)' }}>
            Every critical role, its incumbent, and its succession depth — backed by the same
            assessment, KPI, 9-box and development evidence already tracked elsewhere on this
            platform, not a separate judgement made from scratch.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatTile label="Critical roles" value={stats.totalCriticalRoles} />
          <StatTile label="Ready now" value={stats.readyNowCount} />
          <StatTile label="Ready < 12 months" value={stats.readyUnder12moCount} />
          <StatTile label="Ready 1–3 years" value={stats.ready1to3yrCount} />
          <StatTile label="No viable successor" value={stats.noViableSuccessorCount} />
        </div>

        <p className="text-sm text-gray-500">
          {stats.depthCount} role(s) with strong depth (2+ viable successors) · {stats.singlePointOfFailureCount} single
          point(s) of failure
        </p>

        {highestRisk.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Highest risk critical roles</p>
            <ul className="space-y-1.5">
              {highestRisk.map((r) => (
                <li key={r.role.id}>
                  <Link href={`/succession/roles/${r.role.id}`} className="text-sm accent-text font-medium">
                    {r.role.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <SuccessionFilterBar divisions={divisions} />

        <SuccessionMapTable roles={roles} />

        <div className="flex justify-end">
          <AddRoleButton people={people} />
        </div>
      </div>
    </main>
  )
}
