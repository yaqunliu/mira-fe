import type { Novel, Chapter, Video, Character } from '@/types'

export const mockNovels: Novel[] = [
  {
    id: '1',
    title: 'The Last Dragon',
    author: 'Sarah Johnson',
    description: 'A fantasy adventure about a young mage who discovers the last dragon in the world.',
    coverImage: '/api/placeholder/300/400',
    status: 'completed',
    chapters: [],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Space Odyssey',
    author: 'Mike Chen',
    description: 'An epic space adventure across the galaxy.',
    coverImage: '/api/placeholder/300/400',
    status: 'processing',
    chapters: [],
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  },
]

export const mockChapters: Chapter[] = [
  {
    id: '1-1',
    novelId: '1',
    title: 'The Discovery',
    content: 'In the quiet village of Millbrook, young Emma discovered an ancient book in her grandmother\'s attic. The book was bound in leather that seemed to shimmer with an otherworldly light. As she opened it, the pages glowed softly, and she could hear whispers in a language she didn\'t understand.',
    order: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '1-2',
    novelId: '1',
    title: 'The First Spell',
    content: 'Emma carefully read the first spell in the book. The words seemed to dance on the page, and as she spoke them aloud, her room filled with a warm, golden light. She could feel power coursing through her veins, a sensation both thrilling and terrifying.',
    order: 2,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '1-3',
    novelId: '1',
    title: 'The Dragon Awakens',
    content: 'Deep in the mountains, the last dragon stirred from its thousand-year slumber. It could sense the awakening of magic in the world, and it knew that its time had come to reveal itself to humanity once more.',
    order: 3,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
]

export const mockVideos: Video[] = [
  {
    id: '1',
    title: 'The Last Dragon - Chapter 1',
    description: 'The Discovery of the ancient book',
    novelId: '1',
    chapterId: '1-1',
    videoUrl: '/api/placeholder/video1.mp4',
    thumbnailUrl: '/api/placeholder/400/225',
    duration: 180,
    status: 'completed',
    audioUrl: '/api/placeholder/audio1.mp3',
    subtitles: [
      {
        id: '1',
        startTime: 0,
        endTime: 5,
        text: 'In the quiet village of Millbrook...',
      },
      {
        id: '2',
        startTime: 5,
        endTime: 10,
        text: 'young Emma discovered an ancient book...',
      },
    ],
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-01-16T09:00:00Z',
  },
  {
    id: '2',
    title: 'The Last Dragon - Chapter 2',
    description: 'The First Spell',
    novelId: '1',
    chapterId: '1-2',
    videoUrl: '/api/placeholder/video2.mp4',
    thumbnailUrl: '/api/placeholder/400/225',
    duration: 165,
    status: 'generating',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
]

export const mockCharacters: Character[] = [
  {
    id: '1',
    name: 'Emma',
    description: 'A young mage with curly red hair and bright green eyes',
    imageUrl: '/api/placeholder/200/200',
    prompt: 'young woman, red curly hair, green eyes, mage robes, fantasy art style',
    style: 'fantasy',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'The Last Dragon',
    description: 'A majestic golden dragon with ancient wisdom in its eyes',
    imageUrl: '/api/placeholder/200/200',
    prompt: 'golden dragon, majestic, ancient, wise, fantasy art style',
    style: 'fantasy',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
]

// 更新小说数据，添加章节
mockNovels[0].chapters = mockChapters.filter(ch => ch.novelId === '1')
