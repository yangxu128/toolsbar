'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { UploadCloud, Search, Filter, Download, ChevronLeft, ChevronRight as ChevronRightIcon, FileCode, X, Home, Star } from 'lucide-react'
import { useXmlStore } from '@/lib/xml-store'
import { parseXmlFile } from '@/lib/xml-parser'
import { useFavStore } from '@/lib/fav-store'

export default function XmlPage() {
  const loaded = useXmlStore((s) => s.loaded)
  const headers = useXmlStore((s) => s.headers)
  const allData = useXmlStore((s) => s.data)
  const fileName = useXmlStore((s) => s.fileName)
  const loadXml = useXmlStore((s) => s.loadXml)
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('xml-reader')

  const [search, setSearch] = useState('')
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [errorMsg, setErrorMsg] = useState('')

  const handleUpload = useCallback(async (file: File) => {
    setErrorMsg('')
    try {
      const text = await file.text()
      const result = parseXmlFile(text)
      loadXml(result.headers, result.data, file.name)
      setPage(1)
      setColFilters({})
    } catch (e: any) { setErrorMsg(e.message || '解析失败') }
  }, [loadXml])

  const filteredData = useMemo(() => {
    let data = allData
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(q)))
    }
    Object.entries(colFilters).forEach(([col, val]) => {
      if (val.trim()) {
        const q = val.toLowerCase()
        data = data.filter(row => String(row[col] || '').toLowerCase().includes(q))
      }
    })
    return data
  }, [allData, search, colFilters])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedData = filteredData.slice((safePage - 1) * pageSize, safePage * pageSize)

  const setColFilter = (col: string, val: string) => { setColFilters(prev => ({ ...prev, [col]: val })); setPage(1) }

  const handleExport = () => {
    if (!headers.length || !filteredData.length) return
    const csvRows = [
      headers.join(','),
      ...filteredData.map((row: Record<string, string>) => headers.map((h: string) => { const v = row[h] || ''; return typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v }).join(','))
    ]
    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `xml_export_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span>开发工具</span>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">XML在线阅读器</span>
      </nav>

      {/* Tool Header */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <FileCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">XML在线阅读器</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">支持多种XML结构自动识别，提供搜索、列筛选、分页浏览、导出功能</p>
              </div>
            </div>
            <button
              onClick={() => toggleFav('xml-reader')}
              className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}
              title={fav ? '取消收藏' : '收藏'}
            >
              <Star className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 min-h-[400px]">
          {!loaded ? (
            <UploadArea onUpload={handleUpload} error={errorMsg} />
          ) : (
            <>
              <ToolBar fileName={fileName} rowCount={allData.length} search={search} onSearchChange={setSearch}
                showFilters={showFilters} onToggleFilter={() => setShowFilters(!showFilters)} onExport={handleExport} />
              <DataTable headers={headers} data={pagedData} showFilters={showFilters} colFilters={colFilters} onColFilterChange={setColFilter} />
              <Pagination total={filteredData.length} page={safePage} pageSize={pageSize} totalPages={totalPages}
                onPageChange={(p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                onPageSizeChange={(sz: number) => { setPageSize(sz); setPage(1) }} />
              <button onClick={() => useXmlStore.getState().clearData()}
                className="mt-3 flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                <X className="w-3 h-3" /> 清除数据，重新上传
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function UploadArea({ onUpload, error }: { onUpload: (f: File) => void; error: string }) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="max-w-2xl mx-auto">
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.name.match(/\.xml$/i)) onUpload(f) }}
        onClick={() => document.getElementById('xml-file-input')?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.03)]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
        }`}>
        <input id="xml-file-input" type="file" accept=".xml"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} className="hidden" />
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
          <UploadCloud className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">拖拽 XML 文件到此处</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">点击或拖拽 .xml 文件到此区域</p>
        <button className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-medium text-sm hover:opacity-90 active:scale-[0.97] transition-all">
          选择文件
        </button>
      </div>

      {error && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">{error}</div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] text-sm text-[hsl(var(--muted-foreground))]">
        <p className="flex items-center gap-2"><FileCode className="w-4 h-4" /> 支持结构：FieldName/FieldValue · smr/v · 通用标签</p>
      </div>
    </div>
  )
}

