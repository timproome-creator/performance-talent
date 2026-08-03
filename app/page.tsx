import { getCadenceStatus } from '@/app/cadence/actions'
import { MomentRow } from '@/components/cadence/MomentRow'
import { AccessPrompt } from '@/components/AccessPrompt'
 import { isNotAuthorised } from '@/lib/auth'
import { currentFyStartYear, fyLabel } from '@/lib/kpi'
import { BRAND } from '@/lib/brand'

// The front door. Deliberately not a list of tools — the platform's whole
// argument is that the People year is a rhythm, so the year itself is the
// navigation, and each moment reports whether it actually happened.
export default async function CadenceHomePage() {
  const fyStartYear = currentFyStartYear()
  let summary
  try {
    summary = await getCadenceStatus(fyStartYear)
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? "not_authorised" : "signed_out"} />
  }

  const current = summary.moments.find((m) => m.key === summary.currentMomentKey)
  const attention: string[] = []
  if (summary.overdueCount > 0) attention.push(`${summary.overdueCount} overdue`)
  if (summary.dueNowCount > 0) attention.push(`${summary.dueNowCount} due now`)

  return (
    <main className="min-h-screen bg-gray-50">
      <section style={{ backgroundColor: 'var(--brand-header)', color: 'var(--brand-on-header)' }}>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--brand-accent)' }}
          >
            People Year — {fyLabel(fyStartYear)}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight max-w-3xl">
            {current ? `You are here: ${current.monthLabel} — ${current.label}` : 'The People year at a glance'}
          </h1>
          <p
            className="mt-3 max-w-2xl text-sm sm:text-base"
            style={{ color: 'var(--brand-accent-soft)' }}
          >
            {attention.length > 0
              ? `${attention.join(' · ')}. Every moment below reports live from the tools that own that data — nothing is entered twice.`
              : 'Every moment below reports live from the tools that own that data — nothing is entered twice.'}
          </p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <ol>
          {summary.moments.map((m, i) => (
            <MomentRow
              key={m.key}
              moment={m}
              isCurrent={m.key === summary.currentMomentKey}
              isLast={i === summary.moments.length - 1}
            />
          ))}
        </ol>

        <p className="text-xs text-gray-400 mt-2 max-w-2xl">
          The financial year runs April to March. Each step is timed to use real evidence from the
          one before it — the 9-box in July reads the assessment set in April against a full
          quarter of delivery, rather than positioning people on the day their objectives are
          written.
        </p>
      </div>
    </main>
  )
}
