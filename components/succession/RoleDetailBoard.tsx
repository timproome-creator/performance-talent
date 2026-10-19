'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Person, SuccessionCandidate } from '@/lib/types'
import type { RoleSummary } from '@/app/succession/actions'
import {
  updateRole,
  archiveRole,
  setRoleRiskOverride,
  addSuccessionCandidate,
  updateSuccessionCandidate,
  removeSuccessionCandidate,
} from '@/app/succession/actions'
import { RoleForm, type RoleFormValues } from './RoleForm'
import { RiskOverridePanel, type RiskOverrideValues } from './RiskOverridePanel'
import { SuccessorForm, type SuccessorFormValues } from './SuccessorForm'
import { RiskBadge } from './RiskBadge'
import { ReadinessBadge } from './ReadinessBadge'

export function RoleDetailBoard({
  summary,
  people,
  developmentHints,
}: {
  summary: RoleSummary
  people: Person[]
  developmentHints: Record<string, string | null>
}) {
  const router = useRouter()
  const [editingRole, setEditingRole] = useState(false)
  const [showRiskPanel, setShowRiskPanel] = useState(false)
  const [addingCandidate, setAddingCandidate] = useState(false)
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { role, incumbent, candidates, effectiveRisk, riskSource } = summary

  async function handleRoleSubmit(values: RoleFormValues) {
    setBusy(true)
    setError(null)
    try {
      await updateRole(role.id, values)
      setEditingRole(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleArchiveRole() {
    if (!confirm(`Archive the "${role.title}" role? It will no longer appear in the succession map.`)) return
    try {
      await archiveRole(role.id)
      router.push('/succession')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not archive.')
    }
  }

  async function handleRiskSubmit(values: RiskOverrideValues) {
    setBusy(true)
    setError(null)
    try {
      await setRoleRiskOverride(role.id, { riskOverride: values.riskOverride, riskNote: values.riskNote })
      setShowRiskPanel(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save risk override.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAddCandidate(values: SuccessorFormValues) {
    setBusy(true)
    setError(null)
    try {
      await addSuccessionCandidate({ roleId: role.id, ...values })
      setAddingCandidate(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add successor.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEditCandidate(candidateId: string, values: SuccessorFormValues) {
    setBusy(true)
    setError(null)
    try {
      await updateSuccessionCandidate(candidateId, values)
      setEditingCandidateId(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveCandidate(candidate: SuccessionCandidate, personName: string) {
    if (!confirm(`Remove ${personName} as a successor for this role?`)) return
    try {
      await removeSuccessionCandidate(candidate.id)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove.')
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="err">{error}</p>}

      {editingRole ? (
        <RoleForm people={people} editing={role} busy={busy} onSubmit={handleRoleSubmit} onCancel={() => setEditingRole(false)} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Incumbent</p>
              <p className="text-sm text-gray-900 mt-1">
                {incumbent ? (
                  <Link href={`/tracker/${incumbent.id}`} className="accent-text font-medium">
                    {incumbent.name}
                  </Link>
                ) : (
                  <span className="text-gray-400 italic">Vacant</span>
                )}
              </p>
              {role.division && (
                <p className="text-xs text-gray-400 mt-1">
                  {role.division}
                  {role.team ? ` / ${role.team}` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-3 shrink-0">
              <button type="button" className="text-xs font-medium accent-text" onClick={() => setEditingRole(true)}>
                Edit
              </button>
              <button type="button" className="text-xs font-medium text-red-600 hover:text-red-800" onClick={handleArchiveRole}>
                Archive
              </button>
            </div>
          </div>

          {role.isCritical && role.criticalityReason && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Why critical</p>
              <p className="text-sm text-gray-700 mt-1">{role.criticalityReason}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Succession risk</p>
              <RiskBadge risk={effectiveRisk} />
              {riskSource === 'override' && role.riskNote && <p className="text-xs text-gray-400 mt-1">{role.riskNote}</p>}
            </div>
            <button type="button" className="text-xs font-medium accent-text" onClick={() => setShowRiskPanel(true)}>
              {riskSource === 'override' ? 'Edit override' : 'Override'}
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Successors</p>
          {!addingCandidate && (
            <button type="button" className="text-xs font-medium accent-text" onClick={() => setAddingCandidate(true)}>
              Add successor
            </button>
          )}
        </div>

        {addingCandidate && (
          <div className="mb-3">
            <SuccessorForm
              people={people}
              excludePersonIds={candidates.map((c) => c.person.id)}
              editing={null}
              developmentHints={developmentHints}
              busy={busy}
              onSubmit={handleAddCandidate}
              onCancel={() => setAddingCandidate(false)}
            />
          </div>
        )}

        {candidates.length === 0 ? (
          <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-xl px-4 py-6 text-center">
            No successors identified yet.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {candidates.map((c) =>
              editingCandidateId === c.candidate.id ? (
                <div key={c.candidate.id} className="p-4">
                  <SuccessorForm
                    people={people}
                    excludePersonIds={[]}
                    editing={c}
                    developmentHints={developmentHints}
                    busy={busy}
                    onSubmit={(values) => handleEditCandidate(c.candidate.id, values)}
                    onCancel={() => setEditingCandidateId(null)}
                  />
                </div>
              ) : (
                <div key={c.candidate.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <Link href={`/succession/successors/${c.candidate.id}`} className="text-sm font-medium accent-text">
                      {c.person.name}
                    </Link>
                    {c.person.status === 'archived' && <span className="text-xs text-gray-400 ml-1.5">(archived)</span>}
                    <div className="mt-1">
                      <ReadinessBadge readiness={c.candidate.readiness} />
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      type="button"
                      className="text-xs font-medium accent-text"
                      onClick={() => setEditingCandidateId(c.candidate.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                      onClick={() => handleRemoveCandidate(c.candidate, c.person.name)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {showRiskPanel && (
        <RiskOverridePanel role={role} busy={busy} onSubmit={handleRiskSubmit} onCancel={() => setShowRiskPanel(false)} />
      )}
    </div>
  )
}
