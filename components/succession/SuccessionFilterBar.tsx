'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { READINESS_LABEL, RISK_LABEL } from '@/lib/succession'
import type { SuccessionReadiness, SuccessionRisk } from '@/lib/types'

const READINESS_OPTIONS: SuccessionReadiness[] = ['ready_now', 'ready_12mo', 'ready_1_2yr', 'ready_2_3yr', 'not_ready']
const RISK_OPTIONS: SuccessionRisk[] = ['high', 'medium', 'low']

// First URL-search-param filter bar in this app (see the succession plan's
// note that no filter pattern existed before this). Scoped strictly to what
// the data supports and what the Overview's "at a glance" questions need —
// deliberately no Team filter (high-cardinality, doesn't answer any of
// those questions) and one combined person-search box instead of separate
// incumbent/successor pickers.
export function SuccessionFilterBar({ divisions }: { divisions: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  const criticalOnly = searchParams.get('critical') !== 'off' // default ON

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
      <select
        className="input w-auto"
        value={searchParams.get('division') ?? ''}
        onChange={(e) => setParam('division', e.target.value)}
      >
        <option value="">All divisions</option>
        {divisions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        value={searchParams.get('readiness') ?? ''}
        onChange={(e) => setParam('readiness', e.target.value)}
      >
        <option value="">Any readiness</option>
        {READINESS_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {READINESS_LABEL[r]}
          </option>
        ))}
      </select>

      <select
        className="input w-auto"
        value={searchParams.get('risk') ?? ''}
        onChange={(e) => setParam('risk', e.target.value)}
      >
        <option value="">Any risk</option>
        {RISK_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {RISK_LABEL[r]}
          </option>
        ))}
      </select>

      <input
        className="input w-auto flex-1 min-w-[160px]"
        placeholder="Search by person"
        defaultValue={searchParams.get('q') ?? ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setParam('q', (e.target as HTMLInputElement).value)
        }}
        onBlur={(e) => setParam('q', e.target.value)}
      />

      <label className="flex items-center gap-1.5 text-sm text-gray-600 ml-auto">
        <input
          type="checkbox"
          checked={criticalOnly}
          onChange={(e) => setParam('critical', e.target.checked ? '' : 'off')}
        />
        Critical only
      </label>
    </div>
  )
}
