"use client";

import { useState, useCallback, useEffect } from "react";
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
  Search,
  Sparkles,
  BookMarked,
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
import { useConfirm } from "@/hooks/use-confirm";

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

// 小说卡片组件
function NovelCard({
  novel,
  onClick,
  onDelete,
  isDeleting,
  t,
  confirm,
}: {
  novel: Novel;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
  t: any;
  confirm: (options?: any) => Promise<boolean>;
}) {
  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: t("novel.delete"),
      description: t("novel.deleteConfirm"),
      confirmText: t("common.confirm") || "确认",
      cancelText: t("common.cancel") || "取消",
      variant: "destructive",
    });
    if (confirmed) {
      onDelete(e);
    }
  };

  return (
    <div className="relative rounded-2xl">
      {/* 卡片内容 - 现代化设计 */}
      <div
        className={cn(
          "cursor-pointer group transition-all relative rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/80",
          "border-2 border-gray-200/50 dark:border-gray-700/50",
          "hover:border-green-400/50 hover:shadow-2xl hover:shadow-green-500/20 hover:scale-[1.02]",
          "transition-transform duration-200"
        )}
        onClick={onClick}
      >
        {/* 装饰性背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-teal-400/5 dark:from-green-400/3 dark:to-teal-400/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10 p-5 space-y-4">
          {/* 标题和作者 */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-2">
                  {novel.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate">{novel.author}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 元信息 */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDateTime((novel as any).created_at)}</span>
            </div>
            <Badge
              className="bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 text-green-700 dark:text-green-300 border-2 border-green-300 dark:border-green-700 font-semibold"
            >
              {t("novel.totalChapters", { count: novel.chapter_count || 0 })}
            </Badge>
          </div>
        </div>
      </div>

      {/* 删除按钮 - 右上角固定位置 */}
      <button
        onClick={handleDeleteClick}
        disabled={isDeleting}
        className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-red-500/90 hover:bg-red-600 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={t("novel.delete")}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function NovelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 9;
  const t = useTranslations();
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirm();

  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const queryClient = useQueryClient();

  // 搜索防抖：300ms 延迟
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // 搜索时重置页码
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: novelsResponse,
    isLoading,
    error,
    refetch: refetchNovels,
  } = useQuery({
    queryKey: ["novels", currentPage, pageSize, debouncedSearchTerm],
    queryFn: () => novelApi.getNovels({ 
      page: currentPage, 
      page_size: pageSize,
      title: debouncedSearchTerm || undefined,
    }),
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

  const handleNovelClick = (novelUuid: string) => {
    router.push(`/${locale}/novels/${novelUuid}`);
  };

  const handleUploadComplete = (novelUuid?: string) => {
    setUploadModalOpen(false);
    refetchNovels();
    if (novelUuid) {
      router.push(`/${locale}/novels/${novelUuid}`);
    }
  };

  const handleDelete = (novelUuid: string) => {
    setDeletingId(novelUuid);
    deleteMutation.mutate(novelUuid);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-green-50/50 via-white to-teal-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* 页头 - 现代化设计 */}
      <div className="relative overflow-hidden">
        {/* 装饰性背景 */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-green-400/10 dark:bg-green-400/5 rounded-full blur-3xl" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-3xl" />

        <div className="relative z-10 container mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => router.push(`/${locale}/workspace`)}
            >
              <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                <ChevronLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-400 dark:to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
                <BookMarked className="w-6 h-6 text-green-500" />
                {t("novel.novelList")}
              </h1>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-green-200 dark:via-green-800/30 to-transparent mb-6" />

      {/* 内容区域 */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 px-4 pb-8">
        <div className="container mx-auto space-y-6">
          {/* 搜索和上传 - 现代化设计 */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400 dark:text-green-500" />
              <Input
                placeholder={t("novel.searchNovel")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-all duration-200 focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
              />
            </div>
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="h-12 px-6 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/40 transition-all duration-200 hover:scale-105"
            >
              <Upload className="h-5 w-5 mr-2" />
              {t("novel.uploadNovel")}
            </Button>
          </div>

          {/* 内容区域 */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl h-40 w-full bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-900 animate-pulse overflow-hidden"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="p-5 space-y-4">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-green-300/30 dark:bg-green-700/20 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="p-6 bg-red-100 dark:bg-red-900/30 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t("novel.loadingFailed")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please try again later
                </p>
              </div>
            </div>
          ) : novels.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-6 max-w-md">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-400/10 dark:bg-green-400/5 blur-3xl rounded-full" />
                  <div className="relative p-8 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 rounded-full w-32 h-32 mx-auto flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-green-500 dark:text-green-400 animate-pulse" />
                  </div>
                </div>
                {debouncedSearchTerm ? (
                  <>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("novel.noSearchResults")}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t("novel.noSearchResultsDescription")}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("novel.noNovels")}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t("novel.noNovelsDescription")}
                    </p>
                    <Button
                      onClick={() => setUploadModalOpen(true)}
                      className="h-12 px-8 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/40 transition-all duration-200 hover:scale-105"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      {t("novel.uploadNovel")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* 小说列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {novels.map((novel: Novel) => (
                  <NovelCard
                    key={novel.novel_id}
                    novel={novel}
                    onClick={() => handleNovelClick(novel.uuid || novel.novel_id)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      handleDelete(novel.uuid || novel.novel_id);
                    }}
                    isDeleting={deletingId === (novel.uuid || novel.novel_id)}
                    t={t}
                    confirm={confirm}
                  />
                ))}
              </div>

              {/* 分页 - 现代化设计 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className={cn(
                      "h-11 px-5 rounded-xl border-2 transition-all duration-200",
                      currentPage <= 1
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:scale-105"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t("novel.previousPage")}
                  </Button>

                  <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 border-2 border-green-200 dark:border-green-800">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      {t("novel.pageInfo", { current: currentPage, total: totalPages })}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className={cn(
                      "h-11 px-5 rounded-xl border-2 transition-all duration-200",
                      currentPage >= totalPages
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:scale-105"
                    )}
                  >
                    {t("novel.nextPage")}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* 总数 */}
              <div className="text-center pt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Sparkles className="w-4 h-4 text-green-500" />
                  {t("novel.totalNovels", { total })}
                </div>
              </div>
            </>
          )}
        </div>
      </PullToRefresh>

      {/* 上传弹窗 */}
      <NovelUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onComplete={handleUploadComplete}
      />
      <ConfirmDialogComponent />
    </div>
  );
}
