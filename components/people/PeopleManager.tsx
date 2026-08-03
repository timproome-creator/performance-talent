'use client'

import { useState } from 'react'
import type { Person } from '@/lib/types'
import { createPerson, updatePerson, archivePerson } from '@/app/actions'
import { PeopleTable } from './PeopleTable'
import { PersonForm, type PersonFormValues } from './PersonForm'

export function PeopleManager({ initialPeople }: { initialPeople: Person[] }) {
  const [people, setPeople] = useState(initialPeople)
  const [editing, setEditing] = useState<Person | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(values: PersonFormValues) {
    setBusy(true)
    setError(null)
    try {
      if (editing) {
        const updated = await updatePerson(editing.id, values)
        setPeople((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const created = await createPerson(values)
        setPeople((prev) => [...prev, created])
      }
      setShowForm(false)
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleArchive(person: Person) {
    if (!confirm(`Archive ${person.name}? They will no longer appear in the roster or as a KPI owner option.`)) return
    try {
      await archivePerson(person.id)
      setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, status: 'archived' } : p)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not archive.')
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="err">{error}</p>}

      <PeopleTable
        people={people}
        onEdit={(p) => {
          setEditing(p)
          setShowForm(true)
        }}
        onArchive={handleArchive}
      />

      {showForm ? (
        <PersonForm
          people={people}
          editing={editing}
          busy={busy}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      ) : (
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
        >
          Add a person
        </button>
      )}
    </div>
  )
}
