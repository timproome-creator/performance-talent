import type { ObjectiveStatus, ObjectiveWithProgress } from '@/lib/types'
import { QUARTERS, STATUSES } from '@/lib/types'
import { STATUS_COLOR, RATING_LABEL, currentQuarter } from '@/lib/kpi'

export function ObjectiveRow({
  objective,
  onEdit,
  onDelete,
  onSetQuarterStatus,
}: {
  objective: ObjectiveWithProgress
  onEdit: () => void
  onDelete: () => void
  onSetQuarterStatus: (quarter: (typeof QUARTERS)[number], status: ObjectiveStatus) => void
}) {
  const active = currentQuarter()

  return (
    <div className="border-t border-gray-100 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {objective.divisionSubObjective && (
            <div className="text-xs text-gray-400 mb-0.5">{objective.divisionSubObjective}</div>
          )}
          <div className="text-sm font-medium text-gray-900">{objective.objective}</div>
          {objective.measuresOfSuccess && (
            <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">{objective.measuresOfSuccess}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-gray-900">{Math.round(objective.weighting * 100)}%</div>
          {objective.dueDate && <div className="text-xs text-gray-400">Due {objective.dueDate}</div>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUARTERS.map((q) => {
          const status = objective.progress[q]
          const isActive = q === active
          return (
            <select
              key={q}
              value={status ?? ''}
              onChange={(e) => onSetQuarterStatus(q, e.target.value as ObjectiveStatus)}
              className={[
                'text-xs rounded-md border px-2 py-1',
                isActive ? 'accent-ring' : 'border-gray-200',
              ].join(' ')}
              style={status ? { color: STATUS_COLOR[status] } : undefined}
            >
              <option value="" disabled>{q}</option>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{q}: {s.label}</option>
              ))}
            </select>
          )
        })}
        {objective.finalRating && (
          <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-md px-2 py-1">
            {RATING_LABEL[objective.finalRating]}
          </span>
        )}
      </div>

      {(objective.associateComment || objective.managerComment) && (
        <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs text-gray-500">
          {objective.associateComment && <p><span className="font-semibold">Associate:</span> {objective.associateComment}</p>}
          {objective.managerComment && <p><span className="font-semibold">Manager:</span> {objective.managerComment}</p>}
        </div>
      )}

      <div className="mt-2 flex justify-end gap-3">
        <button onClick={onEdit} className="text-xs font-medium accent-text">Edit</button>
        <button onClick={onDelete} className="text-xs font-medium text-red-600 hover:text-red-800">Delete</button>
      </div>
    </div>
  )
}
