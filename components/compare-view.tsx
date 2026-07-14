'use client'

import { useState, useMemo } from 'react'
import { GitCompareArrows, Loader2 } from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { compareRows } from '@/lib/calc'
import UnifiedTable from './unified-table'

function fmt(n: any) {
  if (n === null || n === undefined) return '-'
  if (Math.abs(n) >= 1e6) return n.toExponential(3)
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(4).replace(/\.?0+$/, '')
}

export default function CompareView() {
  const rows = useKpiStore((s) => s.rows)
  const headers = useKpiStore((s) => s.headers)
  const [rowA, setRowA] = useState<number | null>(null)
  const [rowB, setRowB] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const findCol = (patterns: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i]).toLowerCase()
      if (patterns.some(p => h.includes(p))) return i
    }
    return -1
  }

  const labelColA = useMemo(() => {
    const c = findCol(['网元', '小区', 'cell', '名称', '基站', 'subnet'])
    return c >= 0 ? c : 5
  }, [headers])
  const labelColB = useMemo(() => {
    const c = findCol(['开始时间', 'starttime', 'time', '时间'])
    return c >= 0 ? c : 10
  }, [headers])

  const getRowLabel = (row: any) => `${row?.[labelColA] ?? ''} - ${row?.[labelColB] ?? ''}`

  const handleCompare = () => {
    if (rowA === null || rowB === null) return
    setLoading(true)
    setTimeout(() => { setResult(compareRows(rowA, rowB)); setLoading(false) }, 80)
  }

  const renderPct = (v: number) => (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
      v > 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
      v < 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
      'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
    }`}>
      {v > 0 ? '+' : ''}{v}%
    </span>
  )

  const nameA = rowA !== null ? getRowLabel(rows[rowA]) : ''
  const nameB = rowB !== null ? getRowLabel(rows[rowB]) : ''

  const columns = result ? [
    { key: 'id', title: '指标', width: 160 },
    { key: 'a', title: nameA || result.nameA, align: 'right' as const, render: (v: any) => <span className="tabular-nums text-xs">{fmt(v)}</span> },
    { key: 'b', title: nameB || result.nameB, align: 'right' as const, render: (v: any) => <span className="tabular-nums text-xs">{fmt(v)}</span> },
    { key: 'diff', title: '差值', align: 'right' as const, width: 100, render: (v: any) => <span className={`tabular-nums font-medium text-xs ${v > 0 ? 'text-emerald-500' : v < 0 ? 'text-red-500' : ''}`}>{v > 0 ? '+' : ''}{fmt(v)}</span> },
    { key: 'pct', title: '变化率', align: 'center' as const, width: 90, render: (v: any) => renderPct(v) },
  ] : []

  return (
    <div className="space-y-3">
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">行 A</label>
          <select value={rowA ?? ''} onChange={e => setRowA(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
            <option value="">选择...</option>
            {rows.map((r, i) => <option key={i} value={i}>{getRowLabel(r)}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">行 B</label>
          <select value={rowB ?? ''} onChange={e => setRowB(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
            <option value="">选择...</option>
            {rows.map((r, i) => <option key={i} value={i}>{getRowLabel(r)}</option>)}
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
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
              <h3 className="text-xs font-medium text-[hsl(var(--primary))] mb-0.5">{nameA || result.nameA}</h3>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">对比基准</p>
            </div>
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
              <h3 className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-0.5">{nameB || result.nameB}</h3>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">对比目标</p>
            </div>
          </div>

          <UnifiedTable
            columns={columns}
            data={result.diffs}
            searchable
            showTotal
            rowClassName={(row) => row.diff !== 0 ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}
          />
        </>
      )}

      {!result && (
        <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
          <GitCompareArrows className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">选择两行数据进行指标差异对比分析</p>
        </div>
      )}
    </div>
  )
}
