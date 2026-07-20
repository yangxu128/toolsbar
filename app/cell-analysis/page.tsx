'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, Star, ChevronRight as ChevronRightIcon, Download, Settings2, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, ChevronDown, ChevronUp, X, RotateCcw, Info } from 'lucide-react'
import { useFavStore } from '@/lib/fav-store'
import UploadPanel from '@/components/upload-panel'

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
    const exact = headers.find(h => h === kw)
    if (exact) return exact
  }
  for (const kw of keywords) {
    const found = headers.find(h => h.includes(kw))
    if (found) return found
  }
  return null
}

function findColIdx(headers: string[], keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex(h => h.includes(kw))
    if (idx >= 0) return idx
  }
  return -1
}

function yieldToMain() {
  return new Promise(r => setTimeout(r, 0))
}

interface RootCauseCols {
  qosFail: Record<string, string | null>
  ctxRelease: Record<string, string | null>
  reestablishFail: Record<string, string | null>
  rrcFail: Record<string, string | null>
  coverage: Record<string, string | null>
  rrcSetupSucc: string | null
  ngSetupSucc: string | null
  qosSetupSucc: string | null
  dropRate: string | null
  srsRlf: string | null
}

function analyzeRootCause(r: any, cols: RootCauseCols, type: 'access' | 'drop'): string {
  const causes: string[] = []
  const N = (v: any) => { const n = toNum(v); return isNaN(n) ? 0 : n }

  if (type === 'access') {
    const qosFails: { key: string; val: number; cause: string }[] = []
    for (const [k, col] of Object.entries(cols.qosFail)) {
      if (col) {
        const v = N(r[col])
        if (v > 0) qosFails.push({ key: k, val: v, cause: getQoSFailCause(k) })
      }
    }
    qosFails.sort((a, b) => b.val - a.val)
    if (qosFails.length > 0 && qosFails[0].val > 0) {
      causes.push(`QoS Flow建立失败Top原因：${qosFails[0].cause}（${qosFails[0].val}次）`)
    }

    if (cols.rrcFail.timer && N(r[cols.rrcFail.timer]) > 0) causes.push('RRC建立失败-定时器超时：核查T300/AliceBar参数及无线环境')
    if (cols.rrcFail.admit && N(r[cols.rrcFail.admit]) > 0) causes.push('RRC建立失败-接纳失败：核查接纳控制门限参数')
    if (cols.rrcFail.other && N(r[cols.rrcFail.other]) > 0) causes.push('RRC建立失败-其它原因：无线环境排查')

    if (cols.ngSetupSucc) {
      const ngSucc = toNum(r[cols.ngSetupSucc])
      if (!isNaN(ngSucc) && ngSucc < 95) causes.push('NG接口信令连接建立成功率低：核查NG链路闪断及核心网信令防冲击')
    }
  }

  if (type === 'drop') {
    const ctxFails: { key: string; val: number; cause: string }[] = []
    for (const [k, col] of Object.entries(cols.ctxRelease)) {
      if (col) {
        const v = N(r[col])
        if (v > 0) ctxFails.push({ key: k, val: v, cause: getCtxReleaseCause(k) })
      }
    }
    ctxFails.sort((a, b) => b.val - a.val)
    if (ctxFails.length > 0 && ctxFails[0].val > 0) {
      const top = ctxFails[0]
      let cause = `掉线Top原因：${top.cause}（${top.val}次）`
      if (top.key === 'rlf' && cols.srsRlf) {
        const srsRatio = N(r[cols.srsRlf]) / (top.val || 1) * 100
        if (srsRatio > 30) cause += `；SRS拔卡占比${srsRatio.toFixed(0)}%>30%，疑似终端异常`
      }
      causes.push(cause)
    }

    if (cols.reestablishFail.other && N(r[cols.reestablishFail.other]) > 0) causes.push('重建立失败-其他原因：无线环境排查')
    if (cols.reestablishFail.timeout && N(r[cols.reestablishFail.timeout]) > 0) causes.push('重建立失败-定时器超时：无线环境排查')
    if (cols.reestablishFail.admit && N(r[cols.reestablishFail.admit]) > 0) causes.push('重建立失败-接纳失败：参考接纳失败分析')
  }

  const coverageCauses: string[] = []
  if (cols.coverage.weakCover) {
    const v = toNum(r[cols.coverage.weakCover])
    if (!isNaN(v) && v >= 20) coverageCauses.push(`下行弱覆盖（RSRP<=-108占比${v.toFixed(1)}%）`)
  }
  if (cols.coverage.overCover) {
    const v = toNum(r[cols.coverage.overCover])
    if (!isNaN(v) && v >= 30) coverageCauses.push(`下行过覆盖（TA>800m占比${v.toFixed(1)}%）`)
  }
  if (cols.coverage.overlapCover) {
    const v = toNum(r[cols.coverage.overlapCover])
    if (!isNaN(v) && v >= 20) coverageCauses.push(`下行重叠覆盖（${v.toFixed(1)}%）`)
  }
  if (cols.coverage.weakUlCover) {
    const v = toNum(r[cols.coverage.weakUlCover])
    if (!isNaN(v) && v >= 20) coverageCauses.push(`上行弱覆盖（路损>135占比${v.toFixed(1)}%）`)
  }
  if (cols.coverage.puschIntf || cols.coverage.pucchIntf) {
    const pusch = cols.coverage.puschIntf ? toNum(r[cols.coverage.puschIntf]) : NaN
    const pucch = cols.coverage.pucchIntf ? toNum(r[cols.coverage.pucchIntf]) : NaN
    if ((!isNaN(pusch) && pusch > -95) || (!isNaN(pucch) && pucch > -95)) {
      coverageCauses.push(`上行干扰（PUSCH:${isNaN(pusch) ? 'N/A' : pusch.toFixed(1)}dBm, PUCCH:${isNaN(pucch) ? 'N/A' : pucch.toFixed(1)}dBm）`)
    }
  }
  if (coverageCauses.length > 0) causes.push('覆盖/干扰问题：' + coverageCauses.join('，'))

  return causes.length > 0 ? causes.join('；') : '未识别到明显根因，建议上报故障分析'
}

