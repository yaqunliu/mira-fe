import { useState, useEffect, useRef, useCallback } from 'react'



export interface UsePollingOptions<T> {
  /** 轮询间隔（毫秒），默认 2000ms */
  interval?: number
  /** 是否立即开始轮询，默认 true */
  immediate?: boolean
  /** 判断是否应该停止轮询，返回 true 时停止 */
  shouldStopPolling?: (data: T) => boolean
  /** 数据更新时的回调 */
  onUpdate?: (data: T) => void
  /** 轮询完成（停止）时的回调 */
  onComplete?: (data: T) => void
  /** 错误发生时的回调 */
  onError?: (error: Error) => void
  /** 是否在完成时自动停止轮询，默认 true */
  autoStopOnComplete?: boolean
}

export interface UsePollingReturn<T> {
  /** 数据 */
  data: T | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否正在轮询 */
  isPolling: boolean
  /** 错误信息 */
  error: Error | null
  /** 开始轮询 */
  startPolling: () => void
  /** 停止轮询 */
  stopPolling: () => void
  /** 手动刷新一次 */
  refresh: () => Promise<void>
  /** 重置状态 */
  reset: () => void
}

/**
 * 通用轮询 Hook
 * @param options 配置项
 * @returns 轮询状态和控制方法
 * 
 * @example
 * ```tsx
 * const { data, isPolling, startPolling, stopPolling } = usePolling({
 *   fetcher: () => api.getData(id),
 *   interval: 3000,
 *   shouldStopPolling: (data) => data.status === 'completed',
 *   onUpdate: (data) => {
 *     console.log('数据更新:', data)
 *   },
 *   onComplete: (data) => {
 *     toast.success('完成！')
 *   }
 * })
 * ```
 */
export function usePolling<T>(
  options: UsePollingOptions<T> & { fetcher: () => Promise<T> }
): UsePollingReturn<T> {
  const {
    fetcher,
    interval = 2000,
    immediate = true,
    shouldStopPolling,
    onUpdate,
    onComplete,
    onError,
    autoStopOnComplete = true,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const callbacksRef = useRef({ onUpdate, onComplete, onError, shouldStopPolling })

  // 更新回调 ref（避免闭包问题）
  useEffect(() => {
    callbacksRef.current = { onUpdate, onComplete, onError, shouldStopPolling }
  }, [onUpdate, onComplete, onError, shouldStopPolling])

  // 清理定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 停止轮询
  const stopPolling = useCallback(() => {
    setIsPolling(false)
    clearTimer()
  }, [clearTimer])

  // 执行查询
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await fetcher()
      
      setData(result)
      
      // 触发更新回调
      callbacksRef.current.onUpdate?.(result)

      // 检查是否应该停止轮询
      if (callbacksRef.current.shouldStopPolling?.(result)) {
        callbacksRef.current.onComplete?.(result)
        if (autoStopOnComplete) {
          stopPolling()
        }
      }
     
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('未知错误')
      setError(errorObj)
      callbacksRef.current.onError?.(errorObj)
      console.error('查询失败:', errorObj)
    } finally {
      setIsLoading(false)
    }
  }, [fetcher, autoStopOnComplete, stopPolling])

  // 开始轮询
  const startPolling = useCallback(() => {
    // 先停止之前的轮询
    clearTimer()

    // 设置轮询状态
    setIsPolling(true)

    // 定义轮询函数
    const poll = async () => {
      await fetchData()
      
      // 检查是否还需要继续轮询
      setIsPolling((currentPolling) => {
        if (currentPolling) {
          timerRef.current = setTimeout(poll, interval)
        }
        return currentPolling
      })
    }

    // 立即执行第一次查询
    poll()
  }, [interval, fetchData, clearTimer])

  // 手动刷新
  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // 重置状态
  const reset = useCallback(() => {
    stopPolling()
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [stopPolling])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  // 自动开始轮询
  useEffect(() => {
    if (immediate) {
      startPolling()
    }

    // 依赖变化时停止之前的轮询
    return () => {
      stopPolling()
    }
  }, [immediate, startPolling, stopPolling])

  return {
    data,
    isLoading,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refresh,
    reset,
  }
}

