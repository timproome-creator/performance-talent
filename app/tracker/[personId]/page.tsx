import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listPeople, getTrackerView } from '@/app/actions'
import { TrackerView } from '@/components/tracker/TrackerView'
import { AccessPrompt } from '@/components/AccessPrompt'
 import { isNotAuthorised } from '@/lib/auth'
import { currentFyStartYear, fyLabel } from '@/lib/kpi'

export default async function TrackerPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params

  let person, trackerView
  try {
    const people = await listPeople()
    person = people.find((p) => p.id === personId)
    if (!person) notFound()
    trackerView = await getTrackerView(personId, currentFyStartYear())
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? "not_authorised" : "signed_out"} />
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
          {fyLabel(currentFyStartYear())} KPI Tracker
        </p>
        <h1 className="text-xl font-bold text-gray-900">{person.name}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 mb-6">
          <Link href={`/scorecard/${person.id}`} className="text-sm accent-text font-medium">
            Scorecard →
          </Link>
          <Link href={`/idp/${person.id}`} className="text-sm accent-text font-medium">
            Development plan →
          </Link>
        </div>
        <TrackerView person={person} initial={trackerView} />
      </div>
    </main>
  )
}
