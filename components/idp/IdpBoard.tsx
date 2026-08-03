'use client'

import { useState } from 'react'
import type { ActionCategory, ActionStatus, DevelopmentAction, ReviewOutcome } from '@/lib/types'
import type { PlanView } from '@/lib/idp'
import { updateActionStatus, recordReview, createAction, updateAction, deleteAction } from '@/app/idp/actions'
import { PlanCard } from './PlanCard'
import { ActionForm, type ActionFormValues } from './ActionForm'

// Which action editor is open: either adding to a (plan, category), or
// editing an existing action.
type Editing =
  | { mode: 'add'; planId: string; category: ActionCategory }
  | { mode: 'edit'; action: DevelopmentAction }
  | null

export function IdpBoard({ initialPlans }: { initialPlans: PlanView[] }) {
  const [plans, setPlans] = useState(initialPlans)
  const [editing, setEditing] = useState<Editing>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const replaceAction = (updated: DevelopmentAction) =>
    setPlans((prev) =>
      prev.map((v) => ({ ...v, actions: v.actions.map((a) => (a.id === updated.id ? updated : a)) })),
    )

  async function handleActionStatus(actionId: string, status: ActionStatus) {
    setBusy(true)
    setError(null)
    try {
      replaceAction(await updateActionStatus(actionId, status))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the action.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRecordReview(reviewId: string, outcome: ReviewOutcome, notes: string | null) {
    setBusy(true)
    setError(null)
    try {
      const updated = await recordReview(reviewId, outcome, notes)
      setPlans((prev) =>
        prev.map((v) => ({ ...v, reviews: v.reviews.map((r) => (r.id === updated.id ? updated : r)) })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record the review.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmitAction(values: ActionFormValues) {
    if (!editing) return
    setBusy(true)
    setError(null)
    try {
      if (editing.mode === 'add') {
        const created = await createAction({
          planId: editing.planId,
          category: editing.category,
          description: values.description,
          dueDate: values.dueDate || null,
        })
        setPlans((prev) =>
          prev.map((v) => (v.plan.id === editing.planId ? { ...v, actions: [...v.actions, created] } : v)),
        )
      } else {
        replaceAction(
          await updateAction(editing.action.id, {
            description: values.description,
            dueDate: values.dueDate || null,
            notes: values.notes || null,
          }),
        )
      }
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the action.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteAction() {
    if (!editing || editing.mode !== 'edit') return
    const action = editing.action
    if (!confirm(`Delete "${action.description.slice(0, 60)}"?`)) return
    setBusy(true)
    setError(null)
    try {
      await deleteAction(action.id)
      setPlans((prev) => prev.map((v) => ({ ...v, actions: v.actions.filter((a) => a.id !== action.id) })))
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the action.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="err">{error}</p>}
      {plans.map((v) => (
        <PlanCard
          key={v.plan.id}
          view={v}
          busy={busy}
          onActionStatus={handleActionStatus}
          onAddAction={(planId, category) => setEditing({ mode: 'add', planId, category })}
          onEditAction={(action) => setEditing({ mode: 'edit', action })}
          onRecordReview={handleRecordReview}
        />
      ))}

      {editing && (
        <ActionForm
          // Remount per target so the form never shows a previous action's
          // values — same bug that bit the objective form earlier.
          key={editing.mode === 'edit' ? editing.action.id : `add-${editing.planId}-${editing.category}`}
          category={editing.mode === 'edit' ? editing.action.category : editing.category}
          editing={editing.mode === 'edit' ? editing.action : null}
          busy={busy}
          onSubmit={handleSubmitAction}
          onCancel={() => setEditing(null)}
          onDelete={editing.mode === 'edit' ? handleDeleteAction : undefined}
        />
      )}
    </div>
  )
}
