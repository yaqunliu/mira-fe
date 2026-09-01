import { z } from "zod"

// zod schema 在模块作用域求值，拿不到 useTranslations，而当前也没有任何
// <FormMessage /> 渲染这些 message（novel-upload.tsx 用了 resolver 但不渲染 errors）。
// 因此这里用英文字面量：一旦将来接上表单错误显示，出来的就是正确英文，
// 而不是未翻译的 key 路径。要做完整 i18n 就把 schema 改成接收 t 的工厂函数。

export const novelUploadSchema = z.object({
  title: z.string().min(1, "Please enter the novel title").max(100, "Title cannot exceed 100 characters"),
  author: z.string().min(1, "Please enter the author name").max(50, "Author name cannot exceed 50 characters"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional(),
})

export const chapterEditSchema = z.object({
  title: z.string().min(1, "Please enter the chapter title").max(100, "Title cannot exceed 100 characters"),
  content: z.string().min(1, "Chapter content cannot be empty"),
})

export const storyboardEditSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  narration: z.string().min(1, "Narration cannot be empty"),
})

export type NovelUploadFormData = z.infer<typeof novelUploadSchema>
export type ChapterEditFormData = z.infer<typeof chapterEditSchema>
export type StoryboardEditFormData = z.infer<typeof storyboardEditSchema>
