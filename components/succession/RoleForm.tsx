'use client'

import { useState } from 'react'
import type { Person, Role, RoleLevelKey } from '@/lib/types'

const ROLE_LEVEL_OPTIONS: { key: RoleLevelKey; label: string }[] = [
  { key: 'jpm', label: 'Junior Production Manager' },
  { key: 'pm', label: 'Production Manager' },
  { key: 'dcm', label: 'DC Manager' },
  { key: 'fm', label: 'Facilities & Maintenance Manager' },
  { key: 'exec', label: 'Executive' },
]

// Starting points, not an enforced enum — criticality reason stays free
// text (matches the user's approved spec) since forcing a rigid category
// set would be the exact kind of over-engineering the plan warns against.
const CRITICALITY_SUGGESTIONS = [
  'Business impact',
  'Scarcity of capability',
  'Difficulty to replace',
  'Operational dependency',
  'Leadership importance',
]

export interface RoleFormValues {
  title: string
  roleLevel: RoleLevelKey | ''
  division: string
  team: string
  incumbentId: string
  isCritical: boolean
  criticalityReason: string
  notes: string
}

export function RoleForm({
  people,
  editing,
  onSubmit,
  onCancel,
  busy = false,
}: {
  people: Person[]
  editing: Role | null
  onSubmit: (values: RoleFormValues) => void
  onCancel: () => void
  busy?: boolean
}) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [roleLevel, setRoleLevel] = useState<RoleLevelKey | ''>(editing?.roleLevel ?? '')
  const [division, setDivision] = useState(editing?.division ?? '')
  const [team, setTeam] = useState(editing?.team ?? '')
  const [incumbentId, setIncumbentId] = useState(editing?.incumbentId ?? '')
  const [isCritical, setIsCritical] = useState(editing?.isCritical ?? true)
  const [criticalityReason, setCriticalityReason] = useState(editing?.criticalityReason ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const activePeople = people.filter((p) => p.status === 'active')

  function submit() {
    if (!title.trim()) return setError('Enter a role title.')
    if (isCritical && !criticalityReason.trim()) return setError('Explain why this role is critical.')
    setError(null)
    onSubmit({
      title: title.trim(),
      roleLevel,
      division,
      team,
      incumbentId,
      isCritical,
      criticalityReason,
      notes,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-bold text-gray-900">{editing ? 'Edit role' : 'Add a critical role'}</h3>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Role title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. DC Manager — Area A"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Role level</label>
            <select className="input" value={roleLevel} onChange={(e) => setRoleLevel(e.target.value as RoleLevelKey | '')}>
              <option value="">Not set</option>
              {ROLE_LEVEL_OPTIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Current incumbent</label>
            <select className="input" value={incumbentId} onChange={(e) => setIncumbentId(e.target.value)}>
              <option value="">Vacant</option>
              {activePeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
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
            <input className="input" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Area A" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={isCritical} onChange={(e) => setIsCritical(e.target.checked)} />
          Critical role
        </label>

        {isCritical && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Why is this role critical?</label>
            <textarea
              className="input"
              rows={2}
              value={criticalityReason}
              onChange={(e) => setCriticalityReason(e.target.value)}
              placeholder="e.g. Business impact, scarcity of capability, difficulty to replace..."
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {CRITICALITY_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:accent-panel"
                  onClick={() => setCriticalityReason((prev) => (prev ? `${prev}; ${s}` : s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context" />
        </div>

        {error && <p className="err">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving...' : editing ? 'Save changes' : 'Add role'}
          </button>
        </div>
      </div>
    </div>
  )
}
