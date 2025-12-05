import { createClient } from '@/lib/supabase/client'

/**
 * 等待 Supabase token 请求完成
 * 通过监听网络请求来确保 Supabase 的 token 请求已经完成
 */
export async function waitForSupabaseToken(
  maxWaitTime: number = 10000, // 最大等待时间 10 秒
  checkInterval: number = 100 // 检查间隔 100ms
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const supabaseUrl = 'https://niybedmvebmymaiivtjl.supabase.co'
    const tokenEndpoint = `${supabaseUrl}/auth/v1/token`

    // 检查是否已经有 session
    const checkSession = async () => {
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (session?.access_token) {
          console.log('[waitForSupabaseToken] Session found with access token')
          resolve(true)
          return true
        }
      } catch (error) {
        console.error('[waitForSupabaseToken] Error checking session:', error)
      }
      return false
    }

    // 立即检查一次
    checkSession().then((hasSession) => {
      if (hasSession) {
        return
      }

      // 监听网络请求
      const checkNetworkRequests = () => {
        // 检查 Performance API 中的网络请求
        if (typeof window !== 'undefined' && window.performance) {
          const entries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
          const tokenRequest = entries.find((entry) => {
            return entry.name.includes('/auth/v1/token') || 
                   (entry.name.includes(supabaseUrl) && entry.name.includes('token'))
          })

          if (tokenRequest) {
            console.log('[waitForSupabaseToken] Token request found in performance entries')
            // 再次检查 session
            checkSession().then((hasSession) => {
              if (hasSession) {
                resolve(true)
              }
            })
          }
        }
      }

      // 定期检查
      const interval = setInterval(async () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= maxWaitTime) {
          clearInterval(interval)
          console.log('[waitForSupabaseToken] Max wait time reached, resolving with current session state')
          const hasSession = await checkSession()
          resolve(hasSession)
          return
        }

        // 检查网络请求
        checkNetworkRequests()

        // 检查 session
        const hasSession = await checkSession()
        if (hasSession) {
          clearInterval(interval)
          resolve(true)
        }
      }, checkInterval)
    })
  })
}

/**
 * 等待 Supabase session 可用
 * 更简单的方法：直接轮询检查 session
 */
export async function waitForSupabaseSession(
  maxWaitTime: number = 10000,
  checkInterval: number = 200
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now()

    const checkSession = async () => {
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (session?.access_token) {
          console.log('[waitForSupabaseSession] Session found with access token')
          resolve(true)
          return true
        }
      } catch (error) {
        console.error('[waitForSupabaseSession] Error checking session:', error)
      }
      return false
    }

    // 立即检查一次
    checkSession().then((hasSession) => {
      if (hasSession) {
        return
      }

      // 定期检查
      const interval = setInterval(async () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= maxWaitTime) {
          clearInterval(interval)
          console.log('[waitForSupabaseSession] Max wait time reached')
          const hasSession = await checkSession()
          resolve(hasSession)
          return
        }

        const hasSession = await checkSession()
        if (hasSession) {
          clearInterval(interval)
          resolve(true)
        }
      }, checkInterval)
    })
  })
}

