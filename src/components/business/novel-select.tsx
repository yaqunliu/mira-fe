"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  BookOpen,
  FileText,
  Check,
  ChevronRight,
  Loader2,
  Smile,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Novel, Chapter, ChapterListItem } from "@/types";
import { NovelUploadModal } from "../modals/novel-upload-modal";
import { novelApi } from "@/lib/api/novel";
import { useQuery } from "@tanstack/react-query";
import LoadingIcon from "../ui/loading-icon";

export interface NovelSelectProps {
  // 章节列表（可选，如果不传则从选中的小说中获取）
  chapters?: Chapter[];
  // 固定小说（如果传入则不显示小说选择）
  fixedNovel?: Novel;
  fixedAction?: React.ReactNode;
  // 选中的小说
  selectedNovel?: Novel | null;
  // 选中的章节
  selectedChapters?: Chapter[];
  // 是否支持多选章节
  multiSelect?: boolean;
  // 是否显示搜索功能
  showSearch?: boolean;
  // 是否显示章节数量
  showChapterCount?: boolean;
  // 加载状态
  loading?: boolean;
  // 回调函数
  onNovelChange?: (novel: Novel | null) => void;
  onChaptersChange?: (chapters: Chapter[]) => void;
  onChapterToggle?: (chapter: Chapter, selected: boolean) => void;
  // 自定义样式
  className?: string;
  novelClassName?: string;
  novelFixedClassName?: string;
  chapterClassName?: string;
}