function ToolBar({ fileName, rowCount, search, onSearchChange, showFilters, onToggleFilter, onExport }: any) {
  return (
    <div className="card-dark rounded-lg p-3 mb-3 flex items-center gap-2 flex-wrap">
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] font-medium truncate max-w-[200px]" title={fileName}>
        {fileName}
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <Search className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
        <input placeholder="全局搜索..." value={search} onChange={(e) => onSearchChange(e.target.value)}
          className="w-44 px-2.5 py-1 rounded-md border border-[hsl(var(--border))] text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" />
      </div>
      <button onClick={onExport}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[hsl(160_60%_45%)] hover:opacity-90 text-white text-xs font-medium transition-opacity">
        <Download className="w-3 h-3" /> 导出CSV
      </button>
      <button onClick={onToggleFilter}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${showFilters ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'}`}>
        <Filter className="w-3 h-3" /> 列筛选
      </button>
      <span className="text-[11px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">{rowCount.toLocaleString()} 条</span>
    </div>
  )
}

function DataTable({ headers, data, showFilters, colFilters, onColFilterChange }: any) {
  return (
    <div className="card-dark rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-340px)]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
              {headers.map((h: string) => (<th key={h} className="px-3 py-2 font-medium text-left whitespace-nowrap min-w-[100px]">{h}</th>))}
            </tr>
            {showFilters && (
              <tr className="bg-[hsl(var(--muted))]">
                {headers.map((h: string) => (
                  <td key={`f-${h}`} className="px-1.5 py-1">
                    <input placeholder={`筛选...`} value={colFilters[h] || ''} onChange={(e) => onColFilterChange(h, e.target.value)}
                      className="w-full px-2 py-0.5 rounded border border-[hsl(var(--border))] text-[11px] outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" />
                  </td>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {data.map((row: any, ri: number) => (
              <tr key={ri} className="hover:bg-[hsl(var(--muted))]">
                {headers.map((h: string) => (
                  <td key={`${ri}-${h}`} className="px-3 py-1.5 text-[hsl(var(--muted-foreground))] whitespace-nowrap truncate max-w-[200px]" title={row[h]}>{row[h] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Pagination({ total, page, pageSize, totalPages, onPageChange, onPageSizeChange }: any) {
  const pages = (() => {
    const maxVis = 7
    let start = Math.max(1, page - Math.floor(maxVis / 2))
    let end = Math.min(totalPages, start + maxVis - 1)
    if (end - start + 1 < maxVis) start = Math.max(1, end - maxVis + 1)
    const arr: number[] = []
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  })()

  return (
    <div className="card-dark rounded-lg mt-3 px-3 py-2 flex items-center justify-between">
      <div className="text-[11px] text-[hsl(var(--muted-foreground))]">共 <strong className="text-[hsl(var(--foreground))]">{total}</strong> 条，第 <strong className="text-[hsl(var(--foreground))]">{page}</strong>/<strong className="text-[hsl(var(--foreground))]">{totalPages}</strong> 页</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
          每页
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-1.5 py-0.5 rounded-md border border-[hsl(var(--border))] text-[11px] outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          条
        </div>
        <div className="flex items-center gap-0.5">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="p-1 rounded-md hover:bg-[hsl(var(--muted))] disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
          {pages.map((p: number) => (
            <button key={p} onClick={() => onPageChange(p)}
              className={`min-w-[24px] px-1.5 py-0.5 rounded-md text-[11px] font-medium transition-colors ${p === page ? 'bg-[hsl(var(--primary))] text-white' : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{p}</button>
          ))}
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="p-1 rounded-md hover:bg-[hsl(var(--muted))] disabled:opacity-30"><ChevronRightIcon className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  )
}
