"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Play, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { videoApi } from "@/lib/api/video";
import { useQuery } from "@tanstack/react-query";
import { cn, formatDuration } from "@/lib/utils";
import { Video } from "@/types";

interface VideoOverviewItem {
  id: string;
  title: string;
  thumbnailUrl?: string;
  duration: number;
  status: "generating" | "completed" | "failed";
}

export function VideoOverview() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;

  const { data: videosResponse, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: () => videoApi.getVideos(),
  });

  const videos = (videosResponse as any)?.data?.data || [];
  const displayVideos = videos.slice(0, 3); // 只显示前3个视频

  const handleViewMore = () => {
    router.push(`/${locale}/videos`);
  };

  const handleVideoClick = (video: Video) => {
    if (video.status === "generating") {
      router.push(`/${locale}/create?video=${video.id}&step=${video.step}`);
    }
  };

  const getStatusBadgeVideo = (status: Video["status"]) => {
    const statusMap = {
      generating: { label: "生成中", color: "bg-blue-500" },
      completed: { label: "已完成", color: "bg-green-500" },
      failed: { label: "失败", color: "bg-red-500" },
    };
    return statusMap[status];
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

  if (videos.length === 0) {
    return (
      <div className="text-center py-6">
        <Play className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          {t("home.暂无视频")}
        </p>
        <Button
          size="sm"
          onClick={() => router.push(`/${locale}/create`)}
          className="text-xs"
        >
          {t("home.开始制作")}
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: Video["status"]) => {
    const statusMap = {
      generating: {
        label: "进行中",
        variant: "default" as const,
        className: "bg-blue-600/50",
      },
      completed: {
        label: "已完成",
        variant: "default" as const,
        className: "bg-green-700/80",
      },
      failed: {
        label: "出错了",
        variant: "destructive" as const,
        className: "bg-red-500",
      },
    };

    const { label, variant, className } = statusMap[status];
    return (
      <Badge variant={variant} className={cn("text-xs", className ?? "")}>
        {label}
      </Badge>
    );
  };  

  const renderVideoContent = (video: Video) => {
    if (video.videoUrl) {
      return (
        <video
          src={video.videoUrl}
          controls
          className="w-full h-full object-cover rounded-md"
        />
      );
    }
    return (
      <div className="relative aspect-[16/9] rounded-md overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
        {/* 缩略图背景 */}
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/90 via-pink-500/90 to-red-500/90 dark:from-purple-600/90 dark:via-pink-700/90 dark:to-red-800/90" />
        )}

        {/* 遮罩层 */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />

        {/* 播放按钮 */}
        {/* <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/90 dark:bg-white/80 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <Play className="w-4 h-4 text-slate-800 ml-1" fill="currentColor" />
          </div>
        </div> */}

        {/* 视频信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white line-clamp-1">
            {video.title}
          </h3>
          {getStatusBadge(video.status)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 视频网格布局 */}
      <div className="grid grid-cols-2 gap-3">
        {displayVideos.map((video: Video) => (
          <div
            key={video.id}
            onClick={() => handleVideoClick(video)}
            className="group cursor-pointer"
          >
            {renderVideoContent(video)}
          </div>
        ))}

        {/* 查看更多卡片 */}
        {videos.length > 3 && (
          <div onClick={handleViewMore} className="group cursor-pointer">
            <div className="relative aspect-[16/9] rounded-md overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border-2 border-dashed border-slate-300 dark:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-700/50 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-700/50">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t("home.查看更多")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
