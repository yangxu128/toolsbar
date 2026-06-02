'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  MapPin, UploadCloud, Home, Star, ChevronRight,
  X, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2,
  Settings2, Eye, EyeOff
} from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

declare global {
  interface Window {
    T: any
  }
}

interface CellData {
  lat: number
  lng: number
  azimuth: number
  name: string
  [key: string]: any
}

export default function CellMapPage() {
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('cell-map')

  const [cells, setCells] = useState<CellData[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [tiandituKey, setTiandituKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [latCol, setLatCol] = useState('')
  const [lngCol, setLngCol] = useState('')
  const [azimuthCol, setAzimuthCol] = useState('')
  const [nameCol, setNameCol] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('tianditu-key')
    if (saved) setTiandituKey(saved)
  }, [])

  const saveKey = useCallback(() => {
    localStorage.setItem('tianditu-key', tiandituKey)
    addLog('天地图Key已保存')
    setShowKeyInput(false)
    if (tiandituKey && !mapLoaded) initMap()
  }, [tiandituKey, mapLoaded, addLog])

  const initMap = useCallback(() => {
    if (!mapRef.current || !tiandituKey || mapInstance.current) return

    const script = document.createElement('script')
    script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${tiandituKey}`
    script.onload = () => {
      if (window.T && mapRef.current) {
        mapInstance.current = new window.T.Map(mapRef.current)
        mapInstance.current.centerAndZoom(new window.T.LngLat(116.40769, 39.89945), 12)
        setMapLoaded(true)
        addLog('天地图加载成功')
        if (cells.length > 0) drawCells()
      }
    }
    script.onerror = () => {
      addLog('天地图加载失败，请检查Key是否正确')
    }
    document.head.appendChild(script)
  }, [tiandituKey, cells, addLog])

  const drawCells = useCallback(() => {
    if (!mapInstance.current || !window.T) return

    markersRef.current.forEach(m => mapInstance.current.removeOverLay(m))
    markersRef.current = []

    cells.forEach((cell, idx) => {
      const center = new window.T.LngLat(cell.lng, cell.lat)

      const marker = new window.T.Marker(center, {
        title: cell.name || `小区${idx + 1}`
      })
      mapInstance.current.addOverLay(marker)
      markersRef.current.push(marker)

      const sectorPoints = calcSectorPoints(cell.lat, cell.lng, cell.azimuth, 0.3)
      const polygon = new window.T.Polygon(sectorPoints.map((p: any) => new window.T.LngLat(p.lng, p.lat)), {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.8,
        fillColor: '#3b82f6',
        fillOpacity: 0.3
      })
      mapInstance.current.addOverLay(polygon)
      markersRef.current.push(polygon)

      try {
        const label = new window.T.Label({
          text: cell.name || `小区${idx + 1}`,
          position: center,
          offset: new window.T.Point(10, -20)
        })
        mapInstance.current.addOverLay(label)
        markersRef.current.push(label)
      } catch {}
    })

    if (cells.length > 0) {
      const bounds = new window.T.LngLatBounds()
      cells.forEach(c => bounds.extend(new window.T.LngLat(c.lng, c.lat)))
      mapInstance.current.setViewport(bounds)
    }
  }, [cells])

  useEffect(() => {
    if (mapLoaded && cells.length > 0) {
      drawCells()
    }
  }, [cells, mapLoaded, drawCells])

  const calcSectorPoints = (lat: number, lng: number, azimuth: number, radiusKm: number) => {
    const points = [{ lat, lng }]
    const halfAngle = 65 / 2
    for (let angle = azimuth - halfAngle; angle <= azimuth + halfAngle; angle += 5) {
      const rad = (angle * Math.PI) / 180
      const dLat = (radiusKm / 111.32) * Math.cos(rad)
      const dLng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(rad)
      points.push({ lat: lat + dLat, lng: lng + dLng })
    }
    points.push({ lat, lng })
    return points
  }

  const parseExcel = useCallback(async (file: File) => {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) return { headers: [], rows: [] }

    const headers = jsonData[0].map(h => String(h).trim())
    const rows = jsonData.slice(1)
    return { headers, rows }
  }, [])

  const findCol = (headers: string[], patterns: string[]): string => {
    for (const h of headers) {
      const lower = h.toLowerCase()
      if (patterns.some(p => lower.includes(p))) return h
    }
    return ''
  }

  const handleUpload = useCallback(async (files: FileList) => {
    setProcessing(true)
    setLogs([])
    const file = files[0]
    if (!file) { setProcessing(false); return }

    try {
      const { headers, rows } = await parseExcel(file)
      if (headers.length === 0) {
        addLog('文件无有效数据')
        setProcessing(false)
        return
      }

      setHeaders(headers)

      const lat = findCol(headers, ['lat', '纬度', 'latitude', '纬'])
      const lng = findCol(headers, ['lng', 'lon', '经度', 'longitude', '经'])
      const azimuth = findCol(headers, ['azimuth', '方位角', '方向角', '方向'])
      const name = findCol(headers, ['name', '名称', '小区名', '小区名称', '基站名', 'cell'])

      setLatCol(lat)
      setLngCol(lng)
      setAzimuthCol(azimuth)
      setNameCol(name)

      if (!lat || !lng) {
        addLog('未找到经纬度字段，请手动选择')
        setProcessing(false)
        return
      }

      const latIdx = headers.indexOf(lat)
      const lngIdx = headers.indexOf(lng)
      const azIdx = headers.indexOf(azimuth)
      const nameIdx = headers.indexOf(name)

      const parsed: CellData[] = []
      for (const row of rows) {
        const latVal = parseFloat(String(row[latIdx]))
        const lngVal = parseFloat(String(row[lngIdx]))
        const azVal = azIdx >= 0 ? parseFloat(String(row[azIdx])) || 0 : 0
        if (isNaN(latVal) || isNaN(lngVal)) continue
        parsed.push({
          lat: latVal,
          lng: lngVal,
          azimuth: azVal,
          name: nameIdx >= 0 ? String(row[nameIdx] || '') : '',
        })
      }

      setCells(parsed)
      addLog(`解析 ${file.name}：${parsed.length} 个小区`)
      if (!mapLoaded && tiandituKey) initMap()
    } catch (e: any) {
      addLog(`读取失败：${e.message}`)
    }
    setProcessing(false)
  }, [parseExcel, addLog, mapLoaded, tiandituKey, initMap])

  const handleManualParse = useCallback(() => {
    if (!latCol || !lngCol || !cells.length) return

    const latIdx = headers.indexOf(latCol)
    const lngIdx = headers.indexOf(lngCol)
    const azIdx = headers.indexOf(azimuthCol)
    const nameIdx = headers.indexOf(nameCol)

    const parsed: CellData[] = []
    for (const row of cells as any) {
      const latVal = parseFloat(String(row[latIdx]))
      const lngVal = parseFloat(String(row[lngIdx]))
      const azVal = azIdx >= 0 ? parseFloat(String(row[azIdx])) || 0 : 0
      if (isNaN(latVal) || isNaN(lngVal)) continue
      parsed.push({
        lat: latVal,
        lng: lngVal,
        azimuth: azVal,
        name: nameIdx >= 0 ? String(row[nameIdx] || '') : '',
      })
    }

    setCells(parsed)
    addLog(`重新解析：${parsed.length} 个小区`)
  }, [latCol, lngCol, azimuthCol, nameCol, headers, cells, addLog])

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span>数据可视化</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">基站小区地理化展示</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">基站小区地理化展示</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">上传Excel文件，自动识别经纬度和方位角，在天地图上展示小区扇区</p>
              </div>
            </div>
            <button onClick={() => toggleFav('cell-map')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
              <Star className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button onClick={() => setShowKeyInput(!showKeyInput)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--border))] text-[hsl(var(--foreground))] text-xs font-medium rounded-lg transition-colors">
              <Settings2 className="w-3.5 h-3.5" /> 天地图Key配置
            </button>
            {tiandituKey && (
              <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Key已配置
              </span>
            )}
          </div>

          {showKeyInput && (
            <div className="mb-4 p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tiandituKey}
                  onChange={e => setTiandituKey(e.target.value)}
                  placeholder="请输入天地图API Key"
                  className="flex-1 px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
                />
                <button onClick={saveKey} className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-md text-sm font-medium hover:opacity-90">
                  保存
                </button>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                申请地址：<a href="https://console.tianditu.gov.cn/api/key" target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--primary))] hover:underline">https://console.tianditu.gov.cn/api/key</a>
              </p>
            </div>
          )}

          {cells.length === 0 ? (
            <div className="max-w-2xl mx-auto">
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]">
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files && handleUpload(e.target.files)} className="hidden" />
                <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  {processing ? <Loader2 className="w-8 h-8 text-green-600 animate-spin" /> : <FileSpreadsheet className="w-8 h-8 text-green-600" />}
                </div>
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                  {processing ? '正在解析...' : '上传 Excel 文件'}
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {processing ? '请稍候' : '支持 .xlsx / .xls 格式，自动识别经纬度和方位角'}
                </p>
                {!processing && (
                  <button className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-medium text-sm hover:opacity-90 active:scale-[0.97] transition-all">
                    选择文件
                  </button>
                )}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] space-y-2">
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">使用说明</h4>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))] space-y-1">
                  <p><strong className="text-[hsl(var(--foreground))]">数据格式：</strong>Excel 文件，需包含以下字段</p>
                  <p>• 纬度字段：列名包含 lat / 纬度 / latitude / 纬</p>
                  <p>• 经度字段：列名包含 lng / lon / 经度 / longitude / 经</p>
                  <p>• 方位角字段：列名包含 azimuth / 方位角 / 方向角 / 方向</p>
                  <p>• 小区名称：列名包含 name / 名称 / 小区名 / 基站名 / cell（可选）</p>
                  <p><strong className="text-[hsl(var(--foreground))]">操作步骤：</strong></p>
                  <p>1. 先配置天地图Key（点击上方「天地图Key配置」）</p>
                  <p>2. 上传包含小区信息的Excel文件</p>
                  <p>3. 系统自动识别字段并在地图上绘制扇区（65°）</p>
                  <p>4. 如字段识别有误，可手动选择后重新解析</p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] space-y-2">
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">数据模板</h4>
                <pre className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono overflow-x-auto whitespace-pre">
{`小区名称,经度,纬度,方位角
小区A,120.123456,30.654321,0
小区B,120.123556,30.654421,120
小区C,120.123656,30.654521,240`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">纬度字段</label>
                  <select value={latCol} onChange={e => setLatCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                    <option value="">请选择</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">经度字段</label>
                  <select value={lngCol} onChange={e => setLngCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                    <option value="">请选择</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">方位角字段</label>
                  <select value={azimuthCol} onChange={e => setAzimuthCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                    <option value="">请选择</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">名称字段</label>
                  <select value={nameCol} onChange={e => setNameCol(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                    <option value="">请选择</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleManualParse}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-md hover:opacity-90">
                  <MapPin className="w-3.5 h-3.5" /> 重新解析并展示
                </button>
                <button onClick={() => { setCells([]); setLogs([]); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" /> 清除数据
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <span className="px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 font-medium">
                  {cells.length} 个小区
                </span>
                {mapLoaded ? (
                  <span className="px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-medium">
                    地图已加载
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 font-medium">
                    地图未加载
                  </span>
                )}
              </div>

              {!mapLoaded && tiandituKey && (
                <button onClick={initMap}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors">
                  加载天地图
                </button>
              )}

              <div ref={mapRef} className="w-full h-[500px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                {!mapLoaded && !tiandituKey && (
                  <div className="w-full h-full flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                    <div className="text-center">
                      <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">请先配置天地图Key</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] max-h-48 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-xs text-[hsl(var(--muted-foreground))] font-mono py-0.5 flex items-start gap-1.5">
                  {log.includes('失败') || log.includes('未找到') ? <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />}
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
