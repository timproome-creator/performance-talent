import Link from 'next/link'
import { getDivisionScorecard } from '@/app/scorecard/actions'
import { PerspectiveCard } from '@/components/scorecard/PerspectiveCard'
import { ScoreBadge } from '@/components/scorecard/ScoreBadge'
import { AccessPrompt } from '@/components/AccessPrompt'
 import { isNotAuthorised } from '@/lib/auth'
import { currentFyStartYear, fyLabel } from '@/lib/kpi'
import { BRAND } from '@/lib/brand'

export default async function ScorecardPage() {
  const fyStartYear = currentFyStartYear()
  let result
  try {
    result = await getDivisionScorecard(fyStartYear)
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? "not_authorised" : "signed_out"} />
  }

  const { division, byPerson } = result

  return (
    <main className="min-h-screen bg-gray-50">
      <section style={{ backgroundColor: 'var(--brand-header)', color: 'var(--brand-on-header)' }}>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--brand-accent)' }}>
            Balanced Scorecard — Division — {fyLabel(fyStartYear)}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight max-w-3xl">
            The four perspectives, built from real objectives.
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--brand-accent-soft)' }}>
            {BRAND.name} rolls up every objective already in the Connect 2.0 trackers into the
            division view below. Nothing is entered twice — tag an objective&apos;s perspective on
            the tracker, and it counts here automatically.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {division.untaggedCount > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {division.untaggedCount} of {division.totalObjectives} objectives across the division
            aren&apos;t tagged to a perspective yet, so they&apos;re not counted below. Tag them from
            each person&apos;s tracker.
          </p>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Division overall</p>
            <p className="text-xs text-gray-400 mt-1">
              Weighted across every tagged objective, all {byPerson.length} people combined.
            </p>
          </div>
          <ScoreBadge score={division.overall} rag={division.overallRag} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {division.perspectives.map((p) => (
            <PerspectiveCard key={p.perspective} rollup={p} />
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-900">By person</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              A division average can hide who&apos;s carrying it and who&apos;s stalled. Open anyone
              for their own four-perspective scorecard.
            </p>
          </div>
          {byPerson.map(({ person, scorecard }) => (
            <Link
              key={person.id}
              href={`/scorecard/${person.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-100 first:border-t-0 hover:bg-gray-50"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{person.name}</div>
                <div className="text-xs text-gray-400 truncate">{person.roleTitle ?? 'No role set'}</div>
              </div>
              <ScoreBadge score={scorecard.overall} rag={scorecard.overallRag} compact />
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
