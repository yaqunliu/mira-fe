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
  ChevronLeft,
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
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState("");
  const [novelSearchTerm, setNovelSearchTerm] = useState("");
  const [chapterSearchTerm, setChapterSearchTerm] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const novelsPerPage = 3;
  // 章节分页状态
  const [chapterPage, setChapterPage] = useState(1);
  const [chapterPageInput, setChapterPageInput] = useState("");
  const chapterPageSize = 10;

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

  // 通过API获取章节列表（如果传入了chapters则使用传入的，否则通过API获取）
  const {
    data: chaptersResponse,
    isLoading: isChaptersLoading,
  } = useQuery({
    queryKey: ["chapters", currentNovel?.novel_id, chapterPage, chapterPageSize],
    queryFn: () => novelApi.getChapters(currentNovel!.novel_id, { page: chapterPage, page_size: chapterPageSize }),
    enabled: !!currentNovel?.novel_id && !chapters,
  });

  // 当前显示的章节列表
  const currentChapters = useMemo(() => {
    if (chapters) return chapters;
    // 从API响应中提取章节数据
    if (chaptersResponse) {
      const chaptersData = chaptersResponse as any;
      return (
        chaptersData?.data?.data ||
        chaptersData?.data?.items ||
        chaptersData?.data ||
        chaptersData?.items ||
        (Array.isArray(chaptersData) ? chaptersData : [])
      );
    }
    return [];
  }, [chapters, chaptersResponse]);

  // 章节分页信息
  const chaptersTotal = useMemo(() => {
    if (chapters) return chapters.length;
    if (chaptersResponse) {
      const chaptersData = chaptersResponse as any;
      return chaptersData?.data?.total || chaptersData?.total || currentChapters.length;
    }
    return 0;
  }, [chapters, chaptersResponse, currentChapters.length]);

  const chaptersTotalPages = Math.ceil(chaptersTotal / chapterPageSize);

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

  // 分页计算
  const totalPages = Math.ceil(filteredNovels.length / novelsPerPage);
  const startIndex = (currentPage - 1) * novelsPerPage;
  const endIndex = startIndex + novelsPerPage;
  const currentNovels = filteredNovels.slice(startIndex, endIndex);

  // 当搜索词变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [novelSearchTerm]);

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
          <span>{t("common.loading")}</span>
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
                {t("novel.totalChapters", { count: currentNovel?.chapter_count || 0 })}
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
          <span className="text-sm text-secondary">{t("common.loading")}</span>
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
          <div className="py-8 text-gray-300 h-full flex items-center justify-center flex-col px-4">
            <div className="text-sm sm:text-base text-gray-300 text-center">{t("novel.noNovels")}</div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowUploadModal(true)}
              className="mt-4 text-xs sm:text-sm whitespace-nowrap"
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>{t("novel.uploadNovel")}</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-base text-gray-300">
              {t("createVideo.uploadNovel")}:
            </div>
            <div className="space-y-2 min-h-[200px]">
              {currentNovels.length > 0 &&
                currentNovels.map((novel: Novel) => {
                  const isSelected = selectedNovel?.novel_id === novel.novel_id;
                  return (
                    <div
                      key={novel.novel_id}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 border-gray-500/20 dark:border-gray-500/70",
                        isSelected && "border-primary bg-primary/5"
                      )}
                      onClick={() => handleNovelSelect(novel)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm sm:text-base truncate">
                              {novel.title}
                            </h3>
                            <span className="text-xs text-secondary flex-shrink-0">
                              · {novel.author}
                            </span>
                          </div>
                          {showChapterCount && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <FileText className="w-3 h-3 text-secondary flex-shrink-0" />
                              <span className="text-xs text-secondary">
                                {novel.chapter_count || 0} {t("novel.chapters")}
                              </span>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex items-center justify-center rounded-full bg-orange-500/70 p-1 flex-shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            {/* 分页控件 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-2 px-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                    }
                  }}
                  disabled={currentPage === 1}
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                  <span>{t("novel.previousPage")}</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "min-w-[32px] text-xs sm:text-sm",
                          currentPage === page && "bg-primary"
                        )}
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                    }
                  }}
                  disabled={currentPage === totalPages}
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  <span>{t("novel.nextPage")}</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
        {filteredNovels.length > 0 && (
          <div className="flex justify-center items-center text-secondary mt-4 px-2">
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowUploadModal(true)}
              className="text-xs sm:text-sm whitespace-nowrap min-w-fit"
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>{t("novel.uploadNovel")}</span>
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderChapterSelect = () => {
    return (
      <div className={cn("w-full flex flex-col flex-1 min-h-0", chapterClassName)}>
        {/* 章节列表区域 - 可滚动 */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-2 p-2">
            {filteredChapters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {chapterSearchTerm ? t("novel.noNovels") : t("novel.chapters")}
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
                            {t("novelDetail.chapterNumber", { number: chapter.chapter_number })}
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
        </div>
        
        
        {/* 分页控件 - 固定在底部 */}
        {!chapters && chaptersTotalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-gray-500/20 flex-shrink-0 bg-card">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChapterPage((p) => Math.max(1, p - 1));
                setChapterPageInput("");
              }}
              disabled={chapterPage <= 1 || isChaptersLoading}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {chapterPage} / {chaptersTotalPages}
              </span>
              <Input
                type="number"
                min={1}
                max={chaptersTotalPages}
                value={chapterPageInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || (Number(value) >= 1 && Number(value) <= chaptersTotalPages)) {
                    setChapterPageInput(value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chapterPageInput) {
                    const page = Number(chapterPageInput);
                    if (page >= 1 && page <= chaptersTotalPages) {
                      setChapterPage(page);
                      setChapterPageInput("");
                    }
                  }
                }}
                placeholder={String(chapterPage)}
                className="w-16 h-7 text-center text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (chapterPageInput) {
                    const page = Number(chapterPageInput);
                    if (page >= 1 && page <= chaptersTotalPages) {
                      setChapterPage(page);
                      setChapterPageInput("");
                    }
                  }
                }}
                disabled={!chapterPageInput || isChaptersLoading}
                className="h-7 text-xs px-2"
              >
                跳转
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChapterPage((p) => Math.min(chaptersTotalPages, p + 1));
                setChapterPageInput("");
              }}
              disabled={chapterPage >= chaptersTotalPages || isChaptersLoading}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)}>
      {/* 小说选择区域 */}
      <div className="flex-shrink-0 mb-6">
        {!currentNovel ? renderNovelSelect() : renderFixNovelArea()}
      </div>
      {/* 章节选择区域 */}
      {currentNovel && (
        <div className="flex-1 min-h-0 flex flex-col">
          {renderChapterSelect()}
        </div>
      )}
      <NovelUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onComplete={handleUpload}
      />
    </div>
  );
}