function getQoSFailCause(key: string): string {
  const map: Record<string, string> = {
    msgErrEpsfb: '消息参数错误(EPS fallback)，核查EPSFallbackCtrl-epsfbSwitch参数',
    msgErrVor: '消息参数错误(VoNR/ViNR)，核查MobilityCtrl-voNrSwitch参数',
    sliceFailEpsfb: '切片选择失败(EPS fallback)，核查切片配置',
    sliceFailVor: '切片选择失败(VoNR/ViNR)，核查切片配置',
    flowConflictEpsfb: '流程冲突(EPS fallback)，核查voiceHandoverPriorityStgy参数',
    flowConflictVor: '流程冲突(VoNR/ViNR)，核查voiceHandoverPriorityStgy参数',
    waitReconfig: '等待重配完成超时，无线环境排查',
    transport: '传输层原因，联合核心网传输排查',
    bearerAdmit: '承载接纳失败，核查接纳参数',
    sliceResource: '切片资源受限，上报故障',
    otherInit: '其它原因(初始)，无线环境排查',
    otherVor: '其它原因(VoNR/ViNR)，无线环境排查',
    otherEpsfb: '其它原因(EPS fallback)，无线环境排查',
    msgErrInit: '消息参数错误(初始)，核查参数配置',
  }
  return map[key] || key
}

function getCtxReleaseCause(key: string): string {
  const map: Record<string, string> = {
    rlf: 'RLF引发释放，排查终端SRS/RLF定时器/无线环境',
    hoFail: '切换失败引发释放，参考移动性指标分析',
    airFail: '空口失败引发释放，无线环境排查',
    other: '其它原因引发释放，排查切片配置及无线环境',
    reestablishFail: '重建立失败引发释放，分析重建立子计数器',
    normal: '正常释放，无线环境排查',
  }
  return map[key] || key
}

function buildRows(rawRows: any[][], headers: string[], neededCols: string[]): any[] {
  const colIndices = neededCols.map(name => headers.indexOf(name)).filter(i => i >= 0)
  const result: any[] = []
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    const obj: any = {}
    for (const ci of colIndices) {
      obj[headers[ci]] = row[ci] !== undefined && row[ci] !== null ? row[ci] : ''
    }
    result.push(obj)
  }
  return result
}

