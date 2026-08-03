import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPersonScorecard } from '@/app/scorecard/actions'
import { PerspectiveCard } from '@/components/scorecard/PerspectiveCard'
import { ScoreBadge } from '@/components/scorecard/ScoreBadge'
import { AccessPrompt } from '@/components/AccessPrompt'
 import { isNotAuthorised } from '@/lib/auth'
import { currentFyStartYear, fyLabel } from '@/lib/kpi'

export default async function PersonScorecardPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params
  const fyStartYear = currentFyStartYear()

  let result
  try {
    result = await getPersonScorecard(personId, fyStartYear)
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? "not_authorised" : "signed_out"} />
  }
  if (!result) notFound()

  const { person, scorecard } = result

  return (
    <main className="min-h-screen bg-gray-50">
      <section style={{ backgroundColor: 'var(--brand-header)', color: 'var(--brand-on-header)' }}>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--brand-accent)' }}>
            Balanced Scorecard — {fyLabel(fyStartYear)}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{person.name}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--brand-accent-soft)' }}>
            {person.roleTitle ?? 'No role set'}
            {person.team ? ` · ${person.team}` : ''}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/scorecard" className="accent-text font-medium">
            ← Division scorecard
          </Link>
          <Link href={`/tracker/${person.id}`} className="accent-text font-medium">
            Open full tracker →
          </Link>
        </div>

        {scorecard.totalObjectives === 0 ? (
          <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-10 text-center">
            No objectives on {person.name}&apos;s {fyLabel(fyStartYear)} tracker yet.
          </p>
        ) : (
          <>
            {scorecard.untaggedCount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {scorecard.untaggedCount} of {scorecard.totalObjectives} of {person.name}&apos;s
                objectives aren&apos;t tagged to a perspective, so they&apos;re not counted below.
              </p>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Overall</p>
                <p className="text-xs text-gray-400 mt-1">
                  Weighted across {person.name}&apos;s tagged objectives.
                </p>
              </div>
              <ScoreBadge score={scorecard.overall} rag={scorecard.overallRag} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {scorecard.perspectives.map((p) => (
                <PerspectiveCard key={p.perspective} rollup={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
