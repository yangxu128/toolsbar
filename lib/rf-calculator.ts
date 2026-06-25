export interface LteBand {
  band: number
  mode: 'FDD' | 'TDD'
  dlLow: number
  dlHigh: number
  dlEarfcnStart: number
  dlEarfcnEnd: number
  ulLow?: number
  ulHigh?: number
  ulEarfcnStart?: number
  ulEarfcnEnd?: number
}

export interface NrBand {
  band: string
  mode: 'FDD' | 'TDD'
  low: number
  high: number
  arfcnStart: number
  arfcnEnd: number
  deltaF: number
  dlLow?: number
  dlHigh?: number
  dlArfcnStart?: number
  dlArfcnEnd?: number
  ulLow?: number
  ulHigh?: number
  ulArfcnStart?: number
  ulArfcnEnd?: number
}

export const LTE_BANDS: LteBand[] = [
  { band: 1, mode: 'FDD', dlLow: 2110, dlHigh: 2170, dlEarfcnStart: 0, dlEarfcnEnd: 599, ulLow: 1920, ulHigh: 1980, ulEarfcnStart: 18000, ulEarfcnEnd: 18599 },
  { band: 2, mode: 'FDD', dlLow: 1930, dlHigh: 1990, dlEarfcnStart: 600, dlEarfcnEnd: 1199, ulLow: 1850, ulHigh: 1910, ulEarfcnStart: 18600, ulEarfcnEnd: 19199 },
  { band: 3, mode: 'FDD', dlLow: 1805, dlHigh: 1880, dlEarfcnStart: 1200, dlEarfcnEnd: 1949, ulLow: 1710, ulHigh: 1785, ulEarfcnStart: 19200, ulEarfcnEnd: 19949 },
  { band: 4, mode: 'FDD', dlLow: 2110, dlHigh: 2155, dlEarfcnStart: 1950, dlEarfcnEnd: 2399, ulLow: 1710, ulHigh: 1755, ulEarfcnStart: 19950, ulEarfcnEnd: 20399 },
  { band: 5, mode: 'FDD', dlLow: 869, dlHigh: 894, dlEarfcnStart: 2400, dlEarfcnEnd: 2649, ulLow: 824, ulHigh: 849, ulEarfcnStart: 20400, ulEarfcnEnd: 20649 },
  { band: 7, mode: 'FDD', dlLow: 2620, dlHigh: 2690, dlEarfcnStart: 2750, dlEarfcnEnd: 3449, ulLow: 2500, ulHigh: 2570, ulEarfcnStart: 20750, ulEarfcnEnd: 21449 },
  { band: 8, mode: 'FDD', dlLow: 925, dlHigh: 960, dlEarfcnStart: 3450, dlEarfcnEnd: 3799, ulLow: 880, ulHigh: 915, ulEarfcnStart: 21450, ulEarfcnEnd: 21799 },
  { band: 12, mode: 'FDD', dlLow: 729, dlHigh: 746, dlEarfcnStart: 5010, dlEarfcnEnd: 5179, ulLow: 699, ulHigh: 716, ulEarfcnStart: 23010, ulEarfcnEnd: 23179 },
  { band: 13, mode: 'FDD', dlLow: 746, dlHigh: 756, dlEarfcnStart: 5180, dlEarfcnEnd: 5279, ulLow: 777, ulHigh: 787, ulEarfcnStart: 23180, ulEarfcnEnd: 23279 },
  { band: 17, mode: 'FDD', dlLow: 734, dlHigh: 746, dlEarfcnStart: 5730, dlEarfcnEnd: 5849, ulLow: 704, ulHigh: 716, ulEarfcnStart: 23730, ulEarfcnEnd: 23849 },
  { band: 20, mode: 'FDD', dlLow: 791, dlHigh: 821, dlEarfcnStart: 6150, dlEarfcnEnd: 6449, ulLow: 832, ulHigh: 862, ulEarfcnStart: 23000, ulEarfcnEnd: 23299 },
  { band: 25, mode: 'FDD', dlLow: 1930, dlHigh: 1995, dlEarfcnStart: 8040, dlEarfcnEnd: 8689, ulLow: 1850, ulHigh: 1915, ulEarfcnStart: 25840, ulEarfcnEnd: 26489 },
  { band: 26, mode: 'FDD', dlLow: 859, dlHigh: 894, dlEarfcnStart: 8690, dlEarfcnEnd: 9039, ulLow: 814, ulHigh: 849, ulEarfcnStart: 26040, ulEarfcnEnd: 26689 },
  { band: 28, mode: 'FDD', dlLow: 758, dlHigh: 803, dlEarfcnStart: 9210, dlEarfcnEnd: 9659, ulLow: 703, ulHigh: 748, ulEarfcnStart: 27210, ulEarfcnEnd: 27659 },
  { band: 66, mode: 'FDD', dlLow: 2110, dlHigh: 2200, dlEarfcnStart: 66436, dlEarfcnEnd: 67335, ulLow: 1710, ulHigh: 1780, ulEarfcnStart: 131972, ulEarfcnEnd: 132671 },
  { band: 33, mode: 'TDD', dlLow: 1900, dlHigh: 1920, dlEarfcnStart: 36000, dlEarfcnEnd: 36199 },
  { band: 34, mode: 'TDD', dlLow: 2010, dlHigh: 2025, dlEarfcnStart: 36200, dlEarfcnEnd: 36349 },
  { band: 38, mode: 'TDD', dlLow: 2570, dlHigh: 2620, dlEarfcnStart: 37750, dlEarfcnEnd: 38249 },
  { band: 39, mode: 'TDD', dlLow: 1880, dlHigh: 1920, dlEarfcnStart: 38250, dlEarfcnEnd: 38649 },
  { band: 40, mode: 'TDD', dlLow: 2300, dlHigh: 2400, dlEarfcnStart: 38650, dlEarfcnEnd: 39649 },
  { band: 41, mode: 'TDD', dlLow: 2496, dlHigh: 2690, dlEarfcnStart: 39650, dlEarfcnEnd: 41589 },
]

