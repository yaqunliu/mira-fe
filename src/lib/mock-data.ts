import type { Novel } from '@/types'

export const mockNovels: Novel[] = [
  {
    id: "1",
    title: "不死之帝王",
    author: "作者A",
    description: "一个关于不死之帝王的故事",
    status: "completed",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    chapters: Array.from({ length: 10 }, (_, i) => ({
      id: `chapter-${i + 1}`,
      novelId: "1",
      chapterId: `chapter-${i + 1}`,
      title: `第${i + 1}章`,
      content: `这是第${i + 1}章的内容...`,
      order: i + 1,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z"
    }))
  },
  {
    id: "2",
    title: "修仙传",
    author: "作者B",
    description: "一个修仙者的传奇故事",
    status: "completed",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
    chapters: Array.from({ length: 20 }, (_, i) => ({
      id: `chapter-${i + 1}`,
      novelId: "2",
      chapterId: `chapter-${i + 1}`,
      title: `第${i + 1}章`,
      content: `这是第${i + 1}章的内容...`,
      order: i + 1,
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z"
    }))
  },
  {
    id: "3",
    title: "武侠小说",
    author: "作者c",
    description: "一个武侠世界的冒险故事",
    status: "completed",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
    chapters: Array.from({ length: 30 }, (_, i) => ({
      id: `chapter-${i + 1}`,
      novelId: "3",
      chapterId: `chapter-${i + 1}`,
      title: `第${i + 1}章`,
      content: `这是第${i + 1}章的内容...`,
      order: i + 1,
      createdAt: "2024-01-03T00:00:00Z",
      updatedAt: "2024-01-03T00:00:00Z"
    }))
  },
  {
    id: "4",
    title: "哪吒传奇",
    author: "作者d",
    description: "哪吒的传奇冒险故事",
    status: "completed",
    createdAt: "2024-01-04T00:00:00Z",
    updatedAt: "2024-01-04T00:00:00Z",
    chapters: Array.from({ length: 25 }, (_, i) => ({
      id: `chapter-${i + 1}`,
      novelId: "4",
      chapterId: `chapter-${i + 1}`,
      title: `第${i + 1}章`,
      content: `这是第${i + 1}章的内容...`,
      order: i + 1,
      createdAt: "2024-01-04T00:00:00Z",
      updatedAt: "2024-01-04T00:00:00Z"
    }))
  }
]
