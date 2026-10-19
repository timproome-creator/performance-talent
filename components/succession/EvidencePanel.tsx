import type { ReactNode } from 'react'
import Link from 'next/link'
import type { SuccessionEvidence } from '@/app/succession/actions'
import { ScoreBadge } from '@/components/scorecard/ScoreBadge'
import { planProgress } from '@/lib/idp'

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{children}</p>
}

// Every value here is a read-only reference to data owned elsewhere
// (assessment, scorecard, 9-box, IDP) — nothing is recomputed. Two
// sections only ("current evidence" + "development action"); the third
// spec section, "management judgement", is rendered by the caller
// (SuccessorProfileBoard) since that's where readiness/risk/commentary
// actually live and get edited.
export function EvidencePanel({ evidence, personId }: { evidence: SuccessionEvidence; personId: string }) {
  const { assessment, scorecard, ninebox, idp } = evidence

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <SectionLabel>Current evidence</SectionLabel>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400">Assessment (manager)</p>
            {assessment?.overallManager != null ? (
              <>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {assessment.overallManager.toFixed(1)} <span className="text-xs font-normal text-gray-400">/ 5</span>
                </p>
                <p className="text-xs text-gray-400">{assessment.maturityLabel ?? '—'}</p>
                {assessment.matchMethod === 'name' && (
                  <p className="text-xs text-amber-600 mt-0.5">Matched by name — verify</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-300 mt-1">No completed assessment</p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Balanced Scorecard</p>
            {scorecard ? (
              <ScoreBadge score={scorecard.scorecard.overall} rag={scorecard.scorecard.overallRag} compact />
            ) : (
              <p className="text-sm text-gray-300">No data yet</p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400">9-Box position</p>
            {ninebox && (ninebox.potentialOverride ?? ninebox.potentialComputed) != null ? (
              <p className="text-sm text-gray-700 mt-1">
                Potential {(ninebox.potentialOverride ?? ninebox.potentialComputed)?.toFixed(1)} · Performance{' '}
                {(ninebox.performanceOverride ?? ninebox.performanceComputed)?.toFixed(1) ?? '—'}
              </p>
            ) : (
              <p className="text-sm text-gray-300 mt-1">Not yet positioned</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <SectionLabel>Development action</SectionLabel>
        {idp.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">No development plan yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {idp.map(({ plan, actions }) => {
              const progress = planProgress(actions)
              return (
                <div key={plan.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{plan.competencyName}</span>
                  <span className="text-gray-400">
                    {progress.completed}/{progress.total} actions · {progress.percent}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <Link href={`/idp/${personId}`} className="inline-block mt-3 text-xs font-medium accent-text">
          Open full development plan →
        </Link>
      </div>
    </div>
  )
}
