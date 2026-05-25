import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface MetricDef {
  id: string
  desc: string
  formula: string
  status: string
}

export interface CalcResult {
  id: string
  desc: string
  formula: string
  result: number | null
  error?: string
  steps?: string[]
  expr?: string
}

interface KpiStore {
  headers: string[]
  rows: any[][]
  metrics: MetricDef[]
  loaded: boolean

  loadFile: (headers: string[], rows: any[][], metrics: MetricDef[]) => void
  clearData: () => void
}

export const useKpiStore = create<KpiStore>()(
  persist(
    (set) => ({
      headers: [],
      rows: [],
      metrics: [],
      loaded: false,

      loadFile: (headers, rows, metrics) =>
        set({ headers, rows, metrics, loaded: true }),

      clearData: () =>
        set({ headers: [], rows: [], metrics: [], loaded: false }),
    }),
    {
      name: 'kpi-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ headers: state.headers, rows: state.rows, metrics: state.metrics, loaded: state.loaded }),
    }
  )
)
