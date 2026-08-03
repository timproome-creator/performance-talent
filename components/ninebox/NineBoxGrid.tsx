import { Fragment } from 'react'
import type { NineBoxBand } from '@/lib/ninebox'
import { bandFor, NINEBOX_LABEL } from '@/lib/ninebox'
import type { NineBoxEntry } from '@/lib/types'

const BANDS: NineBoxBand[] = ['high', 'medium', 'low'] // rows, top to bottom
const COLS: NineBoxBand[] = ['low', 'medium', 'high'] // columns, left to right

export function NineBoxGrid({
  entries,
  onSelect,
}: {
  entries: NineBoxEntry[]
  onSelect: (entry: NineBoxEntry) => void
}) {
  const positioned = entries.filter((e) => e.potential !== null && e.performance !== null)
  const unpositioned = entries.filter((e) => e.potential === null || e.performance === null)

  const cell = (potBand: NineBoxBand, perfBand: NineBoxBand) =>
    positioned.filter((e) => bandFor(e.potential!) === potBand && bandFor(e.performance!) === perfBand)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2">
        <div />
        <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide pb-1">
          Low performance
        </div>
        <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide pb-1">
          Medium performance
        </div>
        <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide pb-1">
          High performance
        </div>

        {BANDS.map((potBand) => (
          <Fragment key={potBand}>
            <div
              className="flex items-center justify-center text-xs font-semibold text-gray-500 uppercase tracking-wide [writing-mode:vertical-rl] rotate-180"
            >
              {potBand} potential
            </div>
            {COLS.map((perfBand) => {
              const people = cell(potBand, perfBand)
              return (
                <div
                  key={`${potBand}-${perfBand}`}
                  className="min-h-[110px] rounded-lg border border-gray-200 bg-white p-2"
                >
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    {NINEBOX_LABEL[potBand][perfBand]}
                  </p>
                  <div className="space-y-1">
                    {people.map((e) => (
                      <button
                        key={e.person.id}
                        onClick={() => onSelect(e)}
                        className="w-full text-left text-xs font-medium text-gray-900 bg-gray-50 hover:accent-panel rounded px-2 py-1 flex items-center justify-between gap-1"
                      >
                        <span className="truncate">{e.person.name}</span>
                        {(e.potentialSource === 'override' || e.performanceSource === 'override') && (
                          <span className="text-[9px] text-gray-400 shrink-0">adj.</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>

      {unpositioned.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Not yet positioned — missing {unpositioned.some((e) => e.potential === null) ? 'a WLEA assessment' : ''}
            {unpositioned.some((e) => e.potential === null) && unpositioned.some((e) => e.performance === null)
              ? ' and/or '
              : ''}
            {unpositioned.some((e) => e.performance === null) ? 'KPI progress data' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {unpositioned.map((e) => (
              <button
                key={e.person.id}
                onClick={() => onSelect(e)}
                className="text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-100"
              >
                {e.person.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
