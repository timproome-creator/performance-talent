import type { Rag } from '@/lib/scorecard'
import { RAG_LABEL, RAG_COLOR } from '@/lib/scorecard'

// Shared score + RAG display, so the division header, the per-person rows and
// the person page all read identically.
export function ScoreBadge({
  score,
  rag,
  compact = false,
}: {
  score: number | null
  rag: Rag | null
  compact?: boolean
}) {
  if (score === null || rag === null) {
    return (
      <div className={compact ? 'text-right shrink-0' : 'text-right'}>
        <p className={compact ? 'text-sm font-semibold text-gray-300' : 'text-3xl font-bold text-gray-300'}>—</p>
        <p className="text-xs text-gray-400">No data yet</p>
      </div>
    )
  }

  return (
    <div className={compact ? 'text-right shrink-0' : 'text-right'}>
      <p className={compact ? 'text-sm font-semibold text-gray-900' : 'text-3xl font-bold text-gray-900'}>
        {score.toFixed(1)}
        <span className={compact ? 'text-xs font-normal text-gray-400' : 'text-base font-normal text-gray-400'}> / 5</span>
      </p>
      <div
        className="mt-0.5 flex items-center justify-end gap-1.5 text-xs font-medium"
        style={{ color: RAG_COLOR[rag] }}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RAG_COLOR[rag] }} />
        {RAG_LABEL[rag]}
      </div>
    </div>
  )
}
