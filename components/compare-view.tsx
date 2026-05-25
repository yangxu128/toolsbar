'use client'

import { useState } from 'react'
import { GitCompareArrows, Loader2 } from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { compareRows } from '@/lib/calc'

function fmt(n: any) {
  if (n === null || n === undefined) return '-'
  if (Math.abs(n) >= 1e6) return n.toExponential(3)
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(4).replace(/\.?0+$/, '')
}

export default function CompareView() {
  const rows = useKpiStore((s) => s.rows)
  const [rowA, setRowA] = useState<number | null>(null)
  const [rowB, setRowB] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCompare = () => {
    if (rowA === null || rowB === null) return
    setLoading(true)
    setTimeout(() => { setResult(compareRows(rowA, rowB)); setLoading(false) }, 80)
  }

  const renderPct = (v: number) => (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
      v > 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
      v < 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
      'bg-[hsl(var(--secondary))] text-muted'
    }`}>
      {v > 0 ? '+' : ''}{v}%
    </span>
  )

  return (
    <div className="space-y-3">
      <div className="card-dark rounded-lg p-3 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium text-muted mb-1">行 A</label>
          <select value={rowA ?? ''} onChange={e => setRowA(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
            <option value="">选择...</option>
            {rows.map((r, i) => <option key={i} value={i}>{r[5]} - {r[10]}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium text-muted mb-1">行 B</label>
          <select value={rowB ?? ''} onChange={e => setRowB(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
            <option value="">选择...</option>
            {rows.map((r, i) => <option key={i} value={i}>{r[5]} - {r[10]}</option>)}
          </select>
        </div>
        <button
          onClick={handleCompare}
          disabled={rowA === null || rowB === null || loading}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-40 text-white text-sm font-medium rounded-md transition-opacity"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitCompareArrows className="w-3.5 h-3.5" />}
          对比
        </button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="card-dark rounded-lg p-4">
              <h3 className="text-xs font-medium text-[hsl(var(--primary))] mb-0.5">{result.nameA}</h3>
              <p className="text-[11px] text-muted">对比基准</p>
            </div>
            <div className="card-dark rounded-lg p-4">
              <h3 className="text-xs font-medium text-muted mb-0.5">{result.nameB}</h3>
              <p className="text-[11px] text-muted">对比目标</p>
            </div>
          </div>

          <div className="card-dark rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[hsl(var(--card))]">
                    <th className="px-3 py-2 text-left font-medium w-[140px] text-[hsl(var(--foreground))]">指标</th>
                    <th className="px-3 py-2 text-right font-medium text-[hsl(var(--foreground))]">{result.nameA}</th>
                    <th className="px-3 py-2 text-right font-medium text-[hsl(var(--foreground))]">{result.nameB}</th>
                    <th className="px-3 py-2 text-right font-medium w-[90px] text-[hsl(var(--foreground))]">差值</th>
                    <th className="px-3 py-2 text-center font-medium w-[80px] text-[hsl(var(--foreground))]">变化率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {result.diffs.map((d: any, i: number) => (
                    <tr key={i} className="hover:bg-[hsl(var(--muted))]">
                      <td className="px-3 py-2 font-mono text-[hsl(var(--primary))] font-medium text-[11px]">{d.id}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted text-xs">{fmt(d.a)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted text-xs">{fmt(d.b)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-xs">{d.diff > 0 ? '+' : ''}{fmt(d.diff)}</td>
                      <td className="px-3 py-2 text-center">{renderPct(d.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!result && (
        <div className="text-center py-16 text-muted">
          <GitCompareArrows className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">选择两行数据进行指标差异对比分析</p>
        </div>
      )}
    </div>
  )
}
