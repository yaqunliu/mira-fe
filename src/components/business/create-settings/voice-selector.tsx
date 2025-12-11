"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Play,
  Pause,
  Check,
  Loader2,
  User,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Users,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import voiceApi from "@/lib/api/voice";
import type { VoiceItem, VoiceTag } from "@/types/voice";
import { VOICE_TAG_OPTIONS } from "@/types/voice";

interface VoiceSelectorProps {
  selectedVoiceId: string | null;
  onSelect: (voiceId: string, voice: VoiceItem) => void;
  className?: string;
}

// 单个语音卡片组件
function VoiceCard({
  voice,
  isSelected,
  isPlaying,
  onSelect,
  onPlayToggle,
}: {
  voice: VoiceItem;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPlayToggle: () => void;
}) {
  const sample = voice.samples[0];
  const hasAudio = !!sample?.audio;

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-600",
        isSelected
          ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 shadow-md"
          : "border-zinc-200 dark:border-zinc-700 bg-card"
      )}
      onClick={onSelect}
    >
      {/* 选中标记 */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* 封面图片 */}
        <div className="relative flex-shrink-0">
          {voice.cover_image ? (
            <img
              src={voice.cover_image}
              alt={voice.title}
              className="w-14 h-14 rounded-lg object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
          )}
          {/* 播放按钮覆盖层 */}
          {hasAudio && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayToggle();
              }}
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-lg transition-all",
                "bg-black/40 hover:bg-black/50",
                isPlaying ? "opacity-100" : "opacity-0 hover:opacity-100"
              )}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>
          )}
        </div>

        {/* 语音信息 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-primary truncate">
            {voice.title}
          </h4>
          
          {/* 作者信息 */}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">
              {voice.author?.nickname || "未知"}
            </span>
          </div>

          {/* 使用次数 */}
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{voice.task_count.toLocaleString()} 次使用</span>
          </div>

          {/* 标签 */}
          {voice.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {voice.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-1.5 py-0"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 试听文本预览 */}
      {sample?.text && (
        <div className="mt-3 flex items-start gap-2">
          <p className="flex-1 text-xs text-muted-foreground line-clamp-2 italic">
            "{sample.text}"
          </p>
          {hasAudio && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayToggle();
              }}
              className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                isPlaying
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-orange-100 dark:hover:bg-orange-900/30"
              )}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3 ml-0.5" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function VoiceSelector({
  selectedVoiceId,
  onSelect,
  className,
}: VoiceSelectorProps) {
  // 搜索和筛选状态
  const [searchTitle, setSearchTitle] = useState("");
  const [selectedTag, setSelectedTag] = useState<VoiceTag | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageSize = 10;

  // 音频播放状态
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTitle);
      setCurrentPage(1); // 搜索时重置页码
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTitle]);

  // 标签变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTag]);

  // 获取语音列表
  const {
    data: voicesResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["voices", debouncedSearch, selectedTag, currentPage, pageSize],
    queryFn: async () => {
      const result = await voiceApi.getVoices({
        language: "zh",
        page_number: currentPage,
        page_size: pageSize,
        title: debouncedSearch || undefined,
        tag: selectedTag === "all" ? undefined : selectedTag,
      });
      // 确保返回有效数据
      return result ?? { total: 0, items: [], page_size: pageSize, page_number: currentPage };
    },
  });

  const voices = voicesResponse?.items || [];
  const totalPages = voicesResponse
    ? Math.ceil(voicesResponse.total / pageSize)
    : 0;

  // 播放/暂停试听
  const handlePlayToggle = useCallback((voice: VoiceItem) => {
    const sample = voice.samples[0];
    if (!sample?.audio) return;

    if (playingVoiceId === voice.id) {
      // 暂停当前播放
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      // 停止之前的播放
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // 播放新的音频
      audioRef.current = new Audio(sample.audio);
      audioRef.current.onended = () => setPlayingVoiceId(null);
      audioRef.current.onerror = () => {
        setPlayingVoiceId(null);
      };
      audioRef.current.play();
      setPlayingVoiceId(voice.id);
    }
  }, [playingVoiceId]);

  // 组件卸载时停止播放
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 选择语音
  const handleSelect = useCallback(
    (voice: VoiceItem) => {
      onSelect(voice.id, voice);
    },
    [onSelect]
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* 搜索和筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 搜索框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索语音名称..."
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 标签筛选 */}
        <Select
          value={selectedTag}
          onValueChange={(value) => setSelectedTag(value as VoiceTag | "all")}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="声音类型" />
          </SelectTrigger>
          <SelectContent>
            {VOICE_TAG_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 语音列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-6 animate-spin text-orange-500" />
          <span className="ml-2 text-muted-foreground">加载中...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center">
              <Volume2 className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-destructive font-medium">加载语音列表失败，请稍后重试</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "网络连接异常"}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex items-center gap-2 rounded-xl border-2 border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200 hover:scale-105"
          >
            <RefreshCw className="w-4 h-4" />
            重新加载
          </Button>
        </div>
      ) : voices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Volume2 className="w-12 h-12 mb-4 opacity-50" />
          <p>未找到匹配的语音</p>
          <p className="text-sm mt-1">试试其他搜索条件？</p>
        </div>
      ) : (
        <>
          {/* 语音网格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {voices.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                isSelected={selectedVoiceId === voice.id}
                isPlaying={playingVoiceId === voice.id}
                onSelect={() => handleSelect(voice)}
                onPlayToggle={() => handlePlayToggle(voice)}
              />
            ))}
          </div>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
                上一页
              </Button>

              <span className="text-sm text-muted-foreground px-4">
                第 {currentPage} 页 / 共 {totalPages} 页
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages}
              >
                下一页
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* 总数统计 */}
          {voicesResponse && (
            <div className="text-center text-sm text-muted-foreground">
              共找到 {voicesResponse.total} 个语音
            </div>
          )}
        </>
      )}
    </div>
  );
}

