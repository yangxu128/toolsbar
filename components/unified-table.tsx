'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export interface Column<T = any> {
  key: string
  title: string
  width?: string | number
  align?: 'left' | 'right' | 'center'
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode
  sortable?: boolean
}

interface UnifiedTableProps<T = any> {
  columns: Column<T>[]
  data: T[]
  searchable?: boolean
  searchKeys?: string[]
  pagination?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  showTotal?: boolean
  emptyText?: string
  rowKey?: (row: T, index: number) => string | number
  rowClassName?: (row: T, index: number) => string
  onRowClick?: (row: T, index: number) => void
  toolbar?: React.ReactNode
  className?: string
}

export default function UnifiedTable<T = any>({
  columns,
  data,
  searchable = false,
  searchKeys,
  pagination = false,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  showTotal = true,
  emptyText = '暂无数据',
  rowKey,
  rowClassName,
  onRowClick,
  toolbar,
  className = '',
}: UnifiedTableProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(pageSize)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    let result = [...data]
    if (searchable && search.trim()) {
      const q = search.toLowerCase()
      const keys = searchKeys || columns.map(c => c.key)
      result = result.filter(row =>
        keys.some(k => {
          const v = (row as any)[k]
          return v !== undefined && String(v).toLowerCase().includes(q)
        })
      )
    }
    if (sortKey) {
      result.sort((a, b) => {
        const av = (a as any)[sortKey]
        const bv = (b as any)[sortKey]
        if (av === undefined || av === null) return sortDir === 'asc' ? -1 : 1
        if (bv === undefined || bv === null) return sortDir === 'asc' ? 1 : -1
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av))
      })
    }
    return result
  }, [data, search, searchable, searchKeys, columns, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const safePage = Math.min(page, totalPages)
  const paged = pagination ? filtered.slice((safePage - 1) * size, safePage * size) : filtered

  const handleSort = (key: string) => {
    if (!columns.find(c => c.key === key)?.sortable) return
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const pages = useMemo(() => {
    const maxVis = 7
    let start = Math.max(1, safePage - Math.floor(maxVis / 2))
    let end = Math.min(totalPages, start + maxVis - 1)
    if (end - start + 1 < maxVis) start = Math.max(1, end - maxVis + 1)
    const arr: number[] = []
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  }, [safePage, totalPages])

  return (
    <div className={`bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden ${className}`}>
      {/* Toolbar */}
      {(searchable || toolbar || showTotal) && (
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center gap-3 flex-wrap">
          {searchable && (
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                placeholder="搜索..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="flex-1 outline-none text-sm bg-transparent text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2 ml-auto">{toolbar}</div>}
          {showTotal && (
            <span className="text-[11px] text-[hsl(var(--muted-foreground))] whitespace-nowrap ml-auto">
              {paged.length > 0 ? `${(safePage - 1) * size + 1}-${Math.min(safePage * size, filtered.length)} / ` : ''}{filtered.length} 条
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto max-h-[calc(100vh-340px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 font-medium text-left whitespace-nowrap text-[hsl(var(--foreground))] select-none ${
                    col.sortable ? 'cursor-pointer hover:bg-[hsl(var(--muted))]' : ''
                  }`}
                  style={{ width: col.width, textAlign: col.align || 'left' }}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    {col.title}
                    {col.sortable && (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                  {emptyText}
                </td>
              </tr>
            ) : (
              paged.map((row, ri) => (
                <tr
                  key={rowKey ? rowKey(row, ri) : ri}
                  onClick={() => onRowClick?.(row, ri)}
                  className={`hover:bg-[hsl(var(--muted))] transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${rowClassName ? rowClassName(row, ri) : ''}`}
                >
                  {columns.map(col => {
                    const raw = (row as any)[col.key]
                    const content = col.render ? col.render(raw, row, ri) : raw ?? ''
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-2.5 text-[hsl(var(--muted-foreground))] whitespace-nowrap truncate max-w-[300px]"
                        style={{ textAlign: col.align || 'left' }}
                        title={String(raw ?? '')}
                      >
                        {content}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && filtered.length > 0 && (
        <div className="px-4 py-3 border-t border-[hsl(var(--border))] flex items-center justify-between flex-wrap gap-3">
          <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
            共 <strong className="text-[hsl(var(--foreground))]">{filtered.length}</strong> 条，第 <strong className="text-[hsl(var(--foreground))]">{safePage}</strong> / <strong className="text-[hsl(var(--foreground))]">{totalPages}</strong> 页
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
              每页
              <select
                value={size}
                onChange={e => { setSize(Number(e.target.value)); setPage(1) }}
                className="px-1.5 py-0.5 rounded-md border border-[hsl(var(--border))] text-[11px] outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
              >
                {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              条
            </div>
            <div className="flex items-center gap-0.5">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pages.map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-[28px] px-1.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    p === safePage
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