export function NovelSelect({
  chapters,
  fixedNovel,
  fixedAction,
  selectedNovel,
  selectedChapters = [],
  multiSelect = false,
  showSearch = false,
  showChapterCount = true,
  loading = false,
  onNovelChange,
  onChaptersChange,
  onChapterToggle,
  className,
  novelClassName,
  novelFixedClassName,
  chapterClassName,
}: NovelSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [novelSearchTerm, setNovelSearchTerm] = useState("");
  const [chapterSearchTerm, setChapterSearchTerm] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const {
    data: novelsResponse,
    isFetching: isNovelsLoading,
    refetch: refetchNovels,
  } = useQuery({
    queryKey: ["novels"],
    queryFn: () => novelApi.getNovels(),
  });
  const novels = (novelsResponse as any)?.data?.items || [];
  // 当前显示的小说（固定小说或选中的小说）
  const currentNovel = fixedNovel || selectedNovel;

  // 当前显示的章节列表
  const currentChapters = useMemo(() => {
    if (chapters) return chapters;
    if (currentNovel?.chapters) return currentNovel.chapters;
    return [];
  }, [chapters, currentNovel]);

  // 过滤后的章节列表
  const filteredChapters = useMemo(() => {
    if (!chapterSearchTerm) return currentChapters;
    return currentChapters.filter((chapter) =>
      chapter.title.toLowerCase().includes(chapterSearchTerm.toLowerCase())
    );
  }, [currentChapters, chapterSearchTerm]);

  // 过滤后的小说列表
  const filteredNovels = useMemo(() => {
    if (!novelSearchTerm) return novels;
    return novels.filter(
      (novel: Novel) =>
        novel.title.toLowerCase().includes(novelSearchTerm.toLowerCase()) ||
        novel.author.toLowerCase().includes(novelSearchTerm.toLowerCase())
    );
  }, [novels, novelSearchTerm]);

  // 处理小说选择
  const handleNovelSelect = (novel: Novel) => {
    onNovelChange?.(novel);
    // 清空章节选择
    onChaptersChange?.([]);
  };

  // 处理章节选择
  const handleChapterToggle = (chapter: Chapter | ChapterListItem) => {
    const isSelected = selectedChapters.some(
      (c) => c.chapter_id === chapter.chapter_id
    );

    if (multiSelect) {
      let newSelectedChapters;
      if (isSelected) {
        newSelectedChapters = selectedChapters.filter(
          (c) => c.chapter_id !== chapter.chapter_id
        );
      } else {
        newSelectedChapters = [...selectedChapters, chapter as Chapter];
      }
      onChaptersChange?.(newSelectedChapters);
    } else {
      onChaptersChange?.(isSelected ? [] : [chapter as Chapter]);
    }

    onChapterToggle?.(chapter as Chapter, !isSelected);
  };

  // 全选/取消全选章节
  const handleSelectAllChapters = () => {
    if (selectedChapters.length === filteredChapters.length) {
      onChaptersChange?.([]);
    } else {
      onChaptersChange?.(filteredChapters.map((ch) => ch as Chapter));
    }
  };

  const handleUpload = (novelId: string) => {
    setShowUploadModal(false);
    refetchNovels();
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>加载中...</span>
        </CardContent>
      </Card>
    );
  }

  const renderFixNovelArea = () => {
    return (
      <Card className={cn("w-full py-4", novelFixedClassName)}>
        <CardContent className="px-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <div className="flex-1 space-y-1">
              <h3 className="font-medium text-primary">
                {currentNovel?.title}
              </h3>
              {/* <p className="text-xs text-secondary">
                作者：{currentNovel?.author}
              </p> */}
              <p className="text-xs text-secondary">
                共 {currentNovel?.chapter_count} 章
              </p>
            </div>
            {fixedAction}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderNovelSelect = () => {
    if (isNovelsLoading) {
      return (
        <div className="w-full h-[200px] flex flex-col justify-center items-center gap-2">
          <LoadingIcon />
          <span className="text-sm text-secondary">加载中...</span>
        </div>
      );
    }
    return (
      <div className={cn("w-full", novelClassName)}>
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="搜索小说标题或作者..."
              value={novelSearchTerm}
              onChange={(e) => setNovelSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
        {filteredNovels.length === 0 ? (
          <div className="py-8 text-gray-300 h-full flex items-center justify-center flex-col">
            <div className="text-base text-gray-300">还未上传小说</div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowUploadModal(true)}
              className="mt-4"
            >
              <Upload className="w-4 h-4" />
              立即上传
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-3">
              <div className="text-base text-gray-300">
                选择小说进行视频创作:
              </div>
              <div className="space-y-2">
                {filteredNovels.length > 0 &&
                  filteredNovels.map((novel: Novel) => {
                    const isSelected = selectedNovel?.novel_id === novel.novel_id;
                    return (
                      <div
                        key={novel.novel_id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 border-gray-500/20 dark:border-gray-500/70",
                          isSelected && "border-primary bg-primary/5"
                        )}
                        onClick={() => handleNovelSelect(novel)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-base">
                              {novel.title}
                            </h3>
                            <p
                              className={cn(
                                "text-xs text-muted-foreground mt-1 text-secondary",
                                isSelected && "text-primary"
                              )}
                            >
                              作者：{novel.author}
                            </p>
                            {showChapterCount && (
                              <div className="flex items-center gap-2 mt-2">
                                <FileText className="w-3 h-3 text-secondary" />
                                <span className="text-xs text-secondary">
                                  {novel.chapter_count || 0} 章节
                                </span>
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="flex items-center justify-center rounded-full bg-orange-500/70 p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </ScrollArea>
        )}
        {filteredNovels.length > 0 && (
          <div className="flex justify-center items-center text-secondary mt-4">
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="w-4 h-4" />
              上传小说
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderChapterSelect = () => {
    return (
      <Card className={cn("w-full gap-2 shadow-none", chapterClassName)}>
        <CardHeader className="p-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-300">
              选择章节
            </CardTitle>
            {multiSelect && filteredChapters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllChapters}
              >
                {selectedChapters.length === filteredChapters.length
                  ? "取消全选"
                  : "全选"}
              </Button>
            )}
          </div>
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索章节标题..."
                value={chapterSearchTerm}
                onChange={(e) => setChapterSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredChapters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {chapterSearchTerm ? "没有找到匹配的章节" : "该小说暂无章节"}
                </div>
              ) : (
                filteredChapters.map((chapter: Chapter) => {
                  const isSelected = selectedChapters.some(
                    (c: Chapter) => c.chapter_id === chapter.chapter_id
                  );
                  return (
                    <div
                      key={chapter.chapter_id}
                      className={cn(
                        "p-3 border-[1px] rounded-lg border-gray-500/20 dark:border-gray-500/20 cursor-pointer transition-colors hover:bg-muted/50",
                        isSelected && "bg-stone-600/10 dark:bg-stone-600/20"
                      )}
                      onClick={() => handleChapterToggle(chapter as Chapter)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs bg-gray-400/10 text-stone-400",
                                isSelected && "bg-orange-800/10 text-primary"
                              )}
                            >
                              {`第${chapter.chapter_number}章`}
                            </Badge>
                            <span
                              className={cn(
                                "text-sm font-medium",
                                isSelected && "text-primary"
                              )}
                            >
                              {chapter.title}
                            </span>
                          </div>
                          {"preview" in chapter && chapter.preview && (
                            <p className="text-xs text-gray-300 mt-2 line-clamp-2">
                              {chapter.preview.substring(0, 100)}...
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex items-center justify-center rounded-full bg-orange-500/70 p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* 小说选择区域 */}
      {!currentNovel ? renderNovelSelect() : renderFixNovelArea()}
      {/* 章节选择区域 */}
      {currentNovel && renderChapterSelect()}
      <NovelUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onComplete={handleUpload}
      />
    </div>
  );
}
