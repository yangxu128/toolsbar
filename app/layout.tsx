'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { LayoutGrid, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/lib/theme-store'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <html lang="zh-CN">
      <body className="antialiased transition-colors duration-300">
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]" id="navbar">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-md bg-[hsl(var(--primary))] flex items-center justify-center text-white">
                <LayoutGrid className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight">ToolBox</span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              <Link href="/" className="px-3 py-1.5 rounded-md text-sm font-medium text-[hsl(var(--foreground))] bg-[hsl(var(--muted))]">首页</Link>
              <Link href="/kpi" className="px-3 py-1.5 rounded-md text-sm font-medium text-muted hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">KPI</Link>
              <Link href="/xml" className="px-3 py-1.5 rounded-md text-sm font-medium text-muted hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors">XML</Link>
            </nav>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-muted hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
              title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="pt-14 min-h-screen">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>

        <footer className="py-6 border-t border-[hsl(var(--border))]">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
            <span>ToolBox · 本地优先的工具管理平台</span>
            <span>数据本地存储 · 隐私无忧</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