export const NR_BANDS: NrBand[] = [
  { band: 'n1', mode: 'FDD', low: 1920, high: 2170, arfcnStart: 384000, arfcnEnd: 396000, deltaF: 5, dlLow: 2110, dlHigh: 2170, dlArfcnStart: 422000, dlArfcnEnd: 434000, ulLow: 1920, ulHigh: 1980, ulArfcnStart: 384000, ulArfcnEnd: 396000 },
  { band: 'n2', mode: 'FDD', low: 1850, high: 1990, arfcnStart: 386000, arfcnEnd: 398000, deltaF: 5, dlLow: 1930, dlHigh: 1990, dlArfcnStart: 386000, dlArfcnEnd: 398000, ulLow: 1850, ulHigh: 1910, ulArfcnStart: 370000, ulArfcnEnd: 382000 },
  { band: 'n3', mode: 'FDD', low: 1710, high: 1880, arfcnStart: 342000, arfcnEnd: 376000, deltaF: 5, dlLow: 1805, dlHigh: 1880, dlArfcnStart: 361000, dlArfcnEnd: 376000, ulLow: 1710, ulHigh: 1785, ulArfcnStart: 342000, ulArfcnEnd: 357000 },
  { band: 'n5', mode: 'FDD', low: 824, high: 894, arfcnStart: 164800, arfcnEnd: 178800, deltaF: 5, dlLow: 869, dlHigh: 894, dlArfcnStart: 173800, dlArfcnEnd: 178800, ulLow: 824, ulHigh: 849, ulArfcnStart: 164800, ulArfcnEnd: 169800 },
  { band: 'n7', mode: 'FDD', low: 2500, high: 2690, arfcnStart: 500000, arfcnEnd: 538000, deltaF: 5, dlLow: 2620, dlHigh: 2690, dlArfcnStart: 524000, dlArfcnEnd: 538000, ulLow: 2500, ulHigh: 2570, ulArfcnStart: 500000, ulArfcnEnd: 514000 },
  { band: 'n8', mode: 'FDD', low: 880, high: 960, arfcnStart: 176000, arfcnEnd: 192000, deltaF: 5, dlLow: 925, dlHigh: 960, dlArfcnStart: 185000, dlArfcnEnd: 192000, ulLow: 880, ulHigh: 915, ulArfcnStart: 176000, ulArfcnEnd: 183000 },
  { band: 'n20', mode: 'FDD', low: 832, high: 862, arfcnStart: 166400, arfcnEnd: 172400, deltaF: 5, dlLow: 791, dlHigh: 821, dlArfcnStart: 158200, dlArfcnEnd: 164200, ulLow: 832, ulHigh: 862, ulArfcnStart: 166400, ulArfcnEnd: 172400 },
  { band: 'n28', mode: 'FDD', low: 703, high: 803, arfcnStart: 140600, arfcnEnd: 160600, deltaF: 5, dlLow: 758, dlHigh: 803, dlArfcnStart: 151600, dlArfcnEnd: 160600, ulLow: 703, ulHigh: 748, ulArfcnStart: 140600, ulArfcnEnd: 149600 },
  { band: 'n41', mode: 'TDD', low: 2496, high: 2690, arfcnStart: 499200, arfcnEnd: 537999, deltaF: 15 },
  { band: 'n77', mode: 'TDD', low: 3300, high: 4200, arfcnStart: 620000, arfcnEnd: 680000, deltaF: 15 },
  { band: 'n78', mode: 'TDD', low: 3300, high: 3800, arfcnStart: 620000, arfcnEnd: 653333, deltaF: 15 },
  { band: 'n79', mode: 'TDD', low: 4400, high: 5000, arfcnStart: 693334, arfcnEnd: 733333, deltaF: 15 },
  { band: 'n257', mode: 'TDD', low: 26500, high: 29500, arfcnStart: 2054167, arfcnEnd: 2104167, deltaF: 60 },
  { band: 'n258', mode: 'TDD', low: 24250, high: 27500, arfcnStart: 2016667, arfcnEnd: 2070833, deltaF: 60 },
  { band: 'n260', mode: 'TDD', low: 37000, high: 40000, arfcnStart: 2220000, arfcnEnd: 2270000, deltaF: 60 },
  { band: 'n261', mode: 'TDD', low: 27500, high: 28350, arfcnStart: 2070833, arfcnEnd: 2085000, deltaF: 60 },
]

