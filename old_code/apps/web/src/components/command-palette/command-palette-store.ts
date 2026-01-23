import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RecentPage {
  path: string
  label: string
}

interface SavedSearch {
  id: string
  query: string
  name?: string
  filters?: {
    shardTypeId?: string
    minScore?: number
  }
  createdAt: string
}

interface CommandPaletteState {
  // Dialog state
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void

  // Recent searches (persisted)
  recentSearches: string[]
  addRecentSearch: (search: string) => void
  removeRecentSearch: (search: string) => void
  clearRecentSearches: () => void

  // Saved searches (persisted)
  savedSearches: SavedSearch[]
  saveSearch: (search: Omit<SavedSearch, 'id' | 'createdAt'>) => void
  removeSavedSearch: (id: string) => void
  updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => void
  isSavedSearch: (query: string) => boolean

  // Recent pages (persisted)
  recentPages: RecentPage[]
  addRecentPage: (page: RecentPage) => void
  clearRecentPages: () => void

  // Search suggestions
  popularSearches: string[]
  setPopularSearches: (searches: string[]) => void
}

// Generate a simple unique ID
const generateId = () => Math.random().toString(36).substring(2, 9)

export const useCommandPaletteStore = create<CommandPaletteState>()(
  persist(
    (set, get) => ({
      // Dialog state
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),

      // Recent searches
      recentSearches: [],
      addRecentSearch: (search: string) => {
        const trimmed = search.trim()
        if (!trimmed) return

        set((state) => {
          // Remove if already exists, then add to front
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== trimmed.toLowerCase()
          )
          return {
            recentSearches: [trimmed, ...filtered].slice(0, 10), // Keep last 10
          }
        })
      },
      removeRecentSearch: (search: string) => {
        set((state) => ({
          recentSearches: state.recentSearches.filter(
            (s) => s.toLowerCase() !== search.toLowerCase()
          ),
        }))
      },
      clearRecentSearches: () => set({ recentSearches: [] }),

      // Saved searches
      savedSearches: [],
      saveSearch: (search) => {
        set((state) => {
          // Check if already saved
          const exists = state.savedSearches.some(
            (s) => s.query.toLowerCase() === search.query.toLowerCase()
          )
          if (exists) return state

          const newSearch: SavedSearch = {
            ...search,
            id: generateId(),
            createdAt: new Date().toISOString(),
          }
          return {
            savedSearches: [newSearch, ...state.savedSearches].slice(0, 20), // Keep last 20
          }
        })
      },
      removeSavedSearch: (id: string) => {
        set((state) => ({
          savedSearches: state.savedSearches.filter((s) => s.id !== id),
        }))
      },
      updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => {
        set((state) => ({
          savedSearches: state.savedSearches.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }))
      },
      isSavedSearch: (query: string) => {
        return get().savedSearches.some(
          (s) => s.query.toLowerCase() === query.toLowerCase()
        )
      },

      // Recent pages
      recentPages: [],
      addRecentPage: (page: RecentPage) => {
        set((state) => {
          // Remove if already exists, then add to front
          const filtered = state.recentPages.filter(
            (p) => p.path !== page.path
          )
          return {
            recentPages: [page, ...filtered].slice(0, 10), // Keep last 10
          }
        })
      },
      clearRecentPages: () => set({ recentPages: [] }),

      // Popular searches (can be fetched from backend)
      popularSearches: [
        'recent documents',
        'customer feedback',
        'project updates',
        'meeting notes',
        'technical specs',
      ],
      setPopularSearches: (searches: string[]) => {
        set({ popularSearches: searches })
      },
    }),
    {
      name: 'command-palette-storage',
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        savedSearches: state.savedSearches,
        recentPages: state.recentPages,
      }),
    }
  )
)

export type { SavedSearch, RecentPage }

