"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  BookOpen,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { novelApi } from "@/lib/api/novel";
import type { Novel } from "@/types";
import { NovelUploadModal } from "@/components/modals/novel-upload-modal";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// 格式化日期
function formatDateTime(dateString: string): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
}

// 左滑删除卡片组件
function SwipeableNovelCard({
  novel,
  onClick,
  onDelete,
  isDeleting,
  t,
}: {
  novel: Novel;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
  t: any;
}) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t("novel.deleteConfirm"))) {
      onDelete(e);
    }
  };
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const deleteThreshold = -80; // 滑动超过这个值显示删除按钮

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startXRef.current;
    const newTranslate = Math.min(0, Math.max(-100, currentXRef.current + diff));
    setTranslateX(newTranslate);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateX < deleteThreshold) {
      setTranslateX(-80); // 固定在删除按钮显示位置
    } else {
      setTranslateX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startXRef.current;
    const newTranslate = Math.min(0, Math.max(-100, currentXRef.current + diff));
    setTranslateX(newTranslate);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (translateX < deleteThreshold) {
      setTranslateX(-80);
    } else {
      setTranslateX(0);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (translateX < deleteThreshold) {
        setTranslateX(-80);
      } else {
        setTranslateX(0);
      }
    }
  };

  const handleClick = () => {
    if (Math.abs(translateX) < 5) {
      onClick();
    }
  };

  const handleDelete = (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    if (confirm(t("novel.deleteConfirm"))) {
      onDelete();
    }
  };

  const resetPosition = () => {
    setTranslateX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* 删除按钮背景 */}
      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="w-full h-full flex flex-col items-center justify-center text-white"
        >
          <Trash2 className="w-5 h-5 mb-1" />
          <span className="text-xs">{isDeleting ? t("novel.deleteInProgress") : t("novel.delete")}</span>
        </button>
      </div>

      {/* 卡片内容 */}
      <div
        className={cn(
          "bg-card-custom rounded-lg p-4 cursor-pointer relative transition-transform",
          !isDragging && "transition-transform duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="text-base font-bold line-clamp-2 text-primary">
              {novel.title}
            </div>
            <div className="text-sm flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{novel.author}</span>
            </div>
          </div>
        </div>
        <div className="space-y-3 mt-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1 text-secondary">
              <Calendar className="h-4 w-4" />
              <span>{formatDateTime((novel as any).created_at)}</span>
            </div>
              <Badge
              variant="default"
              className="bg-amber-800/20 text-amber-600"
            >
              {t("novel.totalChapters", { count: novel.chapter_count || 0 })}
            </Badge>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function NovelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 12;
  const t = useTranslations();

  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const queryClient = useQueryClient();

  const {
    data: novelsResponse,
    isLoading,
    error,
    refetch: refetchNovels,
  } = useQuery({
    queryKey: ["novels", currentPage, pageSize],
    queryFn: () => novelApi.getNovels({ page: currentPage, page_size: pageSize }),
  });

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    await refetchNovels();
  }, [refetchNovels]);

  // 删除小说
  const deleteMutation = useMutation({
    mutationFn: (novelId: string) => novelApi.deleteNovel(novelId),
    onSuccess: () => {
      toast.success(t("novel.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["novels"] });
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("novel.deleteFailed"));
      setDeletingId(null);
    },
  });

  // 处理 API 返回数据，兼容多种格式
  const responseData = novelsResponse as any;
  const novels: Novel[] = 
    responseData?.data?.items ||
    responseData?.data ||
    responseData?.items ||
    (Array.isArray(responseData) ? responseData : []);
  
  const total = responseData?.data?.total || responseData?.total || novels.length;
  const totalPages = Math.ceil(total / pageSize);

  // 搜索过滤
  const filteredNovels = novels.filter(
    (novel: Novel) =>
      novel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      novel.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNovelClick = (novelId: string) => {
    router.push(`/${locale}/novels/${novelId}`);
  };

  const handleUploadComplete = (novelId?: string) => {
    setUploadModalOpen(false);
    refetchNovels();
    if (novelId) {
      router.push(`/${locale}/novels/${novelId}`);
    }
  };

  const handleDelete = (novelId: string) => {
    setDeletingId(novelId);
    deleteMutation.mutate(novelId);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 页头 */}
      <div className="flex justify-between">
        <div
          className="flex items-center gap-1 m-3 cursor-pointer"
          onClick={() => router.push(`/${locale}`)}
        >
          <ChevronLeft className="w-4 h-4 text-primary" />
          <h1 className="text-lg text-gradient-primary">{t("novel.novelList")}</h1>
        </div>
      </div>
      <div className="h-[1px] w-full divider-primary mb-4" />

      {/* 内容区域 */}
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
              {t("novel.loadingFailed")}
            </p>
          </div>
        </div>
      ) : novels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("novel.noNovels")}</h3>
            <p className="text-muted-foreground mb-6">
              {t("novel.noNovelsDescription")}
            </p>
            <Button onClick={() => setUploadModalOpen(true)} className="gap-1">
              <Upload className="h-4 w-4" />
              {t("novel.uploadNovel")}
            </Button>
          </div>
        </div>
      ) : (
        <PullToRefresh onRefresh={handleRefresh} className="flex-1 px-4 pb-8">
          <div className="space-y-4">
            {/* 搜索和上传 */}
            <div className="flex justify-between items-center gap-4">
              <Input
                placeholder={t("novel.searchNovel")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-[36px] max-w-md"
              />
              <Button onClick={() => setUploadModalOpen(true)} className="gap-1">
                <Plus className="h-4 w-4" />
                {t("novel.uploadNovel")}
              </Button>
            </div>

            {/* 小说列表 - 左滑删除 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNovels.map((novel: Novel) => (
                <SwipeableNovelCard
                  key={novel.novel_id}
                  novel={novel}
                  onClick={() => handleNovelClick(novel.novel_id)}
                  onDelete={(e) => {
                    e.stopPropagation();
                    handleDelete(novel.novel_id);
                  }}
                  isDeleting={deletingId === novel.novel_id}
                  t={t}
                />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t("novel.previousPage")}
                </Button>

                <span className="text-sm text-muted-foreground px-4">
                  {t("novel.pageInfo", { current: currentPage, total: totalPages })}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  {t("novel.nextPage")}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* 总数 */}
            <div className="text-center text-sm text-muted-foreground">
              {t("novel.totalNovels", { total })}
            </div>
          </div>
        </PullToRefresh>
      )}

      {/* 上传弹窗 */}
      <NovelUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onComplete={handleUploadComplete}
      />
    </div>
  );
}
