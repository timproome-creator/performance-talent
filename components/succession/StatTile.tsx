// Direct clone of PerspectiveCard.tsx's markup — same stat-tile pattern,
// generalised past the RAG-score shape since Succession's headline numbers
// are plain counts, not scores.
export function StatTile({ label, value, caption }: { label: string; value: number | string; caption?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      {caption && <p className="text-xs text-gray-400 mt-1">{caption}</p>}
    </div>
  )
}
