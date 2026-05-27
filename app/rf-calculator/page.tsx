'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Home, ChevronRight as ChevronRightIcon, Star, Radio, Signal, Building2, TowerControl, BookOpen } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'
import {
  LTE_BANDS, NR_BANDS, calcLteFreq, calcLteEarfcn, calcNrFreq, calcNrArfcn,
  decodeECI, encodeECI, decodeNCI, encodeNCI
} from '@/lib/rf-calculator'
import UnifiedTable from '@/components/unified-table'

const tabs = [
  { key: 'lte', label: 'LTE EARFCN', icon: Signal },
  { key: 'nr', label: '5G NR-ARFCN', icon: Radio },
  { key: 'eci', label: '4G ECI', icon: Building2 },
  { key: 'nci', label: '5G NCI', icon: TowerControl },
  { key: 'ref', label: '频段参考', icon: BookOpen },
]

const inp = "px-3 py-2.5 rounded-lg border border-[hsl(var(--border))] text-sm outline-none focus:border-sky-500/50 bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
const btn = "w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium text-sm hover:opacity-90 active:scale-[0.97] transition-all cursor-pointer border-0"
const btnV = "w-full py-2.5 text-white rounded-lg font-medium text-sm hover:opacity-90 active:scale-[0.97] transition-all cursor-pointer border-0"

export default function RfCalculatorPage() {
  const [activeTab, setActiveTab] = useState('lte')
  const isFav = useFavStore((s) => s.isFav)
  const toggleFav = useFavStore((s) => s.toggleFav)
  const fav = isFav('rf-calculator')

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span>开发工具</span>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">4G/5G无线参数计算</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center shrink-0">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">4G/5G 无线参数计算</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">EARFCN / NR-ARFCN / ECI / NCI 全功能查询与换算</p>
              </div>
            </div>
            <button onClick={() => toggleFav('rf-calculator')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
              <Star className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex gap-2 mb-6 flex-wrap">
            {tabs.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    active ? 'bg-sky-500 text-white border-sky-500' : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:border-sky-500/50 hover:text-[hsl(var(--foreground))]'
                  }`}>
                  <Icon className="w-4 h-4" />{tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'lte' && <LteTab />}
          {activeTab === 'nr' && <NrTab />}
          {activeTab === 'eci' && <EciTab />}
          {activeTab === 'nci' && <NciTab />}
          {activeTab === 'ref' && <RefTab />}
        </div>
      </div>
    </div>
  )
}

function ResultBox({ children, empty = false, style }: { children: React.ReactNode; empty?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={`mt-4 p-4 rounded-xl ${empty ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] italic' : 'bg-sky-500/5 border border-sky-500/10'}`} style={style}>
      {children}
    </div>
  )
}

function ResultRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-dashed border-[hsl(var(--border))] last:border-0">
      <span className="text-sm text-[hsl(var(--muted-foreground))] font-medium">{label}</span>
      <span className="text-sm font-semibold text-[hsl(var(--foreground))] font-mono">{value}</span>
    </div>
  )
}

