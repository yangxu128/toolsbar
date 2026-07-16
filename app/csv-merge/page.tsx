'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, X, Home, Star, ChevronRight as ChevronRightIcon, GitMerge, CheckCircle2, AlertCircle, Loader2, Ban, Trash2, Info } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

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
  const [logs, setLogs] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [encoding, setEncoding] = useState<Encoding>('utf8bom')
  const [outputEncoding, setOutputEncoding] = useState<Encoding>('utf8bom')
  const [completedGroups, setCompletedGroups] = useState<{ prefix: string; files: string[]; totalRows: number }[]>([])
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef(false)

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const readFileWithEncoding = useCallback(async (file: File, enc: Encoding): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const arr = new Uint8Array(buffer)
    if (enc === 'gbk') return new TextDecoder('gbk').decode(buffer)
    if (enc === 'utf8') return new TextDecoder('utf-8').decode(buffer)
    if (enc === 'utf8bom') {
      const start = arr.length >= 3 && arr[0] === 0xef && arr[1] === 0xbb && arr[2] === 0xbf ? 3 : 0
      return new TextDecoder('utf-8').decode(arr.slice(start))
    }
    if (arr.length >= 3 && arr[0] === 0xef && arr[1] === 0xbb && arr[2] === 0xbf) {
      return new TextDecoder('utf-8').decode(arr.slice(3))
    }
    if (arr.length >= 2 && arr[0] === 0xff && arr[1] === 0xfe) {
      return new TextDecoder('utf-16le').decode(arr.slice(2))
    }
    if (arr.length >= 2 && arr[0] === 0xfe && arr[1] === 0xff) {
      return new TextDecoder('utf-16be').decode(arr.slice(2))
    }
    const utf8Decoded = new TextDecoder('utf-8').decode(buffer)
    let utf8Valid = true
    try {
      const check = new TextDecoder('utf-8', { fatal: true })
      check.decode(arr)
    } catch {
      utf8Valid = false
    }
    if (utf8Valid) return utf8Decoded
    try {
      return new TextDecoder('gbk').decode(buffer)
    } catch {
      return utf8Decoded
    }
  }, [])

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

  const downloadMerged = useCallback((prefix: string, headers: string[], lines: string[], totalRows: number) => {
    const escape = (v: string) => /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const csvLines = [headers.map(escape).join(','), ...lines]
    const content = csvLines.join('\r\n')
    const data = encodeOutput(content, outputEncoding)
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${prefix}合并.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    addLog(`已自动下载：${prefix}合并.csv (${totalRows}行)`)
  }, [encodeOutput, outputEncoding, addLog])

  const handleCancel = useCallback(() => {
    cancelRef.current = true
    addLog('收到取消请求，将在当前分组完成后停止...')
  }, [addLog])

  const handleUpload = useCallback(async (files: FileList) => {
    setProcessing(true)
    cancelRef.current = false
    setLogs([])
    setCompletedGroups([])
    setProgress(null)
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

    const groupCount = fileGroups.size
    addLog(`按文件名前20位分组，共 ${groupCount} 组`)
    setProgress({ current: 0, total: groupCount })

    let groupIndex = 0
    for (const [prefix, fileItems] of fileGroups) {
      if (cancelRef.current) { addLog('已取消处理'); break }
      groupIndex++
      setProgress({ current: groupIndex, total: groupCount })
      addLog(`处理分组 [${prefix}...]，包含 ${fileItems.length} 个文件（第 ${groupIndex}/${groupCount} 组）`)

      let mergedHeaders: string[] = []
      const mergedLines: string[] = []
      let totalRows = 0

      for (const { file, name } of fileItems) {
        try {
          const text = await readFileWithEncoding(file, encoding)
          const lines = text.split(/\r?\n/)
          if (lines.length === 0) { addLog(`文件 ${name} 无有效数据`); continue }

          const headers = parseLine(lines[0])
          if (headers.length === 0) { addLog(`文件 ${name} 无有效表头`); continue }
          if (mergedHeaders.length === 0) mergedHeaders = headers

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i]
            if (line.length === 0 || line.charCodeAt(0) === 13) continue
            mergedLines.push(line)
            totalRows++
          }
          addLog(`读取 ${name}：${lines.length - 1} 行`)
        } catch (e: any) {
          addLog(`读取 ${name} 失败：${e.message}`)
        }
      }

      if (mergedHeaders.length > 0) {
        downloadMerged(prefix, mergedHeaders, mergedLines, totalRows)
        setCompletedGroups(prev => [...prev, { prefix, files: fileItems.map(f => f.name), totalRows }])
      }
      addLog(`分组 [${prefix}...] 合并完成：共 ${totalRows} 行`)
    }

    setProcessing(false)
    setProgress(null)
    addLog(cancelRef.current ? '处理已取消' : '全部处理完成')
  }, [addLog, readFileWithEncoding, encoding, downloadMerged])

  return (
    <div className="animate-fade-in-up">
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
              <Star className={`w-5 h-5 ${fav ? 'fill-current animate-heart-beat' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">读取编码：</label>
              <select value={encoding} onChange={e => setEncoding(e.target.value as Encoding)}
                className="form-input w-auto min-w-[120px]">
                {(Object.keys(encLabels) as Encoding[]).map(k => <option key={k} value={k}>{encLabels[k]}</option>)}
              </select>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">输出编码：</label>
              <select value={outputEncoding} onChange={e => setOutputEncoding(e.target.value as Encoding)}
                className="form-input w-auto min-w-[120px]">
                {(Object.keys(encLabels) as Encoding[]).map(k => <option key={k} value={k}>{encLabels[k]}</option>)}
              </select>
            </div>

            <div onClick={() => !processing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                processing ? 'opacity-60 cursor-not-allowed' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))]/50'
              }`}>
              <input ref={fileInputRef} type="file" accept=".csv" multiple
                onChange={(e) => e.target.files && e.target.files.length > 0 && handleUpload(e.target.files)} className="hidden" />
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-4">
                {processing ? (
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-8 h-8 text-teal-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                {processing ? '正在合并文件...' : '拖拽多个 CSV 文件到此处'}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                {processing
                  ? (progress ? `正在处理第 ${progress.current}/${progress.total} 组，合并完成后自动下载` : '合并完成后自动下载，请勿关闭页面')
                  : '支持多选，按文件名前20位自动分组合并'}
              </p>
              {!processing ? (
                <button className="btn-primary bg-teal-500 hover:bg-teal-600">
                  选择文件
                </button>
              ) : (
                <button onClick={handleCancel} className="btn-primary bg-red-500 hover:bg-red-600 inline-flex items-center justify-center gap-2">
                  <Ban className="w-4 h-4" /> 取消处理
                </button>
              )}
            </div>

            {completedGroups.length > 0 && (
              <div className="mt-6 space-y-2 animate-scale-in">
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">合并完成</h4>
                {completedGroups.map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-[hsl(var(--foreground))]">{g.prefix}...</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{g.files.length}个文件 · {g.totalRows}行</span>
                    </div>
                    <span className="text-xs text-emerald-500 font-medium">已自动下载</span>
                  </div>
                ))}
                <button onClick={() => { setCompletedGroups([]); setLogs([]); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors mt-2">
                  <X className="w-3.5 h-3.5" /> 清除记录，重新上传
                </button>
              </div>
            )}

            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">使用说明</span>
              </div>
              <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <p><strong className="text-[hsl(var(--foreground))]">功能说明：</strong>按文件名前20位自动分组，批量合并多个 CSV 文件，统一编码输出。</p>
                <p><strong className="text-[hsl(var(--foreground))]">数据格式：</strong>多个 CSV 文件，文件名前20位相同的会自动分为一组。</p>
                <p><strong className="text-[hsl(var(--foreground))]">编码支持：</strong>读取支持 GBK、UTF-8、UTF-8 BOM、自动检测；输出可选择 GBK、UTF-8、UTF-8 BOM。</p>
                <p><strong className="text-[hsl(var(--foreground))]">操作步骤：</strong></p>
                <div className="pl-4 space-y-1">
                  <p>1. 选择读取编码和输出编码（默认 UTF-8 BOM）</p>
                  <p>2. 拖拽或选择多个 CSV 文件上传</p>
                  <p>3. 系统自动按文件名分组并合并</p>
                  <p>4. 每组合并完成后自动下载，无需等待全部完成</p>
                </div>
                <p><strong className="text-[hsl(var(--foreground))]">输出结果：</strong>每组生成一个「文件名前缀合并.csv」文件，保留首行表头，合并后续数据行。</p>
              </div>
            </div>
          </div>

          {logs.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] animate-scale-in">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">处理日志</h4>
                <button onClick={() => setLogs([])} className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> 清空日志
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="text-xs text-[hsl(var(--muted-foreground))] font-mono py-0.5 flex items-start gap-1.5">
                    {log.includes('失败') || log.includes('取消') ? <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />}
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
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

function parseLine(line: string): string[] {
  if (line.indexOf('"') === -1) {
    return line.split(',')
  }
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  const len = line.length
  while (i < len) {
    const quoteIdx = inQuotes ? line.indexOf('"', i) : line.indexOf('"', i)
    const sepIdx = inQuotes ? -1 : line.indexOf(',', i)
    if (inQuotes) {
      if (quoteIdx === -1) {
        current += line.slice(i)
        i = len
      } else if (quoteIdx + 1 < len && line.charCodeAt(quoteIdx + 1) === 34) {
        current += line.slice(i, quoteIdx) + '"'
        i = quoteIdx + 2
      } else {
        current += line.slice(i, quoteIdx)
        inQuotes = false
        i = quoteIdx + 1
      }
    } else {
      if (sepIdx === -1 && quoteIdx === -1) {
        current += line.slice(i)
        result.push(current)
        return result
      }
      if (sepIdx !== -1 && (quoteIdx === -1 || sepIdx < quoteIdx)) {
        current += line.slice(i, sepIdx)
        result.push(current)
        current = ''
        i = sepIdx + 1
      } else {
        current += line.slice(i, quoteIdx)
        inQuotes = true
        i = quoteIdx + 1
      }
    }
  }
  result.push(current)
  return result
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
