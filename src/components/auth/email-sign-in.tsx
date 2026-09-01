'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useQueryClient } from '@tanstack/react-query'
import { clearUserDataCache } from '@/lib/utils/clear-user-data'
import { authApi } from '@/lib/api/auth'
import { Eye, EyeOff } from 'lucide-react'
import type { User } from '@/types'
import { waitForSupabaseSession, waitForUserInfoInStore } from '@/lib/utils/wait-for-supabase-token'
import Link from 'next/link'

const emailSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
})

const passwordSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
})

type EmailFormData = z.infer<typeof emailSchema>
type EmailSignInFormData = z.infer<typeof passwordSchema>

interface EmailSignInProps {
  onSuccess?: () => void
}

export function EmailSignIn({ onSuccess }: EmailSignInProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [emailValidated, setEmailValidated] = useState(false)
  const [validatedEmail, setValidatedEmail] = useState('')
  const supabase = createClient()
  const { login } = useAuthStore()
  const queryClient = useQueryClient()
  
  // 第一步：邮箱验证表单
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  })

  // 第二步：密码登录表单
  const passwordForm = useForm<EmailSignInFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // 验证邮箱
  const onEmailSubmit = async (data: EmailFormData) => {
    // 验证邮箱格式
    const result = emailSchema.safeParse(data)
    if (result.success) {
      setEmailValidated(true)
      setValidatedEmail(data.email)
      // 设置密码表单的邮箱值
      passwordForm.setValue('email', data.email)
    }
  }

  // 提交登录
  const onPasswordSubmit = async (data: EmailSignInFormData) => {
    try {
      // 使用 Supabase 邮箱登录
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      
      // 登录成功后清空密码字段
      passwordForm.setValue('password', '')

      if (error) throw error

      if (authData.session) {
        // 登录前清空所有用户相关的 React Query 缓存
        clearUserDataCache(queryClient)

        // 同步用户到后端
        try {
          const syncResponse = await authApi.syncSupabaseUser(authData.session.access_token)
          
          if (syncResponse.data) {
            // 从 JWT token 中解析过期时间和头像
            const payload = JSON.parse(atob(authData.session.access_token.split('.')[1]))
            const userMetadata = payload.user_metadata || {}
            const avatarFromToken = userMetadata.avatar_url || userMetadata.picture || ''
            
            const user: User = {
              id: syncResponse.data.user_id.toString(),
              email: syncResponse.data.email,
              username: syncResponse.data.username,
              avatar: syncResponse.data.avatar || avatarFromToken || '',
              createdAt: syncResponse.data.created_at || new Date().toISOString(),
              updatedAt: syncResponse.data.updated_at || new Date().toISOString(),
            }
            
            const expiresIn = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 3600
            
            // 先登录，确保 token 和用户信息都存储到 store
            login(user, authData.session.access_token, expiresIn)

            // 等待更长时间，确保 store 完全同步到 localStorage
            // 并且让 Zustand 的 persist 中间件完成持久化
            await new Promise(resolve => setTimeout(resolve, 300))

            // 等待用户信息同步到 store（不等待 Supabase session，因为已经在 store 中了）
            await waitForUserInfoInStore(5000, 100)

            toast.success('登录成功')

            if (onSuccess) {
              onSuccess()
            } else {
              // 跳转到 home 页面
              router.push('/home')
            }
          }
        } catch (syncError) {
          // 即使同步失败，也使用 Supabase 用户信息
          const userMetadata = authData.user.user_metadata || {}
          const avatar = userMetadata.avatar_url || userMetadata.picture || ''
          
          const user: User = {
            id: authData.user.id,
            email: authData.user.email || data.email,
            username: authData.user.email?.split('@')[0] || 'user',
            avatar: avatar,
            createdAt: authData.user.created_at || new Date().toISOString(),
            updatedAt: authData.user.updated_at || new Date().toISOString(),
          }
          
          const payload = JSON.parse(atob(authData.session.access_token.split('.')[1]))
          const expiresIn = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 3600
          
          // 先登录，确保 token 和用户信息都存储到 store
          login(user, authData.session.access_token, expiresIn)

          // 等待更长时间，确保 store 完全同步到 localStorage
          // 并且让 Zustand 的 persist 中间件完成持久化
          await new Promise(resolve => setTimeout(resolve, 300))

          // 等待用户信息同步到 store（不等待 Supabase session，因为已经在 store 中了）
          await waitForUserInfoInStore(5000, 100)

          toast.success('登录成功')

          if (onSuccess) {
            onSuccess()
          } else {
            // 跳转到 home 页面
            router.push('/home')
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || '登录失败，请检查邮箱和密码')
    }
  }

  return (
    <div className="space-y-4">
      {!emailValidated ? (
        // 第一步：输入邮箱
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium mb-2">邮箱</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      className="h-12 clay-inset w-full placeholder:text-gray-400 focus:ring-2 focus:ring-green-200 transition-all"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur()
                        // 当失去焦点时，如果邮箱格式正确，自动验证
                        if (e.target.value && emailSchema.safeParse({ email: e.target.value }).success) {
                          emailForm.handleSubmit(onEmailSubmit)()
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full h-12 bg-vibrant-green hover:bg-green-600 text-white font-medium shadow-lg shadow-green-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-300/60"
              disabled={emailForm.formState.isSubmitting || !emailForm.watch('email')}
            >
              继续
            </Button>
          </form>
        </Form>
      ) : (
        // 第二步：输入密码
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
            <div className="clay-sm p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-vibrant-green font-medium">{validatedEmail}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmailValidated(false)
                    setValidatedEmail('')
                    emailForm.reset()
                    passwordForm.reset()
                  }}
                  className="text-xs text-vibrant-green hover:text-green-600 border-green-200 hover:bg-green-50"
                >
                  更改
                </Button>
              </div>
            </div>

            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="text-gray-700 font-medium">密码</FormLabel>
                    <Link
                      href={'/auth/forgot-password'}
                      className="text-xs text-vibrant-green hover:text-green-600 transition-colors"
                    >
                      忘记密码？
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        className="h-12 clay-inset w-full placeholder:text-gray-400 focus:ring-2 focus:ring-green-200 transition-all pr-12"
                        {...field}
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-4 hover:bg-transparent text-gray-400 hover:text-vibrant-green"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 bg-vibrant-green hover:bg-green-600 text-white font-medium shadow-lg shadow-green-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-300/60"
              disabled={passwordForm.formState.isSubmitting}
            >
              {passwordForm.formState.isSubmitting ? '登录中...' : '登录'}
            </Button>
          </form>
        </Form>
      )}
    </div>
  )
}

