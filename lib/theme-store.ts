import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ThemeStore {
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        set({ theme })
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        get().setTheme(next)
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) state.setTheme(state.theme)
      },
    }
  )
)
