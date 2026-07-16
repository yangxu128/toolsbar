'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { BarChart3, UploadCloud, Download, Home, Star, ChevronRight, X, TrendingUp, BarChart2, PieChart, Activity, Grid3X3, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Settings2, Info } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'area'

interface DataRow {
  [key: string]: string | number
}

interface ChartConfig {
  title: string
  width: number
  height: number
  showGrid: boolean
  showLegend: boolean
  legendPos: 'top' | 'bottom' | 'left' | 'right'
  showLabels: boolean
  colorScheme: string
}

const chartOptions: { key: ChartType; label: string; icon: any; desc: string }[] = [
  { key: 'line', label: '折线图', icon: TrendingUp, desc: '展示数据趋势变化' },
  { key: 'bar', label: '柱状图', icon: BarChart2, desc: '对比不同类别数据' },
  { key: 'pie', label: '饼图', icon: PieChart, desc: '展示占比分布' },
  { key: 'scatter', label: '散点图', icon: Grid3X3, desc: '分析变量相关性' },
  { key: 'area', label: '面积图', icon: Activity, desc: '展示累积趋势' },
]

const colorSchemes: Record<string, string[]> = {
  default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'],
  warm: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6'],
  cool: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
  gray: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'],
}

export default function DataVizPage() {
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('data-viz')

  const [data, setData] = useState<DataRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [chartType, setChartType] = useState<ChartType>('line')
  const [xAxis, setXAxis] = useState('')
  const [yAxis, setYAxis] = useState('')
  const [groupBy, setGroupBy] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<ChartConfig>({
    title: '',
    width: 800,
    height: 400,
    showGrid: true,
    showLegend: true,
    legendPos: 'top',
    showLabels: true,
    colorScheme: 'default',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const numericHeaders = useMemo(() => {
    if (!data.length) return []
    return headers.filter(h => data.some(row => typeof row[h] === 'number' || !isNaN(parseFloat(String(row[h])))))
  }, [data, headers])

  const parseCsv = useCallback((text: string): { headers: string[]; rows: DataRow[] } => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }

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
    const rows: DataRow[] = []
    for (let i = 1; i < lines.length && i <= 5001; i++) {
      const values = parseLine(lines[i])
      const row: DataRow = {}
      headers.forEach((h, idx) => {
        const v = values[idx] || ''
        const num = parseFloat(v)
        row[h] = !isNaN(num) && v !== '' ? num : v
      })
      rows.push(row)
    }
    return { headers, rows }
  }, [])

  const handleUpload = useCallback(async (files: FileList) => {
    setProcessing(true)
    setLogs([])
    const file = files[0]
    if (!file) { setProcessing(false); return }

    try {
      const text = await file.text()
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0) {
        addLog('文件无有效数据')
        setProcessing(false)
        return
      }
      const parsedNumericHeaders = headers.filter(h =>
        rows.some(row => typeof row[h] === 'number' || !isNaN(parseFloat(String(row[h]))))
      )
      setHeaders(headers)
      setData(rows)
      setXAxis(headers[0])
      setYAxis(parsedNumericHeaders[0] || headers[1] || headers[0])
      setConfig(prev => ({ ...prev, title: `${headers[1] || ''} 按 ${headers[0]} 分布` }))
      addLog(`读取 ${file.name}：${rows.length} 行 × ${headers.length} 列`)
      if (rows.length >= 5000) addLog('数据量超过5000行，已截断显示')
    } catch (e: any) {
      addLog(`读取失败：${e.message}`)
    }
    setProcessing(false)
  }, [parseCsv, addLog])

  const chartData = useMemo(() => {
    if (!data.length || !xAxis || !yAxis) return null

    const grouped = new Map<string, number>()
    data.forEach(row => {
      const key = String(row[xAxis] ?? '未知')
      const val = typeof row[yAxis] === 'number' ? row[yAxis] : parseFloat(String(row[yAxis])) || 0
      if (groupBy) {
        const gKey = String(row[groupBy] ?? '默认')
        const mapKey = `${gKey}__${key}`
        grouped.set(mapKey, (grouped.get(mapKey) || 0) + val)
      } else {
        grouped.set(key, (grouped.get(key) || 0) + val)
      }
    })

    const labels = [...new Set(data.map(r => String(r[xAxis] ?? '未知')))]

    if (groupBy) {
      const groups = [...new Set(data.map(r => String(r[groupBy] ?? '默认')))]
      return {
        labels,
        datasets: groups.map(g => ({
          name: g,
          data: labels.map(l => grouped.get(`${g}__${l}`) || 0)
        }))
      }
    }

    return {
      labels,
      datasets: [{ name: yAxis, data: labels.map(l => grouped.get(l) || 0) }]
    }
  }, [data, xAxis, yAxis, groupBy])

  const handleExportChart = useCallback(() => {
    const svg = document.querySelector('#viz-chart svg')
    if (!svg) { addLog('暂无图表可导出'); return }
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chart_${chartType}_${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
    addLog('图表已导出为 SVG')
  }, [chartType, addLog])

  const handleExportPng = useCallback(() => {
    const svg = document.querySelector('#viz-chart svg') as SVGSVGElement | null
    if (!svg) { addLog('暂无图表可导出'); return }
    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = config.width * 2
      canvas.height = config.height * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); return }
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) return
        const pngUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = pngUrl
        a.download = `chart_${chartType}_${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(pngUrl)
      })
      URL.revokeObjectURL(url)
    }
    img.src = url
    addLog('图表已导出为 PNG')
  }, [chartType, config.width, config.height, addLog])

  const maxVal = useMemo(() => {
    if (!chartData) return 0
    const allData = chartData.datasets.flatMap(d => d.data)
    if (!allData.length) return 0
    const max = allData.reduce((a, b) => Math.max(a, b), -Infinity)
    const min = allData.reduce((a, b) => Math.min(a, b), Infinity)
    return Math.max(Math.abs(max), Math.abs(min), 0)
  }, [chartData])

  const colors = colorSchemes[config.colorScheme] || colorSchemes.default

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span>数据可视化</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">数据可视化看板</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">数据可视化看板</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">上传CSV数据，一键生成折线图、柱状图、饼图等多种图表</p>
              </div>
            </div>
            <button onClick={() => toggleFav('data-viz')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
              <Star className={`w-5 h-5 ${fav ? 'fill-current animate-heart-beat' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {data.length === 0 ? (
            <div className="max-w-2xl mx-auto">
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]">
                <input ref={fileInputRef} type="file" accept=".csv" onChange={(e) => e.target.files && handleUpload(e.target.files)} className="hidden" />
                <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
                  {processing ? <Loader2 className="w-8 h-8 text-orange-600 animate-spin" /> : <FileSpreadsheet className="w-8 h-8 text-orange-600" />}
                </div>
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                  {processing ? '正在解析...' : '上传 CSV 数据文件'}
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {processing ? '请稍候' : '支持拖拽上传，最大5000行'}
                </p>
                {!processing && (
                  <button className="px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg font-medium text-sm hover:opacity-90 active:scale-[0.97] transition-all">
                    选择文件
                  </button>
                )}
              </div>

              <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">使用说明</span>
                </div>
                <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <p><strong className="text-[hsl(var(--foreground))]">功能说明：</strong>上传 CSV 数据文件，一键生成折线图、柱状图、饼图、散点图、面积图。</p>
                  <p><strong className="text-[hsl(var(--foreground))]">数据格式：</strong>CSV 文件，第一行为表头，后续行为数据；数值列自动识别作为 Y 轴，最大支持 5000 行。</p>
                  <p><strong className="text-[hsl(var(--foreground))]">操作步骤：</strong></p>
                  <div className="pl-4 space-y-1">
                    <p>1. 准备 CSV 数据文件（可参考下方模板），点击上传区域选择文件</p>
                    <p>2. 选择图表类型：折线、柱状、饼图、散点、面积</p>
                    <p>3. 设置 X 轴（分类字段）、Y 轴（数值字段）、分组字段（可选）</p>
                    <p>4. 点击「图表设置」调整标题、尺寸、网格、图例、配色等属性</p>
                    <p>5. 图表实时渲染，支持导出 SVG 或 PNG</p>
                  </div>
                  <p><strong className="text-[hsl(var(--foreground))]">输出结果：</strong>在线交互式图表，可导出 SVG/PNG 图片。</p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] space-y-2">
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">数据模板</h4>
                <pre className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono overflow-x-auto whitespace-pre">
{`月份,销售额,利润,地区
1月,12000,3000,华东
2月,15000,4000,华东
3月,18000,5000,华南
4月,22000,6000,华南
5月,25000,7000,华北
6月,28000,8000,华北`}
                </pre>
                <button onClick={() => {
                  const blob = new Blob(['月份,销售额,利润,地区\n1月,12000,3000,华东\n2月,15000,4000,华东\n3月,18000,5000,华南\n4月,22000,6000,华南\n5月,25000,7000,华北\n6月,28000,8000,华北'], { type: 'text/csv' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = '数据模板.csv'
                  a.click()
                }} className="text-[11px] text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                  <Download className="w-3 h-3" /> 下载模板
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {chartOptions.map(opt => {
                    const Icon = opt.icon
                    const active = chartType === opt.key
                    return (
                      <button key={opt.key} onClick={() => setChartType(opt.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          active ? 'bg-orange-500 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
                        }`}>
                        <Icon className="w-3.5 h-3.5" />{opt.label}
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => setShowConfig(!showConfig)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    showConfig ? 'bg-orange-500 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--border))]'
                  }`}>
                  <Settings2 className="w-3.5 h-3.5" />图表设置
                </button>
              </div>

              {showConfig && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                  <div>
                    <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">图表标题</label>
                    <input type="text" value={config.title} onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">宽度</label>
                    <input type="number" value={config.width} onChange={e => setConfig(prev => ({ ...prev, width: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">高度</label>
                    <input type="number" value={config.height} onChange={e => setConfig(prev => ({ ...prev, height: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">配色方案</label>
                    <select value={config.colorScheme} onChange={e => setConfig(prev => ({ ...prev, colorScheme: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                      <option value="default">默认</option>
                      <option value="warm">暖色</option>
                      <option value="cool">冷色</option>
                      <option value="gray">灰度</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="showGrid" checked={config.showGrid} onChange={e => setConfig(prev => ({ ...prev, showGrid: e.target.checked }))} />
                    <label htmlFor="showGrid" className="text-xs text-[hsl(var(--foreground))]">显示网格</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="showLegend" checked={config.showLegend} onChange={e => setConfig(prev => ({ ...prev, showLegend: e.target.checked }))} />
                    <label htmlFor="showLegend" className="text-xs text-[hsl(var(--foreground))]">显示图例</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="showLabels" checked={config.showLabels} onChange={e => setConfig(prev => ({ ...prev, showLabels: e.target.checked }))} />
                    <label htmlFor="showLabels" className="text-xs text-[hsl(var(--foreground))]">显示数值标签</label>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">图例位置</label>
                    <select value={config.legendPos} onChange={e => setConfig(prev => ({ ...prev, legendPos: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                      <option value="top">顶部</option>
                      <option value="bottom">底部</option>
                      <option value="left">左侧</option>
                      <option value="right">右侧</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">X轴（分类）</label>
                  <select value={xAxis} onChange={e => setXAxis(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">Y轴（数值）</label>
                  <select value={yAxis} onChange={e => setYAxis(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                    {numericHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">分组（可选）</label>
                  <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-[hsl(var(--border))] text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
                    <option value="">不分组</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {chartData && (
                <div className="bg-[hsl(var(--muted))] rounded-xl border border-[hsl(var(--border))] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">{config.title || `${yAxis} 按 ${xAxis} 分布`}</h3>
                    <div className="flex items-center gap-3">
                      <button onClick={handleExportPng} className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" /> 导出PNG
                      </button>
                      <button onClick={handleExportChart} className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" /> 导出SVG
                      </button>
                    </div>
                  </div>
                  <div id="viz-chart" className="w-full overflow-x-auto">
                    <SvgChart type={chartType} data={chartData} colors={colors} maxVal={maxVal} config={config} />
                  </div>
                </div>
              )}

              <div className="bg-[hsl(var(--muted))] rounded-xl border border-[hsl(var(--border))] p-4">
                <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">数据预览（前10行）</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))]">
                        {headers.map(h => <th key={h} className="text-left py-2 px-3 font-medium text-[hsl(var(--muted-foreground))]">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-[hsl(var(--border))] last:border-0">
                          {headers.map(h => <td key={h} className="py-2 px-3 text-[hsl(var(--foreground))]">{String(row[h] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button onClick={() => { setData([]); setHeaders([]); setLogs([]); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors">
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

function SvgChart({ type, data, colors, maxVal, config }: { type: ChartType; data: any; colors: string[]; maxVal: number; config: ChartConfig }) {
  const width = config.width
  const height = config.height
  const legendH = config.showLegend && (config.legendPos === 'top' || config.legendPos === 'bottom') ? 30 : 0
  const legendW = config.showLegend && (config.legendPos === 'left' || config.legendPos === 'right') ? 100 : 0
  const titleH = config.title ? 30 : 0
  const padding = {
    top: 20 + titleH + (config.legendPos === 'top' ? legendH : 0),
    right: 20 + (config.legendPos === 'right' ? legendW : 0),
    bottom: 60 + (config.legendPos === 'bottom' ? legendH : 0),
    left: 60 + (config.legendPos === 'left' ? legendW : 0),
  }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  if (!data || !data.labels.length) return null

  const labels = data.labels as string[]
  const datasets = data.datasets as { name: string; data: number[] }[]

  const avgLabelLen = labels.reduce((sum, l) => sum + l.length, 0) / labels.length
  const shouldRotate = avgLabelLen * 10 > chartW / labels.length

  if (type === 'pie') {
    const total = datasets[0].data.reduce((a: number, b: number) => a + b, 0)
    if (total === 0) return null
    let curAngle = 0
    const cx = padding.left + chartW / 2
    const cy = padding.top + chartH / 2
    const r = Math.min(chartW, chartH) / 2 - 20

    const slices = datasets[0].data.map((val: number, i: number) => {
      const angle = (val / total) * 2 * Math.PI
      const startA = curAngle
      const endA = curAngle + angle
      const midA = startA + angle / 2
      curAngle = endA
      return {
        idx: i, val, midA,
        x1: cx + r * Math.cos(startA), y1: cy + r * Math.sin(startA),
        x2: cx + r * Math.cos(endA), y2: cy + r * Math.sin(endA),
        largeArc: angle > Math.PI ? 1 : 0,
        tx: cx + (r * 0.7) * Math.cos(midA), ty: cy + (r * 0.7) * Math.sin(midA),
        labelX: cx + (r + 35) * Math.cos(midA), labelY: cy + (r + 35) * Math.sin(midA),
      }
    })

    for (let i = 1; i < slices.length; i++) {
      const prev = slices[i - 1]
      const curr = slices[i]
      if (Math.abs(curr.labelY - prev.labelY) < 14 && Math.abs(curr.labelX - prev.labelX) < 60) {
        curr.labelY = prev.labelY + (i % 2 === 0 ? 16 : -16)
      }
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: width }}>
        {config.title && (
          <text x={width / 2} y={titleH - 5} textAnchor="middle" fill="currentColor" fontSize={14} fontWeight={600}>
            {config.title}
          </text>
        )}
        {slices.map(s => {
          const d = `M ${cx} ${cy} L ${s.x1} ${s.y1} A ${r} ${r} 0 ${s.largeArc} 1 ${s.x2} ${s.y2} Z`
          return (
            <g key={s.idx}>
              <path d={d} fill={colors[s.idx % colors.length]} stroke="white" strokeWidth={2} />
              {config.showLabels && (
                <text x={s.tx} y={s.ty} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontWeight={600}>
                  {((s.val / total) * 100).toFixed(1)}%
                </text>
              )}
              <text x={s.labelX} y={s.labelY} textAnchor={s.midA > Math.PI ? 'end' : 'start'} dominantBaseline="middle" fill="currentColor" fontSize={10}>
                {labels[s.idx]}
              </text>
            </g>
          )
        })}
        {config.showLegend && (
          <Legend datasets={datasets} colors={colors} pos={config.legendPos} width={width} height={height} padding={padding} />
        )}
      </svg>
    )
  }

  const xStep = chartW / Math.max(labels.length, 1)
  const yScale = maxVal > 0 ? chartH / maxVal : 1

  const getX = (i: number) => padding.left + i * xStep + xStep / 2
  const getY = (v: number) => padding.top + chartH - v * yScale

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: width }}>
      {config.title && (
        <text x={width / 2} y={titleH - 5} textAnchor="middle" fill="currentColor" fontSize={14} fontWeight={600}>
          {config.title}
        </text>
      )}

      {/* Grid */}
      {config.showGrid && [0, 0.25, 0.5, 0.75, 1].map(p => {
        const y = padding.top + chartH * p
        const val = maxVal * (1 - p)
        return (
          <g key={p}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="currentColor" fontSize={10} opacity={0.6}>{val.toFixed(0)}</text>
          </g>
        )
      })}

      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={getX(i)} y={height - padding.bottom + 20} textAnchor="middle" fill="currentColor" fontSize={10} opacity={0.7}
          transform={shouldRotate ? `rotate(-30, ${getX(i)}, ${height - padding.bottom + 20})` : undefined}>
          {l}
        </text>
      ))}

      {/* Data */}
      {datasets.map((ds, di) => {
        const color = colors[di % colors.length]
        if (type === 'line' || type === 'area') {
          const points = ds.data.map((v, i) => `${getX(i)},${getY(v)}`).join(' ')
          const areaPoints = `${getX(0)},${padding.top + chartH} ${points} ${getX(ds.data.length - 1)},${padding.top + chartH}`
          return (
            <g key={di}>
              {type === 'area' && <polygon points={areaPoints} fill={color} opacity={0.2} />}
              <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
              {ds.data.map((v, i) => (
                <circle key={i} cx={getX(i)} cy={getY(v)} r={3} fill={color} />
              ))}
              {config.showLabels && ds.data.map((v, i) => (
                <text key={`label-${i}`} x={getX(i)} y={getY(v) - 8} textAnchor="middle" fill={color} fontSize={9} fontWeight={600}>{v}</text>
              ))}
            </g>
          )
        }

        if (type === 'bar') {
          const barW = xStep / (datasets.length + 1)
          return (
            <g key={di}>
              {ds.data.map((v, i) => (
                <g key={i}>
                  <rect x={getX(i) - xStep / 2 + di * barW + barW / 2} y={getY(v)} width={barW - 2} height={padding.top + chartH - getY(v)} fill={color} rx={2} />
                  {config.showLabels && (
                    <text x={getX(i) - xStep / 2 + di * barW + barW / 2 + (barW - 2) / 2} y={getY(v) - 5} textAnchor="middle" fill={color} fontSize={9} fontWeight={600}>{v}</text>
                  )}
                </g>
              ))}
            </g>
          )
        }

        if (type === 'scatter') {
          return (
            <g key={di}>
              {ds.data.map((v, i) => (
                <circle key={i} cx={getX(i)} cy={getY(v)} r={5} fill={color} opacity={0.7} />
              ))}
            </g>
          )
        }

        return null
      })}

      {config.showLegend && (
        <Legend datasets={datasets} colors={colors} pos={config.legendPos} width={width} height={height} padding={padding} />
      )}
    </svg>
  )
}

function Legend({ datasets, colors, pos, width, height, padding }: {
  datasets: { name: string; data: number[] }[]
  colors: string[]
  pos: string
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
}) {
  const itemW = 80
  const itemH = 20

  if (pos === 'top') {
    const totalW = datasets.length * itemW
    const startX = (width - totalW) / 2
    return (
      <g>
        {datasets.map((ds, i) => (
          <g key={i} transform={`translate(${startX + i * itemW}, ${padding.top - 25})`}>
            <rect x={0} y={-6} width={12} height={12} fill={colors[i % colors.length]} rx={2} />
            <text x={18} y={3} fill="currentColor" fontSize={10}>{ds.name}</text>
          </g>
        ))}
      </g>
    )
  }

  if (pos === 'bottom') {
    const totalW = datasets.length * itemW
    const startX = (width - totalW) / 2
    return (
      <g>
        {datasets.map((ds, i) => (
          <g key={i} transform={`translate(${startX + i * itemW}, ${height - padding.bottom + 35})`}>
            <rect x={0} y={-6} width={12} height={12} fill={colors[i % colors.length]} rx={2} />
            <text x={18} y={3} fill="currentColor" fontSize={10}>{ds.name}</text>
          </g>
        ))}
      </g>
    )
  }

  if (pos === 'left') {
    return (
      <g>
        {datasets.map((ds, i) => (
          <g key={i} transform={`translate(${padding.left - 90}, ${padding.top + i * itemH})`}>
            <rect x={0} y={-6} width={12} height={12} fill={colors[i % colors.length]} rx={2} />
            <text x={18} y={3} fill="currentColor" fontSize={10}>{ds.name}</text>
          </g>
        ))}
      </g>
    )
  }

  if (pos === 'right') {
    return (
      <g>
        {datasets.map((ds, i) => (
          <g key={i} transform={`translate(${width - padding.right + 10}, ${padding.top + i * itemH})`}>
            <rect x={0} y={-6} width={12} height={12} fill={colors[i % colors.length]} rx={2} />
            <text x={18} y={3} fill="currentColor" fontSize={10}>{ds.name}</text>
          </g>
        ))}
      </g>
    )
  }

  return null
}
