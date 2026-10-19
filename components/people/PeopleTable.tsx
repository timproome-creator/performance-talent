'use client'

import Link from 'next/link'
import type { Person } from '@/lib/types'

const ROLE_LEVEL_LABEL: Record<string, string> = {
  jpm: 'JPM',
  pm: 'PM',
  dcm: 'DC Manager',
  fm: 'Facilities Mgr',
  exec: 'Executive',
}

export function PeopleTable({
  people,
  onEdit,
  onArchive,
}: {
  people: Person[]
  onEdit: (person: Person) => void
  onArchive: (person: Person) => void
}) {
  const active = people.filter((p) => p.status === 'active')
  const byId = new Map(people.map((p) => [p.id, p]))

  if (active.length === 0) {
    return (
      <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-4 py-6 text-center">
        No people yet. Add the first person below.
      </p>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-2.5 font-semibold">Name</th>
            <th className="px-4 py-2.5 font-semibold">Role</th>
            <th className="px-4 py-2.5 font-semibold">Division / Team</th>
            <th className="px-4 py-2.5 font-semibold">Reports to</th>
            <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {active.map((p) => (
            <tr key={p.id} className="border-t border-gray-100">
              <td className="px-4 py-2.5">
                <div className="font-medium text-gray-900">{p.name}</div>
                {p.email && <div className="text-xs text-gray-400">{p.email}</div>}
              </td>
              <td className="px-4 py-2.5 text-gray-700">
                {p.roleTitle ?? '—'}
                {p.roleLevel && (
                  <span className="ml-1.5 text-xs text-gray-400">({ROLE_LEVEL_LABEL[p.roleLevel]})</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-gray-700">
                {p.division ?? '—'}{p.team ? ` / ${p.team}` : ''}
              </td>
              <td className="px-4 py-2.5 text-gray-700">
                {p.managerId ? byId.get(p.managerId)?.name ?? '—' : '—'}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Link href={`/tracker/${p.id}`} className="text-xs font-medium accent-text mr-3">
                  Tracker
                </Link>
                <Link href={`/idp/${p.id}`} className="text-xs font-medium accent-text mr-3">
                  IDP
                </Link>
                <button onClick={() => onEdit(p)} className="text-xs font-medium accent-text mr-3">
                  Edit
                </button>
                <button onClick={() => onArchive(p)} className="text-xs font-medium text-red-600 hover:text-red-800">
                  Archive
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
