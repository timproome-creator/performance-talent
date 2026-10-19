'use client'

import { useState } from 'react'
import type { Person, SuccessionCandidate, SuccessionReadiness } from '@/lib/types'
import { READINESS_LABEL } from '@/lib/succession'

const READINESS_OPTIONS: SuccessionReadiness[] = ['ready_now', 'ready_12mo', 'ready_1_2yr', 'ready_2_3yr', 'not_ready']

export interface SuccessorFormValues {
  personId: string
  readiness: SuccessionReadiness
  priorityRank: number
  expectedReadinessDate: string
  commentary: string
}

// Doubles as add and edit: with `editing` set, the person picker is hidden
// (person/role identity doesn't change after the fact) and only
// readiness/priority/date/commentary are editable — same show/hide pattern
// as PersonForm.tsx.
export function SuccessorForm({
  people,
  excludePersonIds,
  editing,
  developmentHints,
  onSubmit,
  onCancel,
  busy = false,
}: {
  people: Person[]
  excludePersonIds: string[]
  editing: { candidate: SuccessionCandidate; person: Person } | null
  // Person id -> WLEA's own "time to competency" estimate for their largest
  // gap, keyed so the hint updates live as the picker selection changes.
  developmentHints: Record<string, string | null>
  onSubmit: (values: SuccessorFormValues) => void
  onCancel: () => void
  busy?: boolean
}) {
  const [personId, setPersonId] = useState(editing?.person.id ?? '')
  const [readiness, setReadiness] = useState<SuccessionReadiness>(editing?.candidate.readiness ?? 'not_ready')
  const [priorityRank, setPriorityRank] = useState(String(editing?.candidate.priorityRank ?? 1))
  const [expectedReadinessDate, setExpectedReadinessDate] = useState(editing?.candidate.expectedReadinessDate ?? '')
  const [commentary, setCommentary] = useState(editing?.candidate.commentary ?? '')
  const [error, setError] = useState<string | null>(null)

  const options = people.filter((p) => p.status === 'active' && !excludePersonIds.includes(p.id))
  const activePersonId = editing?.person.id ?? personId
  const timeHint = activePersonId ? developmentHints[activePersonId] : null

  function submit() {
    if (!editing && !personId) return setError('Choose a person.')
    setError(null)
    onSubmit({
      personId: editing?.person.id ?? personId,
      readiness,
      priorityRank: Number(priorityRank) || 1,
      expectedReadinessDate,
      commentary,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="text-sm font-bold text-gray-900">{editing ? `Edit ${editing.person.name}` : 'Add a successor'}</h4>
      <div className="mt-3 space-y-3">
        {!editing && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Person</label>
            <select className="input" value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">Select a person</option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Readiness</label>
            <select
              className="input"
              value={readiness}
              onChange={(e) => setReadiness(e.target.value as SuccessionReadiness)}
            >
              {READINESS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {READINESS_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
            <input
              className="input"
              type="number"
              min={1}
              value={priorityRank}
              onChange={(e) => setPriorityRank(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Expected readiness date</label>
          <input
            className="input"
            type="date"
            value={expectedReadinessDate ?? ''}
            onChange={(e) => setExpectedReadinessDate(e.target.value)}
          />
          {timeHint && (
            <p className="text-xs text-gray-400 mt-1">
              Their assessment estimated <span className="font-medium text-gray-600">{timeHint}</span> to close
              their largest development gap — a reference, not a rule (it's measured against their current role,
              not this one).
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Manager / HR commentary</label>
          <textarea
            className="input"
            rows={2}
            value={commentary ?? ''}
            onChange={(e) => setCommentary(e.target.value)}
            placeholder="Context for this succession call"
          />
        </div>

        {error && <p className="err">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving...' : editing ? 'Save changes' : 'Add successor'}
          </button>
        </div>
      </div>
    </div>
  )
}
