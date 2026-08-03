import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPersonIdp } from '@/app/idp/actions'
import { IdpBoard } from '@/components/idp/IdpBoard'
import { AccessPrompt } from '@/components/AccessPrompt'
 import { isNotAuthorised } from '@/lib/auth'

export default async function IdpPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params

  let result
  try {
    result = await getPersonIdp(personId)
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? "not_authorised" : "signed_out"} />
  }
  if (!result) notFound()

  const { person, plans, seedMessage } = result

  return (
    <main className="min-h-screen bg-gray-50">
      <section style={{ backgroundColor: 'var(--brand-header)', color: 'var(--brand-on-header)' }}>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--brand-accent)' }}>
            Individual Development Plan
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{person.name}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--brand-accent-soft)' }}>
            The assessment identified the development areas. This is what gets done about them —
            tracked per action, reviewed on a schedule scaled to each area.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href={`/tracker/${person.id}`} className="accent-text font-medium">
            KPI tracker →
          </Link>
          <Link href={`/scorecard/${person.id}`} className="accent-text font-medium">
            Scorecard →
          </Link>
        </div>

        {plans.length === 0 ? (
          <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-10 text-center">
            <p className="font-medium text-gray-700">No development plan yet</p>
            <p className="mt-1 text-gray-400">
              {seedMessage ??
                'A plan is created automatically from the development areas in this person’s completed leadership assessment.'}
            </p>
          </div>
        ) : (
          <IdpBoard initialPlans={plans} />
        )}
      </div>
    </main>
  )
}
