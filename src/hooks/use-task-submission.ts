import { useState, useCallback, useRef } from 'react'

/**
 * 任务提交状态管理 hook
 * 用于防止重复提交任务
 */
export function useTaskSubmission<T extends (...args: any[]) => Promise<any>>(
  submitFn: T,
  options?: {
    /** 防抖延迟时间（毫秒），默认 500ms */
    debounceDelay?: number
    /** 是否启用防抖，默认 true */
    enableDebounce?: boolean
    /** 提交失败时的回调 */
    onError?: (error: Error) => void
    /** 提交成功时的回调 */
    onSuccess?: (result: Awaited<ReturnType<T>>) => void
  }
) {
  const {
    debounceDelay = 500,
    enableDebounce = true,
    onError,
    onSuccess,
  } = options || {}

  const [isSubmitting, setIsSubmitting] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSubmittingRef = useRef(false)

  const submit = useCallback(
    async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | null> => {
      // 如果正在提交，直接返回
      if (isSubmittingRef.current) {
        console.warn('任务正在提交中，请勿重复提交')
        return null
      }

      // 清除之前的防抖定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      const executeSubmit = async () => {
        if (isSubmittingRef.current) {
          return null
        }

        try {
          isSubmittingRef.current = true
          setIsSubmitting(true)

          const result = await submitFn(...args)

          if (onSuccess) {
            onSuccess(result)
          }

          return result
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          
          if (onError) {
            onError(err)
          } else {
            console.error('任务提交失败:', err)
          }

          throw err
        } finally {
          isSubmittingRef.current = false
          setIsSubmitting(false)
        }
      }

      if (enableDebounce) {
        return new Promise<Awaited<ReturnType<T>> | null>((resolve, reject) => {
          timeoutRef.current = setTimeout(async () => {
            try {
              const result = await executeSubmit()
              resolve(result)
            } catch (error) {
              reject(error)
            }
          }, debounceDelay)
        })
      } else {
        return executeSubmit()
      }
    },
    [submitFn, debounceDelay, enableDebounce, onSuccess, onError]
  )

  // 清理函数
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    isSubmittingRef.current = false
    setIsSubmitting(false)
  }, [])

  return {
    submit,
    isSubmitting,
    cancel,
  }
}

