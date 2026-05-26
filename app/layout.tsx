'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, Sun, Moon, Settings, Search, Command, Home } from 'lucide-react'
import { useThemeStore } from '@/lib/theme-store'
import ToastContainer from '@/components/toast-container'
import SettingsDrawer from '@/components/settings-drawer'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(true)
    }
    if (e.key === 'Escape') {
      setSearchOpen(false)
      setSettingsOpen(false)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen flex flex-col">
        <ToastContainer />
        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {searchOpen && (
          <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[20vh]">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
            <div className="relative w-full max-w-lg mx-4 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
                <Search className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  autoFocus
                  placeholder="搜索工具..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-sm bg-transparent text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
                />
                <kbd>Esc</kbd>
              </div>
              <div className="p-2">
                <Link href="/kpi" onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
                  <div className="w-8 h-8 rounded-md bg-emerald-500 flex items-center justify-center text-white">
                    <Command className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Excel指标计算</div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))]">Excel 指标文件解析与公式计算</div>
                  </div>
                </Link>
                <Link href="/xml" onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
                  <div className="w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center text-white">
                    <Command className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">XML 在线阅读器</div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))]">XML 文件解析、筛选与导出</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        <header className="glass-header sticky top-0 z-50 h-16 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-md group-hover:shadow-[hsl(var(--primary))]/30 transition-shadow">
                <Box className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[hsl(var(--foreground))]">uanx</span>
            </Link>

            <div className="hidden md:flex flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="搜索工具（如：Excel、XML、JSON）..."
                className="search-input"
                onFocus={() => setSearchOpen(true)}
              />
              <kbd className="hidden lg:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1">
                <span>⌘</span><span>K</span>
              </kbd>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={toggleTheme} className="icon-btn" title="切换主题">
                <Sun className="w-5 h-5 hidden dark:block" />
                <Moon className="w-5 h-5 block dark:hidden" />
              </button>
              <button onClick={() => setSettingsOpen(true)} className="icon-btn" title="设置">
                <Settings className="w-5 h-5" />
              </button>
              <Link href="/" className="icon-btn md:hidden" title="首页">
                <Home className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        <div className="md:hidden px-4 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="搜索工具..."
              className="search-input w-full"
              onFocus={() => setSearchOpen(true)}
            />
          </div>
        </div>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-[hsl(var(--border))] mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[hsl(var(--muted-foreground))]">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="font-semibold text-[hsl(var(--foreground))]">uanx</span>
              <span>· 纯前端 · 本地存储 · 隐私无忧</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => {}} className="hover:text-[hsl(var(--primary))] transition-colors">导出数据</button>
              <button onClick={() => setSettingsOpen(true)} className="hover:text-[hsl(var(--primary))] transition-colors">设置</button>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
