'use client'

import { useState } from 'react'
import type { ActionCategory, DevelopmentAction } from '@/lib/types'
import { ACTION_CATEGORY_LABEL } from '@/lib/idp'

export interface ActionFormValues {
  description: string
  dueDate: string
  notes: string
}

export function ActionForm({
  category,
  editing,
  onSubmit,
  onCancel,
  onDelete,
  busy = false,
}: {
  category: ActionCategory
  editing: DevelopmentAction | null
  onSubmit: (values: ActionFormValues) => void
  onCancel: () => void
  onDelete?: () => void
  busy?: boolean
}) {
  const [description, setDescription] = useState(editing?.description ?? '')
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!description.trim()) return setError('Describe the action.')
    setError(null)
    onSubmit({ description, dueDate, notes })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-sm font-bold text-gray-900">
          {editing ? 'Edit action' : 'Add action'} — {ACTION_CATEGORY_LABEL[category]}
        </h4>
        {editing?.source === 'suggested' && (
          <p className="text-xs text-gray-400 mt-1">
            This came from the assessment as a suggestion. Editing it makes it your own wording.
          </p>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Action</label>
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lead the GFPDC Phase 1 readiness review"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Due date <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(what actually happened)</span>
            </label>
            <textarea
              className="input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Progress, blockers, evidence"
            />
          </div>

          {error && <p className="err">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-1">
            {editing && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className="text-xs font-medium text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'Saving...' : editing ? 'Save' : 'Add action'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
