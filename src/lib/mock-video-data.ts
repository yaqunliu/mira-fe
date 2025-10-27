import type { Video } from '@/types'

export const mockVideos: Video[] = [
  {
    id: "video-1",
    title: "不死之帝王 - 第1章",
    description: "帝王的崛起之路",
    novelId: "1",
    chapterId: "chapter-1",
    videoUrl: "https://zhuluoji.cn-sh2.ufileos.com/images-frontend/test/video.mp4",
    thumbnailUrl: "/amu.png",
    duration: 180,
    status: "completed",
    audioUrl: "/mock/audio.mp3",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z"
  },
  {
    id: "video-2",
    title: "修仙传 - 第1章",
    description: "修仙之路的开端",
    novelId: "2",
    chapterId: "chapter-1",
    videoUrl: "",
    thumbnailUrl: "/anduming.png",
    duration: 240,
    step: "script",
    status: "generating",
    audioUrl: "/mock/audio.mp3",
    createdAt: "2024-01-16T00:00:00Z",
    updatedAt: "2024-01-16T00:00:00Z"
  },
  {
    id: "video-3",
    title: "武侠小说 - 第1章",
    description: "江湖侠客的传奇故事",
    novelId: "3",
    chapterId: "chapter-1",
    videoUrl: "",
    thumbnailUrl: "/atian.png",
    duration: 210,
    step: "material",
    status: "generating",
    audioUrl: "/mock/audio.mp3",
    createdAt: "2024-01-17T00:00:00Z",
    updatedAt: "2024-01-17T00:00:00Z"
  },
  {
    id: "video-4",
    title: "哪吒传奇 - 第1章",
    description: "哪吒的诞生",
    novelId: "4",
    chapterId: "chapter-1",
    videoUrl: "",
    thumbnailUrl: "/amu.png",
    duration: 195,
    status: "failed",
    createdAt: "2024-01-18T00:00:00Z",
    updatedAt: "2024-01-18T00:00:00Z"
  }
]

