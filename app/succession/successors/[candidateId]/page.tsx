import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSuccessorProfile } from '@/app/succession/actions'
import { SuccessorProfileBoard } from '@/components/succession/SuccessorProfileBoard'
import { AccessPrompt } from '@/components/AccessPrompt'
import { isNotAuthorised } from '@/lib/auth'

export default async function SuccessorProfilePage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params

  let profile
  try {
    profile = await getSuccessorProfile(candidateId)
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? 'not_authorised' : 'signed_out'} />
  }
  if (!profile) notFound()

  return (
    <main className="min-h-screen bg-gray-50">
      <section style={{ backgroundColor: 'var(--brand-header)', color: 'var(--brand-on-header)' }}>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--brand-accent)' }}>
            Succession — Successor Profile
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{profile.person.name}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--brand-accent-soft)' }}>
            Potential successor for {profile.role.title}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href={`/succession/roles/${profile.role.id}`} className="accent-text font-medium">
            ← Role detail
          </Link>
          <Link href={`/tracker/${profile.person.id}`} className="accent-text font-medium">
            KPI tracker →
          </Link>
          <Link href={`/scorecard/${profile.person.id}`} className="accent-text font-medium">
            Scorecard →
          </Link>
          <Link href={`/idp/${profile.person.id}`} className="accent-text font-medium">
            Development plan →
          </Link>
        </div>

        <SuccessorProfileBoard profile={profile} />
      </div>
    </main>
  )
}
