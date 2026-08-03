'use client'

import { useState } from 'react'
import type { NineBoxEntry } from '@/lib/types'

export interface OverrideValues {
  potentialOverride: string
  performanceOverride: string
  notes: string
}

export function OverridePanel({
  entry,
  onSubmit,
  onCancel,
  busy = false,
}: {
  entry: NineBoxEntry
  onSubmit: (values: OverrideValues) => void
  onCancel: () => void
  busy?: boolean
}) {
  const [potentialOverride, setPotentialOverride] = useState(
    entry.position?.potentialOverride != null ? String(entry.position.potentialOverride) : '',
  )
  const [performanceOverride, setPerformanceOverride] = useState(
    entry.position?.performanceOverride != null ? String(entry.position.performanceOverride) : '',
  )
  const [notes, setNotes] = useState(entry.position?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  function validate(v: string): boolean {
    if (v.trim() === '') return true
    const n = Number(v)
    return Number.isFinite(n) && n >= 1 && n <= 5
  }

  function submit() {
    if (!validate(potentialOverride) || !validate(performanceOverride)) {
      return setError('Scores must be between 1 and 5 (or left blank to use the computed value).')
    }
    setError(null)
    onSubmit({ potentialOverride, performanceOverride, notes })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900">{entry.person.name}</h3>
        <p className="text-xs text-gray-400 mt-1">
          Computed: Potential {entry.position?.potentialComputed?.toFixed(1) ?? '—'} · Performance{' '}
          {entry.position?.performanceComputed?.toFixed(1) ?? '—'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Leave a field blank to use the computed value. Set it to deliberately place this person
          somewhere the arithmetic doesn&apos;t — that&apos;s the point of a talent conversation.
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Potential override</label>
              <input
                className="input"
                value={potentialOverride}
                onChange={(e) => setPotentialOverride(e.target.value)}
                placeholder="1–5"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Performance override</label>
              <input
                className="input"
                value={performanceOverride}
                onChange={(e) => setPerformanceOverride(e.target.value)}
                placeholder="1–5"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this position — context for next cycle" />
          </div>

          {error && <p className="err">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
              {busy ? 'Saving...' : 'Save position'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
