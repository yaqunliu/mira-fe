"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import creationApi from "@/lib/api/creation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ICreation, CreationStatus, CreationStatusMap } from "@/types/creation";
import { useAuthStore } from "@/stores/auth";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

export function CreationOverview() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;
  const { isAuthenticated, token } = useAuthStore();
  const { loading: authLoading } = useSupabaseAuth();

  const { data: creationsResponse, isLoading } = useQuery({
    queryKey: ["creations"],
    queryFn: () => creationApi.queryCreations({ page: 1, page_size: 100 }),
    // 只要有 token 就可以请求,不需要等待 authLoading
    // 因为请求拦截器会自动从 Supabase 获取 token (如果 store 中没有)
    enabled: !!token || isAuthenticated,
    retry: 1, // 如果首次失败,重试一次
  });
  // API 返回格式: { success: true, data: { items: [...] } } 或 { success: true, data: [...] }
  const responseData = (creationsResponse as any)?.data;
  const creations = responseData?.items || (Array.isArray(responseData) ? responseData : []);
  const displayCreations = creations.slice(0, 3); // 只显示前3个

  const handleViewMore = () => {
    router.push(`/${locale}/creations`);
  };

  // 所有创作都可以点击进入详情
  const handleCreationClick = (creation: ICreation) => {
    const creationUuid = (creation as any).uuid || creation.creation_id;
    router.push(`/${locale}/create?creationId=${creationUuid}`);
  };

  const getStatusBadge = (status: ICreation["status"]) => {
    const statusInfo = CreationStatusMap[status as keyof typeof CreationStatusMap] || { label: t("common.unknown"), color: "bg-gray-500" };
    
    let displayLabel = statusInfo.label;
    let bgColor = statusInfo.color;
    
    if (status === CreationStatus.COMPLETED) {
      displayLabel = t("common.completed");
      bgColor = "bg-green-600";
    } else if (status === CreationStatus.FAILED) {
      displayLabel = t("common.error");
      bgColor = "bg-red-500";
    } else {
      displayLabel = t("common.inProgress");
      bgColor = "bg-blue-500";
    }

    return (
      <Badge variant="default" className={cn("text-xs text-white", bgColor ?? "")}>
        {displayLabel}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-md aspect-[16/9] w-full skeleton" />
        ))}
      </div>
    );
  }

  if (creations.length === 0) {
    return (
      <div className="text-center py-6">
        <Play className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          {t("home.noVideos")}
        </p>
        <Button
          size="sm"
          onClick={() => router.push(`/${locale}/create`)}
          className="text-xs"
        >
          {t("home.startCreating")}
        </Button>
      </div>
    );
  }

  // 统一渲染创作卡片（不直接播放视频）
  const renderCreationContent = (creation: ICreation) => {
    // 获取封面图：优先使用场景的第一张分镜图
    const coverImage = creation.scenes?.[0]?.shots?.[0]?.image_url;
    
    return (
      <div className="relative aspect-[16/9] rounded-md overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
        {/* 封面背景 */}
        {coverImage ? (
          <img
            src={coverImage}
            alt={creation.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/90 via-pink-500/90 to-red-500/90 dark:from-purple-600/90 dark:via-pink-700/90 dark:to-red-800/90" />
        )}

        {/* 遮罩层 */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />

        {/* 视频信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white line-clamp-1 flex-1 min-w-0 mr-2">
            {creation.title}
          </h3>
          {getStatusBadge(creation.status)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 创作网格布局 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayCreations.map((creationItem: ICreation) => (
          <div
            key={(creationItem as any).uuid || creationItem.creation_id}
            onClick={() => handleCreationClick(creationItem)}
            className="group cursor-pointer"
          >
            {renderCreationContent(creationItem)}
          </div>
        ))}

        {/* 查看更多卡片 */}
        {creations.length > 0 && (
          <div onClick={handleViewMore} className="group cursor-pointer">
            <div className="relative aspect-[16/9] rounded-md overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border-2 border-dashed border-slate-300 dark:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-700/50 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-700/50">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t("home.viewMore")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
