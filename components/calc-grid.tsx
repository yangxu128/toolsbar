'use client'

import { useState, useMemo } from 'react'
import { Play, Loader2, BarChart3, Download } from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { calcAll, evaluateFormulaWithValues } from '@/lib/calc'
import UnifiedTable from './unified-table'

function fmt(n: any) {
  if (n === null || n === undefined) return '-'
  if (Math.abs(n) >= 1e6) return n.toExponential(3)
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(4).replace(/\.?0+$/, '')
}

type DimKey = 'none' | 'time' | 'subnet' | 'city'

const dimOptions: { key: DimKey; label: string; desc: string }[] = [
  { key: 'none', label: '单行计算', desc: '逐行计算指标' },
  { key: 'time', label: '开始时间', desc: '按开始时间列汇总' },
  { key: 'subnet', label: '子网名称', desc: '按子网名称列汇总' },
  { key: 'city', label: '地市', desc: '按子网名称前两位字符汇总' },
]

export default function CalcGrid() {
  const rows = useKpiStore((s) => s.rows)
  const headers = useKpiStore((s) => s.headers)
  const metrics = useKpiStore((s) => s.metrics)
  const [mode, setMode] = useState<DimKey>('none')
  const [rowIndex, setRowIndex] = useState<number | null>(null)
  const [results, setResults] = useState<any[]>([])
  const [dimResult, setDimResult] = useState<{ metricIds: string[]; data: any[] }>({ metricIds: [], data: [] })
  const [loading, setLoading] = useState(false)

  const metricMap = useMemo(() => {
    const map: Record<string, string> = {}
    metrics.forEach(m => { map[m.id] = m.desc })
    return map
  }, [metrics])

  const findCol = (patterns: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i]).toLowerCase()
      if (patterns.some(p => h.includes(p))) return i
    }
    return -1
  }

  const timeCol = useMemo(() => findCol(['开始时间', 'starttime', 'start_time', '时间']), [headers])
  const subnetCol = useMemo(() => findCol(['子网名称', 'subnetname', 'subnet_name', '网元名称']), [headers])
  const labelColA = useMemo(() => {
    const c = findCol(['网元', '小区', 'cell', '名称', '基站', 'subnet'])
    return c >= 0 ? c : 5
  }, [headers])
  const labelColB = useMemo(() => {
    const c = findCol(['开始时间', 'starttime', 'time', '时间'])
    return c >= 0 ? c : 10
  }, [headers])

  const getRowLabel = (row: any) => `${row?.[labelColA] ?? ''} - ${row?.[labelColB] ?? ''}`

  const handleCalc = () => {
    if (mode === 'none') {
      if (rowIndex === null) return
      setResults(calcAll(rowIndex))
      return
    }

    const groups = new Map<string, { key: string; rows: number[] }>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      let key = ''
      if (mode === 'time') {
        key = timeCol >= 0 ? String(row[timeCol] ?? '').trim() : ''
      } else if (mode === 'subnet') {
        key = subnetCol >= 0 ? String(row[subnetCol] ?? '').trim() : ''
      } else if (mode === 'city') {
        const raw = subnetCol >= 0 ? String(row[subnetCol] ?? '').trim() : ''
        key = raw.replace(/\s/g, '').slice(0, 2)
      }
      if (!key) key = '未知'
      if (!groups.has(key)) groups.set(key, { key, rows: [] })
      groups.get(key)!.rows.push(i)
    }

    const allCounterIds = new Set<string>()
    for (const m of metrics) {
      if (!m.formula) continue
      const ids = m.formula.match(/C\d+/g) || []
      ids.forEach(id => allCounterIds.add(id))
    }

    const allMetrics = new Set<string>()
    const groupResults: any[] = []

    for (const [key, g] of groups) {
      const counterSums: Record<string, number> = {}
      for (const ri of g.rows) {
        const row = rows[ri]
        for (const id of allCounterIds) {
          const colIdx = headers.findIndex((h: string) => h.startsWith(id + ':') || h === id)
          const v = colIdx >= 0 ? parseFloat(String(row[colIdx] ?? '').replace(/,/g, '')) || 0 : 0
          counterSums[id] = (counterSums[id] || 0) + v
        }
      }

      const metricSums: Record<string, number> = {}
      const metricSteps: Record<string, string[]> = {}
      for (const m of metrics) {
        if (!m.formula) continue
        const r = evaluateFormulaWithValues(m.formula, counterSums)
        if (!r || r.result === null || r.error) continue
        allMetrics.add(m.id)
        metricSums[m.id] = r.result
        if (r.steps) metricSteps[m.id] = r.steps
      }

      groupResults.push({ key, count: g.rows.length, sums: metricSums, steps: metricSteps })
    }

    const metricIds = Array.from(allMetrics)
    const data = groupResults.map(g => {
      const obj: Record<string, any> = { key: g.key, count: g.count, steps: g.steps }
      metricIds.forEach(id => {
        obj[`sum_${id}`] = g.sums[id] ?? null
      })
      return obj
    })

    setDimResult({ metricIds, data })
    setResults([])
  }

  const dimColumns = useMemo(() => {
    if (!dimResult.metricIds.length) return []
    const cols: any[] = [
      { key: 'key', title: mode === 'city' ? '地市' : mode === 'time' ? '开始时间' : '子网名称', width: 180, sortable: true },
      { key: 'count', title: '行数', width: 80, align: 'center' as const },
    ]
    dimResult.metricIds.forEach((id: string) => {
      const desc = metricMap[id] || id
      cols.push({
        key: `sum_${id}`,
        title: `${id} ${desc}`,
        width: 180,
        align: 'right' as const,
        render: (v: any) => <span className="tabular-nums text-xs">{fmt(v)}</span>,
      })
    })
    return cols
  }, [dimResult, mode, metricMap])

  const singleMetricIds = useMemo(() => {
    return [...new Set(results.map(r => r.id))]
  }, [results])

  const singleColumns = useMemo(() => {
    if (!singleMetricIds.length) return []
    const cols: any[] = [
      { key: 'rowInfo', title: '数据行', width: 220, sortable: true },
    ]
    singleMetricIds.forEach((id: string) => {
      const desc = metricMap[id] || id
      cols.push({
        key: `val_${id}`,
        title: `${id} ${desc}`,
        width: 180,
        align: 'right' as const,
        render: (v: any, row: any) => <span className={row.errors?.[id] ? 'text-red-500' : 'text-emerald-500 font-semibold'}>{row.errors?.[id] ? '错误' : fmt(v)}</span>,
      })
    })
    return cols
  }, [singleMetricIds, metricMap])

  const singleTableData = useMemo(() => {
    if (!results.length || rowIndex === null) return []
    const row = rows[rowIndex]
    const obj: Record<string, any> = {
      rowInfo: getRowLabel(row),
      errors: {},
    }
    results.forEach(r => {
      obj[`val_${r.id}`] = r.result
      if (r.error) obj.errors[r.id] = true
    })
    return [obj]
  }, [results, rowIndex, rows, labelColA, labelColB])

  const handleExport = () => {
    const exportData = mode === 'none' ? singleTableData : dimResult.data
    if (!exportData.length) return

    let csvContent = ''
    if (mode === 'none') {
      const cols = singleColumns
      csvContent = cols.map((c: any) => c.title).join(',') + '\n'
      exportData.forEach((row: any) => {
        csvContent += cols.map((c: any) => {
          const v = row[c.key]
          if (v === null || v === undefined) return ''
          const s = String(v).replace(/"/g, '""')
          return /[",\n]/.test(s) ? `"${s}"` : s
        }).join(',') + '\n'
      })
    } else {
      const cols = dimColumns
      csvContent = cols.map(c => c.title).join(',') + '\n'
      exportData.forEach((row: any) => {
        csvContent += cols.map((c: any) => {
          const v = row[c.key]
          if (v === null || v === undefined) return ''
          const s = String(v).replace(/"/g, '""')
          return /[",\n]/.test(s) ? `"${s}"` : s
        }).join(',') + '\n'
      })
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `指标计算_${mode === 'none' ? '单行' : mode === 'time' ? '时间汇总' : mode === 'subnet' ? '子网汇总' : '地市汇总'}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const hasResult = mode === 'none' ? results.length > 0 : dimResult.data.length > 0

  return (
    <div className="space-y-3">
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">计算模式</label>
            <select value={mode} onChange={e => setMode(e.target.value as DimKey)}
              className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
              {dimOptions.map(d => <option key={d.key} value={d.key}>{d.label} — {d.desc}</option>)}
            </select>
          </div>

          {mode === 'none' ? (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">选择数据行</label>
              <select value={rowIndex ?? ''} onChange={e => setRowIndex(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                <option value="">选择数据行...</option>
                {rows.map((r, i) => <option key={i} value={i}>{getRowLabel(r)}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">列映射</label>
              <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-0.5">
                {timeCol >= 0 ? <span className="text-emerald-500">开始时间列: [{timeCol}] {headers[timeCol]}</span> : <span className="text-red-400">未找到开始时间列</span>}
                <br />
                {subnetCol >= 0 ? <span className="text-emerald-500">子网名称列: [{subnetCol}] {headers[subnetCol]}</span> : <span className="text-red-400">未找到子网名称列</span>}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleCalc}
              disabled={loading || (mode === 'none' && rowIndex === null) || (mode === 'time' && timeCol < 0) || ((mode === 'subnet' || mode === 'city') && subnetCol < 0)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-40 text-white text-sm font-medium rounded-md transition-opacity"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : mode === 'none' ? <Play className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
              {mode === 'none' ? '计算' : '汇总计算'}
            </button>
            {hasResult && (
              <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-md transition-colors">
                <Download className="w-3.5 h-3.5" /> 导出CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {mode === 'none' && results.length > 0 && (
        <>
          <UnifiedTable
            columns={singleColumns}
            data={singleTableData}
            searchable
            searchKeys={['rowInfo']}
            showTotal
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {results.map((r, i) => (
              <div key={i} className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-xs font-medium text-[hsl(var(--primary))]">{r.id} {r.desc}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">单行</span>
                </div>
                <div className={`text-xl font-semibold mb-1 ${r.error ? 'text-red-500' : 'text-emerald-500'}`}>
                  {r.error ? `错误` : fmt(r.result)}
                </div>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))] mb-2">1行数据</div>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))] mb-2">公式: {r.formula}</div>
                {r.steps?.length > 0 && (
                  <div className="bg-[hsl(var(--muted))] rounded-md p-2 space-y-0.5 mt-2">
                    {r.steps.map((s: string, j: number) => <div key={j} className="text-[10px] font-mono text-emerald-500">{s}</div>)}
                    <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] pt-1 border-t border-[hsl(var(--border))]">→ {r.expr} = {fmt(r.result)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {mode !== 'none' && dimResult.data.length > 0 && (
        <>
          <UnifiedTable
            columns={dimColumns}
            data={dimResult.data}
            searchable
            searchKeys={['key']}
            showTotal
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {dimResult.metricIds.map((id: string) => (
              dimResult.data.map((g: any, idx: number) => (
                g.steps?.[id] && (
                  <div key={`${id}-${idx}`} className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-xs font-medium text-[hsl(var(--primary))]">{id} {metricMap[id] || ''}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">{g.key}</span>
                    </div>
                    <div className="text-xl font-semibold mb-1 text-emerald-500">
                      {fmt(g[`sum_${id}`])}
                    </div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))] mb-2">{g.count}行数据汇总</div>
                    <div className="bg-[hsl(var(--muted))] rounded-md p-2 space-y-0.5 mt-2">
                      {g.steps[id].map((s: string, j: number) => (
                        <div key={j} className="text-[10px] font-mono text-emerald-500">{s}</div>
                      ))}
                    </div>
                  </div>
                )
              ))
            ))}
          </div>
        </>
      )}

      {!results.length && dimResult.data.length === 0 && !loading && (
        <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
          <Play className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">选择模式后点击计算</p>
        </div>
      )}
    </div>
  )
}
