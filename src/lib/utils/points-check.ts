import { pointsApi } from '@/lib/api/points'
import type { PointsCheckResponse } from '@/types/points'
import { toast } from 'sonner'

/**
 * 检查积分是否充足
 * @param params 积分检查参数
 * @returns 检查结果
 */
export async function checkPointsAvailable(
  params: Parameters<typeof pointsApi.checkPoints>[0]
): Promise<PointsCheckResponse | null> {
  try {
    const result = await pointsApi.checkPoints(params)
    return result
  } catch (error) {
    console.error('积分检查失败:', error)
    const errorMessage = error instanceof Error ? error.message : '积分检查失败'
    toast.error(errorMessage)
    return null
  }
}

/**
 * 检查并提示积分是否充足
 * @param params 积分检查参数
 * @param t 翻译函数（可选）
 * @returns 是否充足
 */
export async function checkAndNotifyPoints(
  params: Parameters<typeof pointsApi.checkPoints>[0],
  t?: (key: string) => string
): Promise<boolean> {
  const result = await checkPointsAvailable(params)
  
  if (!result) {
    return false
  }

  if (!result.available) {
    toast.error(result.message || (t ? t('points.insufficientPoints') : '积分不足'))
    return false
  }

  return true
}

