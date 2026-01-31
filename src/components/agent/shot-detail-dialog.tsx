"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    X,
    Film,
    Image as ImageIcon,
    FileText,
    Sparkles,
    Play,
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
 * 分镜详情弹窗 - Agent 模式下的只读查看版本
 *
 * 展示分镜的所有详细信息：
 * - 首帧/尾帧图片（可放大）
 * - 分镜脚本
 * - 图片提示词
 * - 分镜视频
 * - 台词/旁白
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
}: ShotDetailDialogProps) {
    const [activeTab, setActiveTab] = useState("images");
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    if (!shot) return null;

    const narration = parseNarration(shot.narration);
    const endFrameImageUrl = (shot.extra_data as any)?.end_frame_image_url;
    const endFrameImagePrompt = (shot.extra_data as any)?.end_frame_image_prompt;
    const videoPrompt = (shot.extra_data as any)?.video_prompt;

    // 获取关联的角色
    const associatedCharacters = useMemo(() => {
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

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] sm:max-w-[900px] max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="px-6 pt-5 pb-4 border-b border-blue-100 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-bold text-lg shadow-[2px_2px_6px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.8)]">
                                    #{shotNumber}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold text-gray-900">
                                        {shot.title || `分镜 ${shotNumber}`}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-gray-500">
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
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="flex-1 flex flex-col"
                        >
                            <TabsList className="mx-6 mt-4 mb-2 bg-white/50 border border-blue-100 rounded-xl p-1 justify-start flex-shrink-0">
                                <TabsTrigger
                                    value="images"
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4"
                                >
                                    <ImageIcon size={14} className="mr-1.5" />
                                    图片
                                </TabsTrigger>
                                <TabsTrigger
                                    value="script"
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4"
                                >
                                    <FileText size={14} className="mr-1.5" />
                                    脚本
                                </TabsTrigger>
                                <TabsTrigger
                                    value="prompts"
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4"
                                >
                                    <Sparkles size={14} className="mr-1.5" />
                                    提示词
                                </TabsTrigger>
                                {shot.video_url && (
                                    <TabsTrigger
                                        value="video"
                                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4"
                                    >
                                        <Film size={14} className="mr-1.5" />
                                        视频
                                    </TabsTrigger>
                                )}
                            </TabsList>

                            <div className="flex-1 overflow-y-auto px-6 pb-6">
                                {/* 图片 Tab */}
                                <TabsContent value="images" className="mt-0 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* 首帧图片 */}
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                首帧图片
                                            </div>
                                            <div
                                                className={cn(
                                                    "relative aspect-video rounded-xl overflow-hidden bg-gray-100 group cursor-pointer",
                                                    "border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                                                )}
                                                onClick={() => shot.image_url && setPreviewImage(shot.image_url)}
                                            >
                                                {shot.image_url ? (
                                                    <>
                                                        <Image
                                                            src={shot.image_url}
                                                            alt="首帧"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                            <Maximize2
                                                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                size={24}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <div className="text-center">
                                                            <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                                                            <p className="text-xs">暂无图片</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 尾帧图片 */}
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                尾帧图片
                                            </div>
                                            <div
                                                className={cn(
                                                    "relative aspect-video rounded-xl overflow-hidden bg-gray-100 group cursor-pointer",
                                                    "border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                                                )}
                                                onClick={() => endFrameImageUrl && setPreviewImage(endFrameImageUrl)}
                                            >
                                                {endFrameImageUrl ? (
                                                    <>
                                                        <Image
                                                            src={endFrameImageUrl}
                                                            alt="尾帧"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                            <Maximize2
                                                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                size={24}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
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
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="text-sm font-medium text-gray-700 mb-3">
                                                出场角色
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {associatedCharacters.map((char) => (
                                                    <div
                                                        key={char.character_id || char.uuid}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm"
                                                    >
                                                        {char.image_url && (
                                                            <div className="w-6 h-6 rounded-full overflow-hidden">
                                                                <Image
                                                                    src={char.image_url}
                                                                    alt={char.name}
                                                                    width={24}
                                                                    height={24}
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <span className="text-sm text-gray-700">
                                                            {char.name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* 脚本 Tab */}
                                <TabsContent value="script" className="mt-0 space-y-4">
                                    {/* 分镜描述 */}
                                    <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                            分镜描述
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {shot.description || "暂无描述"}
                                        </p>
                                    </div>

                                    {/* 台词/旁白 */}
                                    {narration.length > 0 && (
                                        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                                            <div className="text-sm font-medium text-gray-700 mb-3">
                                                台词 / 旁白
                                            </div>
                                            <div className="space-y-3">
                                                {narration.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex gap-3 p-3 rounded-lg bg-gray-50"
                                                    >
                                                        <div className="flex-shrink-0">
                                                            <Badge
                                                                variant="secondary"
                                                                className="bg-blue-100 text-blue-700 border-0"
                                                            >
                                                                {item.角色}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-gray-700 flex-1">
                                                            {item.内容}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* 提示词 Tab */}
                                <TabsContent value="prompts" className="mt-0 space-y-4">
                                    {/* 首帧图片提示词 */}
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-100">
                                        <div className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1.5">
                                            <Sparkles size={14} />
                                            首帧图片提示词
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {shot.image_prompt || "暂无提示词"}
                                        </p>
                                    </div>

                                    {/* 尾帧图片提示词 */}
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                                        <div className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-1.5">
                                            <Sparkles size={14} />
                                            尾帧图片提示词
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {endFrameImagePrompt || "暂无提示词"}
                                        </p>
                                    </div>

                                    {/* 视频提示词 */}
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                                        <div className="text-sm font-medium text-purple-700 mb-2 flex items-center gap-1.5">
                                            <Film size={14} />
                                            视频提示词
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {videoPrompt || "暂无提示词"}
                                        </p>
                                    </div>
                                </TabsContent>

                                {/* 视频 Tab */}
                                <TabsContent value="video" className="mt-0 space-y-4">
                                    {shot.video_url ? (
                                        <div className="space-y-4">
                                            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                                                <video
                                                    src={shot.video_url}
                                                    controls
                                                    className="w-full h-full"
                                                    preload="metadata"
                                                />
                                            </div>

                                            {/* 音频（如果有） */}
                                            {shot.audio_url && (
                                                <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                                                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                                        <Volume2 size={14} />
                                                        配音音频
                                                    </div>
                                                    <audio
                                                        src={shot.audio_url}
                                                        controls
                                                        className="w-full h-10"
                                                    />
                                                </div>
                                            )}

                                            {/* 视频时长 */}
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>
                                                    时长：{shot.video_duration || 5}秒
                                                </span>
                                                {shot.video_status && (
                                                    <Badge
                                                        variant={
                                                            shot.video_status === "completed"
                                                                ? "default"
                                                                : "secondary"
                                                        }
                                                    >
                                                        {shot.video_status}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-64 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200">
                                            <div className="text-center text-gray-400">
                                                <Film size={48} className="mx-auto mb-3 opacity-50" />
                                                <p>暂无视频</p>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
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
