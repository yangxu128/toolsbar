'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { FileCode, Home, Star, ChevronRight as ChevronRightIcon, Copy, Check, Trash2, ArrowRightLeft } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

type Mode = 'format' | 'minify' | 'validate'

export default function JsonFormatterPage() {
  const isFav = useFavStore(s => s.isFav)
  const toggleFav = useFavStore(s => s.toggleFav)
  const fav = isFav('json-formatter')

  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>('format')
  const [indent, setIndent] = useState(2)
  const [copied, setCopied] = useState(false)

  const handleProcess = useCallback(() => {
    setError('')
    setOutput('')
    if (!input.trim()) return
    try {
      const parsed = JSON.parse(input)
      if (mode === 'minify') {
        setOutput(JSON.stringify(parsed))
      } else {
        setOutput(JSON.stringify(parsed, null, indent))
      }
    } catch (e: any) {
      setError(e.message)
      if (mode === 'validate') setOutput('JSON 格式无效')
      else setOutput('')
    }
  }, [input, mode, indent])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  const handleSwap = useCallback(() => {
    if (!output || error) return
    setInput(output)
    setOutput('')
    setError('')
  }, [output, error])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setError('')
  }, [])

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1"><Home className="w-4 h-4" />首页</Link>
        <ChevronRightIcon className="w-4 h-4" /><span>开发工具</span>
        <ChevronRightIcon className="w-4 h-4" /><span className="text-[hsl(var(--foreground))] font-medium">JSON格式化</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center shrink-0"><FileCode className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">JSON格式化</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">JSON 美化、压缩、校验</p>
              </div>
            </div>
            <button onClick={() => toggleFav('json-formatter')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}><Star className={`w-5 h-5 ${fav ? 'fill-current animate-heart-beat' : ''}`} /></button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {(['format', 'minify', 'validate'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`tab-pill ${mode === m ? 'active' : ''}`}>
                {{ format: '美化', minify: '压缩', validate: '校验' }[m]}
              </button>
            ))}
            {mode === 'format' && (
              <div className="flex items-center gap-2 ml-2">
                <label className="text-xs text-[hsl(var(--muted-foreground))]">缩进：</label>
                <select value={indent} onChange={e => setIndent(+e.target.value)}
                  className="form-input w-auto min-w-[80px] text-xs py-1.5">
                  <option value={2}>2空格</option>
                  <option value={4}>4空格</option>
                  <option value={1}>1Tab</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">输入</span>
                <button onClick={handleClear} className="copy-btn hover:text-red-500"><Trash2 className="w-3 h-3" />清空</button>
              </div>
              <textarea value={input} onChange={e => setInput(e.target.value)} placeholder='粘贴 JSON 数据...'
                className="form-input h-80 p-3 font-mono text-xs resize-none" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">输出</span>
                <div className="flex items-center gap-2">
                  <button onClick={handleSwap} className="copy-btn"><ArrowRightLeft className="w-3 h-3" />交换</button>
                  <button onClick={handleCopy} className="copy-btn">
                    {copied ? <><Check className="w-3 h-3" />已复制</> : <><Copy className="w-3 h-3" />复制</>}
                  </button>
                </div>
              </div>
              <textarea value={error ? `错误: ${error}` : output} readOnly placeholder='处理结果...'
                className={`w-full h-80 p-3 rounded-xl border text-xs font-mono resize-none outline-none transition-all ${error ? 'border-red-300 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400' : 'form-input'}`} />
            </div>
          </div>

          <button onClick={handleProcess}
            className="mt-4 w-full btn-primary bg-violet-500 hover:bg-violet-600">
            {{ format: '美化', minify: '压缩', validate: '校验' }[mode]}
          </button>

          <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] text-[11px] text-[hsl(var(--muted-foreground))] space-y-1">
            <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">使用说明</h4>
            <p>• 美化：格式化JSON，支持2空格/4空格/Tab缩进</p>
            <p>• 压缩：移除所有空白，输出单行JSON</p>
            <p>• 校验：检查JSON语法是否正确</p>
          </div>
        </div>
      </div>
    </div>
  )
}
