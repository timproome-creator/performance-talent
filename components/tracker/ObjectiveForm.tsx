'use client'

import { useState } from 'react'
import type { FinalRating, Objective, Perspective, Section } from '@/lib/types'
import { FINAL_RATINGS, PERSPECTIVES } from '@/lib/types'

export interface ObjectiveFormValues {
  trackerId: string
  section: Section
  divisionSubObjective: string
  objective: string
  dueDate: string
  weighting: string
  measuresOfSuccess: string
  finalRating: FinalRating | ''
  associateComment: string
  managerComment: string
  perspective: Perspective | ''
}

export function ObjectiveForm({
  trackerId,
  section,
  editing,
  onSubmit,
  onCancel,
  busy = false,
}: {
  trackerId: string
  section: Section
  editing: Objective | null
  onSubmit: (values: ObjectiveFormValues) => void
  onCancel: () => void
  busy?: boolean
}) {
  const [divisionSubObjective, setDivisionSubObjective] = useState(editing?.divisionSubObjective ?? '')
  const [objective, setObjective] = useState(editing?.objective ?? '')
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? '')
  const [weighting, setWeighting] = useState(editing ? String(Math.round(editing.weighting * 100)) : '')
  const [measuresOfSuccess, setMeasuresOfSuccess] = useState(editing?.measuresOfSuccess ?? '')
  const [finalRating, setFinalRating] = useState<FinalRating | ''>(editing?.finalRating ?? '')
  const [associateComment, setAssociateComment] = useState(editing?.associateComment ?? '')
  const [managerComment, setManagerComment] = useState(editing?.managerComment ?? '')
  const [perspective, setPerspective] = useState<Perspective | ''>(editing?.perspective ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!objective.trim()) return setError('Enter the objective.')
    const pct = Number(weighting)
    if (weighting.trim() === '' || Number.isNaN(pct) || pct < 0 || pct > 100) {
      return setError('Enter a weighting between 0 and 100.')
    }
    setError(null)
    onSubmit({
      trackerId,
      section,
      divisionSubObjective,
      objective: objective.trim(),
      dueDate,
      weighting: String(pct / 100),
      measuresOfSuccess,
      finalRating,
      associateComment,
      managerComment,
      perspective,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h4 className="text-sm font-bold text-gray-900">{editing ? 'Edit objective' : 'Add objective'}</h4>

      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Division Sub-Objective <span className="text-gray-400 font-normal">(what this links up to)</span>
          </label>
          <input
            className="input"
            value={divisionSubObjective}
            onChange={(e) => setDivisionSubObjective(e.target.value)}
            placeholder="e.g. Drive increased DC inventory accuracies and reduce losses"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Objective</label>
          <textarea
            className="input"
            rows={2}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Your objective linked to the team or divisional objective"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Measures of Success</label>
          <textarea
            className="input"
            rows={3}
            value={measuresOfSuccess}
            onChange={(e) => setMeasuresOfSuccess(e.target.value)}
            placeholder="1) ... 2) ... 3) ..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Due date</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Weighting <span className="text-gray-400 font-normal">(% of this section)</span>
            </label>
            <input className="input" value={weighting} onChange={(e) => setWeighting(e.target.value)} placeholder="e.g. 25" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Balanced Scorecard perspective <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select className="input" value={perspective} onChange={(e) => setPerspective(e.target.value as Perspective | '')}>
              <option value="">Not tagged</option>
              {PERSPECTIVES.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Final rating</label>
            <select className="input" value={finalRating} onChange={(e) => setFinalRating(e.target.value as FinalRating | '')}>
              <option value="">Not yet rated</option>
              {FINAL_RATINGS.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Associate comment</label>
            <textarea className="input" rows={2} value={associateComment} onChange={(e) => setAssociateComment(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Line manager comment</label>
            <textarea className="input" rows={2} value={managerComment} onChange={(e) => setManagerComment(e.target.value)} />
          </div>
        </div>

        {error && <p className="err">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving...' : editing ? 'Save changes' : 'Add objective'}
          </button>
        </div>
      </div>
    </div>
  )
}
