'use client'

import { useRef } from 'react'
import {
  X, Sun, Moon, Monitor, Download, Upload, Trash2,
  Settings, Palette, Database, Info
} from 'lucide-react'
import { useThemeStore } from '@/lib/theme-store'
import { useKpiStore } from '@/lib/store'
import { useXmlStore } from '@/lib/xml-store'
import { useFavStore } from '@/lib/fav-store'
import { useToastStore } from '@/lib/toast-store'

const APP_VERSION = '2.0.0'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsDrawer({ open, onClose }: Props) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const clearKpi = useKpiStore((s) => s.clearData)
  const clearXml = useXmlStore((s) => s.clearData)
  const addToast = useToastStore((s) => s.addToast)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const data = {
      kpi: JSON.parse(localStorage.getItem('kpi-storage') || '{}'),
      xml: JSON.parse(localStorage.getItem('xml-storage') || '{}'),
      fav: JSON.parse(localStorage.getItem('fav-storage') || '{}'),
      theme: JSON.parse(localStorage.getItem('theme-storage') || '{}'),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `uanx-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    addToast('数据导出成功', 'success')
    onClose()
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          addToast('导入失败，数据格式不是对象', 'error')
          return
        }
        if (data.kpi) localStorage.setItem('kpi-storage', JSON.stringify(data.kpi))
        if (data.xml) localStorage.setItem('xml-storage', JSON.stringify(data.xml))
        if (data.fav) localStorage.setItem('fav-storage', JSON.stringify(data.fav))
        if (data.theme) localStorage.setItem('theme-storage', JSON.stringify(data.theme))
        addToast('数据导入成功，即将刷新', 'success')
        setTimeout(() => window.location.reload(), 800)
      } catch {
        addToast('导入失败，文件格式错误', 'error')
      }
    }
    reader.readAsText(file)
  }

  function handleClearAll() {
    if (!confirm('确定要清除所有本地数据吗？此操作不可恢复。')) return
    clearKpi()
    clearXml()
    useFavStore.setState({ favorites: [] })
    localStorage.clear()
    addToast('所有数据已清除', 'info')
    setTimeout(() => window.location.reload(), 500)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 bottom-0 z-[70] w-full max-w-md bg-[hsl(var(--card))] border-l border-[hsl(var(--border))] overflow-auto transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
          <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[hsl(var(--primary))]" />配置管理中心
          </h2>
          <button onClick={onClose} className="icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto h-[calc(100%-80px)] scrollbar-thin">
          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />外观主题
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`p-3 rounded-xl border transition-all text-center ${theme === 'light' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
              >
                <Sun className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <span className="text-xs font-medium">浅色</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-xl border transition-all text-center ${theme === 'dark' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
              >
                <Moon className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
                <span className="text-xs font-medium">深色</span>
              </button>
              <button
                onClick={() => {
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                  setTheme(prefersDark ? 'dark' : 'light')
                }}
                className="p-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-all text-center"
              >
                <Monitor className="w-5 h-5 mx-auto mb-1 text-[hsl(var(--muted-foreground))]" />
                <span className="text-xs font-medium">跟随系统</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />数据管理
            </h3>
            <div className="space-y-2">
              <button onClick={handleExport}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-[hsl(var(--primary))]">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">导出全部数据</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">下载 JSON 备份文件</div>
                  </div>
                </div>
                <span className="text-[hsl(var(--muted-foreground))]">&rsaquo;</span>
              </button>

              <label className="w-full flex items-center justify-between p-3 rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">导入数据</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">从 JSON 文件恢复</div>
                  </div>
                </div>
                <span className="text-[hsl(var(--muted-foreground))]">&rsaquo;</span>
                <input ref={fileRef} type="file" accept=".json" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
              </label>

              <button onClick={handleClearAll}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-red-600">清除所有数据</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">不可恢复，请谨慎操作</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />关于
            </h3>
            <div className="p-4 rounded-xl bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))] leading-relaxed space-y-1">
              <p>uanx v{APP_VERSION}</p>
              <p>纯前端架构 · 本地 IndexedDB 存储</p>
              <p>所有数据处理均在浏览器本地完成</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