function toNum(v: any): number {
  if (v === '' || v === null || v === undefined) return NaN
  return Number(v)
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
  const [calcQuality, setCalcQuality] = useState(true)
  const [calcHighload, setCalcHighload] = useState(true)
  const [voiceTh, setVoiceTh] = useState<VoiceThresholds>(defaultVoice)
  const [g5Th, setG5Th] = useState<G5Thresholds>(defaultG5)
  const [highLoadTh, setHighLoadTh] = useState<HighLoadThresholds>(defaultHighLoad)
  const [resultSummary, setResultSummary] = useState<string>('')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [progress, setProgress] = useState(0)
  const cancelRef = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem('cell-analysis-thresholds')
    if (saved) {
      try {
        const t = JSON.parse(saved)
        if (t.voice) setVoiceTh(t.voice)
        if (t.g5) setG5Th(t.g5)
        if (t.highLoad) setHighLoadTh(t.highLoad)
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('cell-analysis-thresholds', JSON.stringify({ voice: voiceTh, g5: g5Th, highLoad: highLoadTh }))
  }, [voiceTh, g5Th, highLoadTh])

  const resetThresholds = useCallback(() => {
    setVoiceTh(defaultVoice)
    setG5Th(defaultG5)
    setHighLoadTh(defaultHighLoad)
  }, [])

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const handleRun = useCallback(async () => {
    if (calcQuality && !qualityFile) {
      addLog('请上传质差类指标文件，或取消勾选质差计算')
      return
    }
    if (calcHighload && !highloadFile) {
      addLog('请上传高负荷指标文件，或取消勾选高负荷计算')
      return
    }
    if (!calcQuality && !calcHighload) {
      addLog('请至少选择一项计算内容')
      return
    }
    setProcessing(true)
    setLogs([])
    setResultSummary('')
    setResultBlob(null)
    setProgress(0)
    cancelRef.current = false

    try {
      const XLSX = await import('xlsx')
      let qHeaders: string[] = []
      let hHeaders: string[] = []
      let qRaw: any[][] = []
      let hRaw: any[][] = []

      if (calcQuality && qualityFile) {
        addLog('读取质差指标文件...')
        setProgress(10)
        await yieldToMain()
        const qBuf = await qualityFile.arrayBuffer()
        const qWb = XLSX.read(qBuf, { type: 'array' })
        const qWs = qWb.Sheets[qWb.SheetNames[0]]
        qRaw = XLSX.utils.sheet_to_json(qWs, { header: 1 })
        qHeaders = (qRaw[0] || []).map((h: any) => String(h || ''))
      }

      if (calcHighload && highloadFile) {
        addLog('读取高负荷指标文件...')
        setProgress(20)
        await yieldToMain()
        const hBuf = await highloadFile.arrayBuffer()
        const hWb = XLSX.read(hBuf, { type: 'array' })
        const hWs = hWb.Sheets[hWb.SheetNames[0]]
        hRaw = XLSX.utils.sheet_to_json(hWs, { header: 1 })
        hHeaders = (hRaw[0] || []).map((h: any) => String(h || ''))
      }

      // 识别列名（与Python完全一致）
      const colSubnet = findCol(qHeaders, ['子网名称']) || findCol(hHeaders, ['子网名称'])
      const colMasterId = findCol(qHeaders, ['masterOperatorId']) || findCol(hHeaders, ['masterOperatorId'])
      const colVoiceAccess = findCol(qHeaders, ['VONR语音建立请求次数_New_1652687181493', 'VONR语音建立请求次数', '语音建立请求次数', 'VoNR语音建立请求'])
      const colVoiceRelease = findCol(qHeaders, ['VoNR语音释放总数_1652687182388', 'VoNR语音释放总数', '语音释放总数', 'VoNR语音释放'])
      const colVoiceSetupSucc = findCol(qHeaders, ['VoNR语音建立成功率-55.10', 'VoNR语音建立成功率', '语音建立成功率'])
      const colVoiceDropRate = findCol(qHeaders, ['VoNR语音掉线率-55.10', 'VoNR语音掉线率', '语音掉线率'])
      const colVoiceHoSucc = findCol(qHeaders, ['VoNR语音系统内切换成功率', '语音切换成功率'])
      const colVoicePdcpUpLoss = findCol(qHeaders, ['VoNR语音上行PDCP层丢包率', '语音上行PDCP丢包率', '上行PDCP层丢包率'])
      const colVoicePdcpDnLoss = findCol(qHeaders, ['VoNR语音下行RLC层丢包率', '语音下行RLC丢包率', '下行RLC层丢包率'])
      const col5gAccessCnt = findCol(qHeaders, ['维度汇总分接入类型RRC连接建立请求次数', 'RRC连接建立请求次数'])
      const col5gReleaseCnt = findCol(qHeaders, ['UE上下文释放总次数'])
      const col5gDnRlcTraffic = findCol(qHeaders, ['下行RLC层用户面流量(MBytes)', '下行RLC层用户面流量'])
      const col5gBand = findCol(qHeaders, ['频段列表'])
      const col5gAvgSpeed = findCol(qHeaders, ['5G用户下行平均感知速率-匠心(Mbps)', '5G用户下行平均感知速率', '下行平均感知速率'])
      const col5gAccessSucc = findCol(qHeaders, ['无线接入成功率(%)', '无线接入成功率'])
      const col5gUeDropRate = findCol(qHeaders, ['UE上下文掉线率(%)', 'UE上下文掉线率'])

      const colRrcSetupSucc = findCol(qHeaders, ['667000:RRC连接建立成功率', 'RRC连接建立成功率'])
      const colNgSetupSucc = findCol(qHeaders, ['667183:NG接口UE相关逻辑信令连接建立成功率', 'NG接口UE相关逻辑信令连接建立成功率'])
      const colQosSetupSucc = findCol(qHeaders, ['667014:QoS Flow建立成功率', 'QoS Flow建立成功率'])

      const rootCauseCols: RootCauseCols = {
        qosFail: {
          msgErrEpsfb: findCol(qHeaders, ['C600080121']),
          msgErrVor: findCol(qHeaders, ['C600080120']),
          msgErrInit: findCol(qHeaders, ['C600080109']),
          sliceFailEpsfb: findCol(qHeaders, ['C600080119']),
          sliceFailVor: findCol(qHeaders, ['C600080118']),
          flowConflictEpsfb: findCol(qHeaders, ['C600080111']),
          flowConflictVor: findCol(qHeaders, ['C600080115']),
          waitReconfig: findCol(qHeaders, ['C600080108']),
          transport: findCol(qHeaders, ['C600080106']),
          bearerAdmit: findCol(qHeaders, ['C600080105']),
          sliceResource: findCol(qHeaders, ['C600080114']),
          otherInit: findCol(qHeaders, ['C600080107']),
          otherVor: findCol(qHeaders, ['C600080122']),
          otherEpsfb: findCol(qHeaders, ['C600080123']),
        },
        ctxRelease: {
          rlf: findCol(qHeaders, ['C600050029']),
          hoFail: findCol(qHeaders, ['C600050010']),
          airFail: findCol(qHeaders, ['C600050011']),
          other: findCol(qHeaders, ['C600050014']),
          reestablishFail: findCol(qHeaders, ['C600050036']),
          normal: findCol(qHeaders, ['C600050037']),
        },
        reestablishFail: {
          other: findCol(qHeaders, ['C616860021']),
          fallback: findCol(qHeaders, ['C616860020']),
          timeout: findCol(qHeaders, ['C616860018']),
          admit: findCol(qHeaders, ['C616860019']),
        },
        rrcFail: {
          timer: findCol(qHeaders, ['RRC连接建立失败次数-定时器超时']),
          admit: findCol(qHeaders, ['RRC连接建立失败次数-接纳失败']),
          other: findCol(qHeaders, ['RRC连接建立失败次数-其它原因']),
        },
        coverage: {
          weakCover: findCol(qHeaders, ['服务小区SSB测量RSRP<=-108dBm占比', 'RSRP<=-108']),
          overCover: findCol(qHeaders, ['TA大于800米占比', 'TA大于800']),
          overlapCover: findCol(qHeaders, ['重叠覆盖率']),
          weakUlCover: findCol(qHeaders, ['路损大于135的占比', '路损大于135']),
          puschIntf: findCol(qHeaders, ['C616650045']),
          pucchIntf: findCol(qHeaders, ['C616650047']),
        },
        rrcSetupSucc: colRrcSetupSucc,
        ngSetupSucc: colNgSetupSucc,
        qosSetupSucc: colQosSetupSucc,
        dropRate: col5gUeDropRate,
        srsRlf: findCol(qHeaders, ['C610060010']),
      }

      const hColSubnet = findCol(hHeaders, ['子网名称'])
      const hColMasterId = findCol(hHeaders, ['masterOperatorId'])
      const colPrbUtil = findCol(hHeaders, ['下行PRB平均占用率'])
      const colDnTraffic = findCol(hHeaders, ['下行RLC层用户面流量(MBytes)', '下行RLC层用户面流量'])
      const colRrcUsers = findCol(hHeaders, ['RRC连接平均连接用户数'])
      const colBand = findCol(hHeaders, ['频段列表'])

      addLog('列名自动识别完成')
      setProgress(30)
      addLog(`语音接入次数: ${colVoiceAccess || '未找到'}`)
      addLog(`语音释放次数: ${colVoiceRelease || '未找到'}`)
      addLog(`语音建立成功率: ${colVoiceSetupSucc || '未找到'}`)
      addLog(`语音掉线率: ${colVoiceDropRate || '未找到'}`)
      addLog(`语音切换成功率: ${colVoiceHoSucc || '未找到'}`)
      addLog(`5G接入次数: ${col5gAccessCnt || '未找到'}`)
      addLog(`5G释放次数: ${col5gReleaseCnt || '未找到'}`)
      addLog(`5G速率: ${col5gAvgSpeed || '未找到'}`)
      addLog(`5G接入成功率: ${col5gAccessSucc || '未找到'}`)
      addLog(`5G掉线率: ${col5gUeDropRate || '未找到'}`)
      addLog(`PRB占用率: ${colPrbUtil || '未找到'}`)

      // 只提取需要的列，减少内存
      const rootCauseAllCols = [
        ...Object.values(rootCauseCols.qosFail),
        ...Object.values(rootCauseCols.ctxRelease),
        ...Object.values(rootCauseCols.reestablishFail),
        ...Object.values(rootCauseCols.rrcFail),
        ...Object.values(rootCauseCols.coverage),
        rootCauseCols.rrcSetupSucc, rootCauseCols.ngSetupSucc, rootCauseCols.qosSetupSucc, rootCauseCols.srsRlf,
      ].filter((c): c is string => c !== null)
      const qNeededCols = [colSubnet, colMasterId, colVoiceAccess, colVoiceRelease, colVoiceSetupSucc, colVoiceDropRate, colVoiceHoSucc, colVoicePdcpUpLoss, colVoicePdcpDnLoss, col5gAccessCnt, col5gReleaseCnt, col5gDnRlcTraffic, col5gBand, col5gAvgSpeed, col5gAccessSucc, col5gUeDropRate, ...rootCauseAllCols].filter((c): c is string => c !== null)
      const hNeededCols = [hColSubnet, hColMasterId, colPrbUtil, colDnTraffic, colRrcUsers, colBand].filter((c): c is string => c !== null)

      const dfQuality = calcQuality ? buildRows(qRaw, qHeaders, qNeededCols) : []
      await yieldToMain()
      if (calcQuality) addLog(`质差文件：${dfQuality.length}行，${qNeededCols.length}列`)
      setProgress(40)
      await yieldToMain()

      const dfHighload = calcHighload ? buildRows(hRaw, hHeaders, hNeededCols) : []
      await yieldToMain()
      if (calcHighload) addLog(`高负荷文件：${dfHighload.length}行，${hNeededCols.length}列`)
      setProgress(50)

      // 小区基础信息
      let cellInfoMap = new Map<string, any>()
      if (cellInfoFile) {
        addLog('读取小区基础信息...')
        await yieldToMain()
        const cBuf = await cellInfoFile.arrayBuffer()
        const cWb = XLSX.read(cBuf, { type: 'array' })
        const cWs = cWb.Sheets[cWb.SheetNames[0]]
        const cRaw: any[][] = XLSX.utils.sheet_to_json(cWs, { header: 1 })
        if (cRaw.length > 0) {
          const cHeaders = cRaw[0].map((h: any) => String(h || ''))
          const ciMid = findCol(cHeaders, ['masterOperatorId'])
          const ciBw = findCol(cHeaders, ['carrierBandwidth'])
          const ciAau = findCol(cHeaders, ['aauChannel'])
          const ciDuplex = findCol(cHeaders, ['duplexMode'])
          const cNeeded = [ciMid, ciBw, ciAau, ciDuplex].filter((c): c is string => c !== null)
          const cData = buildRows(cRaw, cHeaders, cNeeded)
          for (const r of cData) {
            const k = String(r[ciMid!] || '')
            if (k && !cellInfoMap.has(k)) cellInfoMap.set(k, r)
          }
        }
        addLog(`小区基础信息：${cellInfoMap.size}条`)
        await yieldToMain()
      }

      // 关联基础信息（与Python merge一致）
      if (cellInfoMap.size > 0 && colMasterId) {
        for (const r of dfQuality) {
          const info = cellInfoMap.get(String(r[colMasterId]))
          if (info) { r['carrierBandwidth'] = info['carrierBandwidth']; r['aauChannel'] = info['aauChannel']; r['duplexMode'] = info['duplexMode'] }
        }
        for (const r of dfHighload) {
          const info = cellInfoMap.get(String(r[hColMasterId || colMasterId]))
          if (info) { r['carrierBandwidth'] = info['carrierBandwidth']; r['aauChannel'] = info['aauChannel']; r['duplexMode'] = info['duplexMode'] }
        }
        addLog('已关联小区基础信息')
        await yieldToMain()
      }

      const N = (v: any) => { const n = toNum(v); return isNaN(n) ? 0 : n }
      const getCity = (r: any, col: string | null) => col ? String(r[col] || '未知').substring(0, 2).trim() || '未知' : '未知'

      // ============ 一、语音质差 ============
      let voiceBadRows: any[] = []
      let voiceStats = { total: 0, lowSetup: 0, highDrop: 0, lowHo: 0, highLoss: 0, bad: 0 }
      const voiceCityMap = new Map<string, { total: number, lowSetup: number, highDrop: number, lowHo: number, highLoss: number, bad: number }>()

      if (calcQuality) {
        addLog('开始语音质差分析...')
        setProgress(60)
        await yieldToMain()
        const hasVoiceCols = colVoiceSetupSucc && colVoiceDropRate && colVoiceHoSucc && colVoicePdcpUpLoss && colVoicePdcpDnLoss

      if (hasVoiceCols) {
        for (let i = 0; i < dfQuality.length; i++) {
          if (cancelRef.current) { addLog('分析已取消'); setProcessing(false); return }
          const r = dfQuality[i]
          const ac = colVoiceAccess ? N(r[colVoiceAccess]) : 0
          const rc = colVoiceRelease ? N(r[colVoiceRelease]) : 0
          if (ac < voiceTh.accessCnt || rc < voiceTh.releaseCnt) continue
          voiceStats.total++

          const city = getCity(r, colSubnet)
          const setupSucc = toNum(r[colVoiceSetupSucc!])
          const dropRate = toNum(r[colVoiceDropRate!])
          const hoSucc = toNum(r[colVoiceHoSucc!])
          const pdcpUpLoss = toNum(r[colVoicePdcpUpLoss!])
          const pdcpDnLoss = toNum(r[colVoicePdcpDnLoss!])

          const lowSetup = !isNaN(setupSucc) && setupSucc < voiceTh.setupSucc
          const highDrop = !isNaN(dropRate) && dropRate > voiceTh.dropRate
          const lowHo = !isNaN(hoSucc) && hoSucc < voiceTh.hoSucc
          const highLoss = (!isNaN(pdcpUpLoss) && pdcpUpLoss > voiceTh.loss) || (!isNaN(pdcpDnLoss) && pdcpDnLoss > voiceTh.loss)
          const isBad = lowSetup || highDrop || lowHo || highLoss

          if (lowSetup) voiceStats.lowSetup++
          if (highDrop) voiceStats.highDrop++
          if (lowHo) voiceStats.lowHo++
          if (highLoss) voiceStats.highLoss++
          if (isBad) {
            voiceStats.bad++
            const out: any = { ...r }
            out['语音-低接通'] = lowSetup; out['语音-高掉线'] = highDrop; out['语音-低切换'] = lowHo; out['语音-高丢包'] = highLoss; out['语音-质差小区'] = isBad
            out['根因分析'] = analyzeRootCause(r, rootCauseCols, highDrop ? 'drop' : 'access')
            voiceBadRows.push(out)
          }

          if (!voiceCityMap.has(city)) voiceCityMap.set(city, { total: 0, lowSetup: 0, highDrop: 0, lowHo: 0, highLoss: 0, bad: 0 })
          const cs = voiceCityMap.get(city)!
          cs.total++
          if (lowSetup) cs.lowSetup++; if (highDrop) cs.highDrop++; if (lowHo) cs.lowHo++; if (highLoss) cs.highLoss++; if (isBad) cs.bad++

          if (i > 0 && i % 5000 === 0) await yieldToMain()
        }
      }
      addLog(`语音质差分析完成：有效${voiceStats.total}个，质差${voiceStats.bad}个`)
      } // end calcQuality

      // ============ 二、5G通用质差 ============
      let g5BadRows: any[] = []
      let g5Stats = { total: 0, lowSpeed: 0, lowAccess: 0, highDrop: 0, bad: 0 }
      const g5CityMap = new Map<string, { total: number, lowSpeed: number, lowAccess: number, highDrop: number, bad: number }>()

      if (calcQuality) {
        addLog('开始5G通用质差分析...')
        setProgress(70)
        await yieldToMain()

      for (let i = 0; i < dfQuality.length; i++) {
        if (cancelRef.current) { addLog('分析已取消'); setProcessing(false); return }
        const r = dfQuality[i]
        const ac = col5gAccessCnt ? N(r[col5gAccessCnt]) : 0
        const rc = col5gReleaseCnt ? N(r[col5gReleaseCnt]) : 0
        const tf = col5gDnRlcTraffic ? N(r[col5gDnRlcTraffic]) : 0
        const bd = col5gBand ? r[col5gBand] : null
        const bdNum = toNum(bd)
        const bandMatch = !isNaN(bdNum) ? g5Th.bands.includes(bdNum) : (bd !== null && bd !== '' && g5Th.bands.some(b => String(bd).includes(String(b))))
        if (ac < g5Th.accessCnt || rc < g5Th.releaseCnt || tf <= g5Th.dnRlcTraffic || !bandMatch) continue
        g5Stats.total++

        const city = getCity(r, colSubnet)
        const avgSpeed = col5gAvgSpeed ? toNum(r[col5gAvgSpeed]) : NaN
        const duplexMode = String(r['duplexMode'] || '')
        const bandwidth = N(r['carrierBandwidth'])
        const threshold = calcSpeedThreshold(duplexMode, bandwidth)
        const lowSpeed = !isNaN(avgSpeed) && threshold !== null && avgSpeed < threshold
        const accessSucc = col5gAccessSucc ? toNum(r[col5gAccessSucc]) : NaN
        const ueDropRate = col5gUeDropRate ? toNum(r[col5gUeDropRate]) : NaN
        const lowAccess = !isNaN(accessSucc) && accessSucc < g5Th.accessSucc
        const highDrop = !isNaN(ueDropRate) && ueDropRate > g5Th.ueDropRate
        const isBad = lowSpeed || lowAccess || highDrop

        if (lowSpeed) g5Stats.lowSpeed++
        if (lowAccess) g5Stats.lowAccess++
        if (highDrop) g5Stats.highDrop++
        if (isBad) {
          g5Stats.bad++
          const out: any = { ...r }
          out['速率门限(Mbps)'] = threshold; out['5G-低速率'] = lowSpeed; out['5G-低接入'] = lowAccess; out['5G-高掉线'] = highDrop; out['5G-质差小区'] = isBad
          out['根因分析'] = analyzeRootCause(r, rootCauseCols, highDrop ? 'drop' : 'access')
          g5BadRows.push(out)
        }

        if (!g5CityMap.has(city)) g5CityMap.set(city, { total: 0, lowSpeed: 0, lowAccess: 0, highDrop: 0, bad: 0 })
        const cs = g5CityMap.get(city)!
        cs.total++
        if (lowSpeed) cs.lowSpeed++; if (lowAccess) cs.lowAccess++; if (highDrop) cs.highDrop++; if (isBad) cs.bad++

        if (i > 0 && i % 5000 === 0) await yieldToMain()
      }
      addLog(`5G质差分析完成：有效${g5Stats.total}个，质差${g5Stats.bad}个`)
      } // end calcQuality

      // ============ 三、高负荷 ============
      const highLoadTypeMap = new Map<string, number>()
      let highLoadBadRows: any[] = []
      const hlCityMap = new Map<string, { total: number, bad: number }>()
      const hlSubnet = hColSubnet || colSubnet
      let highLoadStats = { total: 0, bad: 0 }

      if (calcHighload) {
        addLog('开始高负荷小区分析...')
        setProgress(80)
        await yieldToMain()
        highLoadStats.total = dfHighload.length

      for (let i = 0; i < dfHighload.length; i++) {
        if (cancelRef.current) { addLog('分析已取消'); setProcessing(false); return }
        const r = dfHighload[i]
        const city = getCity(r, hlSubnet)
        const prb = colPrbUtil ? toNum(r[colPrbUtil]) : NaN
        if (isNaN(prb) || prb <= highLoadTh.prbUtil) {
          if (!hlCityMap.has(city)) hlCityMap.set(city, { total: 0, bad: 0 })
          hlCityMap.get(city)!.total++
          continue
        }

        const band = colBand ? N(r[colBand]) : 0
        const aau = String(r['aauChannel'] || '')
        const bw = N(r['carrierBandwidth'])
        const trafficGb = colDnTraffic ? N(r[colDnTraffic]) / 1024 : 0
        const rrcUsers = colRrcUsers ? N(r[colRrcUsers]) : 0

        let thresholdDict: Record<string, [number, number]> | null = null
        let category = ''
        if (band === 78) { thresholdDict = highLoadTh['3_5G']; category = `3.5G-${aau}` }
        else if (band === 1) {
          if (bw === 40) { thresholdDict = highLoadTh['2_1G_40M']; category = `2.1G-40M-${aau}` }
          else if (bw === 20) { thresholdDict = highLoadTh['2_1G_20M']; category = `2.1G-20M-${aau}` }
        }

        let isHighLoad = false
        if (thresholdDict && aau in thresholdDict) {
          const [tTh, uTh] = thresholdDict[aau]
          if (trafficGb >= tTh && rrcUsers >= uTh) isHighLoad = true
        }

        if (!hlCityMap.has(city)) hlCityMap.set(city, { total: 0, bad: 0 })
        hlCityMap.get(city)!.total++
        if (isHighLoad) {
          highLoadStats.bad++
          const out: any = { ...r }
          out['高负荷小区'] = true; out['高负荷类型'] = category
          highLoadBadRows.push(out)
          hlCityMap.get(city)!.bad++
          highLoadTypeMap.set(category, (highLoadTypeMap.get(category) || 0) + 1)
        }

        if (i > 0 && i % 5000 === 0) await yieldToMain()
      }
      addLog(`高负荷分析完成：监测${highLoadStats.total}个，高负荷${highLoadStats.bad}个`)
      } // end calcHighload

      // ============ 四、地市汇总 ============
      setProgress(90)
      await yieldToMain()
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
      setProgress(100)
      await yieldToMain()
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
  }, [qualityFile, highloadFile, cellInfoFile, calcQuality, calcHighload, voiceTh, g5Th, highLoadTh, addLog])

  const handleDownload = useCallback(() => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = '质差小区分析结果（语音+5G通用+高负荷）.xlsx'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [resultBlob])

  return (
    <div className="animate-fade-in-up">
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
              <Star className={`w-5 h-5 ${fav ? 'fill-current animate-heart-beat' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 计算项选择 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${calcQuality ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.03)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--muted))]'}`}>
                <input type="checkbox" checked={calcQuality} onChange={e => setCalcQuality(e.target.checked)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
                <div>
                  <div className="text-sm font-medium text-[hsl(var(--foreground))]">质差指标计算</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">语音质差 + 5G通用质差</div>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${calcHighload ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.03)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--muted))]'}`}>
                <input type="checkbox" checked={calcHighload} onChange={e => setCalcHighload(e.target.checked)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
                <div>
                  <div className="text-sm font-medium text-[hsl(var(--foreground))]">高负荷指标计算</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">PRB占用率 + 流量/用户数门限</div>
                </div>
              </label>
            </div>

            {/* 文件上传 */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-[hsl(var(--foreground))]">质差类指标文件 {calcQuality && <span className="text-red-500">{'*'}</span>}</div>
                  <UploadPanel onUpload={setQualityFile} accept=".xlsx,.xls" title="点击或拖拽上传质差类指标文件" subtitle="支持 .xlsx / .xls 格式" />
                  {qualityFile && (
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--foreground))]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="truncate" title={qualityFile.name}>{qualityFile.name}</span>
                      <button onClick={() => setQualityFile(null)} className="text-[hsl(var(--muted-foreground))] hover:text-red-500 ml-auto"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-[hsl(var(--foreground))]">高负荷指标文件 {calcHighload && <span className="text-red-500">{'*'}</span>}</div>
                  <UploadPanel onUpload={setHighloadFile} accept=".xlsx,.xls" title="点击或拖拽上传高负荷指标文件" subtitle="支持 .xlsx / .xls 格式" />
                  {highloadFile && (
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--foreground))]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="truncate" title={highloadFile.name}>{highloadFile.name}</span>
                      <button onClick={() => setHighloadFile(null)} className="text-[hsl(var(--muted-foreground))] hover:text-red-500 ml-auto"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-[hsl(var(--foreground))]">小区基础信息（可选）</div>
                  <UploadPanel onUpload={setCellInfoFile} accept=".xlsx,.xls" title="点击或拖拽上传小区基础信息文件" subtitle="支持 .xlsx / .xls 格式" />
                  {cellInfoFile && (
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--foreground))]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="truncate" title={cellInfoFile.name}>{cellInfoFile.name}</span>
                      <button onClick={() => setCellInfoFile(null)} className="text-[hsl(var(--muted-foreground))] hover:text-red-500 ml-auto"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>
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

                  <button onClick={resetThresholds}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] border border-[hsl(var(--border))] rounded-md hover:border-[hsl(var(--primary))] transition-colors">
                    <RotateCcw className="w-3 h-3" /> 重置默认值
                  </button>
                </div>
              )}
            </div>

            {/* 运行按钮 */}
            <div className="flex gap-3">
              <button onClick={handleRun} disabled={processing || (calcQuality && !qualityFile) || (calcHighload && !highloadFile) || (!calcQuality && !calcHighload)}
                className="flex-1 py-3 rounded-xl bg-[hsl(var(--primary))] text-white font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" />分析中...</> : <><AlertTriangle className="w-4 h-4" />开始分析</>}
              </button>
              {processing && (
                <button onClick={() => { cancelRef.current = true }}
                  className="px-4 py-3 rounded-xl border border-red-500/30 text-red-500 text-sm font-medium hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
                  <X className="w-4 h-4" /> 取消
                </button>
              )}
            </div>

            {/* 进度条 */}
            {processing && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                  <span>分析进度</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[hsl(var(--border))] overflow-hidden">
                  <div className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

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

            <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[hsl(var(--primary))]" />
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">使用说明</span>
              </div>
              <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                <p><strong className="text-[hsl(var(--foreground))]">功能说明：</strong>综合语音质差、5G通用质差、高负荷小区三类指标分析，自动输出质差小区清单和地市汇总。</p>
                <p><strong className="text-[hsl(var(--foreground))]">必传文件：</strong></p>
                <div className="pl-4 space-y-1">
                  <p>• <strong className="text-[hsl(var(--foreground))]">质差类指标文件（Excel）</strong>：包含 VoNR 语音指标和 5G 通用指标，粒度为自定义全时间</p>
                  <p>• <strong className="text-[hsl(var(--foreground))]">高负荷指标文件（Excel）</strong>：包含 PRB 占用率、流量、用户数等指标，粒度为 1 小时</p>
                </div>
                <p><strong className="text-[hsl(var(--foreground))]">可选文件：</strong></p>
                <div className="pl-4 space-y-1">
                  <p>• <strong className="text-[hsl(var(--foreground))]">小区基础信息（Excel）</strong>：包含 masterOperatorId、carrierBandwidth、aauChannel、duplexMode 字段，用于速率门限计算</p>
                </div>
                <p><strong className="text-[hsl(var(--foreground))]">操作步骤：</strong></p>
                <div className="pl-4 space-y-1">
                  <p>1. 上传必传的质差类和高负荷指标文件</p>
                  <p>2. 可选上传小区基础信息文件</p>
                  <p>3. 展开「阈值配置」调整语音、5G、高负荷门限（默认已设）</p>
                  <p>4. 点击「开始分析」，等待进度完成</p>
                  <p>5. 查看分析结果摘要并下载 Excel 报告</p>
                </div>
                <p><strong className="text-[hsl(var(--foreground))]">输出结果：</strong>语音质差小区详细、5G质差小区详细、高负荷小区详细、地市汇总统计、高负荷类型分布。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
