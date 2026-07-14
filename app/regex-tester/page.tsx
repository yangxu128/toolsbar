'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Search, Home, Star, ChevronRight as ChevronRightIcon, Copy, Check } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

const presets = [
  { name: '邮箱', pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
  { name: '手机号', pattern: /^1[3-9]\d{9}$/ },
  { name: 'URL', pattern: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/ },
  { name: 'IP地址', pattern: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/ },
  { name: '日期(YYYY-MM-DD)', pattern: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/ },
  { name: '中文字符', pattern: /^[\u4e00-\u9fa5]+$/ },
  { name: '身份证', pattern: /^\d{17}[\dXx]$/ },
  { name: '邮编', pattern: /^[1-9]\d{5}$/ },
]

export default function RegexTesterPage() {
  const isFav = useFavStore(s => s.isFav)
  const toggleFav = useFavStore(s => s.toggleFav)
  const fav = isFav('regex-tester')

  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [testStr, setTestStr] = useState('')
  const [replaceStr, setReplaceStr] = useState('')
  const [mode, setMode] = useState<'match' | 'replace' | 'split'>('match')
  const [copied, setCopied] = useState(false)
  const [copiedRegex, setCopiedRegex] = useState(false)

  const flagError = useMemo(() => {
    const valid = 'gimsuyd'
    const invalid = flags.split('').filter(f => !valid.includes(f))
    return invalid.length ? `不支持的标志位: ${invalid.join(', ')}` : ''
  }, [flags])

  const regex = useMemo(() => {
    if (!pattern || flagError) return null
    try { return new RegExp(pattern, flags) } catch { return null }
  }, [pattern, flags, flagError])

  const matches = useMemo(() => {
    if (!regex || !testStr) return []
    const results: { match: string; index: number; groups?: Record<string, string>; captures?: string[] }[] = []
    if (flags.includes('g')) {
      let m
      while ((m = regex.exec(testStr)) !== null) {
        results.push({ match: m[0], index: m.index, groups: m.groups, captures: m.slice(1) })
        if (!m[0]) regex.lastIndex++
      }
    } else {
      const m = regex.exec(testStr)
      if (m) results.push({ match: m[0], index: m.index, groups: m.groups, captures: m.slice(1) })
    }
    return results
  }, [regex, testStr, flags])

  const result = useMemo(() => {
    if (!regex || !testStr) return ''
    if (mode === 'replace') return testStr.replace(regex, replaceStr)
    if (mode === 'split') return testStr.split(regex).join(' | ')
    return ''
  }, [regex, testStr, mode, replaceStr])

  const highlighted = useMemo<{ text: string; isMatch: boolean }[]>(() => {
    if (!regex || !testStr || matches.length === 0) return [{ text: testStr, isMatch: false }]
    const parts: { text: string; isMatch: boolean }[] = []
    let lastIdx = 0
    for (const m of matches) {
      if (m.index > lastIdx) parts.push({ text: testStr.slice(lastIdx, m.index), isMatch: false })
      parts.push({ text: m.match, isMatch: true })
      lastIdx = m.index + m.match.length
    }
    if (lastIdx < testStr.length) parts.push({ text: testStr.slice(lastIdx), isMatch: false })
    return parts
  }, [regex, testStr, matches])

  const toggleFlag = useCallback((f: string) => {
    setFlags(prev => prev.includes(f) ? prev.replace(f, '') : prev + f)
  }, [])

  const copyResult = useCallback(() => {
    const text = mode === 'match' ? matches.map(m => m.match).join('\n') : result
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [mode, matches, result])

  const copyRegex = useCallback(() => {
    if (!pattern) return
    navigator.clipboard.writeText(`/${pattern}/${flags}`)
    setCopiedRegex(true)
    setTimeout(() => setCopiedRegex(false), 1500)
  }, [pattern, flags])

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1"><Home className="w-4 h-4" />首页</Link>
        <ChevronRightIcon className="w-4 h-4" /><span>开发工具</span>
        <ChevronRightIcon className="w-4 h-4" /><span className="text-[hsl(var(--foreground))] font-medium">正则测试工具</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500 flex items-center justify-center shrink-0"><Search className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">正则测试工具</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">实时正则表达式匹配测试，支持替换与分割</p>
              </div>
            </div>
            <button onClick={() => toggleFav('regex-tester')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}><Star className={`w-5 h-5 ${fav ? 'fill-current' : ''} ${fav ? 'animate-heart-beat' : ''}`} /></button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* 正则输入 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-cyan-500 font-mono text-lg">/</span>
            <input type="text" value={pattern} onChange={e => setPattern(e.target.value)} placeholder="输入正则表达式..."
              className="form-input flex-1 text-sm font-mono" />
            <span className="text-cyan-500 font-mono text-lg">/</span>
            <input type="text" value={flags} onChange={e => setFlags(e.target.value)} placeholder="flags"
              className="form-input w-16 px-2 text-sm font-mono text-center" />
            <button onClick={copyRegex} className="copy-btn hover:text-cyan-500 whitespace-nowrap">
              {copiedRegex ? <><Check className="w-3 h-3" />已复制</> : <><Copy className="w-3 h-3" />复制正则</>}
            </button>
          </div>
          {flagError && (
            <div className="text-xs text-red-500 mb-2">{flagError}</div>
          )}

          {/* 标志位 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[['g', '全局'], ['i', '忽略大小写'], ['m', '多行'], ['s', '单行']].map(([f, label]) => (
              <button key={f} onClick={() => toggleFlag(f)}
                className={`tab-pill text-[10px] py-1 px-2 ${flags.includes(f) ? 'active !bg-cyan-500 !border-cyan-500' : ''}`}>
                {f} - {label}
              </button>
            ))}
          </div>

          {/* 预设 */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {presets.map(p => (
              <button key={p.name} onClick={() => { setPattern(p.pattern.source); setFlags(p.pattern.flags || 'g') }}
                className="tab-pill text-[10px] py-1 px-2 hover:text-cyan-600">
                {p.name}
              </button>
            ))}
          </div>

          {/* 模式 */}
          <div className="flex items-center gap-2 mb-4">
            {(['match', 'replace', 'split'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`tab-pill ${mode === m ? 'active !bg-cyan-500 !border-cyan-500' : ''}`}>
                {{ match: '匹配', replace: '替换', split: '分割' }[m]}
              </button>
            ))}
          </div>

          {/* 测试文本 */}
          <div className="mb-4">
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">测试文本</label>
            <textarea value={testStr} onChange={e => setTestStr(e.target.value)} placeholder="输入要测试的文本..."
              className="form-input h-32 p-3 text-sm font-mono resize-none" />
          </div>

          {/* 高亮匹配 */}
          {testStr && regex && (
            <div className="result-card mb-4">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">匹配高亮</label>
              <div className="text-sm font-mono break-all leading-relaxed">
                {highlighted.map((part, i) =>
                  part.isMatch
                    ? <mark key={i} className="bg-cyan-200 dark:bg-cyan-800 text-[hsl(var(--foreground))] rounded px-0.5">{part.text}</mark>
                    : <span key={i}>{part.text}</span>
                )}
              </div>
            </div>
          )}

          {/* 替换输入 */}
          {mode === 'replace' && (
            <div className="mb-4">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">替换为</label>
              <input type="text" value={replaceStr} onChange={e => setReplaceStr(e.target.value)} placeholder="替换字符串（支持$1,$2...）"
                className="form-input text-sm font-mono" />
            </div>
          )}

          {/* 结果 */}
          {(matches.length > 0 || result) && (
            <div className="result-card mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {mode === 'match' ? `匹配结果 (${matches.length}个)` : '处理结果'}
                </label>
                <button onClick={copyResult} className="copy-btn hover:text-cyan-500">
                  {copied ? <><Check className="w-3 h-3" />已复制</> : <><Copy className="w-3 h-3" />复制</>}
                </button>
              </div>
              {mode === 'match' ? (
                <div className="space-y-1">
                  {matches.map((m, i) => (
                    <div key={i} className="text-xs font-mono flex items-center gap-2">
                      <span className="text-[hsl(var(--muted-foreground))]">[{m.index}]</span>
                      <span className="text-cyan-600 dark:text-cyan-400">{m.match}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm font-mono break-all text-[hsl(var(--foreground))]">{result}</div>
              )}
            </div>
          )}

          {/* 捕获组 */}
          {mode === 'match' && matches.some(m => (m.captures && m.captures.length > 0) || m.groups) && (
            <div className="result-card mb-4">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">捕获组</label>
              <div className="space-y-1">
                {matches.map((m, i) => {
                  if (!m.captures?.length && !m.groups) return null
                  return (
                    <div key={i} className="text-xs font-mono flex flex-wrap items-center gap-2">
                      <span className="text-[hsl(var(--muted-foreground))]">[{i}]</span>
                      {m.captures?.map((c, ci) => (
                        <span key={ci}><span className="text-cyan-600 dark:text-cyan-400">${ci + 1}</span>: <span className="text-[hsl(var(--foreground))]">{c || '(空)'}</span></span>
                      ))}
                      {m.groups && Object.entries(m.groups).map(([k, v]) => (
                        <span key={k}><span className="text-cyan-600 dark:text-cyan-400">{k}</span>: <span className="text-[hsl(var(--foreground))]">{v || '(空)'}</span></span>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 正则错误 */}
          {pattern && !regex && (
            <div className="error-state mb-4">
              {flagError || '正则表达式语法错误'}
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] text-[11px] text-[hsl(var(--muted-foreground))] space-y-1">
            <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">使用说明</h4>
            <p>• 输入正则表达式和测试文本，实时显示匹配结果</p>
            <p>• 支持匹配、替换、分割三种模式</p>
            <p>• 点击预设快速填入常用正则</p>
            <p>• 替换模式支持 $1, $2 等捕获组引用</p>
          </div>
        </div>
      </div>
    </div>
  )
}
