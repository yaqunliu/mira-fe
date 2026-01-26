"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { BookOpen, User, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { novelApi } from "@/lib/api/novel";
import { useQuery } from "@tanstack/react-query";
import { Novel } from "@/types";
import { NovelUploadModal } from "../modals/novel-upload-modal";
import { useAuthStore } from "@/stores/auth";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { cn } from "@/lib/utils";

export function NovelOverview() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { token, isAuthenticated } = useAuthStore();
  const { loading: authLoading } = useSupabaseAuth();

  const {
    data: novelsResponse,
    isFetching: isNovelsLoading,
    refetch: refetchNovels,
  } = useQuery({
    queryKey: ["novels"],
    queryFn: async () => {
      const result = await novelApi.getNovels();
      return result;
    },
    // 只要有 token 就可以请求,不需要等待 authLoading
    // 因为请求拦截器会自动从 Supabase 获取 token (如果 store 中没有)
    enabled: !!token || isAuthenticated,
    retry: 1, // 如果首次失败,重试一次
  });

  // 处理 API 返回数据，兼容多种格式
  const responseData = novelsResponse as any;
  const novels: Novel[] =
    responseData?.data?.items ||  // { data: { items: [...] } }
    responseData?.data ||         // { data: [...] }
    responseData?.items ||        // { items: [...] }
    (Array.isArray(responseData) ? responseData : []); // 直接数组

  const displayNovels = novels.slice(0, 5); // 显示前5本小说

  const handleViewMore = () => {
    router.push(`/${locale}/scripts`);
  };

  const handleNovelClick = (novelUuid: string) => {
    window.open(`/${locale}/scripts/${novelUuid}`, '_blank', 'noopener,noreferrer');
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const handleUploadComplete = (novelUuid?: string) => {
    setShowUploadModal(false);
    refetchNovels();
    // 如果有 novelUuid，可以跳转到小说详情
    if (novelUuid) {
      router.push(`/${locale}/novels/${novelUuid}`);
    }
  };

  if (isNovelsLoading) {
    return (
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-md aspect-[3/4] w-full skeleton" />
        ))}
      </div>
    );
  }

  if (novels.length === 0) {
    return (
      <>
        <div className="text-center py-6">
          <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {t("home.noNovelsEmpty")}
          </p>
          <Button
            size="sm"
            onClick={handleUploadClick}
            className="text-xs gap-1"
          >
            <Upload className="w-3 h-3" />
            {t("novel.uploadNovel")}
          </Button>
        </div>

        {/* 上传弹窗 - 空状态也需要显示 */}
        <NovelUploadModal
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
          onComplete={handleUploadComplete}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {/* 书籍网格布局：横版一行6个（5个小说+1个查看更多），竖版两行每行3个 */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {displayNovels.map((novel: Novel & { type?: string }) => {
          const isNovel = novel.type === 'novel';
          const coverImage = isNovel ? '/novel-cover.png' : '/article-cover.png';

          return (
            <div
              key={novel.uuid}
              onClick={() => handleNovelClick(novel.uuid)}
              className="group cursor-pointer"
            >
              {/* 书籍封面 */}
              <div className="relative aspect-[3/4] rounded-md overflow-hidden shadow-[4px_4px_8px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-6px_-6px_12px_rgba(255,255,255,0.8)] transition-all duration-300 transform group-hover:scale-105 hover:-translate-y-0.5">
                {/* 封面背景 */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `url(${coverImage}) no-repeat center center / cover`,
                  }}
                />
                <div className={cn(
                  "absolute backdrop-opacity-10 inset-0 blur-lg backdrop-blur-md bg-gradient-to-br",
                  isNovel
                    ? "from-orange-500/40 to-stone-500/70"
                    : "from-blue-500/40 to-cyan-500/70"
                )} />

                {/* 封面装饰线条 */}
                <div className={cn(
                  "absolute inset-0 border-2 m-2 rounded-sm",
                  isNovel
                    ? "border-amber-200/30 dark:border-amber-400/20"
                    : "border-cyan-200/30 dark:border-cyan-400/20"
                )} />

                {/* 封面内容 */}
                <div className="relative h-full flex flex-col justify-between p-3">
                  {/* 书名 */}
                  <div className="flex-1 flex items-center justify-center">
                    <h3 className="font-bold text-sm text-center text-white line-clamp-3 leading-relaxed">
                      {novel.title}
                    </h3>
                  </div>

                  {/* 作者和章节信息 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1 text-white/90">
                      <User className="h-3 w-3" />
                      <span className="text-xs font-medium line-clamp-1">
                        {novel.author}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-white/80">
                      <BookOpen className="h-3 w-3 flex-shrink-0" />
                      <span className="text-xs whitespace-nowrap">
                        {novel?.chapter_count || 0} {t("home.chapters")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* 查看更多卡片 */}
        {novels.length > 0 && (
          <div onClick={handleViewMore} className="group cursor-pointer">
            <div className="relative aspect-[3/4] rounded-md overflow-hidden shadow-[4px_4px_8px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.4),-6px_-6px_12px_rgba(255,255,255,0.8)] transition-all duration-300 border-2 border-dashed border-[#ADD8E6]/50 bg-[#ADD8E6]/10 hover:border-[#ADD8E6]/70 hover:bg-[#ADD8E6]/20 transform group-hover:scale-105 hover:-translate-y-0.5">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ADD8E6]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ChevronRight className="w-4 h-4 text-[#22C55E]" />
                </div>
                <span className="text-xs font-medium text-[#22C55E] text-center px-2">
                  {t("home.viewMore")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 上传弹窗 */}
      <NovelUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onComplete={handleUploadComplete}
      />
    </div>
  );
}
