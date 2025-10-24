"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { BookOpen, User, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { novelApi } from "@/lib/api/novel";
import { useQuery } from "@tanstack/react-query";

interface NovelOverviewItem {
  id: string;
  title: string;
  author: string;
  chapters: { length: number } | any[];
}

export function NovelOverview() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;

  const { data: novelsResponse, isLoading } = useQuery({
    queryKey: ['novels'],
    queryFn: () => novelApi.getNovels(),
  });

  const novels = (novelsResponse as any)?.data?.data || [];
  const displayNovels = novels.slice(0, 3); // 只显示前3本小说

  const handleViewMore = () => {
    router.push(`/${locale}/novels`);
  };

  const handleNovelClick = (novelId: string) => {
    router.push(`/${locale}/novels/${novelId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (novels.length === 0) {
    return (
      <div className="text-center py-6">
        <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-3">
          暂无小说，点击上传第一本小说
        </p>
        <Button 
          size="sm" 
          onClick={() => router.push(`/${locale}/novels/upload`)}
          className="text-xs"
        >
          上传小说
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 书籍网格布局 */}
      <div className="grid grid-cols-3 gap-3">
        {displayNovels.map((novel: NovelOverviewItem) => (
          <div
            key={novel.id}
            onClick={() => handleNovelClick(novel.id)}
            className="group cursor-pointer"
          >
            {/* 书籍封面 */}
            <div className="relative aspect-[3/4] rounded-md overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
              {/* 封面背景渐变 */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/90 via-orange-500/90 to-red-600/90 dark:from-amber-600/90 dark:via-orange-700/90 dark:to-red-800/90" />
              
              {/* 封面装饰线条 */}
              <div className="absolute inset-0 border-2 border-amber-200/30 dark:border-amber-400/20 m-2 rounded-sm" />
              
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
                    <span className="text-xs font-medium line-clamp-1">{novel.author}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-white/80">
                    <BookOpen className="h-3 w-3" />
                    <span className="text-xs">{novel.chapters.length} {t("home.章节")}</span>
                  </div>
                </div>
              </div>
              
              {/* 书脊效果 */}
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/20 to-transparent" />
            </div>
          </div>
        ))}
      </div>
      
      {novels.length > 3 && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleViewMore}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {t("home.查看更多")}
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
