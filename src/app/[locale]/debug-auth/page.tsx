'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useEffect, useState } from 'react'

export default function DebugAuthPage() {
  const [supabaseSession, setSupabaseSession] = useState<any>(null)
  const authStore = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseSession(session)
    })
  }, [supabase])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Page</h1>

      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Auth Store</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                isAuthenticated: authStore.isAuthenticated,
                hasToken: !!authStore.token,
                tokenLength: authStore.token?.length,
                user: authStore.user,
                tokenExpiresAt: authStore.tokenExpiresAt,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Supabase Session</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                hasSession: !!supabaseSession,
                hasAccessToken: !!supabaseSession?.access_token,
                tokenLength: supabaseSession?.access_token?.length,
                user: supabaseSession?.user
                  ? {
                      id: supabaseSession.user.id,
                      email: supabaseSession.user.email,
                    }
                  : null,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">LocalStorage</h2>
          <button
            onClick={() => {
              const authStorage = localStorage.getItem('auth-storage')
              alert('Check console for auth-storage')
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Check Auth Storage
          </button>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">URL</h2>
          <p className="text-xs break-all">{typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
        </div>
      </div>
    </div>
  )
}
