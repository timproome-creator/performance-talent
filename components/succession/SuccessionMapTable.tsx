import Link from 'next/link'
import type { RoleSummary } from '@/app/succession/actions'
import { RiskBadge } from './RiskBadge'
import { ReadinessBadge } from './ReadinessBadge'

// The single table that satisfies "Organisation -> Role -> Incumbent ->
// Successor(s) -> Readiness -> Risk visible without drilling in" — one row
// per role, not a grid of cards, per the "avoid excessive cards" principle.
export function SuccessionMapTable({ roles }: { roles: RoleSummary[] }) {
  if (roles.length === 0) {
    return (
      <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-4 py-6 text-center">
        No critical roles match these filters yet.
      </p>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-2.5 font-semibold">Role</th>
            <th className="px-4 py-2.5 font-semibold">Incumbent</th>
            <th className="px-4 py-2.5 font-semibold">Successors</th>
            <th className="px-4 py-2.5 font-semibold">Risk</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((r) => {
            const shown = r.candidates.slice(0, 2)
            const extra = r.candidates.length - shown.length
            return (
              <tr key={r.role.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <Link href={`/succession/roles/${r.role.id}`} className="font-medium text-gray-900">
                    {r.role.title}
                  </Link>
                  {r.role.division && (
                    <div className="text-xs text-gray-400">
                      {r.role.division}
                      {r.role.team ? ` / ${r.role.team}` : ''}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-gray-700">
                  {r.incumbent ? r.incumbent.name : <span className="text-gray-400 italic">Vacant</span>}
                </td>
                <td className="px-4 py-2.5">
                  {r.candidates.length === 0 ? (
                    <span className="text-gray-400 italic">None</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {shown.map((c) => (
                        <span key={c.candidate.id} className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                          {c.person.name}
                          <ReadinessBadge readiness={c.candidate.readiness} />
                          {c.person.status === 'archived' && <span className="text-gray-400">(archived)</span>}
                        </span>
                      ))}
                      {extra > 0 && <span className="text-xs text-gray-400">+{extra} more</span>}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <RiskBadge risk={r.effectiveRisk} compact />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
