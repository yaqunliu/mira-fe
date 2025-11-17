import { useMemo } from "react";
import creationApi from "@/lib/api/creation";
import { Creation, CreationStatus } from "@/types/Creation";
import { usePolling, UsePollingReturn } from "./use-polling";

interface UseCreationPollingOptions {
  /** 轮询间隔（毫秒），默认 2000ms */
  interval?: number;
  /** 是否立即开始轮询，默认 true */
  immediate?: boolean;
  /** 任务完成时的回调 */
  onSuccess?: (creation: Creation) => void;
  /** 任务失败时的回调 */
  onFailure?: (creation: Creation) => void;
  /** 任务状态更新时的回调 */
  onProgress?: (creation: Creation) => void;
  /** 是否在任务完成后自动停止轮询，默认 true */
  stopOnComplete?: boolean;
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
export function useCreationPolling(
  creationId: string | null | undefined,
  options: UseCreationPollingOptions = {}
): UsePollingReturn<Creation> {
  const {
    interval = 2000,
    immediate = true,
    onSuccess,
    onFailure,
    onProgress,
    stopOnComplete = true,
  } = options;

  // 使用 useMemo 来稳定 fetcher 函数
  const fetcher = useMemo(() => {
    return async (): Promise<Creation> => {
      if (!creationId) {
        throw new Error("creationId 不能为空");
      }

      const creationData = await creationApi.queryCreationById(creationId);

      return creationData as Creation;
    };
  }, [creationId]);

  // 使用通用轮询 hook
  const polling = usePolling<Creation>({
    fetcher,
    interval,
    immediate: immediate && !!creationId, // 只有当 creationId 存在时才自动开始
    autoStopOnComplete: stopOnComplete,
    shouldStopPolling: (creation) => {
      return creation.current_task_id === null;
    },
    onUpdate: (creation) => {
      onProgress?.(creation);
    },
    onComplete: (creation) => {
      // 任务完成时的最终回调
      onSuccess?.(creation);
    },
  });

  return {
    data: polling.data,
    isLoading: polling.isLoading,
    isPolling: polling.isPolling,
    error: polling.error,
    startPolling: polling.startPolling,
    stopPolling: polling.stopPolling,
    refresh: polling.refresh,
    reset: polling.reset,
  };
}
