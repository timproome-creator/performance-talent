import type { SuccessionReadiness } from '@/lib/types'
import { READINESS_LABEL, READINESS_COLOR } from '@/lib/succession'

export function ReadinessBadge({ readiness }: { readiness: SuccessionReadiness }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ color: READINESS_COLOR[readiness], backgroundColor: `${READINESS_COLOR[readiness]}1a` }}
    >
      {READINESS_LABEL[readiness]}
    </span>
  )
}
