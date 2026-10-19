'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SuccessorProfileView } from '@/app/succession/actions'
import { updateSuccessionCandidate } from '@/app/succession/actions'
import { EvidencePanel } from './EvidencePanel'
import { ReadinessBadge } from './ReadinessBadge'
import { RiskBadge } from './RiskBadge'

// Readiness/priority are intentionally read-only here and only editable
// from the role detail screen — one owner per field, so they can't drift
// out of sync between the two views. Only commentary is editable in place.
export function SuccessorProfileBoard({ profile }: { profile: SuccessorProfileView }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [commentary, setCommentary] = useState(profile.candidate.commentary ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveCommentary() {
    setBusy(true)
    setError(null)
    try {
      await updateSuccessionCandidate(profile.candidate.id, {
        readiness: profile.candidate.readiness,
        priorityRank: profile.candidate.priorityRank,
        expectedReadinessDate: profile.candidate.expectedReadinessDate,
        commentary,
      })
      setEditing(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="err">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Management judgement</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Readiness</p>
            <ReadinessBadge readiness={profile.candidate.readiness} />
            <p className="text-xs text-gray-400 mt-1">Edit from the role detail screen.</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Succession risk (role-level)</p>
            <RiskBadge risk={profile.effectiveRisk} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Date added</p>
            <p className="text-sm text-gray-700">{new Date(profile.candidate.addedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400">Manager / HR commentary</p>
            {!editing && (
              <button type="button" className="text-xs font-medium accent-text" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <textarea className="input" rows={3} value={commentary} onChange={(e) => setCommentary(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="btn-primary" onClick={saveCommentary} disabled={busy}>
                  {busy ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700">
              {profile.candidate.commentary || <span className="text-gray-300 italic">No commentary yet.</span>}
            </p>
          )}
        </div>
      </div>

      <EvidencePanel evidence={profile.evidence} personId={profile.person.id} />
    </div>
  )
}
