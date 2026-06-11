'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, Star, ChevronRight as ChevronRightIcon, Upload, Download, Settings2, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'
import * as XLSX from 'xlsx'

interface VoiceThresholds {
  accessCnt: number
  releaseCnt: number
  setupSucc: number
  dropRate: number
  hoSucc: number
  loss: number
}

interface G5Thresholds {
  accessCnt: number
  releaseCnt: number
  dnRlcTraffic: number
  accessSucc: number
  ueDropRate: number
  bands: number[]
}

interface HighLoadThresholds {
  prbUtil: number
  '3_5G': Record<string, [number, number]>
  '2_1G_40M': Record<string, [number, number]>
  '2_1G_20M': Record<string, [number, number]>
}

const defaultVoice: VoiceThresholds = {
  accessCnt: 25, releaseCnt: 25,
  setupSucc: 0.97, dropRate: 0.005, hoSucc: 0.95, loss: 0.01,
}

const defaultG5: G5Thresholds = {
  accessCnt: 25, releaseCnt: 25, dnRlcTraffic: 0,
  accessSucc: 0.98, ueDropRate: 0.02, bands: [78, 1],
}

const defaultHighLoad: HighLoadThresholds = {
  prbUtil: 0.70,
  '3_5G': { '64T': [80, 100], '32T': [75, 90], '8T': [65, 70], '4T': [55, 60], '2T': [35, 30], '1T': [20, 20] },
  '2_1G_40M': { '8T': [30, 120], '4T': [26, 100], '2T': [22, 80], '1T': [16, 60] },
  '2_1G_20M': { '8T': [14, 55], '4T': [12, 45], '2T': [10, 35], '1T': [7, 27] },
}

function calcSpeedThreshold(duplexMode: string, bandwidth: number): number | null {
  const dm = (duplexMode || '').toUpperCase()
  if (!dm || dm === 'NAN' || !bandwidth || bandwidth === 0) return null
  if (dm === 'TDD') return (bandwidth / 100) * 40
  if (dm === 'FDD') return (bandwidth / 40) * 20
  return null
}

function findCol(headers: string[], keywords: string[]): string | null {
  for (const kw of keywords) {
    const found = headers.find(h => h.includes(kw))
    if (found) return found
  }
  return null
}

