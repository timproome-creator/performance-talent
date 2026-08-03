'use client'

import { useState } from 'react'
import type { NineBoxEntry } from '@/lib/types'
import { upsertNineBoxOverride } from '@/app/ninebox/actions'
import { NineBoxGrid } from './NineBoxGrid'
import { OverridePanel, type OverrideValues } from './OverridePanel'

export function NineBoxBoard({ initialEntries, fyStartYear }: { initialEntries: NineBoxEntry[]; fyStartYear: number }) {
  const [entries, setEntries] = useState(initialEntries)
  const [selected, setSelected] = useState<NineBoxEntry | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(values: OverrideValues) {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const parseOrNull = (v: string) => (v.trim() === '' ? null : Number(v))
      const updated = await upsertNineBoxOverride({
        personId: selected.person.id,
        fyStartYear,
        potentialOverride: parseOrNull(values.potentialOverride),
        performanceOverride: parseOrNull(values.performanceOverride),
        notes: values.notes.trim() || null,
      })
      setEntries((prev) =>
        prev.map((e) =>
          e.person.id === selected.person.id
            ? {
                ...e,
                position: updated,
                potential: updated.potentialOverride ?? updated.potentialComputed,
                performance: updated.performanceOverride ?? updated.performanceComputed,
                potentialSource: updated.potentialOverride !== null ? 'override' : e.potentialSource,
                performanceSource: updated.performanceOverride !== null ? 'override' : e.performanceSource,
              }
            : e,
        ),
      )
      setSelected(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="err">{error}</p>}
      <NineBoxGrid entries={entries} onSelect={setSelected} />
      {selected && (
        <OverridePanel entry={selected} busy={busy} onSubmit={handleSubmit} onCancel={() => setSelected(null)} />
      )}
    </div>
  )
}
