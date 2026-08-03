import Link from 'next/link'
import { listPeople } from '@/app/actions'
import { AccessPrompt } from '@/components/AccessPrompt'
 import { isNotAuthorised } from '@/lib/auth'
import { BRAND } from '@/lib/brand'
import { fyLabel, currentFyStartYear } from '@/lib/kpi'

// Was the home page until the cadence screen took that slot — moved here so
// "/" can be the front door that explains the year, rather than a flat list.
export default async function TrackersPage() {
  let people
  try {
    people = (await listPeople()).filter((p) => p.status === 'active')
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? "not_authorised" : "signed_out"} />
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section style={{ backgroundColor: 'var(--brand-header)', color: 'var(--brand-on-header)' }}>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--brand-accent)' }}
          >
            KPI Tracker — {fyLabel(currentFyStartYear())}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight max-w-3xl">
            Weighted objectives, tracked every quarter.
          </h1>
          <p
            className="mt-3 max-w-2xl text-sm sm:text-base"
            style={{ color: 'var(--brand-accent-soft)' }}
          >
            {BRAND.name} tracks each person&apos;s KPI Delivery and Leadership Effectiveness
            objectives here, weighted to 100% per section, with quarterly progress and a final
            rating at year close. Pick a person below to open their tracker.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {people.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-10 text-center">
            No people yet.{' '}
            <Link href="/people" className="accent-text font-medium">
              Add your first person
            </Link>{' '}
            to start their tracker.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/tracker/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.roleTitle ?? 'No role set'}</div>
                </div>
                <span className="text-xs font-medium accent-text">Open tracker →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
