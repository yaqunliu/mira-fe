"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Play, ChevronRight, ImageOff } from "lucide-react";
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
    router.push('/creations');
  };

  // 所有创作都可以点击进入详情
  const handleCreationClick = (creation: ICreation) => {
    const creationUuid = creation.uuid;
    window.open(`/dynamic-comic-editor?taskId=${creationUuid}`, '_blank', 'noopener,noreferrer');
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
          onClick={() => {
            router.push('/create-dynamic-comic');
          }}
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
      <div className="relative aspect-[16/9] rounded-md overflow-hidden shadow-[4px_4px_8px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-6px_-6px_12px_rgba(255,255,255,0.8)] hover:-translate-y-0.5 transition-all duration-300">
        {/* 封面背景 */}
        {coverImage ? (
          <img
            src={coverImage}
            alt={creation.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800/50">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
            
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-white/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 shadow-sm backdrop-blur-sm">
                <ImageOff className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
              </div>
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 tracking-widest">{t("noPreview")}</span>
            </div>
          </div>
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
            <div className="relative aspect-[16/9] rounded-md overflow-hidden shadow-[4px_4px_8px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-6px_-6px_12px_rgba(255,255,255,0.8)] hover:-translate-y-0.5 transition-all duration-300 border-2 border-dashed border-[#ADD8E6]/50 bg-[#ADD8E6]/10 hover:border-[#ADD8E6]/70 hover:bg-[#ADD8E6]/20">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ADD8E6]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ChevronRight className="w-4 h-4 text-[#22C55E]" />
                </div>
                <span className="text-xs font-medium text-[#22C55E]">
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
