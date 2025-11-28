"use client";

import { useState, useRef, useCallback } from "react";
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

// 左滑删除创作卡片组件
function SwipeableCreationCard({
  creation,
  onClick,
  onDelete,
  isDeleting,
  getStatusBadge,
}: {
  creation: ICreation;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  getStatusBadge: (status: CreationStatus) => React.ReactNode;
}) {
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定要删除这个创作吗？删除后无法恢复。")) {
      onDelete();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* 删除按钮背景 */}
      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full h-full flex flex-col items-center justify-center text-white"
        >
          <Trash2 className="w-5 h-5 mb-1" />
          <span className="text-xs">{isDeleting ? "删除中" : "删除"}</span>
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
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 12;

  const params = useParams();
  const locale = params?.locale as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: creationsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["creations", currentPage, pageSize],
    queryFn: async () => {
      const result = await creationApi.queryCreations({
        page: currentPage,
        page_size: pageSize,
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
      toast.success("删除成功");
      queryClient.invalidateQueries({ queryKey: ["creations"] });
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "删除失败");
      setDeletingId(null);
    },
  });

  // 处理 API 响应数据
  const responseData = creationsResponse as any;
  const creations: ICreation[] = responseData?.data?.items || responseData?.data || [];
  const total = responseData?.data?.total || creations.length;
  const totalPages = Math.ceil(total / pageSize);

  // 搜索过滤
  const filteredCreations = creations.filter((creation: ICreation) =>
    creation.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: CreationStatus) => {
    const statusInfo = CreationStatusMap[status] || { label: "未知", color: "bg-gray-500" };
    
    let displayLabel = statusInfo.label;
    let bgColor = statusInfo.color;
    
    if (status === CreationStatus.COMPLETED) {
      displayLabel = "已完成";
      bgColor = "bg-green-600";
    } else if (status === CreationStatus.FAILED) {
      displayLabel = "失败";
      bgColor = "bg-red-500";
    } else {
      displayLabel = "进行中";
      bgColor = "bg-blue-500";
    }

    return (
      <Badge className={cn("text-xs text-white", bgColor)}>
        {displayLabel}
      </Badge>
    );
  };

  const handleCreationClick = (creation: ICreation) => {
    router.push(`/${locale}/create?creationId=${creation.creation_id}`);
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
          <h1 className="text-lg text-gradient-primary">创作列表</h1>
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
                className="rounded-lg aspect-[16/9] w-full skeleton"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              加载创作列表失败，请稀后重试。
            </p>
          </div>
        </div>
      ) : creations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">还没有创作</h3>
            <p className="text-muted-foreground mb-6">
              点击开始创作，从小说中创作视频
            </p>
            <Link href={`/${locale}/create`}>
              <Button>开始创作</Button>
            </Link>
          </div>
        </div>
      ) : (
        <PullToRefresh onRefresh={handleRefresh} className="flex-1 px-4 pb-8">
          <div className="space-y-4">
            {/* 搜索和新建 */}
            <div className="flex justify-between items-center gap-4">
              <Input
                placeholder="搜索创作..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-md"
              />
              <Link href={`/${locale}/create`}>
                <Button icon={<Plus className="h-4 w-4" />}>开始创作</Button>
              </Link>
            </div>

            {/* 创作列表 - 左滑删除 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCreations.map((creation: ICreation) => (
                <SwipeableCreationCard
                  key={creation.creation_id}
                  creation={creation}
                  onClick={() => handleCreationClick(creation)}
                  onDelete={() => handleDelete(creation.creation_id)}
                  isDeleting={deletingId === creation.creation_id}
                  getStatusBadge={getStatusBadge}
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
                  上一页
                </Button>

                <span className="text-sm text-muted-foreground px-4">
                  第 {currentPage} 页 / 共 {totalPages} 页
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* 总数 */}
            <div className="text-center text-sm text-muted-foreground">
              共 {total} 个创作
            </div>
          </div>
        </PullToRefresh>
      )}
    </div>
  );
}
