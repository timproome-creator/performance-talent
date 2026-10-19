'use client'

import { useState } from 'react'
import type { Role, SuccessionRisk } from '@/lib/types'
import { RISK_LABEL } from '@/lib/succession'

// Clones OverridePanel.tsx's modal shell (ninebox) — same override pattern,
// applied to risk instead of potential/performance.
const RISK_OPTIONS: SuccessionRisk[] = ['high', 'medium', 'low']

export interface RiskOverrideValues {
  riskOverride: SuccessionRisk | ''
  riskNote: string
}

export function RiskOverridePanel({
  role,
  onSubmit,
  onCancel,
  busy = false,
}: {
  role: Role
  onSubmit: (values: RiskOverrideValues) => void
  onCancel: () => void
  busy?: boolean
}) {
  const [riskOverride, setRiskOverride] = useState<SuccessionRisk | ''>(role.riskOverride ?? '')
  const [riskNote, setRiskNote] = useState(role.riskNote ?? '')

  function submit() {
    onSubmit({ riskOverride, riskNote })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900">{role.title}</h3>
        <p className="text-xs text-gray-400 mt-1">
          Computed risk: {role.riskComputed ? RISK_LABEL[role.riskComputed] : '—'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Leave unset to use the computed risk. Override it to deliberately disagree with the rule —
          that&apos;s a judgement call, not the arithmetic.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Risk override</label>
            <select
              className="input"
              value={riskOverride}
              onChange={(e) => setRiskOverride(e.target.value as SuccessionRisk | '')}
            >
              <option value="">Use computed risk</option>
              {RISK_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {RISK_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Note</label>
            <textarea
              className="input"
              rows={3}
              value={riskNote}
              onChange={(e) => setRiskNote(e.target.value)}
              placeholder="Why this rating — context for next cycle"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
              {busy ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
