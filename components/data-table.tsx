'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useKpiStore } from '@/lib/store'

export default function DataTable() {
  const headers = useKpiStore((s) => s.headers)
  const rows = useKpiStore((s) => s.rows)
  const [filter, setFilter] = useState('')

  const filtered = filter
    ? rows.filter(r => r.some((c: any) => String(c).toLowerCase().includes(filter.toLowerCase())))
    : rows

  return (
    <div className="card-dark rounded-lg overflow-hidden">
      <div className="p-3 border-b border-[hsl(var(--border))] flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          placeholder="搜索..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 outline-none text-sm text-[hsl(var(--foreground))] placeholder:text-muted-foreground bg-transparent"
        />
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{filtered.length} / {rows.length}</span>
      </div>
      <div className="overflow-auto max-h-[calc(100vh-300px)]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-medium text-left whitespace-nowrap min-w-[120px] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {filtered.map((r, ri) => (
              <tr key={ri} className="hover:bg-[hsl(var(--muted))]">
                {r.map((c: any, ci: number) => (
                  <td key={ci} className="px-3 py-1.5 text-muted-foreground whitespace-nowrap truncate max-w-[180px]">{c ?? ''}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
