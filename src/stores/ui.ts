import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

// 原本用 persist 中间件持久化 language 字段，但该字段全仓无读取方（语言由
// next-intl 的路由决定，见 src/i18n/routing.ts）。移除 language 后 persist
// 已无可持久化内容，故一并去掉；sidebarOpen 本来就是不持久化的。
export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: false,

  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open })
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },
}))
