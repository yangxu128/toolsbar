'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { UploadCloud, Download, FileSpreadsheet, X, Home, Star, ChevronRight as ChevronRightIcon, GitMerge, FolderOpen, CheckCircle2, AlertCircle } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'
import UnifiedTable from '@/components/unified-table'

interface MergeGroup {
  prefix: string
  files: string[]
  headers: string[]
  data: Record<string, string>[]
  merged: boolean
}

export default function CsvMergePage() {
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('csv-merge')
  const [groups, setGroups] = useState<MergeGroup[]>([])
  const [activeGroup, setActiveGroup] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const parseCsvText = useCallback((text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length === 0) return { headers: [], rows: [] }

    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
          else if (ch === '"') inQuotes = false
          else current += ch
        } else {
          if (ch === '"') inQuotes = true
          else if (ch === ',') { result.push(current); current = '' }
          else current += ch
        }
      }
      result.push(current)
      return result
    }

    const headers = parseLine(lines[0])
    const rows: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i])
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      rows.push(row)
    }
    return { headers, rows }
  }, [])

  const readFileWithEncoding = useCallback(async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer()
      try {
        return new TextDecoder('gbk').decode(buffer)
      } catch {
        return new TextDecoder('utf-8').decode(buffer)
      }
    } catch {
      return await file.text()
    }
  }, [])

  const handleUpload = useCallback(async (files: FileList) => {
    setProcessing(true)
    setLogs([])
    setGroups([])
    addLog(`已选择 ${files.length} 个文件，开始解析...`)

    const fileList = Array.from(files)
    const fileGroups = new Map<string, { file: File; name: string }[]>()

    for (const file of fileList) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        addLog(`跳过非CSV文件：${file.name}`)
        continue
      }
      const prefix = file.name.substring(0, 20)
      if (!fileGroups.has(prefix)) fileGroups.set(prefix, [])
      fileGroups.get(prefix)!.push({ file, name: file.name })
    }

    addLog(`按文件名前20位分组，共 ${fileGroups.size} 组`)

    const result: MergeGroup[] = []

    for (const [prefix, fileItems] of fileGroups) {
      addLog(`处理分组 [${prefix}...]，包含 ${fileItems.length} 个文件`)

      let mergedHeaders: string[] = []
      let mergedData: Record<string, string>[] = []

      for (const { file, name } of fileItems) {
        try {
          const text = await readFileWithEncoding(file)
          const { headers, rows } = parseCsvText(text)
          if (headers.length === 0) { addLog(`文件 ${name} 无有效数据`); continue }
          if (mergedHeaders.length === 0) mergedHeaders = headers
          mergedData = mergedData.concat(rows)
          addLog(`读取 ${name}：${rows.length} 行`)
        } catch (e: any) {
          addLog(`读取 ${name} 失败：${e.message}`)
        }
      }

      result.push({
        prefix,
        files: fileItems.map(f => f.name),
        headers: mergedHeaders,
        data: mergedData,
        merged: true,
      })
      addLog(`分组 [${prefix}...] 合并完成：共 ${mergedData.length} 行`)
    }

    setGroups(result)
    setActiveGroup(0)
    setProcessing(false)
    addLog('全部处理完成')
  }, [addLog, readFileWithEncoding, parseCsvText])

  const handleDownload = useCallback((group: MergeGroup) => {
    if (!group.headers.length || !group.data.length) return
    const escape = (v: string) => /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const csvRows = [
      group.headers.map(escape).join(','),
      ...group.data.map(row => group.headers.map(h => escape(row[h] || '')).join(','))
    ]
    const blob = new Blob(['\ufeff' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${group.prefix}合并.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [])

  const currentGroup = groups[activeGroup]
  const columns = currentGroup?.headers.map(h => ({ key: h, title: h, width: 150 })) || []

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span>数据处理</span>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">CSV批量合并</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
                <GitMerge className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">CSV批量合并</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">按文件名前20位自动分组，批量合并CSV文件，支持GBK/UTF-8编码</p>
              </div>
            </div>
            <button onClick={() => toggleFav('csv-merge')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
              <Star className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {groups.length === 0 ? (
            <UploadArea onUpload={handleUpload} processing={processing} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {groups.map((g, i) => (
                    <button
                      key={g.prefix}
                      onClick={() => setActiveGroup(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeGroup === i
                          ? 'bg-teal-500 text-white'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
                      }`}
                    >
                      <FolderOpen className="w-3 h-3 inline mr-1" />{g.prefix}... ({g.data.length}行)
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDownload(currentGroup)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
                    <Download className="w-4 h-4" /> 导出当前组
                  </button>
                  <button onClick={() => { groups.forEach(g => handleDownload(g)) }} className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors">
                    <Download className="w-4 h-4" /> 全部导出
                  </button>
                </div>
              </div>

              {currentGroup && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 font-medium">
                    {currentGroup.files.length} 个文件
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-medium">
                    {currentGroup.data.length} 行数据
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 font-medium">
                    {currentGroup.headers.length} 列
                  </span>
                </div>
              )}

              {currentGroup && currentGroup.data.length > 0 && (
                <UnifiedTable
                  columns={columns}
                  data={currentGroup.data}
                  searchable
                  searchKeys={currentGroup.headers}
                  pagination
                  pageSize={20}
                  pageSizeOptions={[10, 20, 50, 100]}
                  showTotal
                />
              )}

              {currentGroup && currentGroup.data.length === 0 && (
                <div className="py-16 text-center text-[hsl(var(--muted-foreground))]">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>该分组无有效数据</p>
                </div>
              )}

              <button onClick={() => { setGroups([]); setLogs([]) }} className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" /> 清除数据，重新上传
              </button>
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] max-h-48 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-xs text-[hsl(var(--muted-foreground))] font-mono py-0.5 flex items-start gap-1.5">
                  {log.includes('失败') ? <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />}
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UploadArea({ onUpload, processing }: { onUpload: (files: FileList) => void; processing: boolean }) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="max-w-2xl mx-auto">
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files) }}
        onClick={() => document.getElementById('csv-merge-input')?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.03)]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
        }`}>
        <input id="csv-merge-input" type="file" accept=".csv" multiple
          onChange={(e) => e.target.files && e.target.files.length > 0 && onUpload(e.target.files)} className="hidden" />
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
          {processing ? (
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileSpreadsheet className="w-8 h-8 text-teal-600" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
          {processing ? '正在解析文件...' : '拖拽多个 CSV 文件到此处'}
        </h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          {processing ? '请稍候' : '支持多选，按文件名前20位自动分组合并'}
        </p>
        {!processing && (
          <button className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-medium text-sm hover:opacity-90 active:scale-[0.97] transition-all">
            选择文件
          </button>
        )}
      </div>
      <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] text-sm text-[hsl(var(--muted-foreground))] space-y-1.5">
        <p className="flex items-center gap-2"><GitMerge className="w-4 h-4" /> 按文件名前20位字符自动分组</p>
        <p className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> 支持 GBK / UTF-8 编码自动检测</p>
        <p className="flex items-center gap-2"><Download className="w-4 h-4" /> 可单独或批量导出合并后的 CSV 文件</p>
      </div>
    </div>
  )
}
