import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface FavStore {
  favorites: string[]
  toggleFav: (id: string) => void
  isFav: (id: string) => boolean
}

export const useFavStore = create<FavStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFav: (id) => {
        const { favorites } = get()
        if (favorites.includes(id)) {
          set({ favorites: favorites.filter((f) => f !== id) })
        } else {
          set({ favorites: [...favorites, id] })
        }
      },
      isFav: (id) => get().favorites.includes(id),
    }),
    {
      name: 'fav-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
