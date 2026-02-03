"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
    RotateCcw,
    Download,
    Loader2,
    Image as ImageIcon,
    Info,
} from "lucide-react";
import { IShot, INarrationItem } from "@/types/scene";
import { ICharacter } from "@/types/character";
import shotApi from "@/lib/api/shot";
import { cn } from "@/lib/utils";
import { ImagePreview } from "@/components/ui/image-preview";
import { ImageVersionPreview } from "@/components/ui/image-version-preview";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShotDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    shot: IShot | null;
    shotNumber: number;
    sceneName: string;
    allCharacters?: ICharacter[];
    onNavigatePrevious?: () => void;
    onNavigateNext?: () => void;
    hasPrevious?: boolean;
    hasNext?: boolean;
    aspectRatio?: "16:9" | "9:16";
}

// 安全解析 narration
const parseNarration = (data: any): INarrationItem[] => {
    if (Array.isArray(data)) return data;
    if (typeof data === "string" && data.trim()) {
        try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) { }
    }
    return [];
};

/**
 * 分镜详情弹窗 - 统一滚动布局版本
 */
export function ShotDetailDialog({
    isOpen,
    onClose,
    shot,
    shotNumber,
    sceneName,
    allCharacters = [],
    onNavigatePrevious,
    onNavigateNext,
    hasPrevious = false,
    hasNext = false,
    aspectRatio = "16:9",
}: ShotDetailDialogProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const imageHistory = useMemo(() => {
        if (!shot) return [];
        return ((shot as any).status_detail?.image_historys || []) as Array<{
            image_url: string;
            image_prompt?: string;
            created_at: string;
            task_id?: string;
        }>;
    }, [shot]);

    const lastImageHistory = useMemo(() => {
        if (!shot) return [];
        return ((shot as any).status_detail?.last_image_historys || []) as Array<{
            image_url: string;
            image_prompt?: string;
            created_at: string;
            task_id?: string;
        }>;
    }, [shot]);

    const associatedCharacters = useMemo(() => {
        if (!shot) return [];
        const chars: ICharacter[] = [];

        if (shot.characters && Array.isArray(shot.characters)) {
            chars.push(...shot.characters);
        } else if (shot.associated_characters && Array.isArray(shot.associated_characters)) {
            shot.associated_characters.forEach((id) => {
                const char = allCharacters.find(
                    (c) => String(c.character_id) === String(id) || c.uuid === String(id)
                );
                if (char) chars.push(char);
            });
        }

        return chars;
    }, [shot, allCharacters]);

    // 获取视频版本历史
    const videoVersionHistory = useMemo(() => {
        if (!shot) return [];
        const history = ((shot as any).extra_data?.version_history || []) as Array<{
            version_id: string;
            video_url: string;
            audio_url?: string;
            video_duration?: number;
            video_model?: string;
            created_at: string;
        }>;
        console.log("[ShotDetailDialog] videoVersionHistory:", history, "extra_data:", (shot as any).extra_data);
        return history;
    }, [shot]);

    // 获取当前选中的版本
    const selectedVersion = useMemo(() => {
        if (!videoVersionHistory.length) return null;
        return videoVersionHistory.find(v => v.version_id === selectedVersionId) || videoVersionHistory[videoVersionHistory.length - 1];
    }, [videoVersionHistory, selectedVersionId]);

    // 默认选中最新版本 - 使用 useEffect
    useEffect(() => {
        if (videoVersionHistory.length > 0 && !selectedVersionId) {
            setSelectedVersionId(videoVersionHistory[videoVersionHistory.length - 1].version_id);
        }
    }, [videoVersionHistory, selectedVersionId]);

    if (!shot) return null;

    // 切换首帧版本时
    const handleStartFrameVersionChange = (version: {image_url: string; image_prompt?: string; created_at: string}) => {
        // Agent模式下只用于显示，不修改实际数据
    };

    // 切换尾帧版本时
    const handleEndFrameVersionChange = (version: {image_url: string; image_prompt?: string; created_at: string}) => {
        // Agent模式下只用于显示，不修改实际数据
    };

    // 应用首帧版本
    const handleApplyStartFrameVersion = async (version: {image_url: string; created_at: string}) => {
        try {
            await shotApi.updateShot((shot as any).uuid || String(shot.shot_id), {
                image_url: version.image_url,
            } as any);
            toast.success("已应用首帧新版本");
            onClose();
        } catch (error) {
            console.error("Failed to apply version:", error);
            toast.error("应用失败，请重试");
        }
    };

    // 应用尾帧版本
    const handleApplyEndFrameVersion = async (version: {image_url: string; created_at: string}) => {
        try {
            await shotApi.updateShot((shot as any).uuid || String(shot.shot_id), {
                extra_data: {
                    ...(shot.extra_data || {}),
                    end_frame_image_url: version.image_url,
                },
            } as any);
            toast.success("已应用尾帧新版本");
            onClose();
        } catch (error) {
            console.error("Failed to apply end frame version:", error);
            toast.error("应用失败，请重试");
        }
    };

    // Agent模式下重生成功能不直接支持，给出空实现
    const handleRegenerate = () => {
        toast.info("Agent模式下请通过对话生成新图片");
    };

    // 播放视频和音频
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
    // 兼容两种字段名：end_frame_prompt 和 end_frame_image_prompt
    const endFrameImagePrompt = (shot.extra_data as any)?.end_frame_prompt || (shot.extra_data as any)?.end_frame_image_prompt;
    const videoPrompt = (shot.extra_data as any)?.video_prompt;

    // 根据比例决定布局
    const isPortrait = aspectRatio === "9:16";
    const imageAspectClass = isPortrait ? "aspect-[9/16]" : "aspect-video";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] sm:max-w-[1000px] max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="px-6 pt-5 pb-4 border-b border-blue-100 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-bold text-lg shadow-[2px_2px_6px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.8)]">
                                    #{shotNumber}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold" style={{ color: '#111827' }}>
                                        {shot.title || `分镜 ${shotNumber}`}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm" style={{ color: '#6b7280' }}>
                                        {sceneName}
                                    </DialogDescription>
                                </div>
                            </div>

                            {/* Navigation */}
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
                                    上一个
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
                                    下一个
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Content with Tabs */}
                    <Tabs defaultValue="image" className="flex-1 flex flex-col overflow-hidden px-6 py-4">
                      <TabsList className="grid w-full grid-cols-4 mb-4 flex-shrink-0 bg-white/50">
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
                        <TabsTrigger value="info" className="flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          基本信息
                        </TabsTrigger>
                      </TabsList>

                      <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-300 flex-1">
                        <TabsContent value="image" className="mt-0 space-y-6">
                          {/* 首帧和尾帧图片 - 分栏布局 */}
                          <div className={cn(
                            "grid gap-4",
                            isPortrait ? "grid-cols-4" : "grid-cols-2"
                          )}>
                            {/* 首帧图片 */}
                            <div className={cn("space-y-2", isPortrait && "col-span-2")}>
                                <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    首帧图片
                                </div>
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
                                {/* 首帧提示词 */}
                                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-100">
                                    <div className="text-xs font-medium text-orange-700 mb-1 flex items-center gap-1">
                                        <Sparkles size={12} />
                                        首帧提示词
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                                        {shot.image_prompt || "暂无"}
                                    </p>
                                </div>
                            </div>

                            {/* 尾帧图片 */}
                            <div className={cn("space-y-2", isPortrait && "col-span-2")}>
                                <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    尾帧图片
                                </div>
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
                                {/* 尾帧提示词 */}
                                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                                    <div className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                                        <Sparkles size={12} />
                                        尾帧提示词
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                                        {endFrameImagePrompt || "暂无"}
                                    </p>
                                </div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="video" className="mt-0 space-y-6">
                          {/* 视频预览 */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                <Film size={14} />
                                视频预览
                              </div>
                              {videoVersionHistory.length > 0 && (
                                <Select
                                  value={selectedVersionId || undefined}
                                  onValueChange={setSelectedVersionId}
                                >
                                  <SelectTrigger className="h-8 w-[180px] text-xs">
                                    <SelectValue placeholder="选择版本" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {videoVersionHistory.map((v, idx) => (
                                      <SelectItem key={v.version_id} value={v.version_id} className="text-xs">
                                        版本 {idx + 1} ({new Date(v.created_at).toLocaleString()})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            {(() => {
                              const displayVideoUrl = selectedVersion?.video_url || shot.video_url;
                              const displayAudioUrl = selectedVersion?.audio_url || shot.audio_url;

                              if (displayVideoUrl) {
                                return (
                                  <div className="space-y-3">
                                    <div className={cn(
                                      "relative rounded-xl overflow-hidden bg-black",
                                      imageAspectClass,
                                      isPortrait ? "max-w-[300px]" : ""
                                    )}>
                                      <video
                                        ref={videoRef}
                                        key={displayVideoUrl}
                                        src={displayVideoUrl}
                                        controls
                                        className="w-full h-full object-contain"
                                        preload="metadata"
                                      />
                                    </div>

                                    {displayAudioUrl && (
                                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200">
                                        <Volume2 size={16} className="text-gray-500 shrink-0" />
                                        <audio
                                          ref={audioRef}
                                          src={displayAudioUrl}
                                          controls
                                          className="flex-1 h-8"
                                        />
                                      </div>
                                    )}

                                    <div className="flex gap-3">
                                      <button
                                        onClick={handlePlayBoth}
                                        className="flex-1 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-sm hover:scale-105 transition-all duration-200 px-3 py-2 text-sm flex items-center justify-center gap-1.5"
                                      >
                                        <Play className="w-4 h-4" />
                                        播放视频和音频
                                      </button>
                                      <button
                                        onClick={() => {
                                          const a = document.createElement('a');
                                          a.href = displayVideoUrl;
                                          a.download = `${shot.title || 'video'}_${selectedVersionId || 'latest'}.mp4`;
                                          a.click();
                                        }}
                                        className="flex-1 rounded-xl bg-white border border-gray-200 shadow-sm px-3 py-2 text-sm font-medium text-gray-700 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-1.5"
                                      >
                                        <Download className="w-4 h-4" />
                                        下载视频
                                      </button>
                                    </div>

                                    {selectedVersion && (
                                      <button
                                        onClick={async () => {
                                          if (!selectedVersion) return;
                                          try {
                                            await shotApi.updateShot((shot as any).uuid || String(shot.shot_id), {
                                              video_url: selectedVersion.video_url,
                                              audio_url: selectedVersion.audio_url,
                                            } as any);
                                            toast.success("已应用为最终版本");
                                            onClose();
                                          } catch (error) {
                                            console.error("Failed to apply version:", error);
                                            toast.error("应用失败，请重试");
                                          }
                                        }}
                                        className="w-full rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 text-white font-medium shadow-sm hover:scale-105 transition-all duration-200 px-3 py-2 text-sm flex items-center justify-center gap-1.5"
                                      >
                                        <Sparkles className="w-4 h-4" />
                                        应用为最终版本
                                      </button>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <div className="rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 p-8 text-center">
                                  <div className="text-4xl mb-3">🎬</div>
                                  <p className="text-gray-500 text-sm">暂无视频</p>
                                </div>
                              );
                            })()}
                          </div>

                          {/* 视频提示词 */}
                          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                            <div className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-1.5">
                              <Film size={14} />
                              视频提示词
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {videoPrompt || "暂无"}
                            </p>
                          </div>
                        </TabsContent>

                        <TabsContent value="dialogue" className="mt-0 space-y-6">
                          {/* 台词/旁白 */}
                          {narration.length > 0 ? (
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700">台词 / 旁白</div>
                              <div className="space-y-2">
                                {narration.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex gap-3 p-2.5 rounded-lg bg-gray-50"
                                  >
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-100 text-blue-700 border-0 shrink-0"
                                    >
                                      {item.角色}
                                    </Badge>
                                    <p className="text-sm text-gray-700 flex-1">
                                      {item.内容}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 p-8 text-center">
                              <div className="text-4xl mb-3">💬</div>
                              <p className="text-gray-500 text-sm">暂无台词/旁白</p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="info" className="mt-0 space-y-6">
                          {/* 关联角色 */}
                          {associatedCharacters.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-700">出场角色</div>
                              <div className="flex flex-wrap gap-2">
                                {associatedCharacters.map((char) => (
                                  <div
                                    key={char.character_id || char.uuid}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm text-sm"
                                  >
                                    {char.image_url && (
                                      <img
                                        src={char.image_url}
                                        alt={char.name}
                                        className="w-5 h-5 rounded-full object-cover"
                                      />
                                    )}
                                    <span className="text-gray-700">{char.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 分镜描述 */}
                          {shot.description && (
                            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                <FileText size={14} />
                                分镜描述
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {shot.description}
                              </p>
                            </div>
                          )}
                        </TabsContent>
                      </div>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Image Preview Modal */}
            <ImagePreview
                open={!!previewImage}
                onOpenChange={(open) => !open && setPreviewImage(null)}
                src={previewImage}
                alt="图片预览"
            />
        </>
    );
}