function Badge({ children, color = 'sky' }: { children: React.ReactNode; color?: 'sky' | 'emerald' | 'amber' | 'violet' | 'slate' }) {
  const map: Record<string, string> = {
    sky: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    violet: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${map[color]}`}>{children}</span>
}

function LteTab() {
  const [earfcn, setEarfcn] = useState('')
  const [freqResult, setFreqResult] = useState<any>(null)
  const [bandSel, setBandSel] = useState('')
  const [freqInput, setFreqInput] = useState('')
  const [dirSel, setDirSel] = useState('dl')
  const [earfcnResult, setEarfcnResult] = useState<any>(null)

  const handleCalcFreq = () => {
    const n = parseInt(earfcn, 10)
    if (isNaN(n) || n < 0 || n > 65535) { setFreqResult({ error: 'EARFCN 超出有效范围 (0-65535)' }); return }
    const r = calcLteFreq(n)
    if (!r) { setFreqResult({ error: '未找到匹配的 3GPP 频段定义' }); return }
    setFreqResult({ ok: true, ...r })
  }

  const handleCalcEarfcn = () => {
    const band = LTE_BANDS.find(b => String(b.band) === bandSel)
    const freq = parseFloat(freqInput)
    if (!band || isNaN(freq)) { setEarfcnResult({ error: '请选择频段并输入频率' }); return }
    const e = calcLteEarfcn(band, freq, dirSel as 'dl' | 'ul')
    if (!e) { setEarfcnResult({ error: `频率超出 Band ${band.band} 范围` }); return }
    setEarfcnResult({ ok: true, band, earfcn: e, freq, dir: dirSel })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-[hsl(var(--border)] bg-[hsl(var(--muted))] p-6">
        <h3 className="text-base font-semibold text-sky-600 mb-4 flex items-center gap-2"><Signal className="w-4 h-4" />EARFCN → 频率</h3>
        <div className="mb-3">
          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">输入 EARFCN (0 – 65535)</label>
          <input type="number" min={0} max={65535} value={earfcn} onChange={e => setEarfcn(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCalcFreq()}
            className={`${inp} w-full`} placeholder="例如：1300" />
        </div>
        <button onClick={handleCalcFreq} className={btn}>计算频率与频段</button>
        {freqResult ? (
          freqResult.error ? <ResultBox empty><ResultRow label="错误" value={<span className="text-red-500">{freqResult.error}</span>} /></ResultBox> : (
            <ResultBox>
              <ResultRow label="频段 Band" value={<><Badge color="amber">Band {freqResult.band.band}</Badge> <Badge color={freqResult.band.mode === 'FDD' ? 'sky' : 'emerald'}>{freqResult.band.mode}</Badge></>} />
              <ResultRow label="方向" value={freqResult.isDL ? '下行 Downlink' : '上行 Uplink'} />
              <ResultRow label="中心频率" value={`${freqResult.freq.toFixed(1)} MHz`} />
              {freqResult.band.mode === 'FDD' && (
                <>
                  <ResultRow label={freqResult.isDL ? '对应上行频率' : '对应下行频率'} value={`${(freqResult.band[freqResult.isDL ? 'ulLow' : 'dlLow'] + 0.1 * (freqResult.band[freqResult.isDL ? 'ulEarfcnStart' : 'dlEarfcnStart'] + (parseInt(earfcn) - freqResult.band.dlEarfcnStart) - (freqResult.band[freqResult.isDL ? 'ulEarfcnStart' : 'dlEarfcnStart']))).toFixed(1)} MHz`} />
                  <ResultRow label={freqResult.isDL ? '对应上行EARFCN' : '对应下行EARFCN'} value={freqResult.band[freqResult.isDL ? 'ulEarfcnStart' : 'dlEarfcnStart'] + (parseInt(earfcn) - freqResult.band.dlEarfcnStart)} />
                </>
              )}
              <ResultRow label="EARFCN 步进" value="100 kHz" />
            </ResultBox>
          )
        ) : <ResultBox empty><span className="text-sm">输入 EARFCN 后点击计算</span></ResultBox>}
      </div>

      <div className="rounded-xl border border-[hsl(var(--border)] bg-[hsl(var(--muted))] p-6">
        <h3 className="text-base font-semibold text-sky-600 mb-4 flex items-center gap-2"><Signal className="w-4 h-4" />频率 → EARFCN</h3>
        <div className="mb-3">
          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">选择频段</label>
          <select value={bandSel} onChange={e => setBandSel(e.target.value)} className={`${inp} w-full`}>
            <option value="">-- 选择频段 --</option>
            {LTE_BANDS.map(b => <option key={b.band} value={b.band}>Band {b.band} ({b.mode}) {b.mode === 'FDD' ? `UL:${b.ulLow}-${b.ulHigh} / DL:${b.dlLow}-${b.dlHigh}` : `TDD:${b.dlLow}-${b.dlHigh}`}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">输入中心频率 (MHz)</label>
          <input type="number" step={0.1} value={freqInput} onChange={e => setFreqInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCalcEarfcn()}
            className={`${inp} w-full`} placeholder="例如：1815.0" />
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">方向</label>
          <select value={dirSel} onChange={e => setDirSel(e.target.value)} className={`${inp} w-full`}>
            <option value="dl">下行 (Downlink)</option>
            <option value="ul">上行 (Uplink)</option>
          </select>
        </div>
        <button onClick={handleCalcEarfcn} className={btn}>计算 EARFCN</button>
        {earfcnResult ? (
          earfcnResult.error ? <ResultBox empty><ResultRow label="错误" value={<span className="text-red-500">{earfcnResult.error}</span>} /></ResultBox> : (
            <ResultBox>
              <ResultRow label="频段 Band" value={<><Badge color="amber">Band {earfcnResult.band.band}</Badge> <Badge color={earfcnResult.band.mode === 'FDD' ? 'sky' : 'emerald'}>{earfcnResult.band.mode}</Badge></>} />
              <ResultRow label="方向" value={earfcnResult.dir === 'dl' ? '下行 Downlink' : '上行 Uplink'} />
              <ResultRow label="中心频率" value={`${earfcnResult.freq.toFixed(1)} MHz`} />
              <ResultRow label="EARFCN" value={<span className="text-lg text-sky-600">{earfcnResult.earfcn}</span>} />
              {earfcnResult.band.mode === 'TDD' && <ResultRow label="备注" value="TDD 上下行共用" />}
            </ResultBox>
          )
        ) : <ResultBox empty><span className="text-sm">选择频段并输入频率后点击计算</span></ResultBox>}
      </div>
    </div>
  )
}

function NrTab() {
  const [nrArfcn, setNrArfcn] = useState('')
  const [nrFreqResult, setNrFreqResult] = useState<any>(null)
  const [nrBandSel, setNrBandSel] = useState('')
  const [nrFreqInput, setNrFreqInput] = useState('')
  const [nrArfcnResult, setNrArfcnResult] = useState<any>(null)

  const handleNrFreq = () => {
    const n = parseInt(nrArfcn, 10)
    if (isNaN(n) || n < 0 || n > 3279165) { setNrFreqResult({ error: 'NR-ARFCN 超出有效范围 (0-3279165)' }); return }
    const r = calcNrFreq(n)
    if (!r) { setNrFreqResult({ error: '无效的 NR-ARFCN 范围' }); return }
    setNrFreqResult({ ok: true, ...r, nref: n })
  }

  const handleNrArfcn = () => {
    const band = NR_BANDS.find(b => b.band === nrBandSel)
    const freq = parseFloat(nrFreqInput)
    if (!band || isNaN(freq)) { setNrArfcnResult({ error: '请选择频段并输入频率' }); return }
    const a = calcNrArfcn(band, freq)
    if (!a) { setNrArfcnResult({ error: `频率超出 ${band.band} 范围` }); return }
    setNrArfcnResult({ ok: true, band, arfcn: a, freq })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[hsl(var(--border)] bg-[hsl(var(--muted))] p-6">
          <h3 className="text-base font-semibold text-violet-600 mb-4 flex items-center gap-2"><Radio className="w-4 h-4" />NR-ARFCN → 频率</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">输入 NR-ARFCN (0 – 3279165)</label>
            <input type="number" min={0} max={3279165} value={nrArfcn} onChange={e => setNrArfcn(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNrFreq()}
              className={`${inp} w-full`} placeholder="例如：620000" />
          </div>
          <button onClick={handleNrFreq} className={btnV} style={{ background: '#7c3aed' }}>计算频率</button>
          {nrFreqResult ? (
            nrFreqResult.error ? <ResultBox empty><ResultRow label="错误" value={<span className="text-red-500">{nrFreqResult.error}</span>} /></ResultBox> : (
              <ResultBox style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.15)' }}>
                <ResultRow label="NR-ARFCN" value={<span className="text-lg text-violet-600">{nrFreqResult.nref}</span>} />
                <ResultRow label="中心频率" value={`${nrFreqResult.freq.toFixed(3)} MHz`} />
                <ResultRow label="频率范围" value={nrFreqResult.range.range} />
                <ResultRow label="全局栅格" value={`${nrFreqResult.range.deltaF} kHz`} />
                <ResultRow label="匹配频段" value={nrFreqResult.matchedBand ? <><Badge color="violet">{nrFreqResult.matchedBand.band}</Badge> <Badge color={nrFreqResult.matchedBand.mode === 'FDD' ? 'sky' : 'emerald'}>{nrFreqResult.matchedBand.mode}</Badge></> : '未匹配到已知频段'} />
              </ResultBox>
            )
          ) : <ResultBox empty><span className="text-sm">输入 NR-ARFCN 后点击计算</span></ResultBox>}
        </div>

        <div className="rounded-xl border border-[hsl(var(--border)] bg-[hsl(var(--muted))] p-6">
          <h3 className="text-base font-semibold text-violet-600 mb-4 flex items-center gap-2"><Radio className="w-4 h-4" />频率 → NR-ARFCN</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">选择 NR 频段</label>
            <select value={nrBandSel} onChange={e => setNrBandSel(e.target.value)} className={`${inp} w-full`}>
              <option value="">-- 选择频段 --</option>
              {NR_BANDS.map(b => <option key={b.band} value={b.band}>{b.band} ({b.mode}) {b.low}-{b.high} MHz [{b.arfcnStart}-{b.arfcnEnd}]</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">输入中心频率 (MHz)</label>
            <input type="number" step={0.001} value={nrFreqInput} onChange={e => setNrFreqInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNrArfcn()}
              className={`${inp} w-full`} placeholder="例如：3410.400" />
          </div>
          <button onClick={handleNrArfcn} className={btnV} style={{ background: '#7c3aed' }}>计算 NR-ARFCN</button>
          {nrArfcnResult ? (
            nrArfcnResult.error ? <ResultBox empty><ResultRow label="错误" value={<span className="text-red-500">{nrArfcnResult.error}</span>} /></ResultBox> : (
              <ResultBox style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.15)' }}>
                <ResultRow label="频段" value={<><Badge color="violet">{nrArfcnResult.band.band}</Badge> <Badge color={nrArfcnResult.band.mode === 'FDD' ? 'sky' : 'emerald'}>{nrArfcnResult.band.mode}</Badge></>} />
                <ResultRow label="中心频率" value={`${nrArfcnResult.freq.toFixed(3)} MHz`} />
                <ResultRow label="NR-ARFCN" value={<span className="text-lg text-violet-600">{nrArfcnResult.arfcn}</span>} />
                <ResultRow label="全局栅格" value={`${nrArfcnResult.band.deltaF} kHz`} />
              </ResultBox>
            )
          ) : <ResultBox empty><span className="text-sm">选择频段并输入频率后点击计算</span></ResultBox>}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
        <strong className="text-[hsl(var(--foreground))]">NR-ARFCN 公式（3GPP TS 38.101）：</strong><br />
        • 范围 1 (0–3000 MHz): F = 0 + 0.005 × NREF | ΔFGlobal = 5 kHz<br />
        • 范围 2 (3000–24250 MHz): F = 3000 + 0.015 × (NREF − 600000) | ΔFGlobal = 15 kHz<br />
        • 范围 3 (24250–100000 MHz): F = 24250 + 0.060 × (NREF − 2016667) | ΔFGlobal = 60 kHz
      </div>
    </div>
  )
}

function EciTab() {
  const [eciInput, setEciInput] = useState('')
  const [eciBase, setEciBase] = useState('10')
  const [decodeResult, setDecodeResult] = useState<any>(null)
  const [enbId, setEnbId] = useState('')
  const [cellId, setCellId] = useState('')
  const [encodeResult, setEncodeResult] = useState<any>(null)

  const handleDecode = () => {
    const input = eciInput.trim()
    if (!input) { setDecodeResult({ error: '请输入 ECI' }); return }
    let eci: number
    if (eciBase === '16' || input.toLowerCase().startsWith('0x')) {
      eci = parseInt(input.replace(/^0x/i, ''), 16)
    } else {
      eci = parseInt(input, 10)
    }
    if (isNaN(eci) || eci < 0 || eci > 268435455) { setDecodeResult({ error: '无效的 ECI (范围: 0 – 268,435,455)' }); return }
    setDecodeResult({ ok: true, ...decodeECI(eci) })
  }

  const handleEncode = () => {
    const e = parseInt(enbId, 10)
    const c = parseInt(cellId, 10)
    if (isNaN(e) || isNaN(c)) { setEncodeResult({ error: '请输入有效的 eNB ID 和 Cell ID' }); return }
    if (e < 0 || e > 1048575) { setEncodeResult({ error: 'eNB ID 超出范围 (0 – 1,048,575)' }); return }
    if (c < 0 || c > 255) { setEncodeResult({ error: 'Cell ID 超出范围 (0 – 255)' }); return }
    setEncodeResult({ ok: true, eci: encodeECI(e, c), enbId: e, cellId: c })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[hsl(var(--border)] bg-[hsl(var(--muted))] p-6">
          <h3 className="text-base font-semibold text-sky-600 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" />ECI → eNB ID + Cell ID</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">输入 ECI (十进制或十六进制)</label>
            <div className="flex gap-2">
              <input type="text" value={eciInput} onChange={e => setEciInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDecode()}
                className={`${inp} flex-1`} placeholder="例如：108830209 或 0x067C4001" />
              <select value={eciBase} onChange={e => setEciBase(e.target.value)} className={`${inp} w-[100px]`}>
                <option value="10">十进制</option>
                <option value="16">十六进制</option>
              </select>
            </div>
          </div>
          <button onClick={handleDecode} className={btn}>解析 ECI</button>
          {decodeResult ? (
            decodeResult.error ? <ResultBox empty><ResultRow label="错误" value={<span className="text-red-500">{decodeResult.error}</span>} /></ResultBox> : (
              <ResultBox>
                <ResultRow label="ECI (十进制)" value={decodeResult.eci} />
                <ResultRow label="ECI (十六进制)" value={`0x${decodeResult.eci.toString(16).toUpperCase().padStart(7, '0')}`} />
                <ResultRow label="eNB ID" value={<span className="text-sky-600">{decodeResult.enbId}</span>} />
                <ResultRow label="eNB ID (Hex)" value={`0x${decodeResult.enbId.toString(16).toUpperCase().padStart(5, '0')}`} />
                <ResultRow label="Cell ID" value={<span className="text-sky-600">{decodeResult.cellId}</span>} />
                <ResultRow label="Cell ID (Hex)" value={`0x${decodeResult.cellId.toString(16).toUpperCase().padStart(2, '0')}`} />
                <ResultRow label="公式验证" value={`${decodeResult.enbId} × 256 + ${decodeResult.cellId} = ${decodeResult.eci}`} />
              </ResultBox>
            )
          ) : <ResultBox empty><span className="text-sm">输入 ECI 后点击解析</span></ResultBox>}
        </div>

        <div className="rounded-xl border border-[hsl(var(--border)] bg-[hsl(var(--muted))] p-6">
          <h3 className="text-base font-semibold text-sky-600 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" />eNB ID + Cell ID → ECI</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">eNB ID (0 – 2²⁰-1 = 1048575)</label>
            <input type="number" min={0} max={1048575} value={enbId} onChange={e => setEnbId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEncode()}
              className={`${inp} w-full`} placeholder="例如：42496" />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Cell ID (0 – 255)</label>
            <input type="number" min={0} max={255} value={cellId} onChange={e => setCellId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEncode()}
              className={`${inp} w-full`} placeholder="例如：1" />
          </div>
          <button onClick={handleEncode} className={btn}>合成 ECI</button>
          {encodeResult ? (
            encodeResult.error ? <ResultBox empty><ResultRow label="错误" value={<span className="text-red-500">{encodeResult.error}</span>} /></ResultBox> : (
              <ResultBox>
                <ResultRow label="ECI (十进制)" value={<span className="text-lg text-sky-600">{encodeResult.eci}</span>} />
                <ResultRow label="ECI (十六进制)" value={`0x${encodeResult.eci.toString(16).toUpperCase().padStart(7, '0')}`} />
                <ResultRow label="eNB ID" value={`${encodeResult.enbId} (0x${encodeResult.enbId.toString(16).toUpperCase().padStart(5, '0')})`} />
                <ResultRow label="Cell ID" value={`${encodeResult.cellId} (0x${encodeResult.cellId.toString(16).toUpperCase().padStart(2, '0')})`} />
                <ResultRow label="二进制示意" value={`${encodeResult.eci.toString(2).padStart(28, '0').replace(/(.{8})$/, '_$1')}`} />
              </ResultBox>
            )
          ) : <ResultBox empty><span className="text-sm">输入 eNB ID 和 Cell ID 后点击合成</span></ResultBox>}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
        <strong className="text-[hsl(var(--foreground))]">ECI 结构（3GPP TS 36.413）：</strong><br />
        • ECI 共 28 位：高 20 位 = eNB ID，低 8 位 = Cell ID<br />
        • 公式：ECI = eNB ID × 256 + Cell ID<br />
        • 范围：ECI (0 – 268,435,455), eNB ID (0 – 1,048,575), Cell ID (0 – 255)
      </div>
    </div>
  )
}

function NciTab() {
  const [nciInput, setNciInput] = useState('')
  const [nciBase, setNciBase] = useState('10')
  const [gnbIdLen, setGnbIdLen] = useState(24)
  const [decodeResult, setDecodeResult] = useState<any>(null)
  const [gnbId, setGnbId] = useState('')
  const [nciCellId, setNciCellId] = useState('')
  const [gnbIdLenEnc, setGnbIdLenEnc] = useState(24)
  const [encodeResult, setEncodeResult] = useState<any>(null)

  const handleDecode = () => {
    const input = nciInput.trim()
    if (!input) { setDecodeResult({ error: '请输入 NCI' }); return }
    let nci: number
    if (nciBase === '16' || input.toLowerCase().startsWith('0x')) {
      nci = parseInt(input.replace(/^0x/i, ''), 16)
    } else {
      nci = parseInt(input, 10)
    }
    if (isNaN(nci) || nci < 0 || nci > 68719476735) { setDecodeResult({ error: '无效的 NCI (范围: 0 – 68,719,476,735)' }); return }
    setDecodeResult({ ok: true, ...decodeNCI(nci, gnbIdLen) })
  }

  const handleEncode = () => {
    const g = parseInt(gnbId, 10)
    const c = parseInt(nciCellId, 10)
    if (isNaN(g) || isNaN(c)) { setEncodeResult({ error: '请输入有效的 gNB ID 和 Cell ID' }); return }
    const { maxGnb, maxCell } = decodeNCI(0, gnbIdLenEnc)
    if (g < 0 || g > maxGnb) { setEncodeResult({ error: `gNB ID 超出范围 (0 – ${maxGnb})` }); return }
    if (c < 0 || c > maxCell) { setEncodeResult({ error: `Cell ID 超出范围 (0 – ${maxCell})` }); return }
    setEncodeResult({ ok: true, nci: encodeNCI(g, c, gnbIdLenEnc), gnbId: g, cellId: c, gnbIdLen: gnbIdLenEnc })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[hsl(var(--border)] bg-[hsl(var(--muted))] p-6">
          <h3 className="text-base font-semibold text-violet-600 mb-4 flex items-center gap-2"><TowerControl className="w-4 h-4" />NCI → gNB ID + Cell ID</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">输入 NCI (十进制或十六进制)</label>
            <div className="flex gap-2">
              <input type="text" value={nciInput} onChange={e => setNciInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDecode()}
                className={`${inp} flex-1`} placeholder="例如：68719476735 或 0xFFFFFFFFF" />
              <select value={nciBase} onChange={e => setNciBase(e.target.value)} className={`${inp} w-[100px]`}>
                <option value="10">十进制</option>
                <option value="16">十六进制</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">gNB ID 位长 (22 – 32 bits)</label>
            <select value={gnbIdLen} onChange={e => setGnbIdLen(Number(e.target.value))} className={`${inp} w-full`}>
              <option value={22}>22 bits (Cell ID 14 bits)</option>
              <option value={24}>24 bits (Cell ID 12 bits)</option>
              <option value={26}>26 bits (Cell ID 10 bits)</option>
              <option value={28}>28 bits (Cell ID 8 bits)</option>
              <option value={32}>32 bits (Cell ID 4 bits)</option>
            </select>
          </div>
          <button onClick={handleDecode} className={btnV} style={{ background: '#7c3aed' }}>解析 NCI</button>
          {decodeResult ? (
            decodeResult.error ? <ResultBox empty><ResultRow label="错误" value={<span className="text-red-500">{decodeResult.error}</span>} /></ResultBox> : (
              <ResultBox style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.15)' }}>
                <ResultRow label="NCI (十进制)" value={decodeResult.nci} />
                <ResultRow label="NCI (十六进制)" value={`0x${decodeResult.nci.toString(16).toUpperCase().padStart(9, '0')}`} />
                <ResultRow label="gNB ID 位长" value={`${decodeResult.gnbIdLen} bits`} />
                <ResultRow label="Cell ID 位长" value={`${decodeResult.cellIdLen} bits`} />
                <ResultRow label="gNB ID" value={<span className="text-violet-600">{decodeResult.gnbId}</span>} />
                <ResultRow label="gNB ID (Hex)" value={`0x${decodeResult.gnbId.toString(16).toUpperCase()}`} />
                <ResultRow label="Cell ID" value={<span className="text-violet-600">{decodeResult.cellId}</span>} />
                <ResultRow label="Cell ID (Hex)" value={`0x${decodeResult.cellId.toString(16).toUpperCase()}`} />
                <ResultRow label="最大 gNB ID" value={decodeResult.maxGnb} />
                <ResultRow label="最大 Cell ID" value={decodeResult.maxCell} />
              </ResultBox>
            )
          ) : <ResultBox empty><span className="text-sm">输入 NCI 后点击解析</span></ResultBox>}
        </div>

        <div className="rounded-xl border border-[hsl(var(--border)] bg-[hsl(var(--muted))] p-6">
          <h3 className="text-base font-semibold text-violet-600 mb-4 flex items-center gap-2"><TowerControl className="w-4 h-4" />gNB ID + Cell ID → NCI</h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">gNB ID</label>
            <input type="number" min={0} value={gnbId} onChange={e => setGnbId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEncode()}
              className={`${inp} w-full`} placeholder="例如：10598595" />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Cell ID</label>
            <input type="number" min={0} value={nciCellId} onChange={e => setNciCellId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEncode()}
              className={`${inp} w-full`} placeholder="例如：980" />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">gNB ID 位长</label>
            <select value={gnbIdLenEnc} onChange={e => setGnbIdLenEnc(Number(e.target.value))} className={`${inp} w-full`}>
              <option value={22}>22 bits</option>
              <option value={24}>24 bits</option>
              <option value={26}>26 bits</option>
              <option value={28}>28 bits</option>
              <option value={32}>32 bits</option>
            </select>
          </div>
          <button onClick={handleEncode} className={btnV} style={{ background: '#7c3aed' }}>合成 NCI</button>
          {encodeResult ? (
            encodeResult.error ? <ResultBox empty><ResultRow label="错误" value={<span className="text-red-500">{encodeResult.error}</span>} /></ResultBox> : (
              <ResultBox style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.15)' }}>
                <ResultRow label="NCI (十进制)" value={<span className="text-lg text-violet-600">{encodeResult.nci}</span>} />
                <ResultRow label="NCI (十六进制)" value={`0x${encodeResult.nci.toString(16).toUpperCase().padStart(9, '0')}`} />
                <ResultRow label="gNB ID" value={`${encodeResult.gnbId} (0x${encodeResult.gnbId.toString(16).toUpperCase()}) [${encodeResult.gnbIdLen} bits]`} />
                <ResultRow label="Cell ID" value={`${encodeResult.cellId} (0x${encodeResult.cellId.toString(16).toUpperCase()}) [${36 - encodeResult.gnbIdLen} bits]`} />
                <ResultRow label="公式验证" value={`(${encodeResult.gnbId} << ${36 - encodeResult.gnbIdLen}) | ${encodeResult.cellId} = ${encodeResult.nci}`} />
              </ResultBox>
            )
          ) : <ResultBox empty><span className="text-sm">输入 gNB ID 和 Cell ID 后点击合成</span></ResultBox>}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
        <strong className="text-[hsl(var(--foreground))]">NCI 结构（3GPP TS 38.413）：</strong><br />
        • NCI 共 36 位：高 gNB-ID-length 位 = gNB ID，低 (36 − gNB-ID-length) 位 = Cell ID<br />
        • gNB ID 位长可配置：22–32 bits（常见 24 bits），对应 Cell ID 位长：14–4 bits<br />
        • 公式：NCI = (gNB ID &lt;&lt; cell_id_length) | Cell ID<br />
        • 范围：NCI (0 – 68,719,476,735), gNB ID 最大约 42 亿, Cell ID 最大 16383
      </div>
    </div>
  )
}

function RefTab() {
  const lteRefData = useMemo(() => {
    const rows: any[] = []
    LTE_BANDS.forEach(b => {
      rows.push({ band: `Band ${b.band}`, mode: b.mode, dir: 'DL', freqRange: `${b.dlLow} – ${b.dlHigh}`, earfcnRange: `${b.dlEarfcnStart} – ${b.dlEarfcnEnd}`, step: '100 kHz' })
      if (b.mode === 'FDD' && b.ulLow !== undefined) {
        rows.push({ band: `Band ${b.band}`, mode: b.mode, dir: 'UL', freqRange: `${b.ulLow} – ${b.ulHigh}`, earfcnRange: `${b.ulEarfcnStart} – ${b.ulEarfcnEnd}`, step: '100 kHz' })
      }
    })
    return rows
  }, [])

  const nrRefData = useMemo(() => {
    return NR_BANDS.map(b => ({ band: b.band, mode: b.mode, freqRange: `${b.low} – ${b.high}`, arfcnRange: `${b.arfcnStart} – ${b.arfcnEnd}`, deltaF: `${b.deltaF} kHz`, step: `${b.deltaF} kHz` }))
  }, [])

  const lteColumns = [
    { key: 'band', title: '频段', width: 100 },
    { key: 'mode', title: '模式', width: 80, render: (v: string) => <Badge color={v === 'FDD' ? 'sky' : 'emerald'}>{v}</Badge> },
    { key: 'dir', title: '方向', width: 60 },
    { key: 'freqRange', title: '频率范围 (MHz)', width: 160 },
    { key: 'earfcnRange', title: 'EARFCN 范围', width: 180 },
    { key: 'step', title: '步进', width: 80 },
  ]

  const nrColumns = [
    { key: 'band', title: '频段', width: 80 },
    { key: 'mode', title: '模式', width: 80, render: (v: string) => <Badge color={v === 'FDD' ? 'sky' : 'emerald'}>{v}</Badge> },
    { key: 'freqRange', title: '频率范围 (MHz)', width: 160 },
    { key: 'arfcnRange', title: 'NR-ARFCN 范围', width: 200 },
    { key: 'deltaF', title: 'ΔFGlobal', width: 100 },
    { key: 'step', title: '步进', width: 80 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center gap-2"><Signal className="w-4 h-4 text-sky-600" />LTE 频段 EARFCN 参考表</h3>
        <UnifiedTable columns={lteColumns} data={lteRefData} pagination pageSize={10} showTotal />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-3 flex items-center gap-2"><Radio className="w-4 h-4 text-violet-600" />5G NR 频段 NR-ARFCN 参考表</h3>
        <UnifiedTable columns={nrColumns} data={nrRefData} pagination pageSize={10} showTotal />
      </div>
    </div>
  )
}
