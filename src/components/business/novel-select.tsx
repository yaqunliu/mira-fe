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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Novel, Chapter } from "@/types";

export interface NovelSelectProps {
  // 小说列表
  novels: Novel[];
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
  chapterClassName?: string;
}

export function NovelSelect({
  novels = [],
  chapters,
  fixedNovel,
  fixedAction,
  selectedNovel,
  selectedChapters = [],
  multiSelect = true,
  showSearch = true,
  showChapterCount = true,
  loading = false,
  onNovelChange,
  onChaptersChange,
  onChapterToggle,
  className,
  novelClassName,
  chapterClassName,
}: NovelSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [novelSearchTerm, setNovelSearchTerm] = useState("");
  const [chapterSearchTerm, setChapterSearchTerm] = useState("");

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
      (novel) =>
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
  const handleChapterToggle = (chapter: Chapter) => {
    const isSelected = selectedChapters.some((c) => c.id === chapter.id);

    if (multiSelect) {
      let newSelectedChapters;
      if (isSelected) {
        newSelectedChapters = selectedChapters.filter(
          (c) => c.id !== chapter.id
        );
      } else {
        newSelectedChapters = [...selectedChapters, chapter];
      }
      onChaptersChange?.(newSelectedChapters);
    } else {
      onChaptersChange?.(isSelected ? [] : [chapter]);
    }

    onChapterToggle?.(chapter, !isSelected);
  };

  // 全选/取消全选章节
  const handleSelectAllChapters = () => {
    if (selectedChapters.length === filteredChapters.length) {
      onChaptersChange?.([]);
    } else {
      onChaptersChange?.(filteredChapters);
    }
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
      <Card className={cn("w-full", novelClassName)}>
        <CardContent>
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <div className="flex-1 space-y-1">
              <h3 className="font-medium text-primary">{fixedNovel?.title}</h3>
              <p className="text-xs text-gray-500/80">
                作者：{fixedNovel?.author}
              </p>
            </div>
            {fixedAction}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderNovelSelect = () => {
    return (
      <Card className={cn("w-full", novelClassName)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            选择小说
          </CardTitle>
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
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {filteredNovels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  没有找到小说
                </div>
              ) : (
                filteredNovels.map((novel) => {
                  const isSelected = selectedNovel?.id === novel.id;
                  return (
                    <div
                      key={novel.id}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                        isSelected && "border-primary bg-primary/5"
                      )}
                      onClick={() => handleNovelSelect(novel)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{novel.title}</h3>
                          <p
                            className={cn(
                              "text-xs text-muted-foreground mt-1",
                              isSelected && "text-primary"
                            )}
                          >
                            作者：{novel.author}
                          </p>
                          {novel.description && (
                            <p className="text-xs text-secondary mt-4 line-clamp-2">
                              {novel.description}
                            </p>
                          )}
                          {showChapterCount && (
                            <div className="flex items-center gap-2 mt-2">
                              <FileText className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {novel.chapters?.length || 0} 章节
                              </span>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-primary" />
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
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {filteredChapters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {chapterSearchTerm ? "没有找到匹配的章节" : "该小说暂无章节"}
                </div>
              ) : (
                filteredChapters.map((chapter) => {
                  const isSelected = selectedChapters.some(
                    (c) => c.id === chapter.id
                  );
                  return (
                    <div
                      key={chapter.id}
                      className={cn(
                        "p-3 border-[1px] rounded-lg border-gray-500/20 dark:border-gray-500/10 cursor-pointer transition-colors hover:bg-muted/50",
                        isSelected && "bg-stone-600/10 dark:bg-stone-600/20"
                      )}
                      onClick={() => handleChapterToggle(chapter)}
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
                              {chapter.chapterId}
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
                          {chapter.content && (
                            <p className="text-xs text-gray-300 mt-2 line-clamp-2">
                              {chapter.content.substring(0, 100)}...
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
      {!fixedNovel ? renderNovelSelect() : renderFixNovelArea()}
      {/* 章节选择区域 */}
      {currentNovel && renderChapterSelect()}
    </div>
  );
}
