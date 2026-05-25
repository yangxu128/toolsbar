'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useKpiStore } from '@/lib/store'

export default function MetricTable() {
  const metrics = useKpiStore((s) => s.metrics)
  const [filter, setFilter] = useState('')

  const filtered = filter
    ? metrics.filter(m =>
        m.id.toLowerCase().includes(filter.toLowerCase()) ||
        m.desc.toLowerCase().includes(filter.toLowerCase())
      )
    : metrics

  return (
    <div className="card-dark rounded-lg overflow-hidden">
      <div className="p-3 border-b border-[hsl(var(--border))] flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          placeholder="搜索指标ID或名称..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 outline-none text-sm text-[hsl(var(--foreground))] placeholder:text-muted-foreground bg-transparent"
        />
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{filtered.length} 条</span>
      </div>
      <div className="overflow-auto max-h-[calc(100vh-300px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[hsl(var(--card))]">
              <th className="px-3 py-2 text-left font-medium w-[140px] text-[hsl(var(--foreground))]">指标ID</th>
              <th className="px-3 py-2 text-left font-medium text-[hsl(var(--foreground))]">描述</th>
              <th className="px-3 py-2 text-left font-medium w-[260px] text-[hsl(var(--foreground))]">公式</th>
              <th className="px-3 py-2 text-center font-medium w-[70px] text-[hsl(var(--foreground))]">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {filtered.map((m, i) => (
              <tr key={i} className={`hover:bg-[hsl(var(--muted))] ${m.formula ? 'bg-[hsl(var(--primary)/0.03)]' : ''}`}>
                <td className="px-3 py-2 font-mono text-xs text-[hsl(var(--primary))] font-medium">{m.id}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{m.desc}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{m.formula || '-'}</td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
