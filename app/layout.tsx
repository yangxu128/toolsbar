'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, Sun, Moon, Settings, Search, Home } from 'lucide-react'
import { useThemeStore } from '@/lib/theme-store'
import { useSearchStore } from '@/lib/search-store'
import ToastContainer from '@/components/toast-container'
import SettingsDrawer from '@/components/settings-drawer'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const searchQuery = useSearchStore((s) => s.query)
  const setSearchQuery = useSearchStore((s) => s.setQuery)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

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
      if (desktopInputRef.current) {
        desktopInputRef.current.focus()
      } else if (mobileInputRef.current) {
        mobileInputRef.current.focus()
      }
    }
    if (e.key === 'Escape') {
      setSettingsOpen(false)
      setSearchQuery('')
      document.activeElement instanceof HTMLElement && document.activeElement.blur()
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

        <header className="glass-header sticky top-0 z-50 h-16 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
            <Link href="/" onClick={() => setSearchQuery('')} className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-md group-hover:shadow-[hsl(var(--primary))]/30 transition-shadow">
                <Box className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[hsl(var(--foreground))]">uanx</span>
            </Link>

            <div className="hidden md:flex flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                ref={desktopInputRef}
                type="text"
                placeholder="搜索工具（如：Excel、XML、JSON）..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
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
              ref={mobileInputRef}
              type="text"
              placeholder="搜索工具..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full"
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
