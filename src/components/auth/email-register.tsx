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
import { Eye, EyeOff } from 'lucide-react'

const emailRegisterSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

type EmailRegisterFormData = z.infer<typeof emailRegisterSchema>

interface EmailRegisterProps {
  onSuccess?: () => void
}

export function EmailRegister({ onSuccess }: EmailRegisterProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailValidated, setEmailValidated] = useState(false)
  const [validatedEmail, setValidatedEmail] = useState('')
  const supabase = createClient()
  
  // 第一步：邮箱验证表单
  const emailForm = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.string().email('请输入有效的邮箱地址') })),
    defaultValues: {
      email: '',
    },
  })

  // 第二步：密码注册表单
  const passwordForm = useForm<EmailRegisterFormData>({
    resolver: zodResolver(emailRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  // 验证邮箱
  const onEmailSubmit = async (data: { email: string }) => {
    const result = z.string().email().safeParse(data.email)
    if (result.success) {
      setEmailValidated(true)
      setValidatedEmail(data.email)
      passwordForm.setValue('email', data.email)
    }
  }

  // 提交注册
  const onPasswordSubmit = async (data: EmailRegisterFormData) => {
    try {
      // 使用 Supabase 邮箱注册
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      })

      if (error) throw error

      if (authData.user) {
        toast.success('注册成功！请检查您的邮箱以验证账户')
        
        if (onSuccess) {
          onSuccess()
        } else {
          // 跳转到登录页面，提示用户验证邮箱
          router.push(`/auth/login?message=${encodeURIComponent('请检查您的邮箱以验证账户')}`)
        }
      }
    } catch (error: any) {
      toast.error(error.message || '注册失败，请重试')
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
                        field.onBlur(e)
                        if (e.target.value && z.string().email().safeParse(e.target.value).success) {
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
                  <FormLabel className="text-gray-700 font-medium mb-2">密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="至少6个字符"
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

            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium mb-2">确认密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="再次输入密码"
                        className="h-12 clay-inset w-full placeholder:text-gray-400 focus:ring-2 focus:ring-green-200 transition-all pr-12"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-4 hover:bg-transparent text-gray-400 hover:text-vibrant-green"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
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
              {passwordForm.formState.isSubmitting ? '注册中...' : '注册'}
            </Button>
          </form>
        </Form>
      )}
    </div>
  )
}

