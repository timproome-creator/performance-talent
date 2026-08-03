import Link from 'next/link'
import { listPeople } from '@/app/actions'
import { PeopleManager } from '@/components/people/PeopleManager'
import { AccessPrompt } from '@/components/AccessPrompt'
 import { isNotAuthorised } from '@/lib/auth'

export default async function PeoplePage() {
  let people
  try {
    people = await listPeople()
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? "not_authorised" : "signed_out"} />
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">People</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              The roster KPIs are owned against. Team is free text — group people however suits your DC.
            </p>
          </div>
          <Link href="/import" className="btn-secondary shrink-0">
            Import from Connect 2.0
          </Link>
        </div>
        <PeopleManager initialPeople={people} />
      </div>
    </main>
  )
}
