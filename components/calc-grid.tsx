'use client'

import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { calcAll } from '@/lib/calc'

function fmt(n: any) {
  if (n === null || n === undefined) return '-'
  if (Math.abs(n) >= 1e6) return n.toExponential(3)
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(4).replace(/\.?0+$/, '')
}

export default function CalcGrid() {
  const rows = useKpiStore((s) => s.rows)
  const [rowIndex, setRowIndex] = useState<number | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleCalc = () => {
    if (rowIndex === null) return
    setLoading(true)
    setTimeout(() => { setResults(calcAll(rowIndex)); setLoading(false) }, 50)
  }

  return (
    <div className="space-y-3">
      <div className="card-dark rounded-lg p-3 flex items-center gap-3">
        <select
          value={rowIndex ?? ''}
          onChange={e => setRowIndex(e.target.value ? Number(e.target.value) : null)}
          className="flex-1 max-w-sm px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
        >
          <option value="">选择数据行...</option>
          {rows.map((r, i) => <option key={i} value={i}>{r[5] || ''} - {r[10] || ''}</option>)}
        </select>
        <button
          onClick={handleCalc}
          disabled={rowIndex === null || loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-40 text-white text-sm font-medium rounded-md transition-opacity"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          计算
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {results.map((r, i) => (
          <div key={i} className="card-dark rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="font-mono text-xs font-medium text-[hsl(var(--primary))]">{r.id}</span>
              {!r.error && r.result !== null && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-muted">{r.desc.slice(0, 12)}</span>
              )}
            </div>
            <div className={`text-xl font-semibold mb-1 ${r.error ? 'text-red-500' : 'text-emerald-500'}`}>
              {r.error ? `错误` : fmt(r.result)}
            </div>
            <div className="text-[11px] text-muted mb-2">公式: {r.formula}</div>
            {r.steps?.length > 0 && (
              <div className="bg-[hsl(var(--muted))] rounded-md p-2 space-y-0.5 mt-2">
                {r.steps.map((s: string, j: number) => <div key={j} className="text-[10px] font-mono text-emerald-500">{s}</div>)}
                <div className="text-[10px] font-mono text-muted pt-1 border-t border-[hsl(var(--border))]">→ {r.expr} = {fmt(r.result)}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!results.length && !loading && rowIndex === null && (
        <div className="text-center py-16 text-muted"><p>请先选择数据行，然后点击计算</p></div>
      )}
    </div>
  )
}
