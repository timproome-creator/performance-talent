import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRoleDetail, getDevelopmentTimeHints } from '@/app/succession/actions'
import { listPeople } from '@/app/actions'
import { RoleDetailBoard } from '@/components/succession/RoleDetailBoard'
import { AccessPrompt } from '@/components/AccessPrompt'
import { isNotAuthorised } from '@/lib/auth'

export default async function RoleDetailPage({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params

  let summary
  let people
  let developmentHints: Record<string, string | null> = {}
  try {
    ;[summary, people] = await Promise.all([getRoleDetail(roleId), listPeople()])
    const activeIds = people.filter((p) => p.status === 'active').map((p) => p.id)
    developmentHints = await getDevelopmentTimeHints(activeIds)
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? 'not_authorised' : 'signed_out'} />
  }
  if (!summary) notFound()

  return (
    <main className="min-h-screen bg-gray-50">
      <section style={{ backgroundColor: 'var(--brand-header)', color: 'var(--brand-on-header)' }}>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--brand-accent)' }}>
            Succession — Role Detail
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{summary.role.title}</h1>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Link href="/succession" className="text-sm accent-text font-medium">
          ← Succession map
        </Link>
        <RoleDetailBoard summary={summary} people={people} developmentHints={developmentHints} />
      </div>
    </main>
  )
}
