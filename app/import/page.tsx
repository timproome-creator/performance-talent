'use client'

import { useState } from 'react'
import Link from 'next/link'
import { importConnect2Workbook, type ImportSummary } from './actions'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  async function handleImport() {
    if (!file) return
    setBusy(true)
    setError(null)
    setSummary(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await importConnect2Workbook(formData)
      setSummary(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900">Import from Connect 2.0</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Upload your Connect 2.0 KPI Tracker workbook. Every tab except the known template/guide
          sheets is treated as a person&apos;s tracker — their objectives, weightings, and manager
          are read directly from it. Re-importing a person who already has objectives in the app
          leaves them untouched, so this is safe to run again for teammates you haven&apos;t added
          yet.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <div className="mt-4">
            <button type="button" className="btn-primary" onClick={handleImport} disabled={!file || busy}>
              {busy ? 'Importing...' : 'Import workbook'}
            </button>
          </div>
        </div>

        {error && <p className="err mt-4">{error}</p>}

        {summary && (
          <div className="mt-6 space-y-4">
            {summary.sheetsSkipped.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Sheets skipped</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {summary.sheetsSkipped.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {summary.people.map((p) => (
              <div key={p.name} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <span className="text-xs font-medium text-gray-500">
                    {p.action === 'created' ? 'New person added' : 'Matched existing person'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                  <p>
                    {p.objectivesSkipped
                      ? 'Already had objectives — left untouched.'
                      : `${p.objectivesImported} objective(s) imported.`}
                  </p>
                  {p.managerResolved && <p>Manager linked: {p.managerResolved}</p>}
                  {p.managerUnresolved && (
                    <p className="text-amber-600">
                      Manager &quot;{p.managerUnresolved}&quot; not found in the app — not linked. Add
                      them or fix manually on the People page.
                    </p>
                  )}
                  {p.warnings.map((w, i) => (
                    <p key={i} className="text-amber-600">{w}</p>
                  ))}
                </div>
              </div>
            ))}

            <Link href="/people" className="text-sm accent-text font-medium">
              Go to People →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
