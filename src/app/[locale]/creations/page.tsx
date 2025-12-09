"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Play, Plus, ChevronRight, Trash2 } from "lucide-react";
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

// 左滑删除创作卡片组件
function SwipeableCreationCard({
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
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const deleteThreshold = -80;

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
      setTranslateX(-80);
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
          <span className="text-xs">{isDeleting ? t("creation.deleteInProgress") : t("creation.delete")}</span>
        </button>
      </div>

      {/* 卡片内容 */}
      <div
        className={cn(
          "cursor-pointer group transition-all hover:shadow-lg relative bg-card-custom rounded-lg overflow-hidden",
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
        {/* 封面图 */}
        <div className="relative w-full bg-zinc-800 overflow-hidden aspect-video">
          {creation.scenes?.[0]?.shots?.[0]?.image_url ? (
            <img
              src={creation.scenes[0].shots[0].image_url}
              alt={creation.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800">
              <Play className="w-12 h-12 text-zinc-500" />
            </div>
          )}
          
          {/* 简单遮罩层 */}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
        </div>

        {/* 信息区域 */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="text-base line-clamp-1 font-bold">
                {creation.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(creation.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center ml-2 flex-shrink-0">
              {getStatusBadge(creation.status)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    queryKey: ["creations", currentPage, pageSize, debouncedSearchTerm],
    queryFn: async () => {
      const result = await creationApi.queryCreations({
        page: currentPage,
        page_size: pageSize,
        title: debouncedSearchTerm || undefined,
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
    const statusInfo = CreationStatusMap[status] || { label: t("common.unknown"), color: "bg-gray-500" };
    
    let displayLabel = statusInfo.label;
    let bgColor = statusInfo.color;
    
    if (status === CreationStatus.COMPLETED) {
      displayLabel = t("common.completed");
      bgColor = "bg-green-600";
    } else if (status === CreationStatus.FAILED) {
      displayLabel = t("common.failed");
      bgColor = "bg-red-500";
    } else {
      displayLabel = t("common.inProgress");
      bgColor = "bg-blue-500";
    }

    return (
      <Badge className={cn("text-xs text-white", bgColor)}>
        {displayLabel}
      </Badge>
    );
  };

  const handleCreationClick = (creation: ICreation) => {
    const creationUuid = (creation as any).uuid || creation.creation_id;
    router.push(`/${locale}/create?creationId=${creationUuid}&from=creations`);
  };

  const handleDelete = (creationId: string) => {
    setDeletingId(creationId);
    deleteMutation.mutate(creationId);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 页头 */}
      <div className="flex justify-between">
        <div
          className="flex items-center gap-1 m-3 cursor-pointer"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-4 h-4 text-primary" />
          <h1 className="text-lg text-gradient-primary">{t("creation.creationList")}</h1>
        </div>
      </div>
      <div className="h-[1px] w-full divider-primary mb-4" />

      {/* 内容区域 */}
      <PullToRefresh onRefresh={handleRefresh} className="flex-1 px-4 pb-8">
        <div className="space-y-4">
          {/* 搜索和新建 - 始终显示 */}
          <div className="flex justify-between items-center gap-4">
            <Input
              placeholder={t("creation.searchCreation")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md"
            />
            <Link href={`/${locale}/create?from=creations`}>
              <Button icon={<Plus className="h-4 w-4" />}>{t("creation.createCreation")}</Button>
            </Link>
          </div>

          {/* 内容区域 */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg aspect-[16/9] w-full skeleton"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground">
                  {t("creation.loadingFailed")}
                </p>
              </div>
            </div>
          ) : creations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {debouncedSearchTerm ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2">{t("creation.noSearchResults")}</h3>
                    <p className="text-muted-foreground mb-6">
                      {t("creation.noSearchResultsDescription")}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold mb-2">{t("creation.noCreations")}</h3>
                    <p className="text-muted-foreground mb-6">
                      {t("creation.noCreationsDescription")}
                    </p>
                    <Link href={`/${locale}/create?from=creations`}>
                      <Button>{t("creation.createCreation")}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* 创作列表 - 左滑删除 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creations.map((creation: ICreation) => (
                  <SwipeableCreationCard
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
                    {t("creation.previousPage")}
                  </Button>

                  <span className="text-sm text-muted-foreground px-4">
                    {t("creation.pageInfo", { current: currentPage, total: totalPages })}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    {t("creation.nextPage")}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* 总数 */}
              <div className="text-center text-sm text-muted-foreground">
                {t("creation.totalCreations", { total })}
              </div>
            </>
          )}
        </div>
      </PullToRefresh>
      <ConfirmDialogComponent />
    </div>
  );
}
