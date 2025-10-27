"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { videoApi } from "@/lib/api/video";
import { cn } from "@/lib/utils";
import type { Video } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function VideosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const params = useParams();
  const locale = params?.locale as string;
  const router = useRouter();
  const {
    data: videosResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["videos"],
    queryFn: () => videoApi.getVideos(),
  });

  const videos = (videosResponse as any)?.data?.data || [];

  const filteredVideos = videos.filter((video: Video) =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Video["status"]) => {
    const statusMap = {
      generating: {
        label: "进行中",
        variant: "default" as const,
        className: "bg-blue-600/80",
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


  const handleVideoClick = (video: Video) => {
    if (video.status === "generating") {
      router.push(`/${locale}/create?video=${video.id}&step=${video.step}`);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 页头 - 统一放在最外层 */}
      <div className="flex justify-between">
        <div
          className="flex items-center gap-1 m-3"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-4 h-4 text-primary" />
          <h1 className="text-lg text-gradient-primary">创作列表</h1>
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
                className="rounded-lg aspect-[16/9] w-full skeleton"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              加载视频列表失败，请稍后重试。
            </p>
          </div>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">还没有创作视频</h3>
            <p className="text-muted-foreground mb-6">
              点击创作视频，从小说中创作视频
            </p>
            <Link href="/create">
              <Button>创作视频</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
          {/* <div className="mb-6">
            <input
              type="text"
              placeholder="搜索视频..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div> */}
          <div className="flex justify-between items-center gap-4">
            <Input
              placeholder="搜索视频..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md"
            />
            <Link href={`/${locale}/create`}>
              <Button icon={<Plus className="h-4 w-4" />}>创作视频</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video: Video) => (
              <div
                key={video.id}
                className="overflow-hidden p-0 border-none rounded-lg"
                onClick={() => handleVideoClick(video)}
              >
                {/* 视频缩略图/播放器 */}
                {video.videoUrl && (
                  <div className="relative w-full bg-black overflow-hidden aspect-video">
                    <video
                      src={video.videoUrl}
                      controls
                      className="w-full h-auto aspect-video"
                    ></video>
                  </div>
                )}
                {!video.videoUrl && (
                  <div className="relative w-full bg-black overflow-hidden aspect-video">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="bg-card-custom rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="text-base line-clamp-2 font-bold">
                        {video.title}
                      </div>
                      {video.description && (
                        <div className="line-clamp-2 text-sm text-secondary">
                          {video.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center">
                      {getStatusBadge(video.status)}
                    </div>
                  </div>
                  {/* <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(video.createdAt)}</span>
                    </div>
                    
                  </div> */}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