export function findLteBandByEarfcn(earfcn: number) {
  for (const b of LTE_BANDS) {
    if (earfcn >= b.dlEarfcnStart && earfcn <= b.dlEarfcnEnd) return { band: b, dir: 'DL' as const }
    if (b.mode === 'FDD' && b.ulEarfcnStart !== undefined && b.ulEarfcnEnd !== undefined && earfcn >= b.ulEarfcnStart && earfcn <= b.ulEarfcnEnd) return { band: b, dir: 'UL' as const }
  }
  return null
}

export function calcLteFreq(earfcn: number) {
  const match = findLteBandByEarfcn(earfcn)
  if (!match) return null
  const b = match.band
  const isDL = match.dir === 'DL'
  const low = isDL ? b.dlLow : (b.ulLow ?? b.dlLow)
  const offs = isDL ? b.dlEarfcnStart : (b.ulEarfcnStart ?? b.dlEarfcnStart)
  const freq = low + 0.1 * (earfcn - offs)
  return { band: b, dir: match.dir, freq, isDL }
}

export function calcLteEarfcn(band: LteBand, freq: number, dir: 'dl' | 'ul') {
  const isDL = dir === 'dl'
  const low = isDL ? band.dlLow : (band.mode === 'FDD' ? (band.ulLow ?? band.dlLow) : band.dlLow)
  const high = isDL ? band.dlHigh : (band.mode === 'FDD' ? (band.ulHigh ?? band.dlHigh) : band.dlHigh)
  const offs = isDL ? band.dlEarfcnStart : (band.mode === 'FDD' ? (band.ulEarfcnStart ?? band.dlEarfcnStart) : band.dlEarfcnStart)
  const end = isDL ? band.dlEarfcnEnd : (band.mode === 'FDD' ? (band.ulEarfcnEnd ?? band.dlEarfcnEnd) : band.dlEarfcnEnd)
  if (freq < low || freq > high) return null
  const earfcn = Math.round(offs + 10 * (freq - low))
  return Math.max(offs, Math.min(end, earfcn))
}