export default function CellAnalysisPage() {
  const isFav = useFavStore(s => s.isFav)
  const toggleFav = useFavStore(s => s.toggleFav)
  const fav = isFav('cell-analysis')

  const [qualityFile, setQualityFile] = useState<File | null>(null)
  const [highloadFile, setHighloadFile] = useState<File | null>(null)
  const [cellInfoFile, setCellInfoFile] = useState<File | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [voiceTh, setVoiceTh] = useState<VoiceThresholds>(defaultVoice)
  const [g5Th, setG5Th] = useState<G5Thresholds>(defaultG5)
  const [highLoadTh, setHighLoadTh] = useState<HighLoadThresholds>(defaultHighLoad)
  const [resultSummary, setResultSummary] = useState<string>('')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const handleRun = useCallback(async () => {
    if (!qualityFile || !highloadFile) {
      addLog('请上传质差指标文件和高负荷指标文件')
      return
    }
    setProcessing(true)
    setLogs([])
    setResultSummary('')
    setResultBlob(null)

    try {
      addLog('读取质差指标文件...')
      const qBuf = await qualityFile.arrayBuffer()
      const qWb = XLSX.read(qBuf, { type: 'array' })
      const qWs = qWb.Sheets[qWb.SheetNames[0]]
      const dfQuality: any[] = XLSX.utils.sheet_to_json(qWs)

      addLog('读取高负荷指标文件...')
      const hBuf = await highloadFile.arrayBuffer()
      const hWb = XLSX.read(hBuf, { type: 'array' })
      const hWs = hWb.Sheets[hWb.SheetNames[0]]
      const dfHighload: any[] = XLSX.utils.sheet_to_json(hWs)

      let dfCellInfo: any[] = []
      if (cellInfoFile) {
        addLog('读取小区基础信息CSV...')
        const cBuf = await cellInfoFile.arrayBuffer()
        const cWb = XLSX.read(cBuf, { type: 'array' })
        const cWs = cWb.Sheets[cWb.SheetNames[0]]
        dfCellInfo = XLSX.utils.sheet_to_json(cWs)
        const seen = new Set<string>()
        dfCellInfo = dfCellInfo.filter((r: any) => {
          const k = r['masterOperatorId']
          if (!k || seen.has(k)) return false
          seen.add(String(k))
          return true
        })
      }

      const qHeaders = Object.keys(dfQuality[0] || {})
      const hHeaders = Object.keys(dfHighload[0] || {})

      // 自动识别列名
      const colSubnet = findCol(qHeaders, ['子网名称']) || findCol(hHeaders, ['子网名称'])
      const colMasterId = findCol(qHeaders, ['masterOperatorId']) || findCol(hHeaders, ['masterOperatorId'])

      // 语音列
      const colVoiceAccess = findCol(qHeaders, ['VONR语音建立请求次数', '语音建立请求次数', 'VoNR语音建立请求'])
      const colVoiceRelease = findCol(qHeaders, ['VoNR语音释放总数', '语音释放总数', 'VoNR语音释放'])
      const colVoiceSetupSucc = findCol(qHeaders, ['VoNR语音建立成功率', '语音建立成功率'])
      const colVoiceDropRate = findCol(qHeaders, ['VoNR语音掉线率', '语音掉线率'])
      const colVoiceHoSucc = findCol(qHeaders, ['VoNR语音系统内切换成功率', '语音切换成功率'])
      const colVoicePdcpUpLoss = findCol(qHeaders, ['VoNR语音上行PDCP层丢包率', '语音上行PDCP丢包率', '上行PDCP层丢包率'])
      const colVoicePdcpDnLoss = findCol(qHeaders, ['VoNR语音下行RLC层丢包率', '语音下行RLC丢包率', '下行RLC层丢包率'])

      // 5G列
      const col5gAccessCnt = findCol(qHeaders, ['维度汇总分接入类型RRC连接建立请求次数', 'RRC连接建立请求次数'])
      const col5gReleaseCnt = findCol(qHeaders, ['UE上下文释放总次数'])
      const col5gDnRlcTraffic = findCol(qHeaders, ['下行RLC层用户面流量(MBytes)', '下行RLC层用户面流量'])
      const col5gBand = findCol(qHeaders, ['频段列表'])
      const col5gAvgSpeed = findCol(qHeaders, ['5G用户下行平均感知速率', '下行平均感知速率'])
      const col5gAccessSucc = findCol(qHeaders, ['无线接入成功率(%)', '无线接入成功率'])
      const col5gUeDropRate = findCol(qHeaders, ['UE上下文掉线率(%)', 'UE上下文掉线率'])

      // 高负荷列
      const colPrbUtil = findCol(hHeaders, ['下行PRB平均占用率'])
      const colDnTraffic = findCol(hHeaders, ['下行RLC层用户面流量(MBytes)', '下行RLC层用户面流量'])
      const colRrcUsers = findCol(hHeaders, ['RRC连接平均连接用户数'])
      const colBand = findCol(hHeaders, ['频段列表'])

      addLog('列名自动识别完成')

      // 合并基础信息
      if (dfCellInfo.length > 0 && colMasterId) {
        const cellMap = new Map<string, any>()
        dfCellInfo.forEach((r: any) => cellMap.set(String(r['masterOperatorId']), r))
        dfQuality.forEach((r: any) => {
          const info = cellMap.get(String(r[colMasterId]))
          if (info) {
            r['carrierBandwidth'] = info['carrierBandwidth']
            r['aauChannel'] = info['aauChannel']
            r['duplexMode'] = info['duplexMode']
          }
        })
        dfHighload.forEach((r: any) => {
          const info = cellMap.get(String(r[colMasterId]))
          if (info) {
            r['carrierBandwidth'] = info['carrierBandwidth']
            r['aauChannel'] = info['aauChannel']
            r['duplexMode'] = info['duplexMode']
          }
        })
        addLog('已关联小区基础信息')
      }

      // ============ 一、语音质差 ============
      addLog('开始语音质差分析...')
      const dfVoiceValid = dfQuality.filter((r: any) => {
        const ac = colVoiceAccess ? Number(r[colVoiceAccess]) || 0 : 0
        const rc = colVoiceRelease ? Number(r[colVoiceRelease]) || 0 : 0
        return ac >= voiceTh.accessCnt && rc >= voiceTh.releaseCnt
      })

      const hasVoiceCols = colVoiceSetupSucc && colVoiceDropRate && colVoiceHoSucc && colVoicePdcpUpLoss && colVoicePdcpDnLoss

      let voiceBadRows: any[] = []
      let voiceStats = { total: dfVoiceValid.length, lowSetup: 0, highDrop: 0, lowHo: 0, highLoss: 0, bad: 0 }
      const voiceCityMap = new Map<string, { total: number, lowSetup: number, highDrop: number, lowHo: number, highLoss: number, bad: number }>()

      if (hasVoiceCols) {
        for (const r of dfVoiceValid) {
          const city = colSubnet ? String(r[colSubnet] || '未知').substring(0, 2) : '未知'
          const lowSetup = Number(r[colVoiceSetupSucc!]) < voiceTh.setupSucc
          const highDrop = Number(r[colVoiceDropRate!]) > voiceTh.dropRate
          const lowHo = Number(r[colVoiceHoSucc!]) < voiceTh.hoSucc
          const highLoss = Number(r[colVoicePdcpUpLoss!]) > voiceTh.loss || Number(r[colVoicePdcpDnLoss!]) > voiceTh.loss
          const isBad = lowSetup || highDrop || lowHo || highLoss

          r['语音-低接通'] = lowSetup
          r['语音-高掉线'] = highDrop
          r['语音-低切换'] = lowHo
          r['语音-高丢包'] = highLoss
          r['语音-质差小区'] = isBad

          if (lowSetup) voiceStats.lowSetup++
          if (highDrop) voiceStats.highDrop++
          if (lowHo) voiceStats.lowHo++
          if (highLoss) voiceStats.highLoss++
          if (isBad) { voiceStats.bad++; voiceBadRows.push(r) }

          if (!voiceCityMap.has(city)) voiceCityMap.set(city, { total: 0, lowSetup: 0, highDrop: 0, lowHo: 0, highLoss: 0, bad: 0 })
          const cs = voiceCityMap.get(city)!
          cs.total++
          if (lowSetup) cs.lowSetup++
          if (highDrop) cs.highDrop++
          if (lowHo) cs.lowHo++
          if (highLoss) cs.highLoss++
          if (isBad) cs.bad++
        }
      }
      addLog(`语音质差分析完成：有效${voiceStats.total}个，质差${voiceStats.bad}个`)

      // ============ 二、5G通用质差 ============
      addLog('开始5G通用质差分析...')
      const df5gValid = dfQuality.filter((r: any) => {
        const ac = col5gAccessCnt ? Number(r[col5gAccessCnt]) || 0 : 0
        const rc = col5gReleaseCnt ? Number(r[col5gReleaseCnt]) || 0 : 0
        const tf = col5gDnRlcTraffic ? Number(r[col5gDnRlcTraffic]) || 0 : 0
        const bd = col5gBand ? Number(r[col5gBand]) : 0
        return ac >= g5Th.accessCnt && rc >= g5Th.releaseCnt && tf > g5Th.dnRlcTraffic && g5Th.bands.includes(bd)
      })

      let g5BadRows: any[] = []
      let g5Stats = { total: df5gValid.length, lowSpeed: 0, lowAccess: 0, highDrop: 0, bad: 0 }
      const g5CityMap = new Map<string, { total: number, lowSpeed: number, lowAccess: number, highDrop: number, bad: number }>()

      for (const r of df5gValid) {
        const city = colSubnet ? String(r[colSubnet] || '未知').substring(0, 2) : '未知'
        const avgSpeed = col5gAvgSpeed ? Number(r[col5gAvgSpeed]) || 0 : 0
        const duplexMode = String(r['duplexMode'] || '')
        const bandwidth = Number(r['carrierBandwidth']) || 0
        const threshold = calcSpeedThreshold(duplexMode, bandwidth)
        const lowSpeed = threshold !== null && avgSpeed < threshold
        const lowAccess = col5gAccessSucc ? Number(r[col5gAccessSucc]) < g5Th.accessSucc : false
        const highDrop = col5gUeDropRate ? Number(r[col5gUeDropRate]) > g5Th.ueDropRate : false
        const isBad = lowSpeed || lowAccess || highDrop

        r['速率门限(Mbps)'] = threshold
        r['5G-低速率'] = lowSpeed
        r['5G-低接入'] = lowAccess
        r['5G-高掉线'] = highDrop
        r['5G-质差小区'] = isBad

        if (lowSpeed) g5Stats.lowSpeed++
        if (lowAccess) g5Stats.lowAccess++
        if (highDrop) g5Stats.highDrop++
        if (isBad) { g5Stats.bad++; g5BadRows.push(r) }

        if (!g5CityMap.has(city)) g5CityMap.set(city, { total: 0, lowSpeed: 0, lowAccess: 0, highDrop: 0, bad: 0 })
        const cs = g5CityMap.get(city)!
        cs.total++
        if (lowSpeed) cs.lowSpeed++
        if (lowAccess) cs.lowAccess++
        if (highDrop) cs.highDrop++
        if (isBad) cs.bad++
      }
      addLog(`5G质差分析完成：有效${g5Stats.total}个，质差${g5Stats.bad}个`)

      // ============ 三、高负荷 ============
      addLog('开始高负荷小区分析...')
      const highLoadTypeMap = new Map<string, number>()
      let highLoadStats = { total: dfHighload.length, bad: 0 }
      let highLoadBadRows: any[] = []
      const hlCityMap = new Map<string, { total: number, bad: number }>()

      for (const r of dfHighload) {
        const city = colSubnet ? String(r[colSubnet] || '未知').substring(0, 2) : '未知'
        const prb = colPrbUtil ? Number(r[colPrbUtil]) : 0
        if (isNaN(prb) || prb <= highLoadTh.prbUtil) {
          if (!hlCityMap.has(city)) hlCityMap.set(city, { total: 0, bad: 0 })
          hlCityMap.get(city)!.total++
          continue
        }

        const band = colBand ? Number(r[colBand]) : 0
        const aau = String(r['aauChannel'] || '')
        const bw = Number(r['carrierBandwidth']) || 0
        const trafficGb = colDnTraffic ? (Number(r[colDnTraffic]) || 0) / 1024 : 0
        const rrcUsers = colRrcUsers ? Number(r[colRrcUsers]) || 0 : 0

        let thresholdDict: Record<string, [number, number]> | null = null
        let category = ''
        if (band === 78) {
          thresholdDict = highLoadTh['3_5G']
          category = `3.5G-${aau}`
        } else if (band === 1) {
          if (bw === 40) { thresholdDict = highLoadTh['2_1G_40M']; category = `2.1G-40M-${aau}` }
          else if (bw === 20) { thresholdDict = highLoadTh['2_1G_20M']; category = `2.1G-20M-${aau}` }
        }

        let isHighLoad = false
        if (thresholdDict && aau in thresholdDict) {
          const [tTh, uTh] = thresholdDict[aau]
          if (trafficGb >= tTh && rrcUsers >= uTh) isHighLoad = true
        }

        r['高负荷小区'] = isHighLoad
        r['高负荷类型'] = isHighLoad ? category : ''

        if (!hlCityMap.has(city)) hlCityMap.set(city, { total: 0, bad: 0 })
        hlCityMap.get(city)!.total++
        if (isHighLoad) {
          highLoadStats.bad++
          highLoadBadRows.push(r)
          hlCityMap.get(city)!.bad++
          highLoadTypeMap.set(category, (highLoadTypeMap.get(category) || 0) + 1)
        }
      }
      addLog(`高负荷分析完成：监测${highLoadStats.total}个，高负荷${highLoadStats.bad}个`)

      // ============ 四、地市汇总 ============
      const allCities = new Set<string>()
      voiceCityMap.forEach((_, k) => allCities.add(k))
      g5CityMap.forEach((_, k) => allCities.add(k))
      hlCityMap.forEach((_, k) => allCities.add(k))

      const cityFinalStats = Array.from(allCities).map(city => {
        const v = voiceCityMap.get(city) || { total: 0, lowSetup: 0, highDrop: 0, lowHo: 0, highLoss: 0, bad: 0 }
        const g = g5CityMap.get(city) || { total: 0, lowSpeed: 0, lowAccess: 0, highDrop: 0, bad: 0 }
        const h = hlCityMap.get(city) || { total: 0, bad: 0 }
        return {
          '地市': city,
          '语音_有效小区数': v.total, '语音_低接通数': v.lowSetup, '语音_高掉线数': v.highDrop,
          '语音_低切换数': v.lowHo, '语音_高丢包数': v.highLoss, '语音_质差总数': v.bad,
          '语音_质差比例': v.total > 0 ? (v.bad / v.total * 100).toFixed(2) + '%' : '0.00%',
          'G5_有效小区数': g.total, 'G5_低速率数': g.lowSpeed, 'G5_低接入数': g.lowAccess,
          'G5_高掉线数': g.highDrop, 'G5_质差总数': g.bad,
          'G5_质差比例': g.total > 0 ? (g.bad / g.total * 100).toFixed(2) + '%' : '0.00%',
          '高负荷_总监测小区数': h.total, '高负荷_小区数': h.bad,
          '高负荷_比例': h.total > 0 ? (h.bad / h.total * 100).toFixed(2) + '%' : '0.00%',
        }
      })

      const highLoadTypeStats = Array.from(highLoadTypeMap.entries())
        .map(([type, cnt]) => ({ '高负荷类型': type, '小区数': cnt }))
        .sort((a, b) => b['小区数'] - a['小区数'])

      // ============ 五、导出Excel ============
      addLog('生成Excel文件...')
      const wb = XLSX.utils.book_new()

      if (voiceBadRows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(voiceBadRows)
        XLSX.utils.book_append_sheet(wb, ws, '语音质差小区详细')
      }
      if (g5BadRows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(g5BadRows)
        XLSX.utils.book_append_sheet(wb, ws, '5G质差小区详细')
      }
      if (highLoadBadRows.length > 0) {
        const ws = XLSX.utils.json_to_sheet(highLoadBadRows)
        XLSX.utils.book_append_sheet(wb, ws, '高负荷小区详细')
      }
      {
        const ws = XLSX.utils.json_to_sheet(cityFinalStats)
        XLSX.utils.book_append_sheet(wb, ws, '地市汇总统计')
      }
      if (highLoadTypeStats.length > 0) {
        const ws = XLSX.utils.json_to_sheet(highLoadTypeStats)
        XLSX.utils.book_append_sheet(wb, ws, '高负荷类型分布')
      }

      const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbOut as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      setResultBlob(blob)

      const voiceRatio = voiceStats.total > 0 ? (voiceStats.bad / voiceStats.total * 100).toFixed(2) : '0.00'
      const g5Ratio = g5Stats.total > 0 ? (g5Stats.bad / g5Stats.total * 100).toFixed(2) : '0.00'
      const hlRatio = highLoadStats.total > 0 ? (highLoadStats.bad / highLoadStats.total * 100).toFixed(2) : '0.00'

      setResultSummary(
        `语音质差：有效${voiceStats.total}个，质差${voiceStats.bad}个（${voiceRatio}%）\n` +
        `5G质差：有效${g5Stats.total}个，质差${g5Stats.bad}个（${g5Ratio}%）\n` +
        `高负荷：监测${highLoadStats.total}个，高负荷${highLoadStats.bad}个（${hlRatio}%）`
      )
      addLog('分析完成，可下载结果文件')
    } catch (e: any) {
      addLog(`分析失败：${e.message}`)
    } finally {
      setProcessing(false)
    }
  }, [qualityFile, highloadFile, cellInfoFile, voiceTh, g5Th, highLoadTh, addLog])

  const handleDownload = useCallback(() => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = '质差小区分析结果（语音+5G通用+高负荷）.xlsx'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [resultBlob])

  const FileUpload = ({ label, file, setFile, accept, required }: {
    label: string, file: File | null, setFile: (f: File | null) => void, accept: string, required?: boolean
  }) => (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-[hsl(var(--foreground))] min-w-[180px]">
        {required && <span className="text-red-500 mr-1">*</span>}{label}
      </label>
      <div className="flex-1 flex items-center gap-2">
        <button onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = accept
          input.onchange = (e: any) => setFile(e.target.files?.[0] || null)
          input.click()
        }} className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:border-[hsl(var(--primary))] transition-colors bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
          选择文件
        </button>
        {file && (
          <div className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="truncate max-w-[200px]">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-[hsl(var(--muted-foreground))] hover:text-red-500 ml-1">
              <AlertCircle className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm mb-6 text-[hsl(var(--muted-foreground))]">
        <Link href="/" className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />首页
        </Link>
        <ChevronRightIcon className="w-4 h-4" />
        <span>数据处理</span>
        <ChevronRightIcon className="w-4 h-4" />
        <span className="text-[hsl(var(--foreground))] font-medium">质差小区指标计算</span>
      </nav>

      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm mb-6">
        <div className="p-6 sm:p-8 border-b border-[hsl(var(--border))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">质差小区指标计算</h2>
                <p className="text-[hsl(var(--muted-foreground))] mt-1">语音质差 + 5G通用质差 + 高负荷小区综合分析</p>
              </div>
            </div>
            <button onClick={() => toggleFav('cell-analysis')} className={`icon-btn shrink-0 ${fav ? 'text-amber-400' : 'text-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]'}`}>
              <Star className={`w-5 h-5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 文件上传 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">上传数据文件</h3>
              <FileUpload label="质差类指标文件（Excel）" file={qualityFile} setFile={setQualityFile} accept=".xlsx,.xls" required />
              <FileUpload label="高负荷指标文件（Excel）" file={highloadFile} setFile={setHighloadFile} accept=".xlsx,.xls" required />
              <FileUpload label="小区基础信息（CSV，可选）" file={cellInfoFile} setFile={setCellInfoFile} accept=".csv" />
            </div>

            {/* 阈值设置 */}
            <div>
              <button onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--primary))] hover:opacity-80 transition-opacity">
                <Settings2 className="w-4 h-4" />
                阈值配置
                {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showSettings && (
                <div className="mt-4 space-y-4 p-4 rounded-xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                  {/* 语音阈值 */}
                  <div>
                    <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2">语音质差阈值</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">接入次数≥</label>
                        <input type="number" value={voiceTh.accessCnt} onChange={e => setVoiceTh({ ...voiceTh, accessCnt: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">释放次数≥</label>
                        <input type="number" value={voiceTh.releaseCnt} onChange={e => setVoiceTh({ ...voiceTh, releaseCnt: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">建立成功率&lt;</label>
                        <input type="number" step="0.01" value={voiceTh.setupSucc} onChange={e => setVoiceTh({ ...voiceTh, setupSucc: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">掉线率&gt;</label>
                        <input type="number" step="0.001" value={voiceTh.dropRate} onChange={e => setVoiceTh({ ...voiceTh, dropRate: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">切换成功率&lt;</label>
                        <input type="number" step="0.01" value={voiceTh.hoSucc} onChange={e => setVoiceTh({ ...voiceTh, hoSucc: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">丢包率&gt;</label>
                        <input type="number" step="0.01" value={voiceTh.loss} onChange={e => setVoiceTh({ ...voiceTh, loss: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                    </div>
                  </div>

                  {/* 5G阈值 */}
                  <div>
                    <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2">5G通用质差阈值</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">接入次数≥</label>
                        <input type="number" value={g5Th.accessCnt} onChange={e => setG5Th({ ...g5Th, accessCnt: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">释放次数≥</label>
                        <input type="number" value={g5Th.releaseCnt} onChange={e => setG5Th({ ...g5Th, releaseCnt: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">接入成功率&lt;</label>
                        <input type="number" step="0.01" value={g5Th.accessSucc} onChange={e => setG5Th({ ...g5Th, accessSucc: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">掉线率&gt;</label>
                        <input type="number" step="0.01" value={g5Th.ueDropRate} onChange={e => setG5Th({ ...g5Th, ueDropRate: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">目标频段</label>
                        <input type="text" value={g5Th.bands.join(',')} onChange={e => setG5Th({ ...g5Th, bands: e.target.value.split(',').map(Number).filter(n => !isNaN(n)) })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                    </div>
                  </div>

                  {/* 高负荷阈值 */}
                  <div>
                    <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2">高负荷阈值</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-[hsl(var(--muted-foreground))]">PRB占用率&gt;</label>
                        <input type="number" step="0.01" value={highLoadTh.prbUtil} onChange={e => setHighLoadTh({ ...highLoadTh, prbUtil: +e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[hsl(var(--border))] text-xs bg-white dark:bg-[hsl(var(--card))] text-[hsl(var(--foreground))]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 运行按钮 */}
            <button onClick={handleRun} disabled={processing || !qualityFile || !highloadFile}
              className="w-full py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" />分析中...</> : <><AlertTriangle className="w-4 h-4" />开始分析</>}
            </button>

            {/* 结果 */}
            {resultSummary && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">分析结果</h4>
                <pre className="text-xs text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap">{resultSummary}</pre>
                <button onClick={handleDownload}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:opacity-90 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />下载分析结果Excel
                </button>
              </div>
            )}

            {/* 日志 */}
            {logs.length > 0 && (
              <div className="p-4 rounded-xl bg-[hsl(var(--muted))] max-h-48 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="text-xs text-[hsl(var(--muted-foreground))] font-mono py-0.5 flex items-start gap-1.5">
                    {log.includes('失败') ? <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />}
                    {log}
                  </div>
                ))}
              </div>
            )}

            {/* 使用说明 */}
            <div className="p-4 rounded-xl bg-[hsl(var(--muted))] text-sm text-[hsl(var(--muted-foreground))] space-y-2">
              <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">使用说明</h4>
              <div className="text-[11px] space-y-1">
                <p><strong className="text-[hsl(var(--foreground))]">必传文件：</strong></p>
                <p>• 质差类指标文件（Excel）：包含VoNR语音指标和5G通用指标，粒度为自定义全时间</p>
                <p>• 高负荷指标文件（Excel）：包含PRB占用率、流量、用户数等指标，粒度为1小时</p>
                <p><strong className="text-[hsl(var(--foreground))]">可选文件：</strong></p>
                <p>• 小区基础信息（CSV）：包含masterOperatorId、carrierBandwidth、aauChannel、duplexMode字段</p>
                <p><strong className="text-[hsl(var(--foreground))]">自动识别列名：</strong>系统会自动匹配包含关键字的列名，无需手动指定</p>
                <p><strong className="text-[hsl(var(--foreground))]">输出内容：</strong></p>
                <p>• 语音质差小区详细（低接通/高掉线/低切换/高丢包）</p>
                <p>• 5G质差小区详细（低速率/低接入/高掉线）</p>
                <p>• 高负荷小区详细（按频段+天线类型判断）</p>
                <p>• 地市汇总统计 + 高负荷类型分布</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
