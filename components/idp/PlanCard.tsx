'use client'

import { useState } from 'react'
import type { ActionStatus, DevelopmentAction, DevelopmentReview, ReviewOutcome } from '@/lib/types'
import { ACTION_STATUSES, REVIEW_OUTCOMES } from '@/lib/types'
import {
  ACTION_CATEGORY_LABEL,
  ACTION_STATUS_COLOR,
  REVIEW_OUTCOME_COLOR,
  REVIEW_OUTCOME_LABEL,
  isOverdue,
  planProgress,
  type PlanView,
} from '@/lib/idp'

export function PlanCard({
  view,
  onActionStatus,
  onAddAction,
  onEditAction,
  onRecordReview,
  busy,
}: {
  view: PlanView
  onActionStatus: (actionId: string, status: ActionStatus) => void
  onAddAction: (planId: string, category: DevelopmentAction['category']) => void
  onEditAction: (action: DevelopmentAction) => void
  onRecordReview: (reviewId: string, outcome: ReviewOutcome, notes: string | null) => void
  busy: boolean
}) {
  const { plan, actions, reviews } = view
  const progress = planProgress(actions)
  const [openReview, setOpenReview] = useState<DevelopmentReview | null>(null)
  const [reviewOutcome, setReviewOutcome] = useState<ReviewOutcome>('on_track')
  const [reviewNotes, setReviewNotes] = useState('')

  const grouped: Record<DevelopmentAction['category'], DevelopmentAction[]> = {
    workplace: actions.filter((a) => a.category === 'workplace'),
    coaching: actions.filter((a) => a.category === 'coaching'),
    formal_learning: actions.filter((a) => a.category === 'formal_learning'),
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900">{plan.competencyName}</h3>
            {plan.expectedChange && <p className="text-xs text-gray-500 mt-1">{plan.expectedChange}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-900">
              {plan.currentScore ?? '—'} → {plan.targetScore ?? '—'}
            </p>
            {plan.timeToCompetency && <p className="text-[11px] text-gray-400 mt-0.5">{plan.timeToCompetency}</p>}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>
              {progress.completed} of {progress.total} actions complete
            </span>
            <span className="font-semibold">{progress.percent}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress.percent}%`, backgroundColor: progress.percent === 100 ? '#22c55e' : '#f59e0b' }}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Every category renders even when empty — otherwise there'd be no
            "+ Add action" affordance for a category the assessment didn't
            happen to populate. */}
        {(Object.keys(grouped) as DevelopmentAction['category'][]).map((cat) => (
          <div key={cat}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {ACTION_CATEGORY_LABEL[cat]}
              </p>
              <div className="space-y-2">
                {grouped[cat].map((a) => {
                  const overdueAction =
                    a.dueDate && a.status !== 'completed' && a.dueDate < new Date().toISOString().slice(0, 10)
                  return (
                    <div key={a.id} className="flex items-start gap-3">
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: ACTION_STATUS_COLOR[a.status] }}
                      />
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onEditAction(a)}
                          className={[
                            'text-sm text-left w-full',
                            a.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700',
                          ].join(' ')}
                        >
                          {a.description}
                        </button>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          {a.source === 'agreed' && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide accent-text">
                              Agreed
                            </span>
                          )}
                          {a.dueDate && (
                            <span className={['text-[11px]', overdueAction ? 'text-red-600 font-medium' : 'text-gray-400'].join(' ')}>
                              Due {a.dueDate}
                              {overdueAction ? ' · overdue' : ''}
                            </span>
                          )}
                          {a.notes && <span className="text-[11px] text-gray-400 truncate">{a.notes}</span>}
                        </div>
                      </div>
                      <select
                        value={a.status}
                        disabled={busy}
                        onChange={(e) => onActionStatus(a.id, e.target.value as ActionStatus)}
                        className="text-xs rounded-md border border-gray-200 px-2 py-1 shrink-0"
                      >
                        {ACTION_STATUSES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => onAddAction(plan.id, cat)}
                disabled={busy}
                className="text-xs font-medium accent-text mt-2"
              >
                + Add action
              </button>
          </div>
        ))}

        {plan.successMeasure && (
          <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-semibold">Success measure: </span>
            {plan.successMeasure}
          </p>
        )}
        {plan.evidenceRequired.length > 0 && (
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Evidence required: </span>
            {plan.evidenceRequired.join('; ')}
          </p>
        )}
      </div>

      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Review checkpoints</p>
        <div className="space-y-1.5">
          {reviews.map((r) => {
            const overdue = isOverdue(r)
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-500 shrink-0">Day {r.dayOffset}</span>
                  <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-400'}>
                    {r.scheduledDate}
                    {overdue ? ' · overdue' : ''}
                  </span>
                </div>
                {r.completedAt && r.outcome ? (
                  <span className="font-medium shrink-0" style={{ color: REVIEW_OUTCOME_COLOR[r.outcome] }}>
                    {REVIEW_OUTCOME_LABEL[r.outcome]}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setOpenReview(r)
                      setReviewOutcome('on_track')
                      setReviewNotes('')
                    }}
                    className="accent-text font-medium shrink-0"
                  >
                    Record
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {openReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setOpenReview(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-gray-900">
              Day {openReview.dayOffset} review — {plan.competencyName}
            </h4>
            <p className="text-xs text-gray-400 mt-1">Scheduled {openReview.scheduledDate}</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Outcome</label>
                <select
                  className="input"
                  value={reviewOutcome}
                  onChange={(e) => setReviewOutcome(e.target.value as ReviewOutcome)}
                >
                  {REVIEW_OUTCOMES.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  className="input"
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="What actually happened since the last checkpoint?"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-secondary" onClick={() => setOpenReview(null)} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => {
                    onRecordReview(openReview.id, reviewOutcome, reviewNotes.trim() || null)
                    setOpenReview(null)
                  }}
                >
                  {busy ? 'Saving...' : 'Record review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
