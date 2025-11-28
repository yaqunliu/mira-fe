'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/lib/api/auth'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, setLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const params = useParams()
  const locale = params?.locale as string   
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true)
      const response = await authApi.login(data)
      
      if (response.data?.access_token) {
        // 登录成功，保存 token
        const token = response.data.access_token
        // 用用户名作为临时用户信息，后续可以调用 getCurrentUser 获取完整信息
        const user = {
          id: data.username, // 用用户名作为临时 ID
          username: data.username,
          email: '',
          avatar: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        login(user, token)
        toast.success(response.message || '登录成功！')
        router.push(`/${locale}`)
      } else {
        toast.error(response.message || '服务器错误')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className='border-none bg-zinc-800'>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">登录</CardTitle>
            <CardDescription className="text-center">
              输入用户名和密码登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="请输入用户名"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="请输入密码"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <Link
                    href={`/${locale}/auth/forgot-password`}
                    className="text-sm text-primary hover:underline"
                  >
                    忘记密码？
                  </Link>
                </div>

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? '登录中...' : '登录'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">没有账号？</span>
              <Link href={`/${locale}/auth/register`} className="text-primary hover:underline">
                注册
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
