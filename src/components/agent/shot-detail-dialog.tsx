"use client";

import { useState, useMemo } from "react";
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
    Image as ImageIcon,
    FileText,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Volume2,
} from "lucide-react";
import { IShot, INarrationItem } from "@/types/scene";
import { ICharacter } from "@/types/character";
import { cn } from "@/lib/utils";
import { ImagePreview } from "@/components/ui/image-preview";

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

    // 获取关联的角色 - 必须在所有条件返回之前调用 hooks
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

    // 条件返回必须在所有 hooks 之后
    if (!shot) return null;

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

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                        {/* 图片区域 */}
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
                                <div
                                    className={cn(
                                        "relative rounded-xl overflow-hidden bg-gray-100 group cursor-pointer",
                                        "border border-gray-200 shadow-sm hover:shadow-md transition-shadow",
                                        imageAspectClass
                                    )}
                                    onClick={() => shot.image_url && setPreviewImage(shot.image_url)}
                                >
                                    {shot.image_url ? (
                                        <>
                                            <img
                                                src={shot.image_url}
                                                alt="首帧"
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <Maximize2
                                                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    size={24}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                            <div className="text-center">
                                                <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-xs">暂无图片</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 尾帧图片 */}
                            <div className={cn("space-y-2", isPortrait && "col-span-2")}>
                                <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    尾帧图片
                                </div>
                                <div
                                    className={cn(
                                        "relative rounded-xl overflow-hidden bg-gray-100 group cursor-pointer",
                                        "border border-gray-200 shadow-sm hover:shadow-md transition-shadow",
                                        imageAspectClass
                                    )}
                                    onClick={() => endFrameImageUrl && setPreviewImage(endFrameImageUrl)}
                                >
                                    {endFrameImageUrl ? (
                                        <>
                                            <img
                                                src={endFrameImageUrl}
                                                alt="尾帧"
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <Maximize2
                                                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    size={24}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                            <div className="text-center">
                                                <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-xs">暂无尾帧</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 关联角色 */}
                        {associatedCharacters.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <span className="text-sm text-gray-500 mr-1">出场角色:</span>
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

                        {/* 台词/旁白 */}
                        {narration.length > 0 && (
                            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                                <div className="text-sm font-medium text-gray-700 mb-3">
                                    台词 / 旁白
                                </div>
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
                        )}

                        {/* 提示词区域 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 首帧图片提示词 */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-100">
                                <div className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1.5">
                                    <Sparkles size={14} />
                                    首帧提示词
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">
                                    {shot.image_prompt || "暂无"}
                                </p>
                            </div>

                            {/* 尾帧图片提示词 */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                                <div className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1.5">
                                    <Sparkles size={14} />
                                    尾帧提示词
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">
                                    {endFrameImagePrompt || "暂无"}
                                </p>
                            </div>
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

                        {/* 视频预览 */}
                        {shot.video_url && (
                            <div className="space-y-3">
                                <div className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Film size={14} />
                                    视频预览
                                </div>
                                <div className={cn(
                                    "relative rounded-xl overflow-hidden bg-black",
                                    imageAspectClass,
                                    isPortrait ? "max-w-[300px]" : ""
                                )}>
                                    <video
                                        src={shot.video_url}
                                        controls
                                        className="w-full h-full object-contain"
                                        preload="metadata"
                                    />
                                </div>

                                {/* 音频 */}
                                {shot.audio_url && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200">
                                        <Volume2 size={16} className="text-gray-500 shrink-0" />
                                        <audio
                                            src={shot.audio_url}
                                            controls
                                            className="flex-1 h-8"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
