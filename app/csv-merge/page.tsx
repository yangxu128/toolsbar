'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { UploadCloud, Save, FileSpreadsheet, X, Home, Star, ChevronRight as ChevronRightIcon, GitMerge, FolderOpen, CheckCircle2, AlertCircle, FolderInput } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'
import UnifiedTable from '@/components/unified-table'

interface MergeGroup {
  prefix: string
  files: string[]
  headers: string[]
  data: Record<string, string>[]
}

type Encoding = 'auto' | 'gbk' | 'utf8' | 'utf8bom'

const encLabels: Record<Encoding, string> = {
  auto: '自动检测',
  gbk: 'GBK',
  utf8: 'UTF-8',
  utf8bom: 'UTF-8 BOM',
}

export default function CsvMergePage() {
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('csv-merge')
  const [groups, setGroups] = useState<MergeGroup[]>([])
  const [activeGroup, setActiveGroup] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [encoding, setEncoding] = useState<Encoding>('gbk')
  const [outputEncoding, setOutputEncoding] = useState<Encoding>('gbk')
  const [saving, setSaving] = useState(false)

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

  const readFileWithEncoding = useCallback(async (file: File, enc: Encoding): Promise<string> => {
    const buffer = await file.arrayBuffer()
    if (enc === 'gbk') return new TextDecoder('gbk').decode(buffer)
    if (enc === 'utf8') return new TextDecoder('utf-8').decode(buffer)
    if (enc === 'utf8bom') return new TextDecoder('utf-8').decode(buffer)
    try {
      const decoded = new TextDecoder('gbk').decode(buffer)
      if (/[\u4e00-\u9fa5]/.test(decoded)) return decoded
      return new TextDecoder('utf-8').decode(buffer)
    } catch {
      return new TextDecoder('utf-8').decode(buffer)
    }
  }, [])

  const handleUpload = useCallback(async (files: FileList) => {
    setProcessing(true)
    setLogs([])
    setGroups([])
    addLog(`已选择 ${files.length} 个文件，编码：${encLabels[encoding]}，开始解析...`)

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
          const text = await readFileWithEncoding(file, encoding)
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
      })
      addLog(`分组 [${prefix}...] 合并完成：共 ${mergedData.length} 行`)
    }

    setGroups(result)
    setActiveGroup(0)
    setProcessing(false)
    addLog('全部处理完成')
  }, [addLog, readFileWithEncoding, parseCsvText, encoding])

  const encodeOutput = useCallback((content: string, enc: Encoding): Uint8Array => {
    if (enc === 'gbk') return gbkEncode(content)
    if (enc === 'utf8bom') {
      const bom = new Uint8Array([0xef, 0xbb, 0xbf])
      const body = new TextEncoder().encode(content)
      const merged = new Uint8Array(bom.length + body.length)
      merged.set(bom, 0)
      merged.set(body, bom.length)
      return merged
    }
    return new TextEncoder().encode(content)
  }, [])

  const generateCsvContent = useCallback((group: MergeGroup): string => {
    if (!group.headers.length || !group.data.length) return ''
    const escape = (v: string) => /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    return [
      group.headers.map(escape).join(','),
      ...group.data.map(row => group.headers.map(h => escape(row[h] || '')).join(','))
    ].join('\r\n')
  }, [])

  const handleSaveAll = useCallback(async () => {
    if (groups.length === 0) return
    setSaving(true)
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' })
      for (const group of groups) {
        if (!group.data.length) continue
        const content = generateCsvContent(group)
        const data = encodeOutput(content, outputEncoding)
        const fileName = `${group.prefix}合并.csv`
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(data)
        await writable.close()
        addLog(`已保存：${dirHandle.name}/${fileName} (${group.data.length}行, ${outputEncoding.toUpperCase()})`)
      }
      addLog('全部文件已保存到选定目录')
    } catch (e: any) {
      if (e.name === 'AbortError') {
        addLog('用户取消了目录选择')
      } else {
        addLog(`保存失败：${e.message}`)
      }
    }
    setSaving(false)
  }, [groups, outputEncoding, generateCsvContent, encodeOutput, addLog])

  const handleSaveSingle = useCallback(async (group: MergeGroup) => {
    if (!group.data.length) return
    setSaving(true)
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' })
      const content = generateCsvContent(group)
      const data = encodeOutput(content, outputEncoding)
      const fileName = `${group.prefix}合并.csv`
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(data)
      await writable.close()
      addLog(`已保存：${dirHandle.name}/${fileName} (${group.data.length}行, ${outputEncoding.toUpperCase()})`)
    } catch (e: any) {
      if (e.name === 'AbortError') {
        addLog('用户取消了目录选择')
      } else {
        addLog(`保存失败：${e.message}`)
      }
    }
    setSaving(false)
  }, [outputEncoding, generateCsvContent, encodeOutput, addLog])

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
                <p className="text-[hsl(var(--muted-foreground))] mt-1">按文件名前20位自动分组，批量合并CSV文件</p>
              </div>
            </div>
            <button onClick={() => toggleFav('csv-merge')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
              <Star className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {groups.length === 0 ? (
            <UploadArea onUpload={handleUpload} processing={processing} encoding={encoding} onEncodingChange={setEncoding} />
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
                      }`}>
                      <FolderOpen className="w-3 h-3 inline mr-1" />{g.prefix}... ({g.data.length}行)
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <select value={outputEncoding} onChange={e => setOutputEncoding(e.target.value as Encoding)}
                    className="px-2 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs outline-none focus:border-teal-500 bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                    {(Object.keys(encLabels) as Encoding[]).map(k => <option key={k} value={k}>{encLabels[k]}</option>)}
                  </select>
                  <button onClick={() => handleSaveSingle(currentGroup)} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                    <Save className="w-4 h-4" /> 保存当前组
                  </button>
                  <button onClick={handleSaveAll} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                    <FolderInput className="w-4 h-4" /> 全部保存到目录
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
                  {log.includes('失败') || log.includes('取消') ? <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />}
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

function UploadArea({ onUpload, processing, encoding, onEncodingChange }: {
  onUpload: (files: FileList) => void
  processing: boolean
  encoding: Encoding
  onEncodingChange: (e: Encoding) => void
}) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">读取编码：</label>
        <select value={encoding} onChange={e => onEncodingChange(e.target.value as Encoding)}
          className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-sm outline-none focus:border-teal-500 bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
          {(Object.keys(encLabels) as Encoding[]).map(k => <option key={k} value={k}>{encLabels[k]}</option>)}
        </select>
      </div>

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

      <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] text-sm text-[hsl(var(--muted-foreground))] space-y-2">
        <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">使用说明</h4>
        <div className="text-[11px] space-y-1">
          <p><strong className="text-[hsl(var(--foreground))]">数据格式：</strong>多个 CSV 文件，文件名前20位相同的会自动分为一组</p>
          <p>• 编码支持：GBK、UTF-8、UTF-8 BOM、自动检测</p>
          <p>• 分组规则：按文件名前20个字符匹配，如 FDD-ZX-MRO-xxx 和 FDD-ZX-MRO-yyy 会合并</p>
          <p><strong className="text-[hsl(var(--foreground))]">操作步骤：</strong></p>
          <p>1. 选择读取编码（中文文件通常选 GBK）</p>
          <p>2. 拖拽或选择多个 CSV 文件上传</p>
          <p>3. 系统自动按文件名分组并合并，显示每组行数</p>
          <p>4. 选择输出编码，点击「保存到目录」将合并结果保存到本地文件夹</p>
        </div>
      </div>
    </div>
  )
}

function gbkEncode(str: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) { bytes.push(code); continue }
    if (code >= 0xd800 && code <= 0xdbff) { const hi = code; const lo = str.charCodeAt(++i); const cp = ((hi - 0xd800) << 10) + (lo - 0xdc00) + 0x10000; const enc = gbkLookup(cp); bytes.push(enc >> 8, enc & 0xff); continue }
    const enc = gbkLookup(code)
    bytes.push(enc >> 8, enc & 0xff)
  }
  return new Uint8Array(bytes)
}

function gbkLookup(cp: number): number {
  if (cp >= 0x4e00 && cp <= 0x9fa5) { const idx = cp - 0x4e00; return 0xb0a1 + Math.floor(idx / 94) * 256 + (idx % 94) + 0xa1 }
  if (cp >= 0x3000 && cp <= 0x303f) return gbkSym(cp) || 0x3f3f
  if (cp >= 0xff00 && cp <= 0xff5e) return 0xa3 + ((cp - 0xff00) << 8) + 0xa1
  if (cp === 0x2018 || cp === 0x2019) return 0xa1ae + (cp - 0x2018)
  if (cp === 0x201c || cp === 0x201d) return 0xa3ac + (cp - 0x201c)
  if (cp === 0x2014) return 0xc2a1
  if (cp === 0x2026) return 0xa1ad
  if (cp === 0x3001) return 0xa1a1
  if (cp === 0x3002) return 0xa1a2
  if (cp === 0x300a) return 0xa1a7
  if (cp === 0x300c) return 0xa1a9
  if (cp === 0x300d) return 0xa1aa
  if (cp === 0x3010) return 0xa1ab
  if (cp === 0x3011) return 0xa1ac
  if (cp === 0xff01) return 0xa3a1
  if (cp === 0xff0c) return 0xa3ac
  if (cp === 0xff1b) return 0xa3ba
  if (cp === 0xff1f) return 0xa3bb
  if (cp === 0xff08) return 0xa3a8
  if (cp === 0xff09) return 0xa3a9
  return 0x3f3f
}

function gbkSym(cp: number): number | null {
  const map: Record<number, number> = {
    0x3000: 0xa1a1, 0x3001: 0xa1a2, 0x3002: 0xa1a3, 0x3003: 0xa1a4,
    0x3005: 0xa1a5, 0x3006: 0xa1a6, 0x3007: 0xa1a7, 0x3008: 0xa1a8,
    0x3009: 0xa1a9, 0x300a: 0xa1aa, 0x300b: 0xa1ab, 0x300c: 0xa1ac,
    0x300d: 0xa1ad, 0x300e: 0xa1ae, 0x300f: 0xa1af, 0x3010: 0xa1b0,
    0x3011: 0xa1b1, 0x3012: 0xa1b2, 0x3013: 0xa1b3, 0x3014: 0xa1b4,
    0x3015: 0xa1b5, 0x3016: 0xa1b6, 0x3017: 0xa1b7, 0x3018: 0xa1b8,
    0x3019: 0xa1b9, 0x301a: 0xa1ba, 0x301b: 0xa1bb, 0x301c: 0xa1bc,
    0x301d: 0xa1bd, 0x301e: 0xa1be, 0x301f: 0xa1bf,
  }
  return map[cp] ?? null
}
