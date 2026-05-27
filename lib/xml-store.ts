import { create } from 'zustand'

interface XmlStore {
  headers: string[]
  data: Record<string, string>[]
  fileName: string
  loaded: boolean

  loadXml: (headers: string[], data: Record<string, string>[], fileName: string) => void
  clearData: () => void
}

export const useXmlStore = create<XmlStore>()(
  (set) => ({
    headers: [],
    data: [],
    fileName: '',
    loaded: false,

    loadXml: (headers, data, fileName) =>
      set({ headers, data, fileName, loaded: true }),

    clearData: () =>
      set({ headers: [], data: [], fileName: '', loaded: false }),
  })
)
