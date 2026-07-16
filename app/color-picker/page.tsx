'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Palette, Home, Star, ChevronRight as ChevronRightIcon, Copy, Check, Info } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) { r = g = b = l }
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function getContrastColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff'
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  const [rs, gs, bs] = [r, g, b].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1), l2 = luminance(hex2)
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function CopyBtn({ text, label, copied, onCopy }: { text: string; label: string; copied: string | null; onCopy: (text: string, label: string) => void }) {
  return (
    <button onClick={() => onCopy(text, label)} className="copy-btn">
      {copied === label ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

export default function ColorPickerPage() {
  const isFav = useFavStore(s => s.isFav)
  const toggleFav = useFavStore(s => s.toggleFav)
  const fav = isFav('color-picker')

  const [hex, setHex] = useState('#3b82f6')
  const [copied, setCopied] = useState<string | null>(null)
  const [palette, setPalette] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('color-history') || '[]') } catch { return [] }
  })

  const [r, g, b] = hexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)

  const addToHistory = useCallback((color: string) => {
    setHistory(prev => {
      const next = [color, ...prev.filter(c => c.toLowerCase() !== color.toLowerCase())].slice(0, 12)
      try { localStorage.setItem('color-history', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const selectColor = useCallback((c: string) => {
    setHex(c)
    addToHistory(c)
  }, [addToHistory])

  const updateFromHsl = useCallback((nh: number, ns: number, nl: number) => {
    const [nr, ng, nb] = hslToRgb(nh, ns, nl)
    setHex(rgbToHex(nr, ng, nb))
  }, [])

  const generatePalette = useCallback(() => {
    const colors: string[] = []
    for (let i = 0; i < 10; i++) {
      const nl = 10 + i * 9
      const [nr, ng, nb] = hslToRgb(h, s, nl)
      colors.push(rgbToHex(nr, ng, nb))
    }
    setPalette(colors)
  }, [h, s])

  useEffect(() => { generatePalette() }, [generatePalette])

  const schemes = useMemo(() => {
    const mk = (nh: number, ns = s, nl = l) => {
      const [nr, ng, nb] = hslToRgb(((nh % 360) + 360) % 360, ns, nl)
      return rgbToHex(nr, ng, nb)
    }
    return {
      complementary: mk(h + 180),
      analogous: [mk(h + 30), mk(h - 30)],
      triadic: [mk(h + 120), mk(h + 240)],
    }
  }, [h, s, l])

  const copy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    if (label === 'hex') addToHistory(text)
    setTimeout(() => setCopied(null), 1500)
  }, [addToHistory])

  const ratio = contrastRatio(hex, '#ffffff')
  const ratioBlack = contrastRatio(hex, '#000000')

  return (
    <div className="animate-fade-in-up">
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1"><Home className="w-4 h-4" />首页</Link>
        <ChevronRightIcon className="w-4 h-4" /><span>设计工具</span>
        <ChevronRightIcon className="w-4 h-4" /><span className="text-[hsl(var(--foreground))] font-medium">颜色选择器</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center shrink-0"><Palette className="w-6 h-6 text-white" /></div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">颜色选择器</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">HEX / RGB / HSL 互转，色板生成，对比度检查</p>
              </div>
            </div>
            <button onClick={() => toggleFav('color-picker')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}><Star className={`w-5 h-5 ${fav ? 'fill-current' : ''} ${fav ? 'animate-heart-beat' : ''}`} /></button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：选择器 */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input type="color" value={hex} onChange={e => setHex(e.target.value)}
                  className="w-20 h-20 rounded-xl border-2 border-[hsl(var(--border))] cursor-pointer" />
                <div className="flex-1 h-20 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ backgroundColor: hex, color: getContrastColor(hex) }}>
                  {hex}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] flex items-center justify-between">HEX <CopyBtn text={hex} label="hex" copied={copied} onCopy={copy} /></label>
                  <input type="text" value={hex} onChange={e => { if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(e.target.value)) setHex(e.target.value) }}
                    className="form-input mt-1 text-sm font-mono" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                    RGB <CopyBtn text={`rgb(${r}, ${g}, ${b})`} label="rgb" copied={copied} onCopy={copy} />
                  </label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[['R', r], ['G', g], ['B', b]].map(([ch, val]) => (
                      <div key={ch as string} className="flex items-center gap-1">
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-3">{ch}</span>
                        <input type="number" min={0} max={255} value={val as number}
                          onChange={e => {
                            const nv = Math.min(255, Math.max(0, +e.target.value))
                            const nr = ch === 'R' ? nv : r, ng = ch === 'G' ? nv : g, nb = ch === 'B' ? nv : b
                            setHex(rgbToHex(nr, ng, nb))
                          }}
                          className="form-input px-2 py-1 text-xs font-mono" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                    HSL <CopyBtn text={`hsl(${h}, ${s}%, ${l}%)`} label="hsl" copied={copied} onCopy={copy} />
                  </label>
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-6">H:{h}</span>
                      <input type="range" min={0} max={360} value={h} onChange={e => updateFromHsl(+e.target.value, s, l)} className="flex-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-6">S:{s}</span>
                      <input type="range" min={0} max={100} value={s} onChange={e => updateFromHsl(h, +e.target.value, l)} className="flex-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-6">L:{l}</span>
                      <input type="range" min={0} max={100} value={l} onChange={e => updateFromHsl(h, s, +e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：色板+对比度 */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2">色板</h4>
                <div className="grid grid-cols-5 gap-1.5">
                  {palette.map((c, i) => (
                    <button key={i} onClick={() => selectColor(c)} className="h-10 rounded-lg border border-[hsl(var(--border))] cursor-pointer hover:scale-105 transition-transform"
                      style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2">对比度检查</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-[hsl(var(--border))]">
                    <div className="w-10 h-10 rounded" style={{ backgroundColor: hex }} />
                    <div className="text-xs">
                      <div className="text-[hsl(var(--foreground))]">vs 白色</div>
                      <div className={`font-bold ${ratio >= 4.5 ? 'text-emerald-600' : ratio >= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                        {ratio.toFixed(2)}:1 {ratio >= 4.5 ? 'AA✓' : ratio >= 3 ? 'AA大字✓' : '不通过'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-black border border-[hsl(var(--border))]">
                    <div className="w-10 h-10 rounded" style={{ backgroundColor: hex }} />
                    <div className="text-xs text-white">
                      <div>vs 黑色</div>
                      <div className={`font-bold ${ratioBlack >= 4.5 ? 'text-emerald-400' : ratioBlack >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                        {ratioBlack.toFixed(2)}:1 {ratioBlack >= 4.5 ? 'AA✓' : ratioBlack >= 3 ? 'AA大字✓' : '不通过'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2">渐变色</h4>
                <div className="h-10 rounded-lg border border-[hsl(var(--border))]"
                  style={{ background: `linear-gradient(to right, #000000, ${hex}, #ffffff)` }} />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2">配色方案</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-16 shrink-0">互补色</span>
                    <button onClick={() => selectColor(schemes.complementary)} className="h-8 flex-1 rounded-lg border border-[hsl(var(--border))] cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: schemes.complementary }} title={schemes.complementary} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-16 shrink-0">类似色</span>
                    {schemes.analogous.map((c, i) => (
                      <button key={i} onClick={() => selectColor(c)} className="h-8 flex-1 rounded-lg border border-[hsl(var(--border))] cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-16 shrink-0">三角配色</span>
                    <button onClick={() => selectColor(hex)} className="h-8 flex-1 rounded-lg border border-[hsl(var(--border))] cursor-pointer" style={{ backgroundColor: hex }} title={hex} />
                    {schemes.triadic.map((c, i) => (
                      <button key={i} onClick={() => selectColor(c)} className="h-8 flex-1 rounded-lg border border-[hsl(var(--border))] cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2">最近使用</h4>
                <div className="flex flex-wrap gap-1.5">
                  {history.length === 0 ? (
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">复制颜色或点击色板后会自动记录</span>
                  ) : history.map((c, i) => (
                    <button key={i} onClick={() => selectColor(c)} className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="text-sm font-semibold text-[hsl(var(--foreground))]">使用说明</span>
            </div>
            <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
              <p><strong className="text-[hsl(var(--foreground))]">功能说明：</strong>HEX / RGB / HSL 颜色互转，生成色板、配色方案，并检查 WCAG 对比度。</p>
              <p><strong className="text-[hsl(var(--foreground))]">数据格式：</strong>支持 HEX（#3b82f6）、RGB（rgb(59,130,246)）、HSL（hsl(217,91%,60%)）三种格式输入。</p>
              <p><strong className="text-[hsl(var(--foreground))]">操作步骤：</strong></p>
              <div className="pl-4 space-y-1">
                <p>1. 点击色块选择颜色，或直接输入 HEX/RGB/HSL 值</p>
                <p>2. 查看自动生成的同色相 10 色色板</p>
                <p>3. 查看互补色、类似色、三角配色方案</p>
                <p>4. 检查与白色/黑色的对比度是否满足 AA 标准</p>
                <p>5. 点击复制按钮复制颜色值，历史记录自动保存</p>
              </div>
              <p><strong className="text-[hsl(var(--foreground))]">输出结果：</strong>HEX、RGB、HSL 值，色板，配色方案，WCAG 对比度评级。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
