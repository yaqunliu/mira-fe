"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Film,
    FileText,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Volume2,
    Play,
    Pause,
    Download,
    Loader2,
    Image as ImageIcon,
    Info,
    Save,
    X,
    Plus,
    Trash2,
    RefreshCw,
} from "lucide-react";
import { IShot, INarrationItem, parseNarration } from "@/types/scene";
import { ICharacter } from "@/types/character";
import shotApi from "@/lib/api/shot";
import { cn } from "@/lib/utils";
import { ImagePreview } from "@/components/ui/image-preview";
import { ImageVersionPreview } from "@/components/ui/image-version-preview";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FormField,
    FormControl,
    FormItem,
} from "@/components/ui/form";

interface ShotDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    shot: IShot | null;
    shotNumber: number;
    sceneName?: string;
    onNavigatePrevious?: () => void;
    onNavigateNext?: () => void;
    hasPrevious?: boolean;
    hasNext?: boolean;
    associatedCharacters?: ICharacter[];
    allScenes?: any[];
    allCharacters?: ICharacter[];
    onRefresh?: () => void;
}

export function ShotDetailDialog({
    isOpen,
    onClose,
    shot,
    shotNumber,
    sceneName,
    onNavigatePrevious,
    onNavigateNext,
    hasPrevious,
    hasNext,
    associatedCharacters = [],
    allScenes = [],
    allCharacters = [],
    onRefresh,
}: ShotDetailDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [playingNarrationIdx, setPlayingNarrationIdx] = useState<number | null>(null);
    const [generatingAudioIdx, setGeneratingAudioIdx] = useState<number | null>(null);
    const [editingNarration, setEditingNarration] = useState<INarrationItem[]>([]);
    const [appearanceElements, setAppearanceElements] = useState<string[]>([]);

    const form = useForm({
        defaultValues: {
            description: shot?.description || "",
            imagePrompt: shot?.image_prompt || "",
            endFramePrompt: (shot as any)?.extra_data?.end_frame_image_prompt || (shot as any)?.extra_data?.end_frame_prompt || "",
            videoPrompt: (shot as any)?.extra_data?.video_prompt || "",
            videoDuration: shot?.video_duration || 5,
            narration: JSON.stringify(parseNarration(shot?.narration) || []),
            sceneId: shot?.scene_id || null,
            characterIds: (shot?.characters || []).map((c: any) => Number(c.character_id)).filter(Boolean),
        },
    });

    // 当 shot 变化时，重置表单值
    useEffect(() => {
        if (shot) {
            const characterIds = (shot.characters || [])
                .map((c: any) => Number(c.character_id))
                .filter((id) => !isNaN(id) && id > 0);

            form.reset({
                description: shot.description || "",
                imagePrompt: shot.image_prompt || "",
                endFramePrompt: (shot as any)?.extra_data?.end_frame_image_prompt || (shot as any)?.extra_data?.end_frame_prompt || "",
                videoPrompt: (shot as any)?.extra_data?.video_prompt || "",
                videoDuration: shot.video_duration || 5,
                narration: JSON.stringify(parseNarration(shot.narration) || []),
                sceneId: shot.scene_id || null,
                characterIds: characterIds,
            });
            setEditingNarration(parseNarration(shot.narration));

            // 初始化出镜元素
            const elements = (shot.extra_data as any)?.appearance_elements || [];
            setAppearanceElements(Array.isArray(elements) ? elements : []);
        }
    }, [shot?.shot_id, form]);

    // 清理音频播放
    useEffect(() => {
        return () => {
            if (narrationAudioRef.current) {
                narrationAudioRef.current.pause();
                narrationAudioRef.current = null;
            }
        };
    }, []);

    if (!shot) return null;

    // 更新单条台词
    const handleNarrationChange = (idx: number, field: '角色' | '内容', value: string) => {
        const updated = [...editingNarration];
        updated[idx] = { ...updated[idx], [field]: value };
        setEditingNarration(updated);
        form.setValue("narration", JSON.stringify(updated));
    };

    // 添加台词
    const handleAddNarration = () => {
        const updated = [...editingNarration, { 角色: "", 内容: "" }];
        setEditingNarration(updated);
        form.setValue("narration", JSON.stringify(updated));
    };

    // 删除台词
    const handleDeleteNarration = (idx: number) => {
        const updated = editingNarration.filter((_, i) => i !== idx);
        setEditingNarration(updated);
        form.setValue("narration", JSON.stringify(updated));
    };

    // 出镜元素处理函数
    const handleAddAppearanceElement = () => {
        setAppearanceElements(prev => [...prev, '']);
    };

    const handleUpdateAppearanceElement = (index: number, value: string) => {
        setAppearanceElements(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleRemoveAppearanceElement = (index: number) => {
        setAppearanceElements(prev => prev.filter((_, i) => i !== index));
    };

    // 生成单条台词音频
    const handleGenerateNarrationAudio = async (idx: number, item: INarrationItem) => {
        if (!item.内容) {
            toast.error("请先输入台词内容");
            return;
        }
        setGeneratingAudioIdx(idx);
        try {
            const result = await shotApi.generateNarrationAudio(
                shot.shot_id,
                idx,
                item.角色 || "旁白",
                item.内容
            );
            if (result.success && result.data?.audio_url) {
                const updated = [...editingNarration];
                updated[idx] = { ...updated[idx], audio_url: result.data.audio_url };
                setEditingNarration(updated);
                toast.success("音频生成成功");
                onRefresh?.();
            } else {
                toast.error(result.error || "生成失败，请重试");
            }
        } catch (error) {
            console.error("Failed to generate narration audio:", error);
            toast.error("生成失败，请重试");
        } finally {
            setGeneratingAudioIdx(null);
        }
    };

    // 播放/暂停台词音频
    const handlePlayNarrationAudio = (idx: number, audioUrl: string) => {
        if (playingNarrationIdx === idx) {
            narrationAudioRef.current?.pause();
            setPlayingNarrationIdx(null);
        } else {
            if (narrationAudioRef.current) {
                narrationAudioRef.current.pause();
            }
            narrationAudioRef.current = new Audio(audioUrl);
            narrationAudioRef.current.onended = () => setPlayingNarrationIdx(null);
            narrationAudioRef.current.onerror = () => setPlayingNarrationIdx(null);
            narrationAudioRef.current.play();
            setPlayingNarrationIdx(idx);
        }
    };

    // 下载音频
    const handleDownloadAudio = (audioUrl: string, fileName: string) => {
        const a = document.createElement("a");
        a.href = audioUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleStartFrameVersionChange = (version: { image_url: string; image_prompt?: string; created_at: string }) => {
        if (version.image_prompt) {
            form.setValue("imagePrompt", version.image_prompt);
        }
    };

    const handleEndFrameVersionChange = (version: { image_url: string; image_prompt?: string; created_at: string }) => {
    };

    const handleApplyStartFrameVersion = async (version: { image_url: string; created_at: string }) => {
        try {
            await shotApi.updateShot((shot as any).uuid || String(shot.shot_id), {
                image_url: version.image_url,
            } as any);
            toast.success("已应用首帧新版本");
            onRefresh?.();
        } catch (error) {
            console.error("Failed to apply version:", error);
            toast.error("应用失败，请重试");
        }
    };

    const handleApplyEndFrameVersion = async (version: { image_url: string; created_at: string }) => {
        try {
            await shotApi.updateShot((shot as any).uuid || String(shot.shot_id), {
                extra_data: {
                    ...(shot.extra_data || {}),
                    end_frame_image_url: version.image_url,
                },
            } as any);
            toast.success("已应用尾帧新版本");
            onRefresh?.();
        } catch (error) {
            console.error("Failed to apply end frame version:", error);
            toast.error("应用失败，请重试");
        }
    };

    const handleSave = async (values: any) => {
        setIsSaving(true);
        try {
            const shotUuid = (shot as any).uuid || String(shot.shot_id);

            // 解析 narration 数据
            let narrationData: INarrationItem[] = [];
            try {
                const parsed = JSON.parse(values.narration);
                if (Array.isArray(parsed)) {
                    narrationData = parsed;
                }
            } catch (e) {
                narrationData = parseNarration(shot.narration);
            }

            // 更新分镜基本信息（不包含 narration）
            await shotApi.updateShot(shotUuid, {
                description: values.description,
                image_prompt: values.imagePrompt,
                video_duration: values.videoDuration,
                scene_id: values.sceneId,
                extra_data: {
                    ...(shot.extra_data || {}),
                    video_prompt: values.videoPrompt,
                    end_frame_image_prompt: values.endFramePrompt,
                    appearance_elements: appearanceElements,
                },
            } as any);

            // 单独更新 narration（确保使用正确格式）
            if (narrationData && narrationData.length > 0) {
                await shotApi.updateShot(shotUuid, {
                    narration: narrationData,
                } as any);
            }

            // 单独更新角色关联（使用专门的API）
            if (values.characterIds && Array.isArray(values.characterIds)) {
                await shotApi.updateShotCharacters(shotUuid, values.characterIds);
            }

            toast.success("保存成功");
            onRefresh?.();
        } catch (error) {
            console.error("Failed to save shot:", error);
            toast.error("保存失败，请重试");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerate = async () => {
        try {
            await shotApi.regenerateShotImage(
                (shot as any).uuid || String(shot.shot_id),
                form.getValues("imagePrompt") || shot.image_prompt || ""
            );
            toast.success("正在生成分镜图片，请稍候...");
        } catch (error) {
            console.error("Failed to regenerate shot image:", error);
            toast.error("生成失败，请重试");
        }
    };

    const handlePlayBoth = () => {
        if (videoRef.current) {
            videoRef.current.play();
        }
        if (audioRef.current) {
            audioRef.current.play();
        }
    };

    const narration = parseNarration(shot.narration);
    const endFrameImageUrl = (shot.extra_data as any)?.end_frame_image_url;
    const endFrameImagePrompt = (shot.extra_data as any)?.end_frame_prompt || (shot.extra_data as any)?.end_frame_image_prompt;
    const videoPrompt = (shot.extra_data as any)?.video_prompt;

    const imageHistory = ((shot as any).status_detail?.image_historys || []) as Array<{
        image_url: string;
        image_prompt?: string;
        created_at: string;
        task_id?: string
    }>;
    const lastImageHistory = ((shot as any).status_detail?.last_image_historys || []) as Array<{
        image_url: string;
        image_prompt?: string;
        created_at: string;
        task_id?: string
    }>;

    const aspectRatio = (shot.extra_data as any)?.aspect_ratio === "9:16" ? "9:16" : "16:9";
    const isPortrait = aspectRatio === "9:16";
    const imageAspectClass = isPortrait ? "aspect-[9/16]" : "aspect-video";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent showCloseButton={false} className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] sm:max-w-[1000px] max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-5 pb-4 border-b border-blue-100 flex-shrink-0">
                        <DialogTitle className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-bold text-lg shadow-[2px_2px_6px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.8)]">
                                    #{shotNumber}
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-gray-900">
                                        {shot.title || `分镜 ${shotNumber}`}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {sceneName}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
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
                                    上一个
                                </button>
                                <button
                                    type="button"
                                    onClick={onNavigateNext}
                                    disabled={!hasNext}
                                    className={cn(
                                        "h-9 px-3 rounded-lg flex items-center gap-1.5 transition-all text-sm",
                                        hasNext
                                            ? "bg-white/80 hover:bg-white text-gray-700 shadow-sm border border-gray-200"
                                            : "text-gray-300 cursor-not-allowed"
                                    )}
                                >
                                    下一个
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 text-gray-700 font-medium"
                                >
                                    <X size={14} />
                                    <span className="text-sm">关闭</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={form.handleSubmit(handleSave)}
                                    disabled={isSaving}
                                    className={cn(
                                        "h-9 px-4 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2",
                                        isSaving ? "opacity-60 cursor-not-allowed" : ""
                                    )}
                                >
                                    {isSaving && <Loader2 size={14} className="animate-spin" />}
                                    <Save size={14} />
                                    <span className="text-sm">保存</span>
                                </button>
                            </div>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            分镜详情
                        </DialogDescription>
                    </DialogHeader>

                    <FormProvider {...form}>
                    <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden px-6 py-4">
                      <TabsList className="grid w-full grid-cols-4 mb-4 flex-shrink-0 bg-white/50">
                        <TabsTrigger value="info" className="flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          基本信息
                        </TabsTrigger>
                        <TabsTrigger value="image" className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          首尾帧图片
                        </TabsTrigger>
                        <TabsTrigger value="video" className="flex items-center gap-2">
                          <Film className="w-4 h-4" />
                          视频预览
                        </TabsTrigger>
                        <TabsTrigger value="dialogue" className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          台词/旁白
                        </TabsTrigger>
                      </TabsList>

                      <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-300 flex-1">
                        {/* 基本信息 Tab */}
                        <TabsContent value="info" className="mt-0 space-y-6">
                          {/* 关联场景选择 */}
                          <div className="p-4 rounded-xl bg-gradient-to-br from-white to-purple-50 border border-purple-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Film className="w-4 h-4 text-purple-600" />
                              <label className="text-sm font-medium text-purple-700">关联场景</label>
                            </div>
                            <FormField
                              control={form.control}
                              name="sceneId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Select
                                      value={field.value ? String(field.value) : ""}
                                      onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                                    >
                                      <SelectTrigger className="w-full bg-white border-purple-200">
                                        <SelectValue placeholder="选择关联场景" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {allScenes.map((scene, idx) => (
                                          <SelectItem key={scene.scene_id} value={String(scene.scene_id)}>
                                            场景 {idx + 1}: {scene.title || scene.location || `场景 ${scene.scene_id}`}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* 关联角色选择 */}
                          <div className="p-4 rounded-xl bg-gradient-to-br from-white to-green-50 border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-green-700">关联角色</span>
                            </div>
                            <FormField
                              control={form.control}
                              name="characterIds"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex flex-wrap gap-2">
                                    {allCharacters.map((char) => {
                                      const isSelected = field.value?.includes(char.character_id);
                                      return (
                                        <div
                                          key={char.character_id || char.uuid}
                                          onClick={() => {
                                            const currentIds = field.value || [];
                                            if (isSelected) {
                                              field.onChange(currentIds.filter((id: number) => id !== char.character_id));
                                            } else {
                                              field.onChange([...currentIds, char.character_id]);
                                            }
                                          }}
                                          className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer transition-all",
                                            isSelected
                                              ? "bg-green-100 border-green-500 shadow-sm"
                                              : "bg-white border-gray-200 hover:border-green-300"
                                          )}
                                        >
                                          {char.image_url && (
                                            <img
                                              src={char.image_url}
                                              alt={char.name}
                                              className="w-5 h-5 rounded-full object-cover"
                                            />
                                          )}
                                          <span className={cn("text-sm", isSelected ? "text-green-700 font-medium" : "text-gray-700")}>
                                            {char.name}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* 分镜描述 */}
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <div className="p-4 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <label className="text-sm font-medium text-blue-700">
                                      分镜描述
                                    </label>
                                  </div>
                                  <FormControl>
                                    <textarea
                                      {...field}
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange(e.target.value || "")}
                                      className="w-full min-h-[100px] p-3 rounded-xl bg-white border border-blue-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                      placeholder="输入分镜描述..."
                                    />
                                  </FormControl>
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* 出镜元素 */}
                          <div className="p-4 rounded-xl bg-gradient-to-br from-white to-orange-50 border border-orange-100">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-orange-700">出镜元素 (手机、包包等道具)</label>
                              <button
                                type="button"
                                onClick={handleAddAppearanceElement}
                                className="h-7 text-[10px] text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded-lg px-2 flex items-center gap-1 transition-all duration-200"
                              >
                                <Plus size={10} />
                                添加
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(appearanceElements) && appearanceElements.map((element, index) => (
                                <div key={index} className="flex items-center gap-1 bg-white border border-orange-200 rounded-lg px-2 py-1 shadow-sm">
                                  <input
                                    value={element}
                                    onChange={(e) => handleUpdateAppearanceElement(index, e.target.value)}
                                    className="h-6 w-24 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-orange-300 text-xs"
                                    placeholder="元素名称"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAppearanceElement(index)}
                                    className="h-4 w-4 text-gray-500 hover:text-red-500 transition-colors duration-200"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                              {(!Array.isArray(appearanceElements) || appearanceElements.length === 0) && (
                                <span className="text-xs text-gray-500 italic">暂无元素，点击"添加"按钮添加</span>
                              )}
                            </div>
                          </div>
                        </TabsContent>

                        {/* 首尾帧图片 Tab */}
                        <TabsContent value="image" className="mt-0 space-y-8">
                          {/* 分镜首帧 | 分镜首帧提示词 */}
                          <div className="grid grid-cols-2 gap-6 items-stretch">
                            <div className="space-y-3 flex flex-col">
                              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                分镜首帧
                              </div>
                              <div className="flex-1">
                                <ImageVersionPreview
                                  currentImageUrl={shot.image_url || undefined}
                                  imageHistory={imageHistory}
                                  onRegenerate={handleRegenerate}
                                  onApplyVersion={handleApplyStartFrameVersion}
                                  onVersionChange={handleStartFrameVersionChange}
                                  entityType="shot"
                                  entityName={`分镜 ${shotNumber}`}
                                  frameType="start"
                                />
                              </div>
                            </div>
                            <div className="space-y-3 flex flex-col">
                              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Sparkles size={14} className="text-orange-500" />
                                分镜首帧提示词
                              </div>
                              <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-100 flex flex-col">
                                <FormField
                                  control={form.control}
                                  name="imagePrompt"
                                  render={({ field }) => (
                                    <FormItem className="flex-1 flex flex-col">
                                      <FormControl>
                                        <textarea
                                          {...field}
                                          value={field.value || ""}
                                          onChange={(e) => field.onChange(e.target.value || "")}
                                          className="flex-1 w-full px-3 py-2 rounded-lg bg-white border border-orange-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                                          placeholder="输入首帧生成提示词..."
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 分镜尾帧 | 分镜尾帧提示词 */}
                          <div className="grid grid-cols-2 gap-6 items-stretch">
                            <div className="space-y-3 flex flex-col">
                              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                分镜尾帧
                              </div>
                              <div className="flex-1">
                                <ImageVersionPreview
                                  currentImageUrl={endFrameImageUrl || undefined}
                                  imageHistory={lastImageHistory}
                                  onRegenerate={handleRegenerate}
                                  onApplyVersion={handleApplyEndFrameVersion}
                                  onVersionChange={handleEndFrameVersionChange}
                                  entityType="shot"
                                  entityName={`分镜 ${shotNumber}`}
                                  frameType="end"
                                />
                              </div>
                            </div>
                            <div className="space-y-3 flex flex-col">
                              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Sparkles size={14} className="text-purple-500" />
                                分镜尾帧提示词
                              </div>
                              <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 flex flex-col">
                                <FormField
                                  control={form.control}
                                  name="endFramePrompt"
                                  render={({ field }) => (
                                    <FormItem className="flex-1 flex flex-col">
                                      <FormControl>
                                        <textarea
                                          {...field}
                                          value={field.value || ""}
                                          onChange={(e) => field.onChange(e.target.value || "")}
                                          className="flex-1 w-full px-3 py-2 rounded-lg bg-white border border-purple-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          placeholder="输入尾帧生成提示词..."
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        {/* 视频预览 Tab */}
                        <TabsContent value="video" className="mt-0 space-y-6">
                          {/* 分镜视频 | 分镜视频提示词 左右布局 */}
                          <div className="grid grid-cols-2 gap-6 items-stretch">
                            {/* 左侧：视频预览 */}
                            <div className="space-y-3 flex flex-col">
                              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Film size={14} className="text-blue-500" />
                                分镜视频
                              </div>
                              <div className={cn("rounded-xl overflow-hidden border border-gray-200 flex-1", imageAspectClass)}>
                                {shot.video_url ? (
                                  <video
                                    ref={videoRef}
                                    src={shot.video_url}
                                    className="w-full h-full object-contain bg-black"
                                    controls
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 min-h-[200px]">
                                    <div className="text-center">
                                      <Film size={48} className="mx-auto mb-3 text-gray-400" />
                                      <p className="text-gray-500 text-sm">暂无视频</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {shot.video_url && (
                                <button
                                  onClick={handlePlayBoth}
                                  className="w-full h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 text-white font-medium shadow-sm hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                  <Play size={16} />
                                  播放预览
                                </button>
                              )}
                            </div>

                            {/* 右侧：视频提示词和时长 */}
                            <div className="space-y-3 flex flex-col">
                              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Sparkles size={14} className="text-purple-500" />
                                分镜视频提示词
                              </div>
                              <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 flex flex-col gap-3">
                                <FormField
                                  control={form.control}
                                  name="videoPrompt"
                                  render={({ field }) => (
                                    <FormItem className="flex-1 flex flex-col">
                                      <FormControl>
                                        <textarea
                                          {...field}
                                          value={field.value || ""}
                                          onChange={(e) => field.onChange(e.target.value || "")}
                                          className="flex-1 w-full px-3 py-2 rounded-lg bg-white border border-purple-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          placeholder="输入视频生成提示词..."
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="videoDuration"
                                  render={({ field }) => (
                                    <FormItem>
                                      <div className="flex items-center gap-2">
                                        <label className="text-xs text-purple-600">视频时长 (秒)</label>
                                        <FormControl>
                                          <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            {...field}
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                                            className="w-20 px-2 py-1 rounded border border-purple-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="5"
                                          />
                                        </FormControl>
                                        <span className="text-xs text-gray-500">秒 (1-100)</span>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        {/* 台词/旁白 Tab */}
                        <TabsContent value="dialogue" className="mt-0 space-y-4">
                          {/* 标题和添加按钮 */}
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-700">台词/旁白</div>
                            <button
                              type="button"
                              onClick={handleAddNarration}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                              <Plus size={14} />
                              添加
                            </button>
                          </div>

                          {editingNarration.length > 0 ? (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                              {editingNarration.map((item, idx) => {
                                const isGenerating = generatingAudioIdx === idx;
                                const isPlaying = playingNarrationIdx === idx;
                                const hasAudio = !!(item as any).audio_url;

                                return (
                                  <div key={idx} className="p-4 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
                                    {/* 角色和内容编辑 */}
                                    <div className="flex gap-3 mb-3">
                                      <div className="w-24 flex-shrink-0">
                                        <label className="text-xs text-gray-500 mb-1 block">角色</label>
                                        <input
                                          type="text"
                                          value={item.角色 || ""}
                                          onChange={(e) => handleNarrationChange(idx, "角色", e.target.value)}
                                          placeholder="旁白"
                                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <label className="text-xs text-gray-500 mb-1 block">台词内容</label>
                                        <textarea
                                          value={item.内容 || ""}
                                          onChange={(e) => handleNarrationChange(idx, "内容", e.target.value)}
                                          placeholder="输入台词内容..."
                                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>

                                    {/* 操作按钮 */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {/* 生成音频按钮 */}
                                        <button
                                          type="button"
                                          onClick={() => handleGenerateNarrationAudio(idx, item)}
                                          disabled={isGenerating || !item.内容}
                                          className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all",
                                            isGenerating
                                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                              : "bg-green-50 text-green-600 hover:bg-green-100"
                                          )}
                                        >
                                          {isGenerating ? (
                                            <>
                                              <Loader2 size={12} className="animate-spin" />
                                              生成中...
                                            </>
                                          ) : (
                                            <>
                                              <RefreshCw size={12} />
                                              生成音频
                                            </>
                                          )}
                                        </button>

                                        {/* 播放/暂停按钮 */}
                                        {hasAudio && (
                                          <button
                                            type="button"
                                            onClick={() => handlePlayNarrationAudio(idx, (item as any).audio_url)}
                                            className={cn(
                                              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all",
                                              isPlaying
                                                ? "bg-blue-500 text-white"
                                                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                            )}
                                          >
                                            {isPlaying ? (
                                              <>
                                                <Pause size={12} />
                                                暂停
                                              </>
                                            ) : (
                                              <>
                                                <Play size={12} />
                                                播放
                                              </>
                                            )}
                                          </button>
                                        )}

                                        {/* 下载按钮 */}
                                        {hasAudio && (
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadAudio((item as any).audio_url, `narration_${idx + 1}.mp3`)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                          >
                                            <Download size={12} />
                                            下载
                                          </button>
                                        )}
                                      </div>

                                      {/* 删除按钮 */}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteNarration(idx)}
                                        className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      >
                                        <Trash2 size={12} />
                                        删除
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 p-8 text-center">
                              <div className="text-4xl mb-3">💬</div>
                              <p className="text-gray-500 text-sm mb-3">暂无台词/旁白</p>
                              <button
                                type="button"
                                onClick={handleAddNarration}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              >
                                <Plus size={14} />
                                添加台词
                              </button>
                            </div>
                          )}
                        </TabsContent>
                      </div>
                    </Tabs>
                    </FormProvider>
                </DialogContent>
            </Dialog>

            <ImagePreview
                open={!!previewImage}
                onOpenChange={(open) => !open && setPreviewImage(null)}
                src={previewImage}
                alt="图片预览"
            />
        </>
    );
}
