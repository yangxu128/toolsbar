'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  BarChart3, UploadCloud, Download, Home, Star, ChevronRight,
  X, TrendingUp, BarChart2, PieChart, Activity, Grid3X3,
  FileSpreadsheet, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'area'

interface DataRow {
  [key: string]: string | number
}

const chartOptions: { key: ChartType; label: string; icon: any; desc: string }[] = [
  { key: 'line', label: '折线图', icon: TrendingUp, desc: '展示数据趋势变化' },
  { key: 'bar', label: '柱状图', icon: BarChart2, desc: '对比不同类别数据' },
  { key: 'pie', label: '饼图', icon: PieChart, desc: '展示占比分布' },
  { key: 'scatter', label: '散点图', icon: Grid3X3, desc: '分析变量相关性' },
  { key: 'area', label: '面积图', icon: Activity, desc: '展示累积趋势' },
]

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
      setHeaders(headers)
      setData(rows)
      setXAxis(headers[0])
      setYAxis(numericHeaders[0] || headers[1] || headers[0])
      addLog(`读取 ${file.name}：${rows.length} 行 × ${headers.length} 列`)
      if (rows.length >= 5000) addLog('数据量超过5000行，已截断显示')
    } catch (e: any) {
      addLog(`读取失败：${e.message}`)
    }
    setProcessing(false)
  }, [parseCsv, addLog, numericHeaders])

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

  const maxVal = useMemo(() => {
    if (!chartData) return 0
    return Math.max(...chartData.datasets.flatMap(d => d.data))
  }, [chartData])

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

  return (
    <div>
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
              <Star className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
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

              <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] space-y-2">
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">使用说明</h4>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))] space-y-1">
                  <p><strong className="text-[hsl(var(--foreground))]">数据格式：</strong>CSV 文件，第一行为表头</p>
                  <p>• 支持数值列自动识别，用于图表纵轴</p>
                  <p>• 最大支持 5000 行数据，超限自动截断</p>
                  <p><strong className="text-[hsl(var(--foreground))]">操作步骤：</strong></p>
                  <p>1. 准备 CSV 数据文件（可参考下方模板）</p>
                  <p>2. 上传文件，系统自动解析列名和数据</p>
                  <p>3. 选择图表类型、X轴、Y轴、分组字段</p>
                  <p>4. 图表实时渲染，支持导出 SVG</p>
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
              </div>

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
                    <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">{yAxis} 按 {xAxis} 分布</h3>
                    <button onClick={handleExportChart} className="text-xs text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" /> 导出SVG
                    </button>
                  </div>
                  <div id="viz-chart" className="w-full overflow-x-auto">
                    <SvgChart type={chartType} data={chartData} colors={colors} maxVal={maxVal} />
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

function SvgChart({ type, data, colors, maxVal }: { type: ChartType; data: any; colors: string[]; maxVal: number }) {
  const width = 800
  const height = 320
  const padding = { top: 20, right: 20, bottom: 60, left: 60 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  if (!data || !data.labels.length) return null

  const labels = data.labels as string[]
  const datasets = data.datasets as { name: string; data: number[] }[]

  if (type === 'pie') {
    const total = datasets[0].data.reduce((a: number, b: number) => a + b, 0)
    let startAngle = 0
    const cx = width / 2
    const cy = height / 2
    const r = Math.min(chartW, chartH) / 2 - 10

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: 600 }}>
        {datasets[0].data.map((val: number, i: number) => {
          const angle = (val / total) * 2 * Math.PI
          const endAngle = startAngle + angle
          const x1 = cx + r * Math.cos(startAngle)
          const y1 = cy + r * Math.sin(startAngle)
          const x2 = cx + r * Math.cos(endAngle)
          const y2 = cy + r * Math.sin(endAngle)
          const largeArc = angle > Math.PI ? 1 : 0
          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
          const midAngle = startAngle + angle / 2
          const tx = cx + (r * 0.7) * Math.cos(midAngle)
          const ty = cy + (r * 0.7) * Math.sin(midAngle)
          const labelX = cx + (r + 30) * Math.cos(midAngle)
          const labelY = cy + (r + 30) * Math.sin(midAngle)
          startAngle = endAngle
          return (
            <g key={i}>
              <path d={d} fill={colors[i % colors.length]} stroke="white" strokeWidth={2} />
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontWeight={600}>
                {((val / total) * 100).toFixed(1)}%
              </text>
              <text x={labelX} y={labelY} textAnchor={midAngle > Math.PI ? 'end' : 'start'} dominantBaseline="middle" fill="currentColor" fontSize={10}>
                {labels[i]}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  const xStep = chartW / Math.max(labels.length, 1)
  const yScale = maxVal > 0 ? chartH / maxVal : 1

  const getX = (i: number) => padding.left + i * xStep + xStep / 2
  const getY = (v: number) => padding.top + chartH - v * yScale

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: 800 }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(p => {
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
        <text key={i} x={getX(i)} y={height - padding.bottom + 20} textAnchor="middle" fill="currentColor" fontSize={10} opacity={0.7} transform={`rotate(-30, ${getX(i)}, ${height - padding.bottom + 20})`}>
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
            </g>
          )
        }

        if (type === 'bar') {
          const barW = xStep / (datasets.length + 1)
          return (
            <g key={di}>
              {ds.data.map((v, i) => (
                <rect key={i} x={getX(i) - xStep / 2 + di * barW + barW / 2} y={getY(v)} width={barW - 2} height={padding.top + chartH - getY(v)} fill={color} rx={2} />
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

      {/* Legend */}
      {datasets.map((ds, i) => (
        <g key={i} transform={`translate(${width - padding.right - 100}, ${padding.top + i * 20})`}>
          <rect x={0} y={-6} width={12} height={12} fill={colors[i % colors.length]} rx={2} />
          <text x={18} y={3} fill="currentColor" fontSize={10}>{ds.name}</text>
        </g>
      ))}
    </svg>
  )
}
