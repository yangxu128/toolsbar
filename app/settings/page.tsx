'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Settings2, Trash2, Database, FileSpreadsheet, FileCode,
  Sun, Moon, HardDrive, RefreshCw, AlertTriangle, Home, Star, ChevronRight
} from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { useXmlStore } from '@/lib/xml-store'
import { useThemeStore } from '@/lib/theme-store'
import { useFavStore } from '@/lib/fav-store'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getStorageSize(key: string): number {
  try {
    const item = localStorage.getItem(key)
    return item ? new Blob([item]).size : 0
  } catch { return 0 }
}

interface StoreInfo {
  key: string
  name: string
  icon: React.ElementType
  color: string
  loaded: boolean
  size: number
  detail: string
  onClear: () => void
}

export default function SettingsPage() {
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('settings')

  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  const kpiHeaders = useKpiStore((s) => s.headers)
  const kpiRows = useKpiStore((s) => s.rows)
  const kpiMetrics = useKpiStore((s) => s.metrics)
  const kpiLoaded = useKpiStore((s) => s.loaded)
  const clearKpi = useKpiStore((s) => s.clearData)

  const xmlHeaders = useXmlStore((s) => s.headers)
  const xmlData = useXmlStore((s) => s.data)
  const xmlFileName = useXmlStore((s) => s.fileName)
  const xmlLoaded = useXmlStore((s) => s.loaded)
  const clearXml = useXmlStore((s) => s.clearData)

  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)
  const [sizes, setSizes] = useState<Record<string, number>>({})

  useEffect(() => {
    refreshSizes()
  }, [kpiLoaded, xmlLoaded])

  function refreshSizes() {
    setSizes({
      'kpi-storage': getStorageSize('kpi-storage'),
      'xml-storage': getStorageSize('xml-storage'),
      'theme-storage': getStorageSize('theme-storage'),
    })
  }

  function clearAll() {
    clearKpi()
    clearXml()
    localStorage.clear()
    window.location.reload()
  }

  const stores: StoreInfo[] = [
    {
      key: 'kpi-storage',
      name: 'KPI 指标数据',
      icon: FileSpreadsheet,
      color: 'hsl(var(--primary))',
      loaded: kpiLoaded,
      size: sizes['kpi-storage'] || 0,
      detail: kpiLoaded ? `${kpiRows.length} 行 × ${kpiHeaders.length} 列 · ${kpiMetrics.length} 个指标` : '暂无数据',
      onClear: () => { clearKpi(); refreshSizes() },
    },
    {
      key: 'xml-storage',
      name: 'XML 解析数据',
      icon: FileCode,
      color: 'hsl(160 60% 45%)',
      loaded: xmlLoaded,
      size: sizes['xml-storage'] || 0,
      detail: xmlLoaded ? `${xmlData.length} 条记录 · ${xmlHeaders.length} 列 · ${xmlFileName}` : '暂无数据',
      onClear: () => { clearXml(); refreshSizes() },
    },
    {
      key: 'theme-storage',
      name: '主题偏好设置',
      icon: theme === 'dark' ? Moon : Sun,
      color: 'hsl(45 90% 55%)',
      loaded: true,
      size: sizes['theme-storage'] || 0,
      detail: `当前模式：${theme === 'dark' ? '深色' : '浅色'}`,
      onClear: () => toggleTheme(),
    },
  ]

  const totalSize = Object.values(sizes).reduce((a, b) => a + b, 0)

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span>系统</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">配置管理中心</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                <Settings2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">配置管理中心</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">查看和管理浏览器本地存储的所有数据</p>
              </div>
            </div>
            <button onClick={() => toggleFav('settings')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
              <Star className={`w-5 h-5 ${fav ? 'fill-current animate-heart-beat' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[hsl(var(--foreground))]">本地存储总用量</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{formatBytes(totalSize)} · localStorage</div>
              </div>
            </div>
            <button onClick={refreshSizes} className="btn-primary">
              <RefreshCw className="w-3.5 h-3.5" /> 刷新
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[hsl(var(--foreground))]">数据存储项</h3>
            {stores.map(store => {
              const Icon = store.icon
              return (
                <div key={store.key} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ background: store.color }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[hsl(var(--foreground))]">{store.name}</div>
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">{store.detail}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${store.loaded ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'}`}>
                        {store.loaded ? '已存储' : '空'}
                      </span>
                      <span className="text-[11px] tabular-nums text-[hsl(var(--muted-foreground))] min-w-[48px] text-right">{formatBytes(store.size)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-[hsl(var(--border))]">
                    {confirmTarget === store.key ? (
                      <>
                        <span className="text-[11px] text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 确定清除？</span>
                        <button onClick={() => { store.onClear(); setConfirmTarget(null) }}
                          className="px-2 py-1 rounded-md bg-red-500 text-white text-[11px] font-medium">确认</button>
                        <button onClick={() => setConfirmTarget(null)}
                          className="px-2 py-1 rounded-md text-[11px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card))]">取消</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmTarget(store.key)}
                        disabled={!store.loaded}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-red-500 hover:bg-red-500/10 disabled:opacity-30 transition-colors">
                        <Trash2 className="w-3 h-3" /> 清除
                      </button>
                    )}
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-auto font-mono">{store.key}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-red-500">危险操作区</div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))]">清除所有本地数据，包括主题设置和所有工具数据</div>
                </div>
              </div>
              {confirmTarget === '__ALL__' ? (
                <div className="flex items-center gap-2">
                  <button onClick={clearAll}
                    className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium">确认全部清除</button>
                  <button onClick={() => setConfirmTarget(null)}
                    className="px-2 py-1.5 rounded-md text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card))]">取消</button>
                </div>
              ) : (
                <button onClick={() => setConfirmTarget('__ALL__')}
                  className="px-3 py-1.5 rounded-md border border-red-500/30 text-red-500 text-xs font-medium hover:bg-red-500/10 transition-colors">
                  清除全部数据
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
