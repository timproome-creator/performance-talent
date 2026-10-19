'use client'

import { useState } from 'react'
import type { Person, RoleLevelKey } from '@/lib/types'

const ROLE_LEVEL_OPTIONS: { key: RoleLevelKey; label: string }[] = [
  { key: 'jpm', label: 'Junior Production Manager' },
  { key: 'pm', label: 'Production Manager' },
  { key: 'dcm', label: 'DC Manager' },
  { key: 'fm', label: 'Facilities & Maintenance Manager' },
  { key: 'exec', label: 'Executive' },
]

export interface PersonFormValues {
  name: string
  email: string
  roleTitle: string
  roleLevel: RoleLevelKey | ''
  team: string
  managerId: string
  associateNo: string
  division: string
}

export function PersonForm({
  people,
  editing,
  onSubmit,
  onCancel,
  busy = false,
}: {
  people: Person[]
  editing: Person | null
  onSubmit: (values: PersonFormValues) => void
  onCancel: () => void
  busy?: boolean
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [email, setEmail] = useState(editing?.email ?? '')
  const [roleTitle, setRoleTitle] = useState(editing?.roleTitle ?? '')
  const [roleLevel, setRoleLevel] = useState<RoleLevelKey | ''>(editing?.roleLevel ?? '')
  const [team, setTeam] = useState(editing?.team ?? '')
  const [managerId, setManagerId] = useState(editing?.managerId ?? '')
  const [associateNo, setAssociateNo] = useState(editing?.associateNo ?? '')
  const [division, setDivision] = useState(editing?.division ?? '')
  const [error, setError] = useState<string | null>(null)

  const managerOptions = people.filter((p) => p.status === 'active' && p.id !== editing?.id)

  function submit() {
    if (!name.trim()) return setError('Enter a name.')
    setError(null)
    onSubmit({ name: name.trim(), email, roleTitle, roleLevel, team, managerId, associateNo, division })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-bold text-gray-900">{editing ? 'Edit person' : 'Add a person'}</h3>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam Dlamini" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sam@company.com" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Associate no.</label>
            <input className="input" value={associateNo} onChange={(e) => setAssociateNo(e.target.value)} placeholder="e.g. 5002101" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Role title</label>
            <input className="input" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. Warehouse Manager" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Role level</label>
            <select className="input" value={roleLevel} onChange={(e) => setRoleLevel(e.target.value as RoleLevelKey | '')}>
              <option value="">Not set</option>
              {ROLE_LEVEL_OPTIONS.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Division</label>
            <input className="input" value={division} onChange={(e) => setDivision(e.target.value)} placeholder="e.g. Logistics" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Team</label>
            <input className="input" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Distribution and Logistics" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Reports to</label>
          <select className="input" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">No manager set</option>
            {managerOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {error && <p className="err">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving...' : editing ? 'Save changes' : 'Add person'}
          </button>
        </div>
      </div>
    </div>
  )
}
