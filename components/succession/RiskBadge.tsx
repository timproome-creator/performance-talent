import type { SuccessionRisk } from '@/lib/types'
import { RISK_LABEL, RISK_COLOR } from '@/lib/succession'

export function RiskBadge({ risk, compact = false }: { risk: SuccessionRisk | null; compact?: boolean }) {
  if (!risk) {
    return <span className="text-xs text-gray-400">No data</span>
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${compact ? 'text-xs' : 'text-sm'}`}
      style={{ color: RISK_COLOR[risk] }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLOR[risk] }} />
      {RISK_LABEL[risk]}
    </span>
  )
}
