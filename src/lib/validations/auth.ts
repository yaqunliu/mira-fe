import { z } from "zod"

// zod schema 在模块作用域求值，拿不到 useTranslations，而当前也没有任何
// <FormMessage /> 渲染这些 message（novel-upload.tsx 用了 resolver 但不渲染 errors）。
// 因此这里用英文字面量：一旦将来接上表单错误显示，出来的就是正确英文，
// 而不是未翻译的 key 路径。要做完整 i18n 就把 schema 改成接收 t 的工厂函数。

export const loginSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(20, "Username cannot exceed 20 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(20, "Username cannot exceed 20 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
