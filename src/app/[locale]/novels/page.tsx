"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  BookOpen,
  Calendar,
  User,
  MoreHorizontal,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { novelApi } from "@/lib/api/novel";
import { formatDate } from "@/lib/utils";
import type { Novel } from "@/types";
import { NovelUploadModal } from "@/components/modals/novel-upload-modal";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function NovelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;

  const {
    data: novelsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["novels"],
    queryFn: () => novelApi.getNovels(),
  });

  const novels = (novelsResponse as any)?.data?.data || [];

  const filteredNovels = novels.filter(
    (novel: any) =>
      novel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      novel.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col">
      {/* 页头 - 统一放在最外层 */}
      <div className="flex justify-between">
        <div
          className="flex items-center gap-1 m-3"
          onClick={() => router.push(`/${params?.locale}`)}
        >
          <ChevronLeft className="w-4 h-4 text-primary" />
          <h1 className="text-lg text-gradient-primary">小说列表</h1>
        </div>
      </div>
      <div className="h-[1px] w-full divider-primary mb-4" />

      {/* 内容区域 - 根据状态显示不同内容 */}
      {isLoading ? (
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg aspect-[4/3] w-full bg-card-custom skeleton"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              加载小说列表失败，请稍后重试。
            </p>
          </div>
        </div>
      ) : novels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无小说</h3>
            <p className="text-muted-foreground mb-6">
              开始上传小说进行视频创作吧
            </p>
            <Button onClick={() => setUploadModalOpen(true)}>
              <Plus className="h-4 w-4" />
              上传小说
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
          <div className="flex justify-between items-center gap-4">
            <Input
              placeholder="搜索小说..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="flex-1 h-[36px] max-w-md"
            />
            <Button onClick={() => setUploadModalOpen(true)}>
              <Plus className="h-4 w-4" />
              上传小说
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNovels.map((novel: any) => (
              <div key={novel.id} className="bg-card-custom rounded-lg p-4" onClick={() => router.push(`/${locale}/novels/${novel.id}`)}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="text-base font-bold line-clamp-2 text-primary">
                      {novel.title}
                    </div>
                    <div className="text-sm flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{novel.author}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {novel.description && (
                    <p className="text-sm line-clamp-2">{novel.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1 text-secondary">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(novel.createdAt)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="default"
                        className="bg-amber-800/20 text-amber-600"
                      >
                        共 {novel.chapters.length} 章
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 上传弹窗 */}
      <NovelUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
    </div>
  );
}
