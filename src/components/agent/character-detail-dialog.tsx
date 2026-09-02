"use client";

import { useTranslations } from 'next-intl'
import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Image as ImageIcon,
  Save,
  X,
  Loader2,
  Sparkles,
  Volume2,
  Play,
  Pause,
  Search,
  Check,
} from "lucide-react";
import { ICharacter } from "@/types/character";
import characterApi from "@/lib/api/character";
import voiceApi from "@/lib/api/voice";
import { cn } from "@/lib/utils";
import { ImagePreview } from "@/components/ui/image-preview";
import { ImageVersionPreview } from "@/components/ui/image-version-preview";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FormField,
  FormControl,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { VoiceItem } from "@/types/voice";

interface CharacterDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  character: ICharacter | null;
  characterNumber: number;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onRefresh?: () => void;
}

/**
 * 获取生成状态
 */
function getGenerationStatus(character: any): 'pending' | 'generating' | 'generated' {
  const status = character?.status?.toLowerCase();
  const hasImage = !!character?.image_url;

  if (hasImage || status === 'generated' || status === 'completed' || status === 'done') {
    return 'generated';
  }
  if (status === 'generating' || status === 'processing' || status === 'running') {
    return 'generating';
  }
  return 'pending';
}

/**
 * 状态标签组件
 */