export function getNrRange(nref: number) {
  if (nref >= 0 && nref <= 599999) return { fOffs: 0, nOffs: 0, deltaF: 5, range: '0–3000 MHz' }
  if (nref >= 600000 && nref <= 2016666) return { fOffs: 3000, nOffs: 600000, deltaF: 15, range: '3000–24250 MHz' }
  if (nref >= 2016667 && nref <= 3279165) return { fOffs: 24250, nOffs: 2016667, deltaF: 60, range: '24250–100000 MHz' }
  return null
}

export function calcNrFreq(nref: number) {
  const range = getNrRange(nref)
  if (!range) return null
  const freq = range.fOffs + (range.deltaF / 1000) * (nref - range.nOffs)
  let matchedBand: NrBand | null = null
  let dir: 'dl' | 'ul' | null = null
  for (const b of NR_BANDS) {
    if (b.mode === 'FDD') {
      if (b.dlArfcnStart !== undefined && b.dlArfcnEnd !== undefined && nref >= b.dlArfcnStart && nref <= b.dlArfcnEnd) { matchedBand = b; dir = 'dl'; break }
      if (b.ulArfcnStart !== undefined && b.ulArfcnEnd !== undefined && nref >= b.ulArfcnStart && nref <= b.ulArfcnEnd) { matchedBand = b; dir = 'ul'; break }
    } else {
      if (nref >= b.arfcnStart && nref <= b.arfcnEnd) { matchedBand = b; dir = 'dl'; break }
    }
  }
  return { freq, range, matchedBand, dir }
}

export function calcNrArfcn(band: NrBand, freq: number, dir: 'dl' | 'ul' = 'dl') {
  let low: number, high: number, start: number, end: number
  if (dir === 'dl' && band.dlLow !== undefined && band.dlHigh !== undefined && band.dlArfcnStart !== undefined) {
    low = band.dlLow; high = band.dlHigh; start = band.dlArfcnStart; end = band.dlArfcnEnd ?? start
  } else if (dir === 'ul' && band.ulLow !== undefined && band.ulHigh !== undefined && band.ulArfcnStart !== undefined) {
    low = band.ulLow; high = band.ulHigh; start = band.ulArfcnStart; end = band.ulArfcnEnd ?? start
  } else {
    low = band.low; high = band.high; start = band.arfcnStart; end = band.arfcnEnd
  }
  if (freq < low || freq > high) return null
  return Math.max(start, Math.min(end, Math.round(start + (freq - low) * 1000 / band.deltaF)))
}

export function decodeECI(eci: number) {
  const enbId = Math.floor(eci / 256)
  const cellId = eci % 256
  return { eci, enbId, cellId }
}

export function encodeECI(enbId: number, cellId: number) {
  return enbId * 256 + cellId
}

export function decodeNCI(nci: number, gnbIdLen: number) {
  const cellIdLen = 36 - gnbIdLen
  const cellIdMask = (1n << BigInt(cellIdLen)) - 1n
  const nciBig = BigInt(nci)
  const cellId = Number(nciBig & cellIdMask)
  const gnbId = Number(nciBig >> BigInt(cellIdLen))
  const maxGnb = Number((1n << BigInt(gnbIdLen)) - 1n)
  const maxCell = Number((1n << BigInt(cellIdLen)) - 1n)
  return { nci, gnbId, cellId, gnbIdLen, cellIdLen, maxGnb, maxCell }
}

export function encodeNCI(gnbId: number, cellId: number, gnbIdLen: number) {
  const cellIdLen = 36 - gnbIdLen
  return Number((BigInt(gnbId) << BigInt(cellIdLen)) | BigInt(cellId))
}
