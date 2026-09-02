"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomTabs } from "@/components/ui/custom-tabs";
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
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Novel, Chapter, ChapterListItem } from "@/types";
import { NovelUploadModal } from "../modals/novel-upload-modal";
import { novelApi } from "@/lib/api/novel";
import { useQuery } from "@tanstack/react-query";
import LoadingIcon from "../ui/loading-icon";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  const tNovel = useTranslations('novel');
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("novel");

  // 当 selectedNovel 变化时，如果它有 type，自动切换到对应的 tab
  useEffect(() => {
    if (selectedNovel && selectedNovel.type) {
      setActiveTab(selectedNovel.type);
    }
  }, [selectedNovel]);

  // 创建项目和章节的状态
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [isChapterDialogOpen, setIsChapterDialogOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterContent, setNewChapterContent] = useState("");

  const {
    data: novelsResponse,
    isFetching: isNovelsLoading,
    refetch: refetchNovels,
  } = useQuery({
    queryKey: ["novels", activeTab],
    queryFn: () => novelApi.getNovels({ type: activeTab }),
  });
  const novels = (novelsResponse as any)?.data?.items || [];
  // 当前显示的小说（固定小说或选中的小说）
  const currentNovel = fixedNovel || selectedNovel;

  // 通过API获取章节列表（如果传入了chapters则使用传入的，否则通过API获取）
  const {
    data: chaptersResponse,
    isLoading: isChaptersLoading,
  } = useQuery({
    queryKey: ["chapters", currentNovel?.uuid, chapterPage, chapterPageSize],
    queryFn: () => novelApi.getChapters(currentNovel!.uuid as string, { page: chapterPage, page_size: chapterPageSize }),
    enabled: !!currentNovel?.uuid && !chapters,
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
    return currentChapters.filter((chapter: Chapter) =>
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

  // 创建项目的 mutation
  const createProjectMutation = useMutation({
    mutationFn: (title: string) =>
      novelApi.createNovel({ title, type: 'script', author: 'User' }),
    onSuccess: (response: any) => {
      toast.success(tNovel("projectCreated"));
      setIsProjectDialogOpen(false);
      setNewProjectTitle("");
      queryClient.invalidateQueries({ queryKey: ["novels"] });
    },
    onError: (error: any) => {
      toast.error(tNovel("projectCreateFailed"));
    }
  });

  // 创建章节的 mutation
  const createChapterMutation = useMutation({
    mutationFn: ({ novelId, title, content }: { novelId: string; title: string; content: string }) =>
      novelApi.createChapter(novelId, { title, content }),
    onSuccess: (response: any) => {
      toast.success(tNovel("scriptCreated"));
      setIsChapterDialogOpen(false);
      setNewChapterTitle("");
      setNewChapterContent("");
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      // 自动选中新创建的章节
      const newChapter = response?.data?.data || response?.data;
      if (newChapter) {
        handleChapterToggle(newChapter);
      }
    },
    onError: (error: any) => {
      toast.error(tNovel("scriptCreateFailed"));
    }
  });

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) {
      toast.error(tNovel("projectNameRequired"));
      return;
    }
    createProjectMutation.mutate(newProjectTitle.trim());
  };

  const handleCreateChapter = () => {
    if (!currentNovel) return;
    if (!newChapterTitle.trim()) {
      toast.error(tNovel("scriptTitleRequired"));
      return;
    }
    if (!newChapterContent.trim()) {
      toast.error(tNovel("scriptContentRequired"));
      return;
    }
    createChapterMutation.mutate({
      novelId: (currentNovel.uuid || currentNovel.novel_id) as string,
      title: newChapterTitle.trim(),
      content: newChapterContent.trim(),
    });
  };

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
      onChaptersChange?.(filteredChapters.map((ch: any) => ch as Chapter));
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
      <div className={cn("w-full py-4 rounded-2xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100", novelFixedClassName)}>
        <div className="px-4 py-2">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-#22C55E" />
            <div className="flex-1 space-y-1">
              <h3 className="font-medium text-gray-800">
                {currentNovel?.title}
              </h3>
              {/* <p className="text-xs text-gray-600">
                作者：{currentNovel?.author}
              </p> */}
              <p className="text-xs text-gray-600">
                {t("novel.totalChapters", { count: currentNovel?.chapter_count || 0 })}
              </p>
            </div>
            {fixedAction}
          </div>
        </div>
      </div>
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
        <div className="mb-4">
          <CustomTabs
            variant="pills"
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              // Reset selection when tab changes
              onNovelChange?.(null);
              onChaptersChange?.([]);
            }}
            items={[
              { value: "novel", label: t("novel.typeNovel"), content: null },
              { value: "script", label: t("novel.typeScript"), content: null },
            ]}
          />
        </div>
        {showSearch && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder={tNovel("searchPlaceholderNovel")}
              value={novelSearchTerm}
              onChange={(e) => setNovelSearchTerm(e.target.value)}
              className="pl-10 rounded-2xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
            />
          </div>
        )}
        {filteredNovels.length === 0 ? (
          <div className="py-8 text-gray-600 h-full flex items-center justify-center flex-col px-4">
            <div className="text-sm sm:text-base text-gray-600 text-center">{t("novel.noNovels")}</div>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowUploadModal(true)}
              className="mt-4 text-xs sm:text-sm whitespace-nowrap rounded-xl bg-gradient-to-br from-#22C55E to-#16A34A shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>{t("createVideo.uploadNovel")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProjectDialogOpen(true)}
              className="mt-2 text-xs sm:text-sm whitespace-nowrap rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>{t("createVideo.createProject")}</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-base text-gray-600">
              {t("createVideo.uploadNovel")}:
            </div>
            <div className="space-y-3 min-h-[200px]">
              {currentNovels.length > 0 &&
                currentNovels.map((novel: Novel) => {
                  const isSelected = selectedNovel?.novel_id === novel.novel_id;
                  return (
                    <div
                      key={novel.novel_id}
                      className={cn(
                        "p-3 rounded-2xl cursor-pointer transition-all duration-300 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] hover:scale-[1.02]",
                        isSelected && "border-2 border-#22C55E shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.5)]"
                      )}
                      onClick={() => handleNovelSelect(novel)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm sm:text-base truncate text-gray-800">
                              {novel.title}
                            </h3>
                            <span className="text-xs text-gray-600 flex-shrink-0">
                              · {novel.author}
                            </span>
                          </div>
                          {showChapterCount && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <FileText className="w-3 h-3 text-gray-600 flex-shrink-0" />
                              <span className="text-xs text-gray-600 whitespace-nowrap">
                                {novel.chapter_count || 0} {t("novel.chapters")}
                              </span>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex items-center justify-center rounded-full bg-#22C55E p-1 flex-shrink-0 shadow-md">
                            <Check className="w-3 h-3 text-white" />
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
                  className="text-xs sm:text-sm whitespace-nowrap rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200"
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
                          currentPage === page 
                            ? "bg-#22C55E text-white rounded-xl shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)]"
                            : "rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]"
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
                  className="text-xs sm:text-sm whitespace-nowrap rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200"
                >
                  <span>{t("novel.nextPage")}</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
        {filteredNovels.length > 0 && (
          <div className="flex justify-center items-center text-gray-600 mt-4 px-2 gap-4">
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowUploadModal(true)}
              className="text-xs sm:text-sm whitespace-nowrap min-w-fit rounded-xl hover:bg-blue-50 p-2"
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>{t("createVideo.uploadNovel")}</span>
            </Button>
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsProjectDialogOpen(true)}
              className="text-xs sm:text-sm whitespace-nowrap min-w-fit rounded-xl hover:bg-blue-50 p-2"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span>{t("createVideo.createProject")}</span>
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
        <div className="flex-shrink-0 flex items-center justify-between px-2 mb-3">
          <div className="text-sm font-medium text-gray-800">
            {t("createVideo.selectScript")}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsChapterDialogOpen(true)}
            className="h-8 text-xs px-3 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-3 h-3 mr-1" />
            {t("createVideo.addChapter")}
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-3 p-2">
            {filteredChapters.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                {chapterSearchTerm ? t("novel.noNovels") : t("createVideo.selectScript")}
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
                      "p-3 rounded-2xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 cursor-pointer transition-all duration-300 hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] hover:scale-[1.02]",
                      isSelected && "border-2 border-#22C55E shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.5)]"
                    )}
                    onClick={() => handleChapterToggle(chapter as Chapter)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs bg-blue-100 text-blue-800",
                              isSelected && "bg-#22C55E/20 text-#22C55E"
                            )}
                          >
                            {t("novelDetail.chapterNumber", { number: chapter.chapter_number })}
                          </Badge>
                          <span
                            className={cn(
                              "text-sm font-medium text-gray-800",
                              isSelected && "text-#22C55E"
                            )}
                          >
                            {chapter.title}
                          </span>
                        </div>
                        {"preview" in chapter && chapter.preview && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {chapter.preview.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex items-center justify-center rounded-full bg-#22C55E p-1 shadow-md">
                          <Check className="w-3 h-3 text-white" />
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
          <div className="flex items-center justify-center gap-2 p-3 border-t border-blue-100 flex-shrink-0 bg-gradient-to-br from-white to-blue-50 rounded-b-2xl mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChapterPage((p) => Math.max(1, p - 1));
                setChapterPageInput("");
              }}
              disabled={chapterPage <= 1 || isChaptersLoading}
              className="h-8 w-8 p-0 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200"
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">
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
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
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
                className="w-16 h-8 text-center text-xs rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
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
                className="h-8 text-xs px-3 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200"
              >
                {t("novel.goto")}
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
              className="h-8 w-8 p-0 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200"
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

      {/* 创建项目对话框 */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("createVideo.createProject")}</DialogTitle>
            <DialogDescription className="sr-only">
              {tNovel("createProjectDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{tNovel('projectNameLabel')}</label>
              <Input
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder={tNovel('projectNamePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsProjectDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? t("common.loading") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加新文案对话框 */}
      <Dialog open={isChapterDialogOpen} onOpenChange={setIsChapterDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("createVideo.addChapter")}</DialogTitle>
            <DialogDescription className="sr-only">
              {tNovel("createScriptDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{tNovel('scriptTitleLabel')}</label>
              <Input
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder={tNovel('scriptTitlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{tNovel('scriptContentLabel')}</label>
              <textarea
                value={newChapterContent}
                onChange={(e) => setNewChapterContent(e.target.value)}
                placeholder={tNovel('scriptContentPlaceholder')}
                className="w-full h-48 p-3 rounded-md border bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsChapterDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateChapter} disabled={createChapterMutation.isPending}>
              {createChapterMutation.isPending ? t("common.loading") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
