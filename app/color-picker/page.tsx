'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Palette, Home, Star, ChevronRight as ChevronRightIcon, Copy, Check } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
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

export default function ColorPickerPage() {
  const isFav = useFavStore(s => s.isFav)
  const toggleFav = useFavStore(s => s.toggleFav)
  const fav = isFav('color-picker')

  const [hex, setHex] = useState('#3b82f6')
  const [copied, setCopied] = useState<string | null>(null)
  const [palette, setPalette] = useState<string[]>([])

  const [r, g, b] = hexToRgb(hex)
  const [h, s, l] = rgbToHsl(r, g, b)

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

  const copy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }, [])

  const CopyBtn = ({ text, label }: { text: string; label: string }) => (
    <button onClick={() => copy(text, label)} className="copy-btn">
      {copied === label ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  )

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
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] flex items-center justify-between">HEX <CopyBtn text={hex} label="hex" /></label>
                  <input type="text" value={hex} onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setHex(e.target.value) }}
                    className="form-input mt-1 text-sm font-mono" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                    RGB <CopyBtn text={`rgb(${r}, ${g}, ${b})`} label="rgb" />
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
                    HSL <CopyBtn text={`hsl(${h}, ${s}%, ${l}%)`} label="hsl" />
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
                    <button key={i} onClick={() => setHex(c)} className="h-10 rounded-lg border border-[hsl(var(--border))] cursor-pointer hover:scale-105 transition-transform"
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
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] text-[11px] text-[hsl(var(--muted-foreground))] space-y-1">
            <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">使用说明</h4>
            <p>• 点击色块或输入HEX/RGB/HSL值选择颜色</p>
            <p>• 自动生成同色相不同明度的10色色板</p>
            <p>• 对比度检查基于WCAG 2.0标准（AA级4.5:1，大字3:1）</p>
          </div>
        </div>
      </div>
    </div>
  )
}
