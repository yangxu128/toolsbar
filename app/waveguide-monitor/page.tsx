'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Home, Star, ChevronRight as ChevronRightIcon, Download, X, Loader2, Info, Thermometer, Wind, Droplets, Gauge } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'
import UploadPanel from '@/components/upload-panel'

interface RawRow {
  time: Date
  city: string
  value: number | null
}

type WeatherRow = Record<string, string | number>

const CITIES = ['杭州', '绍兴', '衢州', '丽水', '台州']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function WaveguideMonitorPage() {
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('waveguide-monitor')

  const [rows, setRows] = useState<RawRow[]>([])
  const [weather, setWeather] = useState<WeatherRow[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)

  const parseCity = (group: string): string => {
    const m = group.match(/网络优化-永久-(\S+)5G/)
    if (!m) return ''
    const prefix = m[1]
    for (const c of CITIES) if (prefix.includes(c)) return c
    return prefix
  }

  const parseDate = (v: any): Date | null => {
    if (v === null || v === undefined || v === '') return null
    if (v instanceof Date) return v
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }

  const parseFile = useCallback(async (file: File): Promise<RawRow[]> => {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (json.length < 2) throw new Error(`${file.name} 无有效数据`)

    const headers = (json[0] || []).map((h: any) => String(h || ''))
    const colTime = headers.findIndex(h => h.includes('开始时间'))
    const colGroup = headers.findIndex(h => h.includes('分组'))
    const colValue = headers.findIndex(h => h.includes('小区特殊时隙最后一个GP符号平均干扰电平'))
    if (colTime < 0 || colGroup < 0 || colValue < 0) throw new Error(`${file.name} 未找到必需的列：开始时间/分组/干扰电平`)

    const parsed: RawRow[] = []
    for (let i = 1; i < json.length; i++) {
      const r = json[i]
      const time = parseDate(r[colTime])
      const city = parseCity(String(r[colGroup] || ''))
      const v = r[colValue]
      const value = v === '' || v === null || v === undefined ? null : Number(v)
      if (time && city) parsed.push({ time, city, value })
    }
    return parsed
  }, [])

  const handleUpload = useCallback(async (files: FileList) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const allParsed: RawRow[] = []
      const fileList = Array.from(files)
      for (const file of fileList) {
        const parsed = await parseFile(file)
        allParsed.push(...parsed)
      }
      if (allParsed.length === 0) throw new Error('未解析到有效数据')

      const merged = mergeRows(allParsed)
      merged.sort((a, b) => a.time.getTime() - b.time.getTime())
      setRows(merged)
      setDateRange({ start: formatDate(merged[0].time), end: formatDate(merged[merged.length - 1].time) })
      generateDefaultWeather(merged)
    } catch (e: any) {
      setErrorMsg(e.message || '解析失败')
    } finally {
      setLoading(false)
    }
  }, [parseFile])

  const generateDefaultWeather = (data: RawRow[]) => {
    const dates = Array.from(new Set(data.map(r => formatDate(r.time)))).sort()
    const weatherRows: WeatherRow[] = dates.map(d => {
      const temp = 22 + Math.floor(Math.random() * 12)
      return {
        日期: d,
        最高温: `${temp}°`,
        最低温: `${temp - 8}°`,
        天气: '多云',
        风力指数: '东风2级',
        空气质量指数: '50 优',
      }
    })
    setWeather(weatherRows)
  }

  const matrixByCity = useMemo(() => {
    const map = new Map<string, Map<string, (number | null)[]>>()
    for (const r of rows) {
      if (!map.has(r.city)) map.set(r.city, new Map())
      const cityMap = map.get(r.city)!
      const d = formatDate(r.time)
      if (!cityMap.has(d)) cityMap.set(d, Array(24).fill(null))
      const hour = r.time.getHours()
      cityMap.get(d)![hour] = r.value
    }
    return map
  }, [rows])

  const stats = useMemo(() => {
    const result: Record<string, { min: number; max: number; avg: number; count: number }> = {}
    for (const city of CITIES) {
      const values = rows.filter(r => r.city === city && r.value !== null).map(r => r.value as number)
      if (values.length === 0) continue
      const sum = values.reduce((a, b) => a + b, 0)
      result[city] = { min: Math.min(...values), max: Math.max(...values), avg: sum / values.length, count: values.length }
    }
    return result
  }, [rows])

  const handleWeatherChange = (idx: number, key: string, value: string) => {
    setWeather(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }

  const exportExcel = useCallback(async () => {
    if (!rows.length) return
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    for (const city of CITIES) {
      const cityMap = matrixByCity.get(city)
      if (!cityMap || cityMap.size === 0) continue
      const dates = Array.from(cityMap.keys()).sort()
      const headerRow = [`${city} 小区特殊时隙最后一个GP符号平均干扰电平(dBm)`, ...dates]
      const weatherRows = [
        ['最高温', ...dates.map(d => findWeather(d, '最高温') || '')],
        ['最低温', ...dates.map(d => findWeather(d, '最低温') || '')],
        ['天气', ...dates.map(d => findWeather(d, '天气') || '')],
        ['风力指数', ...dates.map(d => findWeather(d, '风力指数') || '')],
        ['空气质量指数', ...dates.map(d => findWeather(d, '空气质量指数') || '')],
        ['时间', ...dates],
      ]
      const dataRows = HOURS.map(h => [`${h}:00:00`, ...dates.map(d => cityMap.get(d)![h] ?? '')])
      const sheetData = [headerRow, ...weatherRows, ...dataRows]
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      ws['!cols'] = [{ wch: 12 }, ...dates.map(() => ({ wch: 10 }))]
      XLSX.utils.book_append_sheet(wb, ws, city)
    }

    const weatherAoa = [['日期', '最高温', '最低温', '天气', '风力指数', '空气质量指数'], ...weather.map(w => [w['日期'], w['最高温'], w['最低温'], w['天气'], w['风力指数'], w['空气质量指数']])]
    const wsWeather = XLSX.utils.aoa_to_sheet(weatherAoa)
    wsWeather['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsWeather, '天气')

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `大气波导干扰监控_${dateRange?.start || ''}_${dateRange?.end || ''}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }, [rows, matrixByCity, weather, dateRange])

  const findWeather = (date: string, key: string): string => {
    const row = weather.find(w => w['日期'] === date)
    return row ? String(row[key] || '') : ''
  }

  const handleClear = () => {
    setRows([])
    setWeather([])
    setDateRange(null)
    setErrorMsg('')
  }

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span>数据可视化</span>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">大气波导干扰监控</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500 flex items-center justify-center shrink-0">
                <Gauge className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">大气波导干扰监控</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">上传小时级干扰电平指标，自动生成按地市分片的热力图监控表</p>
              </div>
            </div>
            <button onClick={() => toggleFav('waveguide-monitor')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
              <Star className={`w-5 h-5 ${fav ? 'fill-current animate-heart-beat' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {!rows.length ? (
            <div className="max-w-2xl mx-auto space-y-4">
              <UploadPanel onUploadMultiple={handleUpload} multiple loading={loading} accept=".xlsx,.xls" title="点击或拖拽上传一个或多个原始指标文件" subtitle="支持 .xlsx / .xls 格式" hint="需包含开始时间、分组、小区特殊时隙最后一个GP符号平均干扰电平(dBm)列" />
              {errorMsg && (
                <div className="error-state flex items-start justify-between gap-2">
                  <span>{errorMsg}</span>
                  <button onClick={() => setErrorMsg('')} className="shrink-0 hover:text-red-700 dark:hover:text-red-300 transition-colors" aria-label="关闭错误">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">使用说明</span>
                </div>
                <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <p><strong className="text-[hsl(var(--foreground))]">数据格式：</strong>开始时间、结束时间、粒度、分组、小区特殊时隙最后一个GP符号平均干扰电平(dBm)。</p>
                  <p><strong className="text-[hsl(var(--foreground))]">地市识别：</strong>从"分组"列提取，如"网络优化-永久-台州5G"识别为台州。</p>
                  <p><strong className="text-[hsl(var(--foreground))]">输出结果：</strong>每个地市一个sheet，行表示0-23点，列表示日期，附带天气信息行。</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-scale-in">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  数据时间：{dateRange?.start} 至 {dateRange?.end}，共 {rows.length} 条记录
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportExcel} className="btn-primary">
                    <Download className="w-4 h-4" /> 导出Excel
                  </button>
                  <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:border-red-300 transition-colors">
                    <X className="w-3.5 h-3.5" /> 清除数据
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {CITIES.map(city => {
                  const s = stats[city]
                  return (
                    <div key={city} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                      <div className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">{city}</div>
                      {s ? (
                        <div className="space-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                          <div>最小：{s.min.toFixed(2)} dBm</div>
                          <div>最大：{s.max.toFixed(2)} dBm</div>
                          <div>平均：{s.avg.toFixed(2)} dBm</div>
                          <div>样本：{s.count}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">无数据</div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Thermometer className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">天气信息（可编辑）</span>
                </div>
                <div className="overflow-auto max-h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[hsl(var(--card))]">
                      <tr className="border-b border-[hsl(var(--border))]">
                        <th className="text-left py-2 px-2 text-[hsl(var(--muted-foreground))] font-medium">日期</th>
                        <th className="text-left py-2 px-2 text-[hsl(var(--muted-foreground))] font-medium"><Droplets className="w-3.5 h-3.5 inline mr-1" />最高温</th>
                        <th className="text-left py-2 px-2 text-[hsl(var(--muted-foreground))] font-medium">最低温</th>
                        <th className="text-left py-2 px-2 text-[hsl(var(--muted-foreground))] font-medium">天气</th>
                        <th className="text-left py-2 px-2 text-[hsl(var(--muted-foreground))] font-medium"><Wind className="w-3.5 h-3.5 inline mr-1" />风力指数</th>
                        <th className="text-left py-2 px-2 text-[hsl(var(--muted-foreground))] font-medium">空气质量指数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weather.map((w, idx) => (
                        <tr key={idx} className="border-b border-[hsl(var(--border))] last:border-0">
                          <td className="py-2 px-2 text-[hsl(var(--foreground))] whitespace-nowrap">{w['日期']}</td>
                          {['最高温', '最低温', '天气', '风力指数', '空气质量指数'].map(key => (
                            <td key={key} className="py-1 px-2">
                              <input
                                type="text"
                                value={String(w[key] || '')}
                                onChange={e => handleWeatherChange(idx, key, e.target.value)}
                                className="w-full min-w-[80px] bg-transparent border-b border-[hsl(var(--border))] focus:border-[hsl(var(--primary))] outline-none text-[hsl(var(--foreground))] text-sm py-1"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-6">
                {CITIES.map(city => {
                  const cityMap = matrixByCity.get(city)
                  if (!cityMap || cityMap.size === 0) return null
                  const dates = Array.from(cityMap.keys()).sort()
                  return (
                    <div key={city} className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                        <span className="font-semibold text-[hsl(var(--foreground))]">{city}</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] ml-2">小区特殊时隙最后一个GP符号平均干扰电平(dBm)</span>
                      </div>
                      <div className="overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-[hsl(var(--muted))]">
                              <th className="py-2 px-2 text-left text-[hsl(var(--foreground))] font-medium sticky left-0 bg-[hsl(var(--muted))] z-20">时间</th>
                              {dates.map(d => (
                                <th key={d} className="py-2 px-1 text-center text-[hsl(var(--muted-foreground))] font-medium min-w-[64px]">{d.slice(5)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {HOURS.map(h => (
                              <tr key={h} className="border-t border-[hsl(var(--border))]">
                                <td className="py-1.5 px-2 text-[hsl(var(--foreground))] font-medium sticky left-0 bg-[hsl(var(--card))] z-10">{`${h}:00:00`}</td>
                                {dates.map(d => {
                                  const v = cityMap.get(d)![h]
                                  return (
                                    <td key={d} className="py-1.5 px-1 text-center whitespace-nowrap" style={{ backgroundColor: v !== null ? heatColor(v) : 'transparent' }}>
                                      {v !== null ? v.toFixed(2) : '-'}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function heatColor(v: number): string {
  // 三色刻度：最低值（最负）绿色，-105 白色，最高值（接近0）红色
  const mid = -105
  if (v <= mid) {
    const min = -120
    const t = Math.max(0, Math.min(1, (v - min) / (mid - min)))
    const r = Math.round(255 - (255 - 76) * t)
    const g = Math.round(255 - (255 - 175) * t)
    const b = Math.round(255 - (255 - 80) * t)
    return `rgba(${r}, ${g}, ${b}, 0.45)`
  }
  const max = -100
  const t = Math.max(0, Math.min(1, (v - mid) / (max - mid)))
  const r = Math.round(255 - (255 - 239) * t)
  const g = Math.round(255 - (255 - 68) * t)
  const b = Math.round(255 - (255 - 68) * t)
  return `rgba(${r}, ${g}, ${b}, 0.45)`
}

function mergeRows(rows: RawRow[]): RawRow[] {
  const map = new Map<string, RawRow>()
  for (const r of rows) {
    const key = `${formatDate(r.time)}_${r.time.getHours()}_${r.city}`
    if (!map.has(key)) {
      map.set(key, r)
    } else {
      const existing = map.get(key)!
      if (existing.value === null && r.value !== null) existing.value = r.value
    }
  }
  return Array.from(map.values())
}
