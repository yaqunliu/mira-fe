import { QueryClient } from '@tanstack/react-query'

/**
 * 清空所有用户相关的 React Query 缓存
 * 在退出登录或重新登录时调用，确保不会显示上一个用户的数据
 */
export function clearUserDataCache(queryClient: QueryClient) {
  // 清空所有用户相关的查询缓存
  // 这些 queryKey 前缀都是用户相关的数据
  const userRelatedKeys = [
    'novels',
    'novel',
    'chapters',
    'characters',
    'creations',
    'creation',
    'points',
    'balance',
    'checkin',
    'user',
    'task',
    'shots',
    'audio',
    'video',
    'voice', // 语音相关
  ]

  // 遍历所有缓存并删除用户相关的
  queryClient.getQueryCache().getAll().forEach((query) => {
    const queryKey = query.queryKey
    if (Array.isArray(queryKey) && queryKey.length > 0) {
      const firstKey = queryKey[0] as string
      if (userRelatedKeys.includes(firstKey)) {
        queryClient.removeQueries({ queryKey })
      }
    } else if (typeof queryKey === 'string' && userRelatedKeys.includes(queryKey)) {
      queryClient.removeQueries({ queryKey: [queryKey] })
    }
  })

  // 为了更彻底，也可以直接清空所有缓存（如果上面的方式不够彻底）
  // 但为了保留一些非用户相关的缓存（如配置等），我们使用上面的方式
}

