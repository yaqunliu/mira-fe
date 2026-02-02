"use client";

import { useState } from "react";
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
    Maximize2,
    User,
} from "lucide-react";
import { ICharacter } from "@/types/character";
import { cn } from "@/lib/utils";
import { ImagePreview } from "@/components/ui/image-preview";

interface CharacterDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    character: ICharacter | null;
    characterNumber: number;
    onNavigatePrevious?: () => void;
    onNavigateNext?: () => void;
    hasPrevious?: boolean;
    hasNext?: boolean;
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
    const config = {
        pending: {
            label: '⏳ 未生成',
            className: 'bg-gray-100 text-gray-600 border-gray-300',
        },
        generating: {
            label: '🔄 生成中',
            className: 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse',
        },
        generated: {
            label: '✅ 已生成',
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
}: CharacterDetailDialogProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    if (!character) return null;

    const imageUrl = character.image_url || (character as any).final_image_url;
    const candidateImages = (character as any).candidate_image_urls || [];
    const description = (character as any).description || (character as any).basic_info;
    const status = getGenerationStatus(character);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="bg-gradient-to-br from-white to-green-50 border border-green-100 shadow-[8px_8px_24px_rgba(173,230,200,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] sm:max-w-[700px] max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="px-6 pt-5 pb-4 border-b border-green-100 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-200 text-green-700 font-bold text-lg shadow-[2px_2px_6px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.8)]">
                                    #{characterNumber}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold" style={{ color: '#111827' }}>
                                        {character.name || '未命名角色'}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm flex items-center gap-2" style={{ color: '#6b7280' }}>
                                        <StatusBadge status={status} />
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
                        {/* 角色图片 */}
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                角色形象
                            </div>
                            <div
                                className={cn(
                                    "relative rounded-xl overflow-hidden bg-gray-100 group",
                                    "border border-gray-200 shadow-sm hover:shadow-md transition-shadow",
                                    "aspect-video",
                                    imageUrl && "cursor-pointer"
                                )}
                                onClick={() => imageUrl && setPreviewImage(imageUrl)}
                            >
                                {imageUrl ? (
                                    <>
                                        <img
                                            src={imageUrl}
                                            alt={character.name}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Maximize2
                                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                size={24}
                                            />
                                        </div>
                                        {candidateImages.length > 1 && (
                                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                                                1/{candidateImages.length}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                        <div className="text-center">
                                            <User size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-xs">
                                                {status === 'generating' ? '生成中...' : '暂无图片'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 角色属性 */}
                        <div className="flex flex-wrap gap-2">
                            {(character as any).gender && (
                                <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200">
                                    {(character as any).gender === 'male' ? '♂ 男性' : (character as any).gender === 'female' ? '♀ 女性' : (character as any).gender}
                                </span>
                            )}
                            {(character as any).age && (
                                <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-lg border border-purple-200">
                                    {(character as any).age}岁
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
                        {description && (
                            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                                <div className="text-sm font-medium text-gray-700 mb-2">角色描述</div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        )}

                        {/* 角色外观 */}
                        {character.appearance && (
                            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                                <div className="text-sm font-medium text-gray-700 mb-2">外观特征</div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {character.appearance}
                                </p>
                            </div>
                        )}

                        {/* 候选图片 */}
                        {candidateImages.length > 1 && (
                            <div className="space-y-3">
                                <div className="text-sm font-medium text-gray-700">候选图片</div>
                                <div className="grid grid-cols-4 gap-2">
                                    {candidateImages.map((url: string, idx: number) => (
                                        <div
                                            key={idx}
                                            className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                                            onClick={() => setPreviewImage(url)}
                                        >
                                            <img
                                                src={url}
                                                alt={`候选 ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 生成提示词 */}
                        {(character as any).image_prompt && (
                            <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-teal-50 border border-green-100">
                                <div className="text-sm font-medium text-green-700 mb-2">生成提示词</div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    {(character as any).image_prompt}
                                </p>
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
                alt="角色图片预览"
            />
        </>
    );
}
