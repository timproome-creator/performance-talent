import { getNineBoxGrid } from '@/app/ninebox/actions'
import { NineBoxBoard } from '@/components/ninebox/NineBoxBoard'
import { AccessPrompt } from '@/components/AccessPrompt'
 import { isNotAuthorised } from '@/lib/auth'
import { currentFyStartYear, fyLabel } from '@/lib/kpi'
import { BRAND } from '@/lib/brand'

export default async function NineBoxPage() {
  const fyStartYear = currentFyStartYear()
  let entries
  try {
    entries = await getNineBoxGrid(fyStartYear)
  } catch (e) {
    return <AccessPrompt reason={isNotAuthorised(e) ? "not_authorised" : "signed_out"} />
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section style={{ backgroundColor: 'var(--brand-header)', color: 'var(--brand-on-header)' }}>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--brand-accent)' }}>
            9-Box — {fyLabel(fyStartYear)}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight max-w-3xl">
            Potential × Performance, dated per cycle.
          </h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--brand-accent-soft)' }}>
            {BRAND.name} plots Potential from each person&apos;s latest WLEA assessment against
            Performance from their live Connect 2.0 objectives — computed automatically, adjustable
            in a real conversation. Click anyone to see the numbers behind their position or override
            it.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <NineBoxBoard initialEntries={entries} fyStartYear={fyStartYear} />
      </div>
    </main>
  )
}
