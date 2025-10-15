'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Plus, BookOpen, Calendar, User, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { novelApi } from '@/lib/api/novel'
import { formatDate } from '@/lib/utils'
import type { Novel } from '@/types'
import { NovelUploadModal } from '@/components/modals/novel-upload-modal'

export default function NovelsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const { data: novelsResponse, isLoading, error } = useQuery({
    queryKey: ['novels'],
    queryFn: () => novelApi.getNovels(),
  })

  console.log(novelsResponse, 'novelsResponse')
  const novels = (novelsResponse as any)?.data?.data || []

  const filteredNovels = novels.filter((novel: any) =>
    novel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    novel.author.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: Novel['status']) => {
    const statusMap = {
      uploading: { label: 'Uploading', variant: 'secondary' as const },
      processing: { label: 'Processing', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'default' as const },
      failed: { label: 'Failed', variant: 'destructive' as const },
    }
    
    const { label, variant } = statusMap[status]
    return <Badge variant={variant}>{label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Novels</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">My Novels</h1>
          <p className="text-muted-foreground">Failed to load novels. Please try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Novels</h1>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Novel
        </Button>
      </div>

      {novels.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No novels yet</h3>
          <p className="text-muted-foreground mb-6">
            Upload your first novel to get started
          </p>
          <Button onClick={() => setUploadModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Novel
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search novels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNovels.map((novel: any) => (
              <Card key={novel.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-2">{novel.title}</CardTitle>
                      <CardDescription className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{novel.author}</span>
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/novels/${novel.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/create?novel=${novel.id}`}>
                            Create Video
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {novel.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {novel.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(novel.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span>{novel.chapters.length} chapters</span>
                        {getStatusBadge(novel.status)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 上传弹窗 */}
      <NovelUploadModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen} 
      />
    </div>
  )
}