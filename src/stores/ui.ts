import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  language: 'en' | 'zh' | 'ja'
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setLanguage: (language: 'en' | 'zh' | 'ja') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      language: 'en',
      
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open })
      },
      
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }))
      },
      
      setLanguage: (language: 'en' | 'zh' | 'ja') => {
        set({ language })
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ language: state.language }),
    }
  )
)
