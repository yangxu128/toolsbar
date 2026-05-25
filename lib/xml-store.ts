import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface XmlStore {
  headers: string[]
  data: Record<string, string>[]
  fileName: string
  loaded: boolean

  loadXml: (headers: string[], data: Record<string, string>[], fileName: string) => void
  clearData: () => void
}

export const useXmlStore = create<XmlStore>()(
  persist(
    (set) => ({
      headers: [],
      data: [],
      fileName: '',
      loaded: false,

      loadXml: (headers, data, fileName) =>
        set({ headers, data, fileName, loaded: true }),

      clearData: () =>
        set({ headers: [], data: [], fileName: '', loaded: false }),
    }),
    {
      name: 'xml-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ headers: state.headers, data: state.data, fileName: state.fileName, loaded: state.loaded }),
    }
  )
)
