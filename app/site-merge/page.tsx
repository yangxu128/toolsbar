'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Home, Star, ChevronRight as ChevronRightIcon, FileSpreadsheet, X, Loader2, CheckCircle2, AlertCircle, Settings2, Upload, Download } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

type Row = Record<string, any>

export default function SiteMergePage() {
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('site-merge')

  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [colLng, setColLng] = useState('')
  const [colLat, setColLat] = useState('')
  const [colCovType, setColCovType] = useState('')
  const [colSiteId, setColSiteId] = useState('')
  const [distance, setDistance] = useState(100)
  const [separate, setSeparate] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef(false)

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const handleFile = async (file: File) => {
    setError('')
    setDone(false)
    setLogs([])
    addLog(`正在读取文件: ${file.name}`)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Row[]>(ws, { defval: '' })
      if (raw.length === 0) {
        setError('文件为空或无数据行')
        return
      }
      const cols = Object.keys(raw[0])
      setHeaders(cols)
      setRows(raw)
      setFileName(file.name)
      addLog(`读取成功，共 ${raw.length} 行，${cols.length} 列`)

      const find = (keywords: string[]) => cols.find(c => keywords.some(k => c.toLowerCase().includes(k.toLowerCase())))
      setColLng(find(['经度', 'longitude', 'lng', 'lon']) || '')
      setColLat(find(['纬度', 'latitude', 'lat']) || '')
      setColCovType(find(['覆盖类型', 'coverage', 'covtype', '宏站室分']) || '')
      setColSiteId(find(['物理站址', 'siteid', 'site_id', '站址标识', '站址']) || '')
    } catch (e: any) {
      setError(`读取失败: ${e.message}`)
      addLog(`读取失败: ${e.message}`)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const yieldToMain = () => new Promise(r => setTimeout(r, 0))

  const processGroup = async (data: Row[], dist: number, prefix: string, lngCol: string, latCol: string, siteIdCol: string): Promise<Row[]> => {
    if (data.length === 0) return data

    addLog(`  去重站点标识...`)
    const seen = new Map<string, Row>()
    for (const r of data) {
      const sid = String(r[siteIdCol] ?? '').trim()
      if (sid && !seen.has(sid)) seen.set(sid, r)
    }
    const unique = Array.from(seen.values())
    addLog(`  去重后 ${unique.length} 个唯一站点`)

    const coords = unique.map(r => ({
      lng: Number(r[lngCol]),
      lat: Number(r[latCol]),
    }))

    const degDist = dist / 111320
    const latRad = coords.length > 0 ? coords[0].lat * Math.PI / 180 : 0
    const lngFactor = Math.cos(latRad)

    addLog(`  构建空间网格搜索邻近站点 (阈值 ${dist}m)...`)
    const cellSize = degDist
    const grid = new Map<string, number[]>()
    for (let i = 0; i < coords.length; i++) {
      const cx = Math.floor(coords[i].lng * lngFactor / cellSize)
      const cy = Math.floor(coords[i].lat / cellSize)
      const key = `${cx},${cy}`
      if (!grid.has(key)) grid.set(key, [])
      grid.get(key)!.push(i)
    }

    const pairs: [number, number][] = []
    for (let i = 0; i < coords.length; i++) {
      const cx = Math.floor(coords[i].lng * lngFactor / cellSize)
      const cy = Math.floor(coords[i].lat / cellSize)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${cx + dx},${cy + dy}`
          const cell = grid.get(key)
          if (!cell) continue
          for (const j of cell) {
            if (j <= i) continue
            const dlng = (coords[i].lng - coords[j].lng) * lngFactor
            const dlat = coords[i].lat - coords[j].lat
            const d = Math.sqrt(dlng * dlng + dlat * dlat)
            if (d <= degDist) pairs.push([i, j])
          }
        }
      }
      if (i % 5000 === 0) await yieldToMain()
    }
    addLog(`  找到 ${pairs.length} 对邻近站点`)

    addLog(`  合并邻近站点...`)
    const labels = new Int32Array(unique.length)
    for (let i = 0; i < unique.length; i++) labels[i] = i

    const find = (x: number): number => {
      while (labels[x] !== x) {
        labels[x] = labels[labels[x]]
        x = labels[x]
      }
      return x
    }

    for (const [i, j] of pairs) {
      if (cancelRef.current) return data
      const ri = find(i)
      const rj = find(j)
      if (ri !== rj) {
        const mn = Math.min(ri, rj)
        const mx = Math.max(ri, rj)
        labels[mx] = mn
      }
    }

    for (let i = 0; i < unique.length; i++) labels[i] = find(i)

    const uniqueLabels = [...new Set(labels)]
    uniqueLabels.sort((a, b) => a - b)
    const labelMap = new Map<number, string>()
    uniqueLabels.forEach((lbl, idx) => labelMap.set(lbl, `${prefix}-${idx + 1}`))

    const sidToLabel = new Map<string, string>()
    unique.forEach((r, i) => {
      const sid = String(r[siteIdCol] ?? '').trim()
      sidToLabel.set(sid, labelMap.get(labels[i]) || '')
    })

    const result = data.map(r => {
      const sid = String(r[siteIdCol] ?? '').trim()
      return { ...r, '新物理站址标签': sidToLabel.get(sid) || '' }
    })

    addLog(`  合并完成，共 ${uniqueLabels.length} 个物理站址`)
    return result
  }

  const handleRun = async () => {
    if (!rows.length) return
    if (!colLng || !colLat || !colSiteId) {
      setError('请选择经度、纬度、物理站址标识列')
      return
    }
    if (!colCovType && separate) {
      setError('区分宏站/室分需要选择覆盖类型列')
      return
    }

    setProcessing(true)
    setDone(false)
    setError('')
    setLogs([])
    cancelRef.current = false

    try {
      let result: Row[] = []

      if (separate && colCovType) {
        const macro = rows.filter(r => String(r[colCovType] ?? '').trim() === '宏站')
        const indoor = rows.filter(r => String(r[colCovType] ?? '').trim() === '室分')
        const other = rows.filter(r => {
          const v = String(r[colCovType] ?? '').trim()
          return v !== '宏站' && v !== '室分'
        })

        addLog(`宏站 ${macro.length} 行，室分 ${indoor.length} 行${other.length ? `，其他 ${other.length} 行` : ''}`)

        let combined: Row[] = []

        if (macro.length) {
          addLog('处理宏站数据...')
          const r = await processGroup(macro, distance, '宏站', colLng, colLat, colSiteId)
          combined = combined.concat(r)
        }
        if (indoor.length) {
          addLog('处理室分数据...')
          const r = await processGroup(indoor, distance, '室分', colLng, colLat, colSiteId)
          combined = combined.concat(r)
        }
        if (other.length) {
          addLog(`处理其他类型数据 (${other.length} 行)...`)
          const r = await processGroup(other, distance, '其他', colLng, colLat, colSiteId)
          combined = combined.concat(r)
        }
        result = combined
      } else {
        addLog('不区分类型，处理全部数据...')
        result = await processGroup(rows, distance, '站址', colLng, colLat, colSiteId)
      }

      if (cancelRef.current) {
        addLog('已取消')
        return
      }

      addLog('导出 Excel...')
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(result)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '合并结果')
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `站址合并_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
      addLog('处理完成！')
    } catch (e: any) {
      setError(`处理失败: ${e.message}`)
      addLog(`处理失败: ${e.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleReset = () => {
    setHeaders([])
    setRows([])
    setFileName('')
    setLogs([])
    setDone(false)
    setError('')
    setColLng('')
    setColLat('')
    setColCovType('')
    setColSiteId('')
  }

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="flex items-center gap-1 hover:text-[hsl(var(--primary))] transition-colors"><Home className="w-3.5 h-3.5" />首页</Link>
        <ChevronRightIcon className="w-3.5 h-3.5" />
        <span>数据处理</span>
        <ChevronRightIcon className="w-3.5 h-3.5" />
        <span className="text-[hsl(var(--foreground))]">物理站址合并</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">物理站址合并</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">基于经纬度距离合并邻近物理站址，支持宏站/室分分离处理</p>
            </div>
          </div>
          <button onClick={() => toggleFav('site-merge')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
            <Star className={`w-5 h-5 ${fav ? 'fill-current' : ''} ${fav ? 'animate-heart-beat' : ''}`} />
          </button>
        </div>
      </div>

      {!rows.length ? (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          className="bg-[hsl(var(--card))] rounded-2xl border-2 border-dashed border-[hsl(var(--border))] p-12 text-center hover:border-[hsl(var(--primary))]/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-base font-medium text-[hsl(var(--foreground))] mb-1">点击或拖拽上传 Excel 文件</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">支持 .xlsx / .xls 格式</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium text-[hsl(var(--foreground))]">{fileName}</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">{rows.length} 行</span>
              </div>
              <button onClick={handleReset} className="icon-btn"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">经度列</label>
                <select value={colLng} onChange={e => setColLng(e.target.value)} className="form-input">
                  <option value="">-- 选择 --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">纬度列</label>
                <select value={colLat} onChange={e => setColLat(e.target.value)} className="form-input">
                  <option value="">-- 选择 --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">覆盖类型列</label>
                <select value={colCovType} onChange={e => setColCovType(e.target.value)} className="form-input">
                  <option value="">-- 选择 --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">物理站址标识列</label>
                <select value={colSiteId} onChange={e => setColSiteId(e.target.value)} className="form-input">
                  <option value="">-- 选择 --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4 mt-4 pt-4 border-t border-[hsl(var(--border))]">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">合并距离 (米)</label>
                <input type="number" value={distance} onChange={e => setDistance(Number(e.target.value))} min={1} className="form-input w-32" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                <input type="checkbox" checked={separate} onChange={e => setSeparate(e.target.checked)} className="w-4 h-4 rounded accent-[hsl(var(--primary))]" />
                <span className="text-sm text-[hsl(var(--foreground))]">区分宏站/室分</span>
              </label>
              <div className="flex-1" />
              {processing ? (
                <button onClick={() => { cancelRef.current = true }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all">
                  <X className="w-4 h-4" />取消
                </button>
              ) : (
                <button onClick={handleRun} className="btn-primary">
                  <Settings2 className="w-4 h-4" />开始合并
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="error-state flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {done && (
            <div className="result-card flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">处理完成，文件已下载</span>
            </div>
          )}

          {logs.length > 0 && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">处理日志</span>
                <button onClick={() => setLogs([])} className="icon-btn"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="bg-[hsl(var(--muted))] rounded-lg p-3 max-h-60 overflow-y-auto font-mono text-xs space-y-0.5">
                {logs.map((l, i) => <div key={i} className="text-[hsl(var(--muted-foreground))]">{l}</div>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
