"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, ChevronLeft, ChevronRight, Trash2, Search, Sparkles, Film, ImageOff, Clapperboard, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import creationApi from "@/lib/api/creation";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ICreation, CreationStatus, CreationStatusMap } from "@/types/creation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/hooks/use-confirm";

// 创作卡片组件
function CreationCard({
  creation,
  onClick,
  onDelete,
  isDeleting,
  getStatusBadge,
  t,
  confirm,
}: {
  creation: ICreation;
  onClick: () => void;
  onDelete: (creationId: string) => void;
  isDeleting: boolean;
  getStatusBadge: (status: CreationStatus) => React.ReactNode;
  t: any;
  confirm: (options?: any) => Promise<boolean>;
}) {
  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: t("creation.delete"),
      description: t("creation.deleteConfirm"),
      confirmText: t("common.confirm") || "确认",
      cancelText: t("common.cancel") || "取消",
      variant: "destructive",
    });
    if (confirmed) {
      onDelete(creation.uuid);
    }
  };

  return (
    <div className="relative rounded-2xl">
      {/* 卡片内容 - Claymorphism 设计 */}
      <div
        className={cn(
          "cursor-pointer group transition-all relative rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-white to-gray-50/80",
          "shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]",
          "hover:shadow-[6px_6px_12px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] hover:scale-[1.02]",
          "transition-transform duration-200"
        )}
        onClick={onClick}
      >
        {/* 封面图 */}
        <div className="relative w-full overflow-hidden aspect-video">
          {creation.scenes?.[0]?.shots?.[0]?.image_url ? (
            <>
              <img
                src={creation.scenes[0].shots[0].image_url}
                alt={creation.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* 渐变遮罩 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800/50">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
              
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-white/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 shadow-sm backdrop-blur-sm">
                  <ImageOff className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                </div>
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 tracking-widest">
                  暂无预览
                </span>
              </div>
            </div>
          )}

          {/* 播放图标覆盖层 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="p-4 bg-white/20 dark:bg-black/40 backdrop-blur-sm rounded-full">
              <Play className="w-12 h-12 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* 信息区域 */}
        <div className="p-4 bg-gradient-to-b from-transparent to-white/50">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <h3 className="text-base line-clamp-1 font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent group-hover:text-[#ADD8E6] transition-colors">
                {creation.title}
              </h3>
              <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 px-3 py-1 rounded-lg shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-clip-text text-transparent">
                <Film className="w-3.5 h-3.5 text-[#ADD8E6]" />
                <span>{new Date(creation.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center flex-shrink-0">
              {getStatusBadge(creation.status)}
            </div>
          </div>
        </div>
      </div>

      {/* 删除按钮 - 右上角固定位置 */}
      <button
        onClick={handleDeleteClick}
        disabled={isDeleting}
        className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#F69689] text-white shadow-[4px_4px_8px_rgba(253,188,180,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={t("creation.delete")}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function CreationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creationTypeFilter, setCreationTypeFilter] = useState<string>("all");
  const pageSize = 12;
  const t = useTranslations();
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirm();

  const params = useParams();
  const locale = params?.locale as string;
  const router = useRouter();
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
    data: creationsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["creations", currentPage, pageSize, debouncedSearchTerm, creationTypeFilter],
    queryFn: async () => {
      const result = await creationApi.queryCreations({
        page: currentPage,
        page_size: pageSize,
        title: debouncedSearchTerm || undefined,
        creation_type: creationTypeFilter !== "all" ? creationTypeFilter : undefined,
      });
      return result;
    },
  });

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // 删除创作
  const deleteMutation = useMutation({
    mutationFn: (creationId: string) => creationApi.deleteCreation(creationId),
    onSuccess: () => {
      toast.success(t("creation.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["creations"] });
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("creation.deleteFailed"));
      setDeletingId(null);
    },
  });

  // 处理 API 响应数据
  const responseData = creationsResponse as any;
  const creations: ICreation[] = responseData?.data?.items || responseData?.data || [];
  const total = responseData?.data?.total || creations.length;
  const totalPages = Math.ceil(total / pageSize);

  const getStatusBadge = (status: CreationStatus) => {
    let displayLabel = t("common.inProgress");
    let bgGradient = "bg-gradient-to-r from-[#ADD8E6] to-[#ADD8E6]/80";

    if (status === CreationStatus.COMPLETED) {
      displayLabel = t("common.completed");
      bgGradient = "bg-gradient-to-r from-[#22C55E] to-[#16A34A]";
    } else if (status === CreationStatus.FAILED) {
      displayLabel = t("common.failed");
      bgGradient = "bg-gradient-to-r from-[#FDBCB4] to-[#F9A899]";
    }

    return (
      <Badge className={cn("text-xs text-white", bgGradient, "shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]")}>
        {displayLabel}
      </Badge>
    );
  };

  const handleCreationClick = (creation: ICreation) => {
    const creationUuid = creation.uuid;
    
    // chat 类型或 agent 模式都跳转到 /create-agent
    if (creation.creation_type === "chat" || creation.workflow_mode === "agent") {
      window.open(`/${locale}/create-agent?creationId=${creationUuid}`, '_blank', 'noopener,noreferrer');
    } else {
      // 传统模式跳转到 /dynamic-comic-editor
      window.open(`/${locale}/dynamic-comic-editor?taskId=${creationUuid}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = (creationId: string) => {
    setDeletingId(creationId);
    deleteMutation.mutate(creationId);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#FDBCB4]/20 via-[#ADD8E6]/20 to-white">
      {/* 页头 - 现代化设计 */}
      <div className="relative overflow-hidden">
        {/* 装饰性背景 */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#FDBCB4]/20 rounded-full blur-3xl" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#ADD8E6]/20 rounded-full blur-3xl" />

        <div className="relative z-10 container mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#22C55E]" />
              {t("creation.creationList")}
            </h1>
          </div>
        </div>
      </div>
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#ADD8E6]/30 to-transparent mb-6" />

      {/* 内容区域 */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 px-4 pb-8">
        <div className="container mx-auto space-y-6">
          {/* 搜索和筛选 - 现代化设计 */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex flex-1 gap-3 max-w-2xl">
              {/* 搜索框 */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADD8E6]" />
                <Input
                  placeholder={t("creation.searchCreation")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] hover:-translate-y-0.5 transition-all duration-200"
                />
              </div>
              
              {/* 类型筛选 */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCreationTypeFilter("all");
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "h-12 px-4 rounded-xl font-medium transition-all duration-200 flex items-center gap-2",
                    creationTypeFilter === "all"
                      ? "bg-gradient-to-r from-[#ADD8E6] to-[#87CEEB] text-white shadow-[4px_4px_8px_rgba(173,221,230,0.3)]"
                      : "bg-white text-gray-600 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.3)]"
                  )}
                >
                  <Film className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("creation.filterAll")}</span>
                </button>
                <button
                  onClick={() => {
                    setCreationTypeFilter("chapter");
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "h-12 px-4 rounded-xl font-medium transition-all duration-200 flex items-center gap-2",
                    creationTypeFilter === "chapter"
                      ? "bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] text-white shadow-[4px_4px_8px_rgba(253,188,180,0.3)]"
                      : "bg-white text-gray-600 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.3)]"
                  )}
                >
                  <Clapperboard className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("creation.filterAnime")}</span>
                </button>
                <button
                  onClick={() => {
                    setCreationTypeFilter("chat");
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "h-12 px-4 rounded-xl font-medium transition-all duration-200 flex items-center gap-2",
                    creationTypeFilter === "chat"
                      ? "bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-[4px_4px_8px_rgba(34,197,94,0.3)]"
                      : "bg-white text-gray-600 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.3)]"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("creation.filterAI")}</span>
                </button>
              </div>
            </div>
            
            <Link href={`/${locale}/create-dynamic-comic`}>
              <Button
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#F69689] text-white shadow-[4px_4px_8px_rgba(253,188,180,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(253,188,180,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all duration-200 hover:scale-105"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t("creation.createCreation")}
              </Button>
            </Link>
          </div>

          {/* 内容区域 */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl aspect-video w-full bg-gradient-to-br from-white to-gray-50/80 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] animate-pulse overflow-hidden"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="w-full h-2/3 bg-gradient-to-br from-[#ADD8E6]/20 to-[#FDBCB4]/20" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 rounded w-3/4 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]" />
                    <div className="h-3 bg-gradient-to-r from-[#ADD8E6]/20 to-[#ADD8E6]/10 rounded w-1/2 shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="p-6 bg-red-100 dark:bg-red-900/30 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                  <Play className="h-12 w-12 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t("creation.loadingFailed")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please try again later
                </p>
              </div>
            </div>
          ) : creations.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-6 max-w-md">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-400/10 dark:bg-purple-400/5 blur-3xl rounded-full" />
                  <div className="relative p-8 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full w-32 h-32 mx-auto flex items-center justify-center">
                    <Play className="h-16 w-16 text-purple-500 dark:text-purple-400 animate-pulse" />
                  </div>
                </div>
                {debouncedSearchTerm ? (
                  <>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("creation.noSearchResults")}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t("creation.noSearchResultsDescription")}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("creation.noCreations")}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t("creation.noCreationsDescription")}
                    </p>
                    <Link href={`/${locale}/create-dynamic-comic`}>
                      <Button className="h-12 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transition-all duration-200 hover:scale-105">
                        <Plus className="h-5 w-5 mr-2" />
                        {t("creation.createCreation")}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* 创作列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creations.map((creation: ICreation) => (
                  <CreationCard
                    key={creation.uuid}
                    creation={creation}
                    onClick={() => handleCreationClick(creation)}
                    onDelete={handleDelete}
                    isDeleting={deletingId === creation.uuid}
                    getStatusBadge={getStatusBadge}
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
                        : "hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:scale-105"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t("creation.previousPage")}
                  </Button>

                  <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-purple-200 dark:border-purple-800">
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      {t("creation.pageInfo", { current: currentPage, total: totalPages })}
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
                        : "hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:scale-105"
                    )}
                  >
                    {t("creation.nextPage")}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* 总数 */}
              <div className="text-center pt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  {t("creation.totalCreations", { total })}
                </div>
              </div>
            </>
          )}
        </div>
      </PullToRefresh>
      <ConfirmDialogComponent />
    </div>
  );
}
