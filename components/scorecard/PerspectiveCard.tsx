import type { PerspectiveRollup } from '@/lib/scorecard'
import { RAG_LABEL, RAG_COLOR } from '@/lib/scorecard'

export function PerspectiveCard({ rollup }: { rollup: PerspectiveRollup }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{rollup.label}</p>

      {rollup.score === null ? (
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-300">—</p>
          <p className="text-xs text-gray-400 mt-1">
            {rollup.objectivesTagged === 0
              ? 'No objectives tagged to this perspective yet.'
              : `${rollup.objectivesTagged} objective(s) tagged, but none have ${rollup.quarter ?? 'this quarter'}'s progress recorded yet.`}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">{rollup.score.toFixed(1)}</p>
            <span className="text-sm text-gray-400">/ 5</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium" style={{ color: RAG_COLOR[rollup.rag!] }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RAG_COLOR[rollup.rag!] }} />
            {RAG_LABEL[rollup.rag!]}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {rollup.objectivesScored} of {rollup.objectivesTagged} objective(s) — {rollup.quarter} progress
          </p>
        </div>
      )}
    </div>
  )
}
