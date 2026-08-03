'use client'

import { useState } from 'react'
import type { Objective, ObjectiveStatus, ObjectiveWithProgress, Person, Quarter, Section, TrackerView as TrackerViewData } from '@/lib/types'
import { SECTIONS } from '@/lib/types'
import { weightingTotalForSection, fyLabel } from '@/lib/kpi'
import { createObjective, updateObjective, deleteObjective, upsertObjectiveProgress, updateTrackerComments } from '@/app/actions'
import { ObjectiveRow } from './ObjectiveRow'
import { ObjectiveForm, type ObjectiveFormValues } from './ObjectiveForm'

export function TrackerView({ person, initial }: { person: Person; initial: TrackerViewData }) {
  const [tracker, setTracker] = useState(initial.tracker)
  const [objectives, setObjectives] = useState(initial.objectives)
  const [addingSection, setAddingSection] = useState<Section | null>(null)
  const [editing, setEditing] = useState<ObjectiveWithProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [associateComment, setAssociateComment] = useState(tracker.associateComment ?? '')
  const [managerComment, setManagerComment] = useState(tracker.managerComment ?? '')
  const [savingComments, setSavingComments] = useState(false)

  async function handleSubmit(values: ObjectiveFormValues) {
    setBusy(true)
    setError(null)
    try {
      if (editing) {
        const updated = await updateObjective(editing.id, values)
        setObjectives((prev) => prev.map((o) => (o.id === updated.id ? { ...updated, progress: o.progress } : o)))
      } else {
        const created = await createObjective(values)
        setObjectives((prev) => [...prev, { ...created, progress: {} }])
      }
      setAddingSection(null)
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(objective: Objective) {
    if (!confirm(`Delete "${objective.objective}"?`)) return
    try {
      await deleteObjective(objective.id)
      setObjectives((prev) => prev.filter((o) => o.id !== objective.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.')
    }
  }

  async function handleSetQuarterStatus(objectiveId: string, quarter: Quarter, status: ObjectiveStatus) {
    try {
      await upsertObjectiveProgress({ objectiveId, quarter, status })
      setObjectives((prev) =>
        prev.map((o) => (o.id === objectiveId ? { ...o, progress: { ...o.progress, [quarter]: status } } : o)),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status.')
    }
  }

  async function handleSaveComments() {
    setSavingComments(true)
    setError(null)
    try {
      const updated = await updateTrackerComments(tracker.id, { associateComment, managerComment })
      setTracker(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save comments.')
    } finally {
      setSavingComments(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <p><span className="text-gray-400">Name:</span> <span className="font-medium text-gray-900">{person.name}</span></p>
          <p><span className="text-gray-400">Associate no:</span> {person.associateNo ?? '—'}</p>
          <p><span className="text-gray-400">Role:</span> {person.roleTitle ?? '—'}</p>
          <p><span className="text-gray-400">Division:</span> {person.division ?? '—'}</p>
          <p><span className="text-gray-400">Team:</span> {person.team ?? '—'}</p>
          <p><span className="text-gray-400">Year:</span> {fyLabel(tracker.fyStartYear)}</p>
        </div>
      </div>

      {error && <p className="err">{error}</p>}

      {SECTIONS.map((section) => {
        const sectionObjectives = objectives.filter((o) => o.section === section.key)
        const totalPct = Math.round(weightingTotalForSection(objectives, section.key) * 100)
        const isAdding = addingSection === section.key

        return (
          <div key={section.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">{section.label}</h2>
              <span className={['text-xs font-medium', totalPct === 100 ? 'text-green-600' : 'text-amber-600'].join(' ')}>
                {totalPct}% weighted{totalPct !== 100 ? ' — should total 100%' : ''}
              </span>
            </div>

            {sectionObjectives.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-6 text-center">No objectives in this section yet.</p>
            ) : (
              sectionObjectives.map((o) => (
                <ObjectiveRow
                  key={o.id}
                  objective={o}
                  onEdit={() => {
                    setEditing(o)
                    setAddingSection(section.key)
                  }}
                  onDelete={() => handleDelete(o)}
                  onSetQuarterStatus={(q, status) => handleSetQuarterStatus(o.id, q, status)}
                />
              ))
            )}

            <div className="px-4 py-3 border-t border-gray-100">
              {isAdding ? (
                <ObjectiveForm
                  // Forces a remount whenever the target changes (switching
                  // between objectives, or from "add" to "edit") — without
                  // this, React reuses the same instance and its internal
                  // useState never re-reads the new `editing` prop, so the
                  // form keeps showing whatever was open before.
                  key={editing && editing.section === section.key ? editing.id : 'new'}
                  trackerId={tracker.id}
                  section={section.key}
                  editing={editing && editing.section === section.key ? editing : null}
                  busy={busy}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setAddingSection(null)
                    setEditing(null)
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditing(null)
                    setAddingSection(section.key)
                  }}
                >
                  Add objective
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900">General comments</h3>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Associate general comment</label>
            <textarea className="input" rows={3} value={associateComment} onChange={(e) => setAssociateComment(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Line manager general comment</label>
            <textarea className="input" rows={3} value={managerComment} onChange={(e) => setManagerComment(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end pt-3">
          <button type="button" className="btn-primary" onClick={handleSaveComments} disabled={savingComments}>
            {savingComments ? 'Saving...' : 'Save comments'}
          </button>
        </div>
      </div>
    </div>
  )
}
