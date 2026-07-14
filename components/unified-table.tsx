'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react'

export interface Column<T = any> {
  key: string
  title: string
  width?: string | number
  align?: 'left' | 'right' | 'center'
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode
  sortable?: boolean
  cellClassName?: string
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
  stickyFirstColumn?: boolean
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
  stickyFirstColumn = false,
}: UnifiedTableProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(pageSize)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const columnsKey = columns.map(c => c.key).join(',')
  const searchKeysKey = searchKeys?.join(',')

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
  }, [data, search, searchable, searchKeysKey, columnsKey, sortKey, sortDir])

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
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2 flex-wrap">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  placeholder="搜索数据..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 pr-3 py-2 w-full sm:w-64 rounded-lg border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] transition-colors"
                />
              </div>
            )}
            {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
          </div>
          {showTotal && (
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              显示 <strong className="text-[hsl(var(--foreground))]">{filtered.length > 0 ? (safePage - 1) * size + 1 : 0}-{Math.min(safePage * size, filtered.length)}</strong> 条，共 <strong className="text-[hsl(var(--foreground))]">{filtered.length}</strong> 条
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full border-collapse">
          <thead className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
            <tr>
              {columns.map((col, ci) => {
                const isSticky = stickyFirstColumn && ci === 0
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider whitespace-nowrap select-none ${
                      col.sortable ? 'cursor-pointer hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors' : ''
                    } ${isSticky ? 'sticky left-0 z-20 bg-[hsl(var(--muted))] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]' : ''}`}
                    style={{ width: col.width, textAlign: col.align || 'left' }}
                  >
                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                      {col.title}
                      {col.sortable && (
                        <span className="text-[hsl(var(--muted-foreground))]">
                          {sortKey === col.key ? (
                            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[hsl(var(--primary))]" /> : <ArrowDown className="w-3 h-3 text-[hsl(var(--primary))]" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                  <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  {emptyText}
                </td>
              </tr>
            ) : (
              paged.map((row, ri) => (
                <tr
                  key={rowKey ? rowKey(row, ri) : ri}
                  onClick={() => onRowClick?.(row, ri)}
                  className={`transition-colors duration-150 hover:bg-[hsl(var(--muted))] ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${rowClassName ? rowClassName(row, ri) : ''}`}
                >
                  {columns.map((col, ci) => {
                    const raw = (row as any)[col.key]
                    const content = col.render ? col.render(raw, row, ri) : raw ?? ''
                    const isSticky = stickyFirstColumn && ci === 0
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm text-[hsl(var(--foreground))] whitespace-nowrap truncate max-w-[300px] ${
                          col.cellClassName || ''
                        } ${isSticky ? 'sticky left-0 z-10 bg-[hsl(var(--card))] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]' : ''}`}
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
        <div className="flex items-center justify-between p-4 border-t border-[hsl(var(--border))]">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            显示 <strong className="text-[hsl(var(--foreground))]">{(safePage - 1) * size + 1}-{Math.min(safePage * size, filtered.length)}</strong> 条，共 <strong className="text-[hsl(var(--foreground))]">{filtered.length}</strong> 条
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              className="p-1.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pages.map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-[32px] px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  p === safePage
                    ? 'bg-[hsl(var(--primary))] text-white hover:opacity-90'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              className="p-1.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
