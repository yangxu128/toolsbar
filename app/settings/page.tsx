'use client'

import { useState, useEffect } from 'react'
import {
  Settings2, Trash2, Database, FileSpreadsheet, FileCode,
  Sun, Moon, HardDrive, RefreshCw, AlertTriangle
} from 'lucide-react'
import { useKpiStore } from '@/lib/store'
import { useXmlStore } from '@/lib/xml-store'
import { useThemeStore } from '@/lib/theme-store'

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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">配置管理中心</h2>
        <p className="text-sm text-muted mt-0.5">查看和管理浏览器本地存储的所有数据</p>
      </div>

      <div className="card-dark rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[hsl(var(--muted))] flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-muted" />
          </div>
          <div>
            <div className="text-sm font-medium">本地存储总用量</div>
            <div className="text-xs text-muted">{formatBytes(totalSize)} · localStorage</div>
          </div>
        </div>
        <button onClick={refreshSizes} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted hover:bg-[hsl(var(--muted))] transition-colors">
          <RefreshCw className="w-3 h-3" /> 刷新
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">数据存储项</h3>
        {stores.map(store => {
          const Icon = store.icon
          return (
            <div key={store.key} className="card-dark rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{ background: store.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{store.name}</div>
                    <div className="text-[11px] text-muted mt-0.5">{store.detail}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${store.loaded ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-[hsl(var(--secondary))] text-muted border border-[hsl(var(--border)))]'}`}>
                    {store.loaded ? '已存储' : '空'}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted min-w-[48px] text-right">{formatBytes(store.size)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[hsl(var(--border))]">
                {confirmTarget === store.key ? (
                  <>
                    <span className="text-[11px] text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 确定清除？</span>
                    <button onClick={() => { store.onClear(); setConfirmTarget(null) }}
                      className="px-2 py-1 rounded-md bg-red-500 text-white text-[11px] font-medium">确认</button>
                    <button onClick={() => setConfirmTarget(null)}
                      className="px-2 py-1 rounded-md text-[11px] text-muted hover:bg-[hsl(var(--muted))]">取消</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmTarget(store.key)}
                    disabled={!store.loaded}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-red-500 hover:bg-red-500/10 disabled:opacity-30 transition-colors">
                    <Trash2 className="w-3 h-3" /> 清除
                  </button>
                )}
                <span className="text-[10px] text-muted ml-auto font-mono">{store.key}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card-dark rounded-lg p-4 border border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-red-500">危险操作区</div>
              <div className="text-[11px] text-muted">清除所有本地数据，包括主题设置和所有工具数据</div>
            </div>
          </div>
          {confirmTarget === '__ALL__' ? (
            <div className="flex items-center gap-2">
              <button onClick={clearAll}
                className="px-3 py-1.5 rounded-md bg-red-500 text-white text-xs font-medium">确认全部清除</button>
              <button onClick={() => setConfirmTarget(null)}
                className="px-2 py-1.5 rounded-md text-xs text-muted hover:bg-[hsl(var(--muted))]">取消</button>
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
  )
}