function StatusBadge({ status }: { status: 'pending' | 'generating' | 'generated' }) {
  const t = useTranslations('agent');
  const config = {
    pending: {
      label: t('statusNotGenerated'),
      className: 'bg-gray-100 text-gray-600 border-gray-300',
    },
    generating: {
      label: t('statusGenerating'),
      className: 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse',
    },
    generated: {
      label: t('statusGenerated'),
      className: 'bg-green-100 text-green-700 border-green-300',
    },
  };

  const { label, className } = config[status];

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${className}`}>
      {label}
    </span>
  );
}

/**
 * 角色详情对话框
 */
export function CharacterDetailDialog({
  isOpen,
  onClose,
  character,
  characterNumber,
  onNavigatePrevious,
  onNavigateNext,
  hasPrevious = false,
  hasNext = false,
  onRefresh,
}: CharacterDetailDialogProps) {
  const t = useTranslations('agent');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // 音色相关状态
  const [voiceSearch, setVoiceSearch] = useState("");
  const [voicePage, setVoicePage] = useState(1);
  const voicePageSize = 10;
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const form = useForm({
    defaultValues: {
      name: character?.name || "",
      basicInfo: (character as any)?.description || (character as any)?.basic_info || "",
      appearance: character?.appearance || "",
      imagePrompt: (character as any)?.image_prompt || "",
      voiceId: character?.voice_id || "",
    },
  });

  // 当 character 变化时，重置表单值
  useEffect(() => {
    if (character) {
      form.reset({
        name: character.name || "",
        basicInfo: (character as any)?.description || (character as any)?.basic_info || "",
        appearance: character.appearance || "",
        imagePrompt: (character as any)?.image_prompt || "",
        voiceId: character.voice_id || "",
      });
    }
  }, [character, form]);

  // 获取音色列表
  const { data: voicesResponse, isLoading: isLoadingVoices } = useQuery({
    queryKey: ["voices", voiceSearch, voicePage],
    queryFn: async () => {
      const result = await voiceApi.getVoicesForDelivery({
        page_number: voicePage,
        page_size: voicePageSize,
        title: voiceSearch || undefined,
      });
      return result ?? { total: 0, items: [], page_size: voicePageSize, page_number: voicePage };
    },
    enabled: isOpen,
  });

  const voices = voicesResponse?.items || [];
  const totalVoicePages = voicesResponse ? Math.ceil(voicesResponse.total / voicePageSize) : 0;

  // 播放/暂停试听
  const handlePlayToggle = useCallback((voice: VoiceItem) => {
    const sample = voice.samples[0];
    if (!sample?.audio) return;

    if (playingVoiceId === voice.id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(sample.audio);
      audioRef.current.onended = () => setPlayingVoiceId(null);
      audioRef.current.onerror = () => setPlayingVoiceId(null);
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

  if (!character) return null;

  // 从 status_detail 中获取图片历史
  const imageHistory = ((character as any).status_detail?.image_historys || []) as Array<{
    image_url: string;
    image_prompt?: string;
    created_at: string;
    task_id?: string;
  }>;

  const imageUrl = character.image_url || (character as any).final_image_url;
  const candidateImages = (character as any).candidate_image_urls || [];
  const status = getGenerationStatus(character);

  const handleVersionChange = (version: { image_url: string; image_prompt?: string; created_at: string }) => {
    if (version.image_prompt) {
      form.setValue("imagePrompt", version.image_prompt);
    }
  };

  const handleApplyVersion = async (version: { image_url: string; created_at: string }) => {
    try {
      await characterApi.updateCharacter((character as any).uuid || String(character.character_id), {
        image_url: version.image_url,
      } as any);
      toast.success(t("versionApplied"));
      onRefresh?.();
    } catch (error) {
      console.error("Failed to apply version:", error);
      toast.error(t("applyFailed"));
    }
  };

  const handleSave = async (values: any) => {
    setIsSaving(true);
    try {
      await characterApi.updateCharacter((character as any).uuid || String(character.character_id), {
        name: values.name,
        basic_info: values.basicInfo,
        appearance: values.appearance,
        image_prompt: values.imagePrompt,
        voice_id: values.voiceId,
      } as any);
      toast.success(t("saveSuccess"));
      onRefresh?.();
    } catch (error) {
      console.error("Failed to save character:", error);
      toast.error(t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await characterApi.regenerateCharacterImage(
        (character as any).uuid || String(character.character_id),
        character.visual_style || "",
        String(character.novel_id)
      );
      toast.success(t("generatingCharacterImage"));
    } catch (error) {
      console.error("Failed to regenerate character image:", error);
      toast.error(t("generationFailed"));
    } finally {
      setIsRegenerating(false);
    }
  };

  const selectedVoiceId = form.watch("voiceId");

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent showCloseButton={false} className="bg-gradient-to-br from-white to-green-50 border border-green-100 shadow-[8px_8px_24px_rgba(173,230,200,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] sm:max-w-[1000px] max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-green-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-green-700 font-bold text-lg shadow-[2px_2px_6px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.8)]">
                  #{characterNumber}
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold" style={{ color: '#111827' }}>
                    {character.name || t('unnamedCharacter')}
                  </DialogTitle>
                  <DialogDescription className="text-sm flex items-center gap-2" style={{ color: '#6b7280' }}>
                    <StatusBadge status={status} />
                  </DialogDescription>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onNavigatePrevious}
                  disabled={!hasPrevious}
                  className={cn(
                    "h-9 px-3 rounded-lg flex items-center gap-1.5 transition-all text-sm",
                    hasPrevious
                      ? "bg-white/80 hover:bg-white text-gray-700 shadow-sm border border-gray-200"
                      : "text-gray-300 cursor-not-allowed"
                  )}
                >
                  <ChevronLeft size={16} />
                  {t('prev')}
                </button>
                <button
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  className={cn(
                    "h-9 px-3 rounded-lg flex items-center gap-1.5 transition-all text-sm",
                    hasNext
                      ? "bg-white/80 hover:bg-white text-gray-700 shadow-sm border border-gray-200"
                      : "text-gray-300 cursor-not-allowed"
                  )}
                >
                  {t('next')}
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 text-gray-700 font-medium"
                >
                  <X size={14} />
                  <span className="text-sm">{t('close')}</span>
                </button>
                <button
                  onClick={form.handleSubmit(handleSave)}
                  disabled={isSaving}
                  className={cn(
                    "h-9 px-4 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2",
                    isSaving ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <Save size={14} />
                  <span className="text-sm">{t('save')}</span>
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Content with Tabs */}
          <FormProvider {...form}>
            <Tabs defaultValue="image" className="flex-1 flex flex-col overflow-hidden px-6 py-4">
              <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0 bg-white/50">
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {t('characterImage')}
                </TabsTrigger>
                <TabsTrigger value="info" className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {t("basicInfoTab")}
                </TabsTrigger>
                <TabsTrigger value="voice" className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  {t("voiceColor")}
                </TabsTrigger>
              </TabsList>

              <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-green-300 flex-1">
                {/* 基本信息 Tab */}
                <TabsContent value="info" className="mt-0 space-y-6">
                  {/* 角色属性 */}
                  <div className="flex flex-wrap gap-2">
                    {(character as any).gender && (
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200">
                        {(character as any).gender === 'male' ? t('genderMale') : (character as any).gender === 'female' ? t('genderFemale') : (character as any).gender}
                      </span>
                    )}
                    {(character as any).age && (
                      <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-lg border border-purple-200">
                        {(character as any).age}{t('yearsOld')}
                      </span>
                    )}
                    {(character as any).role && (
                      <span className="px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
                        {(character as any).role}
                      </span>
                    )}
                    {character.tags && character.tags.length > 0 && character.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-gray-50 text-gray-700 text-sm rounded-lg border border-gray-200">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* 角色描述 */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100">
                    <div className="text-sm font-medium text-blue-700 mb-2">{t('characterDescription')}</div>
                    <FormField
                      control={form.control}
                      name="basicInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <textarea
                              {...field}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-blue-200 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={t('characterDescriptionPlaceholder')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 角色外观 */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-white to-pink-50 border border-pink-100">
                    <div className="text-sm font-medium text-pink-700 mb-2">{t('appearanceFeatures')}</div>
                    <FormField
                      control={form.control}
                      name="appearance"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <textarea
                              {...field}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-pink-200 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-pink-500"
                              placeholder={t('appearancePlaceholder')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 生成提示词 */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-teal-50 border border-green-100">
                    <div className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                      <Sparkles size={14} />
                      {t('generationPrompt')}
                    </div>
                    <FormField
                      control={form.control}
                      name="imagePrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <textarea
                              {...field}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-green-200 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder={t('customImagePromptPlaceholder')}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* 角色图片 Tab */}
                <TabsContent value="image" className="mt-0 space-y-6">
                  {/* 角色图片 | 角色提示词 左右布局 */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* 左侧：角色图片 */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">{t('characterImage')}</div>
                      <ImageVersionPreview
                        currentImageUrl={imageUrl}
                        imageHistory={imageHistory}
                        onRegenerate={handleRegenerate}
                        onApplyVersion={handleApplyVersion}
                        onVersionChange={handleVersionChange}
                        onImageClick={(url) => setPreviewImage(url)}
                        entityType="character"
                        entityName={character.name}
                        isRegenerating={isRegenerating}
                        className="rounded-xl"
                      />
                    </div>

                    {/* 右侧：角色提示词 */}
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">{t('characterPrompt')}</div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-teal-50 border border-green-100 h-full">
                        <FormField
                          control={form.control}
                          name="imagePrompt"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <textarea
                                  {...field}
                                  className="w-full h-[200px] px-3 py-2 rounded-lg bg-white border border-green-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                                  placeholder={t('customImagePromptPlaceholder')}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 候选图片 */}
                  {candidateImages.length > 1 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700">{t('candidateImages')}</div>
                      <div className="grid grid-cols-4 gap-2">
                        {candidateImages.map((url: string, idx: number) => (
                          <div
                            key={idx}
                            className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                            onClick={() => setPreviewImage(url)}
                          >
                            <img
                              src={url}
                              alt={t('candidateN', { n: idx + 1 })}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* 音色选择 Tab */}
                <TabsContent value="voice" className="mt-0 space-y-4">
                  {/* 搜索框 */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder={t('searchVoicePlaceholder')}
                      value={voiceSearch}
                      onChange={(e) => setVoiceSearch(e.target.value)}
                      className="pl-9 rounded-xl bg-white border border-gray-200"
                    />
                  </div>

                  {/* 音色列表 */}
                  {isLoadingVoices ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                      <span className="ml-2 text-gray-600">{t('loading')}</span>
                    </div>
                  ) : voices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <Volume2 className="w-10 h-10 mb-2 opacity-50" />
                      <p>{t('noMatchingVoice')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {voices.map((voice) => {
                        const isSelected = selectedVoiceId === voice.id;
                        const isPlaying = playingVoiceId === voice.id;
                        const sample = voice.samples[0];
                        const hasAudio = !!sample?.audio;

                        return (
                          <div
                            key={voice.id}
                            onClick={() => form.setValue("voiceId", voice.id)}
                            className={cn(
                              "relative rounded-xl p-4 cursor-pointer transition-all duration-200",
                              "bg-gradient-to-br from-white to-green-50 border",
                              isSelected
                                ? "border-green-500 shadow-md ring-1 ring-green-500"
                                : "border-gray-200 hover:border-green-300 hover:shadow-sm"
                            )}
                          >
                            {isSelected && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}

                            <div className="flex gap-4">
                              {/* 左侧：封面图片 */}
                              <div className="relative flex-shrink-0">
                                {voice.cover_image ? (
                                  <img
                                    src={voice.cover_image}
                                    alt={voice.title}
                                    className="w-16 h-16 rounded-xl object-cover"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                                    <Volume2 className="w-8 h-8 text-green-600" />
                                  </div>
                                )}
                              </div>

                              {/* 中间：信息区域 */}
                              <div className="flex-1 min-w-0">
                                {/* 标题和作者 */}
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-semibold text-base text-gray-900 truncate">
                                      {voice.title}
                                    </h4>
                                    {voice.author && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {voice.author.nickname}
                                      </p>
                                    )}
                                  </div>
                                  {/* 使用次数 */}
                                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                                    <Play className="w-3 h-3" />
                                    <span>{voice.task_count || 0}</span>
                                  </div>
                                </div>

                                {/* 标签 */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {voice.tags.slice(0, 4).map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>

                                {/* 试听文本和播放按钮 */}
                                {sample && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600 truncate">
                                      {sample.text || t('noAuditionText')}
                                    </div>
                                    {hasAudio && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePlayToggle(voice);
                                        }}
                                        className={cn(
                                          "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all",
                                          isPlaying
                                            ? "bg-green-500 text-white shadow-md"
                                            : "bg-white border border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-600"
                                        )}
                                      >
                                        {isPlaying ? (
                                          <Pause className="w-4 h-4" />
                                        ) : (
                                          <Play className="w-4 h-4 ml-0.5" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 分页控件 */}
                  {totalVoicePages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <button
                        onClick={() => setVoicePage((p) => Math.max(1, p - 1))}
                        disabled={voicePage <= 1}
                        className={cn(
                          "h-8 px-3 rounded-lg text-sm transition-all",
                          voicePage <= 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {t('previousPage')}
                      </button>
                      <span className="text-sm text-gray-600 px-2">
                        {voicePage} / {totalVoicePages}
                      </span>
                      <button
                        onClick={() => setVoicePage((p) => Math.min(totalVoicePages, p + 1))}
                        disabled={voicePage >= totalVoicePages}
                        className={cn(
                          "h-8 px-3 rounded-lg text-sm transition-all",
                          voicePage >= totalVoicePages
                            ? "text-gray-300 cursor-not-allowed"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {t('nextPage')}
                      </button>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <ImagePreview
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        src={previewImage}
        alt={t('characterImagePreview')}
      />
    </>
  );
}
