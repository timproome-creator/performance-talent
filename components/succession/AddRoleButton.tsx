'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Person } from '@/lib/types'
import { createRole } from '@/app/succession/actions'
import { RoleForm, type RoleFormValues } from './RoleForm'

export function AddRoleButton({ people }: { people: Person[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(values: RoleFormValues) {
    setBusy(true)
    setError(null)
    try {
      await createRole(values)
      setShowForm(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (showForm) {
    return (
      <div className="space-y-2">
        {error && <p className="err">{error}</p>}
        <RoleForm people={people} editing={null} busy={busy} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
      </div>
    )
  }

  return (
    <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
      Add a critical role
    </button>
  )
}
