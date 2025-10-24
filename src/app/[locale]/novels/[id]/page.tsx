"use client";

import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  BookOpen, 
  User, 
  Calendar, 
  FileText,
  PlayCircle,
  Edit,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { novelApi } from "@/lib/api/novel";
import { formatDate } from "@/lib/utils";
import type { Novel, Chapter } from "@/types";

export default function NovelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations();
  const locale = params?.locale as string;
  const novelId = params?.id as string;

  const { data: novelResponse, isLoading, error } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: () => novelApi.getNovel(novelId),
    enabled: !!novelId,
  });

  console.log('novelResponse:', novelResponse);
  const novel = (novelResponse as any)?.data as Novel;
  console.log('novel:', novel);

  const handleBack = () => {
    router.back();
  };

  const handleCreateVideo = (chapterId?: string) => {
    if (chapterId) {
      router.push(`/${locale}/create?novel=${novelId}&chapter=${chapterId}`);
    } else {
      router.push(`/${locale}/create?novel=${novelId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-purple-50/30 to-slate-50/30 dark:bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !novel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-purple-50/30 to-slate-50/30 dark:bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t("novelDetail.未找到该书籍")}</h2>
            <Button onClick={handleBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("novelDetail.返回")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-purple-50/30 to-slate-50/30 dark:bg-black">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* 头部导航 */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="text-slate-700 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("novelDetail.返回")}
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                <Edit className="h-3 w-3 mr-1" />
                {t("novelDetail.编辑")}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {t("novelDetail.删除")}
              </Button>
            </div>
          </div>

          {/* 书籍信息卡片 */}
          <Card className="mb-6 shadow-lg">
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* 书籍封面 */}
                <div className="flex-shrink-0">
                  <div className="relative w-32 aspect-[3/4] rounded-md overflow-hidden shadow-xl">
                    {/* 封面背景渐变 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/90 via-orange-500/90 to-red-600/90 dark:from-amber-600/90 dark:via-orange-700/90 dark:to-red-800/90" />
                    
                    {/* 封面装饰线条 */}
                    <div className="absolute inset-0 border-2 border-amber-200/30 dark:border-amber-400/20 m-2 rounded-sm" />
                    
                    {/* 封面内容 */}
                    <div className="relative h-full flex flex-col justify-center p-4">
                      <h3 className="font-bold text-xs text-center text-white line-clamp-4 leading-relaxed">
                        {novel.title}
                      </h3>
                    </div>
                    
                    {/* 书脊效果 */}
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/20 to-transparent" />
                  </div>
                </div>

                {/* 书籍信息 */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                      {novel.title}
                    </h1>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{novel.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{novel.chapters.length} {t("novelDetail.章节数")}</span>
                      </div>
                      <Badge variant="default">{novel.status}</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t("novelDetail.简介")}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {novel.description || t("novelDetail.暂无简介")}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{t("novelDetail.创建时间")}: {formatDate(novel.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{t("novelDetail.更新时间")}: {formatDate(novel.updatedAt)}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => handleCreateVideo()}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {t("novelDetail.开始创作")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 章节列表 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                {t("novelDetail.章节列表")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {novel.chapters.map((chapter: Chapter, index: number) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {chapter.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {chapter.content.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCreateVideo(chapter.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <PlayCircle className="h-4 w-4 mr-1" />
                      {t("novelDetail.开始创作")}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

