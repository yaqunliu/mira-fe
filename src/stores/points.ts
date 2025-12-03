import { create } from 'zustand'
import type { PointsBalance } from '@/types/points'

interface PointsState {
  balance: PointsBalance | null
  isLoading: boolean
  lastUpdated: number | null
  setBalance: (balance: PointsBalance) => void
  setLoading: (loading: boolean) => void
  clearBalance: () => void
  // 检查是否需要刷新（超过5分钟）
  shouldRefresh: () => boolean
}

export const usePointsStore = create<PointsState>((set, get) => ({
  balance: null,
  isLoading: false,
  lastUpdated: null,

  setBalance: (balance: PointsBalance) => {
    set({
      balance,
      lastUpdated: Date.now(),
      isLoading: false,
    })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  clearBalance: () => {
    set({
      balance: null,
      lastUpdated: null,
    })
  },

  shouldRefresh: () => {
    const { lastUpdated } = get()
    if (!lastUpdated) return true
    // 5分钟内不需要刷新
    return Date.now() - lastUpdated > 5 * 60 * 1000
  },
}))

