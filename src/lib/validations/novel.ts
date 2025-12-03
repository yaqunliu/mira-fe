import { z } from "zod"

export const novelUploadSchema = z.object({
  title: z.string().min(1, "请输入小说标题").max(100, "标题不能超过100个字符"),
  author: z.string().min(1, "请输入作者名称").max(50, "作者名称不能超过50个字符"),
  description: z.string().max(500, "描述不能超过500个字符").optional(),
})

export const chapterEditSchema = z.object({
  title: z.string().min(1, "请输入章节标题").max(100, "标题不能超过100个字符"),
  content: z.string().min(1, "章节内容不能为空"),
})

export const storyboardEditSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  narration: z.string().min(1, "旁白不能为空"),
})

export type NovelUploadFormData = z.infer<typeof novelUploadSchema>
export type ChapterEditFormData = z.infer<typeof chapterEditSchema>
export type StoryboardEditFormData = z.infer<typeof storyboardEditSchema>
