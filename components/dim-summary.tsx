'use client'

import { useState, useMemo } from 'react'
import { BarChart3, Loader2 } from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { calcAll } from '@/lib/calc'
import UnifiedTable from './unified-table'

function fmt(n: any) {
  if (n === null || n === undefined) return '-'
  if (Math.abs(n) >= 1e6) return n.toExponential(3)
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(4).replace(/\.?0+$/, '')
}

type DimKey = 'time' | 'subnet' | 'city'

const dimOptions: { key: DimKey; label: string; desc: string }[] = [
  { key: 'time', label: '开始时间', desc: '按开始时间列汇总' },
  { key: 'subnet', label: '子网名称', desc: '按子网名称列汇总' },
  { key: 'city', label: '地市', desc: '按子网名称前两位字符汇总' },
]

export default function DimSummary() {
  const rows = useKpiStore((s) => s.rows)
  const headers = useKpiStore((s) => s.headers)
  const [dim, setDim] = useState<DimKey>('subnet')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ metricIds: string[]; data: any[] }>({ metricIds: [], data: [] })

  const findCol = (patterns: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i]).toLowerCase()
      if (patterns.some(p => h.includes(p))) return i
    }
    return -1
  }

  const timeCol = useMemo(() => findCol(['开始时间', 'starttime', 'start_time', '时间']), [headers])
  const subnetCol = useMemo(() => findCol(['子网名称', 'subnet', '子网', '网元名称']), [headers])

  const handleCalc = () => {
    setLoading(true)
    setTimeout(() => {
      const groups = new Map<string, { key: string; rows: number[] }>()

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        let key = ''
        if (dim === 'time') {
          key = timeCol >= 0 ? String(row[timeCol] ?? '').trim() : ''
        } else if (dim === 'subnet') {
          key = subnetCol >= 0 ? String(row[subnetCol] ?? '').trim() : ''
        } else if (dim === 'city') {
          const raw = subnetCol >= 0 ? String(row[subnetCol] ?? '').trim() : ''
          key = raw.slice(0, 2)
        }
        if (!key) key = '未知'
        if (!groups.has(key)) groups.set(key, { key, rows: [] })
        groups.get(key)!.rows.push(i)
      }

      const allMetrics = new Set<string>()
      const groupResults: any[] = []

      for (const [key, g] of groups) {
        const metricSums: Record<string, number> = {}
        const metricCounts: Record<string, number> = {}
        for (const ri of g.rows) {
          const calcRes = calcAll(ri)
          for (const r of calcRes) {
            if (r.result === null || r.error) continue
            allMetrics.add(r.id)
            metricSums[r.id] = (metricSums[r.id] || 0) + r.result
            metricCounts[r.id] = (metricCounts[r.id] || 0) + 1
          }
        }
        const avg: Record<string, number> = {}
        for (const id of allMetrics) {
          avg[id] = metricCounts[id] ? metricSums[id] / metricCounts[id] : 0
        }
        groupResults.push({ key, count: g.rows.length, sums: metricSums, avgs: avg })
      }

      const metricIds = Array.from(allMetrics)
      const data = groupResults.map(g => {
        const obj: Record<string, any> = { key: g.key, count: g.count }
        metricIds.forEach(id => {
          obj[`avg_${id}`] = g.avgs[id] ?? null
          obj[`sum_${id}`] = g.sums[id] ?? null
        })
        return obj
      })

      setResult({ metricIds, data })
      setLoading(false)
    }, 50)
  }

  const columns = useMemo(() => {
    if (!result.metricIds) return []
    const cols: any[] = [
      { key: 'key', title: dim === 'city' ? '地市' : dim === 'time' ? '开始时间' : '子网名称', width: 180, sortable: true },
      { key: 'count', title: '行数', width: 80, align: 'center' as const },
    ]
    result.metricIds.forEach((id: string) => {
      cols.push({
        key: `avg_${id}`,
        title: `${id} (平均)`,
        width: 140,
        align: 'right' as const,
        render: (v: any) => <span className="tabular-nums text-xs">{fmt(v)}</span>,
      })
      cols.push({
        key: `sum_${id}`,
        title: `${id} (合计)`,
        width: 140,
        align: 'right' as const,
        render: (v: any) => <span className="tabular-nums text-xs">{fmt(v)}</span>,
      })
    })
    return cols
  }, [result, dim])

  return (
    <div className="space-y-3">
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">汇总维度</label>
          <select value={dim} onChange={e => setDim(e.target.value as DimKey)}
            className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
            {dimOptions.map(d => <option key={d.key} value={d.key}>{d.label} — {d.desc}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">列映射</label>
          <div className="text-xs text-[hsl(var(--muted-foreground))] space-y-0.5">
            {timeCol >= 0 ? <span className="text-emerald-500">开始时间列: [{timeCol}] {headers[timeCol]}</span> : <span className="text-red-400">未找到开始时间列</span>}
            <br />
            {subnetCol >= 0 ? <span className="text-emerald-500">子网名称列: [{subnetCol}] {headers[subnetCol]}</span> : <span className="text-red-400">未找到子网名称列</span>}
          </div>
        </div>
        <button
          onClick={handleCalc}
          disabled={loading || (dim === 'time' && timeCol < 0) || ((dim === 'subnet' || dim === 'city') && subnetCol < 0)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-40 text-white text-sm font-medium rounded-md transition-opacity"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
          汇总计算
        </button>
      </div>

      {result.data?.length > 0 && (
        <UnifiedTable
          columns={columns}
          data={result.data}
          searchable
          searchKeys={['key']}
          showTotal
        />
      )}

      {!result.data?.length && !loading && (
        <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">选择维度后点击汇总计算，按维度分组统计指标平均值与合计</p>
        </div>
      )}
    </div>
  )
}
