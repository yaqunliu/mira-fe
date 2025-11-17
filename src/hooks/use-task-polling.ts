import { useMemo } from 'react'
import taskApi from '@/lib/api/task'
import { Task, TaskStatus } from '@/types'
import { usePolling, UsePollingReturn } from './use-polling'

interface UseTaskPollingOptions {
  /** 轮询间隔（毫秒），默认 2000ms */
  interval?: number
  /** 是否立即开始轮询，默认 true */
  immediate?: boolean
  /** 任务完成时的回调 */
  onSuccess?: (task: Task) => void
  /** 任务失败时的回调 */
  onFailure?: (task: Task) => void
  /** 任务状态更新时的回调 */
  onProgress?: (task: Task) => void
  /** 是否在任务完成后自动停止轮询，默认 true */
  stopOnComplete?: boolean
}

/**
 * 轮询任务状态的 Hook（基于通用 usePolling 实现）
 * @param taskId 任务ID
 * @param options 配置项
 * @returns 轮询状态和控制方法
 * 
 * @example
 * ```tsx
 * const { task, isPolling, startPolling, stopPolling } = useTaskPolling(taskId, {
 *   interval: 3000,
 *   onSuccess: (task) => {
 *     toast.success('任务完成！')
 *   },
 *   onFailure: (task) => {
 *     toast.error('任务失败：' + task.message)
 *   }
 * })
 * ```
 */
export function useTaskPolling(
  taskId: string | null | undefined,
  options: UseTaskPollingOptions = {}
): UsePollingReturn<Task> {
  const {
    interval = 2000,
    immediate = true,
    onSuccess,
    onFailure,
    onProgress,
    stopOnComplete = true,
  } = options

  // 使用 useMemo 来稳定 fetcher 函数
  const fetcher = useMemo(() => {
    return async () => {
      if (!taskId) {
        throw new Error('taskId 不能为空')
      }
      
      const taskData = await taskApi.queryTaskStatus(taskId)
      
      if (!taskData || !taskData.status) {
        throw new Error('查询任务状态失败：返回数据格式错误')
      }
      
      return taskData
    }
  }, [taskId])

  // 使用通用轮询 hook
  const polling = usePolling<Task>({
    fetcher,
    interval,
    immediate: immediate && !!taskId, // 只有当 taskId 存在时才自动开始
    autoStopOnComplete: stopOnComplete,
    shouldStopPolling: (task) => {
      return task.status === TaskStatus.SUCCESS || task.status === TaskStatus.FAILURE
    },
    onUpdate: (task) => {
      const currentStatus = task.status
      
      // 根据任务状态调用不同的回调
      if (currentStatus === TaskStatus.SUCCESS) {
        onSuccess?.(task)
      } else if (currentStatus === TaskStatus.FAILURE) {
        onFailure?.(task)
      } else if (currentStatus === TaskStatus.PROGRESS || currentStatus === TaskStatus.STARTED) {
        onProgress?.(task)
      }
    },
    onComplete: (task) => {
      // 任务完成时的最终回调
      if (task.status === TaskStatus.SUCCESS) {
        onSuccess?.(task)
      } else if (task.status === TaskStatus.FAILURE) {
        onFailure?.(task)
      }
    },
  })

  return {
    data: polling.data,
    isLoading: polling.isLoading,
    isPolling: polling.isPolling,
    error: polling.error,
    startPolling: polling.startPolling,
    stopPolling: polling.stopPolling,
    refresh: polling.refresh,
    reset: polling.reset,
  }
}
