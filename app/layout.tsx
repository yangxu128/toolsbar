'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Sun, Moon, Settings, Search, Command } from 'lucide-react'
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

  const navLinks = [
    { href: '/', label: '首页' },
    { href: '/kpi', label: 'KPI' },
    { href: '/xml', label: 'XML' },
    { href: '/settings', label: '设置' },
  ]

  return (
    <html lang="zh-CN">
      <body className="antialiased transition-colors duration-300">
        <ToastContainer />
        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {searchOpen && (
          <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[20vh]">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
            <div className="relative w-full max-w-lg mx-4 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
                <Search className="w-4 h-4 text-muted" />
                <input
                  autoFocus
                  placeholder="搜索工具..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-sm bg-transparent text-[hsl(var(--foreground))] placeholder:text-muted"
                />
                <kbd>Esc</kbd>
              </div>
              <div className="p-2">
                <Link href="/kpi" onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
                  <div className="w-8 h-8 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center text-white">
                    <Command className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">KPI 指标计算</div>
                    <div className="text-[11px] text-muted">Excel 指标文件解析与公式计算</div>
                  </div>
                </Link>
                <Link href="/xml" onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors">
                  <div className="w-8 h-8 rounded-md bg-[hsl(160_60%_45%)] flex items-center justify-center text-white">
                    <Command className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">XML 在线阅读器</div>
                    <div className="text-[11px] text-muted">XML 文件解析、筛选与导出</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        <header className="fixed top-0 left-0 right-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-xl" id="navbar">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center text-white">
                <LayoutGrid className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight">ToolBox</span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'text-[hsl(var(--foreground))] bg-[hsl(var(--muted))]'
                      : 'text-muted hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>搜索</span>
                <kbd className="ml-1">⌘K</kbd>
              </button>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-md text-muted hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-1.5 rounded-md text-muted hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                title="设置"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="pt-14 min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
