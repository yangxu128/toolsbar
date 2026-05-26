'use client'

import { useRef } from 'react'
import {
  X, Sun, Moon, Monitor, Download, Upload, Trash2,
  AlertTriangle, HardDrive
} from 'lucide-react'
import { useThemeStore } from '@/lib/theme-store'
import { useKpiStore } from '@/lib/store'
import { useXmlStore } from '@/lib/xml-store'
import { useFavStore } from '@/lib/fav-store'
import { useToastStore } from '@/lib/toast-store'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsDrawer({ open, onClose }: Props) {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const clearKpi = useKpiStore((s) => s.clearData)
  const clearXml = useXmlStore((s) => s.clearData)
  const clearFav = useFavStore((s) => s.favorites)
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
    a.download = `toolsbar_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    addToast('数据已导出', 'success')
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.kpi) localStorage.setItem('kpi-storage', JSON.stringify(data.kpi))
        if (data.xml) localStorage.setItem('xml-storage', JSON.stringify(data.xml))
        if (data.fav) localStorage.setItem('fav-storage', JSON.stringify(data.fav))
        if (data.theme) localStorage.setItem('theme-storage', JSON.stringify(data.theme))
        addToast('数据已导入，即将刷新', 'success')
        setTimeout(() => window.location.reload(), 800)
      } catch {
        addToast('导入失败，文件格式错误', 'error')
      }
    }
    reader.readAsText(file)
  }

  function handleClearAll() {
    clearKpi()
    clearXml()
    useFavStore.setState({ favorites: [] })
    localStorage.clear()
    addToast('所有数据已清除', 'info')
    setTimeout(() => window.location.reload(), 500)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-[70] w-full max-w-sm bg-[hsl(var(--card))] border-l border-[hsl(var(--border))] animate-slide-in-right overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-semibold">设置</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">外观</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${theme === 'light' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                >
                  <Sun className="w-4 h-4" />
                  <span className="text-[11px]">浅色</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${theme === 'dark' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                >
                  <Moon className="w-4 h-4" />
                  <span className="text-[11px]">深色</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="text-[11px]">跟随系统</span>
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">数据管理</h3>
              <div className="space-y-2">
                <button onClick={handleExport}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors text-sm">
                  <Download className="w-4 h-4 text-[hsl(var(--primary))]" />
                  导出数据备份
                </button>
                <button onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors text-sm">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  导入数据恢复
                </button>
                <input ref={fileRef} type="file" accept=".json" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">危险操作</h3>
              <button onClick={handleClearAll}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-colors text-sm">
                <Trash2 className="w-4 h-4" />
                一键清除所有数据
              </button>
            </section>

            <div className="pt-4 border-t border-[hsl(var(--border))]">
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <HardDrive className="w-3.5 h-3.5" />
                <span>所有数据仅存储于浏览器本地</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
