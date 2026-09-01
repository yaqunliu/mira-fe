"use client";

import { useTranslations } from 'next-intl'
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
        "relative rounded-2xl p-4 cursor-pointer transition-all duration-300",
        "bg-gradient-to-br from-white to-blue-50",
        "shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]",
        "hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)]",
        "hover:scale-[1.02]",
        isSelected
          ? "border-2 border-#22C55E shadow-[inset_2px_2px_5px_rgba(0,0,0,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.5)]"
          : "border border-blue-100"
      )}
      onClick={onSelect}
    >
      {/* 选中标记 */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-#22C55E rounded-full flex items-center justify-center shadow-md">
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
              className="w-14 h-14 rounded-xl object-cover shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-#ADD8E6 to-#FDBCB4 flex items-center justify-center shadow-md">
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
                "absolute inset-0 flex items-center justify-center rounded-xl transition-all",
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
          <h4 className="font-medium text-sm text-gray-800 truncate">
            {voice.title}
          </h4>
          
          {/* 作者信息 */}
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
            <User className="w-3 h-3" />
            <span className="truncate">
              {voice.author?.nickname || t("unknown")}
            </span>
          </div>

          {/* 使用次数 */}
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
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
                  className="text-xs px-1.5 py-0 bg-blue-100 text-blue-800 hover:bg-blue-200"
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
          <p className="flex-1 text-xs text-gray-600 line-clamp-2 italic">
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
                "shadow-sm",
                isPlaying
                  ? "bg-#22C55E text-white hover:bg-#16A34A"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            className="pl-9 rounded-2xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
          />
        </div>

        {/* 标签筛选 */}
        <Select
          value={selectedTag}
          onValueChange={(value) => setSelectedTag(value as VoiceTag | "all")}
        >
          <SelectTrigger className="w-full sm:w-[140px] rounded-2xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]">
            <SelectValue placeholder={t("voiceType")} />
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
          <Loader2 className="w-8 h-6 animate-spin text-#22C55E" />
          <span className="ml-2 text-gray-600">{t("loadingVoices")}</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center shadow-md">
              <Volume2 className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-red-500 font-medium">{t("loadFailed")}</p>
            <p className="text-sm text-gray-600 mt-2">
              {error instanceof Error ? error.message : t("networkError")}
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="flex items-center gap-2 rounded-2xl border-2 border-#22C55E hover:border-#16A34A bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] transition-all duration-200 hover:scale-105"
          >
            <RefreshCw className="w-4 h-4" />{t("reload")}</Button>
        </div>
      ) : voices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600">
          <Volume2 className="w-12 h-12 mb-4 opacity-50" />
          <p>{t("noMatchingVoice", { default: "No matching voices found" })}</p>
          <p className="text-sm mt-1">{t("tryOtherSearch", { default: "Try other search terms?" })}</p>
        </div>
      ) : (
        <>
          {/* 语音网格 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("prev", { default: "Previous" })}
              </Button>

              <span className="text-sm text-gray-600 px-4 py-2 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]">
                第 {currentPage} 页 / 共 {totalPages} 页
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages}
                className="rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200"
              >
                {t("nextPage", { default: "Next" })}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* 总数统计 */}
          {voicesResponse && (
            <div className="text-center text-sm text-gray-600 mt-4 py-2 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]">
              {t("foundTotal", { default: "Found" })} {voicesResponse.total} 个语音
            </div>
          )}
        </>
      )}
    </div>
  );
}

