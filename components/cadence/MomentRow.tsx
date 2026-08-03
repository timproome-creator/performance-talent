import Link from 'next/link'
import type { MomentStatus } from '@/lib/cadence'
import { STATE_COLOR, STATE_LABEL } from '@/lib/cadence'

// A stop on the year's timeline, not a card in a grid — the whole point of
// "year at a glance" is the sequence, so the layout has to read top-to-bottom
// in the same order the cadence actually runs, with a connecting rail rather
// than cards that wrap arbitrarily at each breakpoint.
export function MomentRow({
  moment,
  isCurrent,
  isLast,
}: {
  moment: MomentStatus
  isCurrent: boolean
  isLast: boolean
}) {
  const colors = STATE_COLOR[moment.state]
  const percent = moment.total === 0 ? 0 : Math.round((moment.completed / moment.total) * 100)
  const isUpcoming = moment.state === 'upcoming'

  return (
    <li className="relative flex gap-4 sm:gap-5">
      <div className="flex flex-col items-center w-4 shrink-0 pt-5">
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0"
          style={{
            backgroundColor: colors.bar,
            boxShadow: isCurrent ? `0 0 0 4px ${colors.bg}, 0 0 0 5px ${colors.bar}` : undefined,
          }}
        />
        {!isLast && <span className="flex-1 w-px mt-1" style={{ backgroundColor: '#e5e7eb' }} />}
      </div>

      <Link
        href={moment.href}
        className="block flex-1 min-w-0 mb-4 rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm"
        style={
          isCurrent
            ? { borderColor: 'var(--brand-primary)', borderWidth: 2 }
            : { borderColor: '#e5e7eb', borderWidth: 1 }
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
              style={{ color: isCurrent ? 'var(--brand-primary)' : '#9ca3af' }}
            >
              {moment.monthLabel}
              {isCurrent ? ' · now' : ''}
            </span>
            <p className="text-sm font-bold text-gray-900 truncate">{moment.label}</p>
          </div>
          <span
            className="text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0"
            style={{ color: colors.text, backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
          >
            {STATE_LABEL[moment.state]}
          </span>
        </div>

        {isUpcoming ? (
          <p className="text-xs text-gray-500 mt-2">Due {moment.monthLabel}</p>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percent}%`, backgroundColor: colors.bar }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">
              {moment.completed} of {moment.total} {moment.measure}
            </span>
          </div>
        )}
      </Link>
    </li>
  )
}
