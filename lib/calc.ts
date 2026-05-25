import * as XLSX from 'xlsx'
import { useKpiStore } from './store'

function getColIndexById(id: string): number {
  const { headers } = useKpiStore.getState()
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].startsWith(id + ':') || headers[i] === id) return i
  }
  return -1
}

function parseValue(v: any): number | null {
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'number') return v
  const s = String(v).replace(/,/g, '').replace(/%/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export function evaluateFormula(formula: string, rowIdx: number) {
  if (!formula) return null
  const { rows } = useKpiStore.getState()
  const row = rows[rowIdx]
  if (!row) return null

  const idPattern = /C?\d+/g
  const ids = [...new Set(formula.match(idPattern) || [])]
  const values: Record<string, number | null> = {}

  for (const id of ids) {
    const colIdx = getColIndexById(id)
    values[id] = colIdx >= 0 ? parseValue(row[colIdx]) : null
  }

  let jsExpr = formula
  for (const id of ids) {
    const v = values[id]
    if (v === null) return { result: null, error: `缺少数据: ${id}`, steps: [] }
    jsExpr = jsExpr.replace(new RegExp('\\b' + id + '\\b', 'g'), String(v))
  }

  try {
    const result = Function('"use strict"; return (' + jsExpr + ')')()
    const steps = ids.map(id => `${id}=${values[id]}`)
    return {
      result: result === Infinity || result === -Infinity || isNaN(result) ? null : result,
      steps,
      expr: jsExpr,
    }
  } catch (e: any) {
    return { result: null, error: e.message, steps: [] }
  }
}

export function calcAll(rowIdx: number): CalcResult[] {
  const { metrics } = useKpiStore.getState()
  const results: CalcResult[] = []
  const seen = new Set()

  for (const def of metrics) {
    const id = def.id
    if (!id || seen.has(id)) continue
    seen.add(id)
    if (!def.formula) continue
    const r = evaluateFormula(def.formula, rowIdx)
    results.push({ id, desc: def.desc, formula: def.formula, ...r })
  }

  return results
}

export function compareRows(rowA: number, rowB: number) {
  const a = calcAll(rowA)
  const b = calcAll(rowB)
  const mapA = Object.fromEntries(a.map(r => [r.id, r.result]))
  const mapB = Object.fromEntries(b.map(r => [r.id, r.result]))
  const allIds = [...new Set([...Object.keys(mapA), ...Object.keys(mapB)])]
  const diffs: any[] = []

  for (const id of allIds) {
    const av = mapA[id], bv = mapB[id]
    if (av === null || bv === null || av === undefined || bv === undefined) continue
    const diff = bv - av
    diffs.push({
      id,
      a: av,
      b: bv,
      diff,
      pct: av !== 0 ? parseFloat(((diff / Math.abs(av)) * 100).toFixed(2)) : 0,
    })
  }

  const { rows } = useKpiStore.getState()
  return {
    nameA: `${rows[rowA]?.[5] || ''} - ${rows[rowA]?.[10] || ''}`,
    nameB: `${rows[rowB]?.[5] || ''} - ${rows[rowB]?.[10] || ''}`,
    diffs,
  }
}

export function parseExcel(buffer: ArrayBuffer) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet0 = wb.Sheets[wb.SheetNames[0]]
  const sheetM = wb.Sheets[wb.SheetNames[1]]

  const raw0 = XLSX.utils.sheet_to_json(sheet0, { header: 1 })
  const headers = raw0[0] as string[]
  const dataRows = raw0.slice(1)

  const rawM = XLSX.utils.sheet_to_json(sheetM, { header: 1 })
  const mHeaders = rawM[0] as string[]
  const metricList: MetricDef[] = []

  for (let i = 1; i < rawM.length; i++) {
    const r = rawM[i]
    const id = r[0]
    if (!id || metricList.some(m => m.id === id)) continue
    metricList.push({
      id: String(id),
      desc: r[1] || '',
      formula: r[2] || '',
      status: r[3] || '',
    })
  }

  return { headers, rows: dataRows, metrics: metricList }
}
