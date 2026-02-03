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
    User,
    Info,
    Image as ImageIcon,
} from "lucide-react";
import { ICharacter } from "@/types/character";
import characterApi from "@/lib/api/character";
import { cn } from "@/lib/utils";
import { ImagePreview } from "@/components/ui/image-preview";
import { ImageVersionPreview } from "@/components/ui/image-version-preview";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

    // 从 status_detail 中获取图片历史
    const imageHistory = ((character as any).status_detail?.image_historys || []) as Array<{
        image_url: string;
        image_prompt?: string;
        created_at: string;
        task_id?: string;
    }>;

    const imageUrl = character.image_url || (character as any).final_image_url;
    const candidateImages = (character as any).candidate_image_urls || [];
    const description = (character as any).description || (character as any).basic_info;
    const status = getGenerationStatus(character);

    // 切换版本时加载对应的提示词
    const handleVersionChange = (version: {image_url: string; image_prompt?: string; created_at: string}) => {
        // Agent模式下只用于显示，不修改实际数据
    };

    // 应用版本作为最终图片
    const handleApplyVersion = async (version: {image_url: string; created_at: string}) => {
        try {
            await characterApi.updateCharacter((character as any).uuid || String(character.character_id), {
                image_url: version.image_url,
            } as any);
            toast.success("已应用新版本");
            // 触发父组件刷新
            onClose();
        } catch (error) {
            console.error("Failed to apply version:", error);
            toast.error("应用失败，请重试");
        }
    };

    // Agent模式下重生成功能不直接支持，给出空实现
    const handleRegenerate = () => {
        toast.info("Agent模式下请通过对话生成新图片");
    };

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

                    {/* Content with Tabs */}
                    <Tabs defaultValue="image" className="flex-1 flex flex-col overflow-hidden px-6 py-4">
                      <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0 bg-white/50">
                        <TabsTrigger value="image" className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          角色图片
                        </TabsTrigger>
                        <TabsTrigger value="info" className="flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          角色信息
                        </TabsTrigger>
                      </TabsList>

                      <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-green-300 flex-1">
                        <TabsContent value="image" className="mt-0 space-y-6">
                          {/* 角色图片区域 */}
                          <ImageVersionPreview
                            currentImageUrl={imageUrl}
                            imageHistory={imageHistory}
                            onRegenerate={handleRegenerate}
                            onApplyVersion={handleApplyVersion}
                            onVersionChange={handleVersionChange}
                            entityType="character"
                            entityName={character.name}
                            className="rounded-xl"
                          />

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
                        </TabsContent>

                        <TabsContent value="info" className="mt-0 space-y-6">
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
                alt="角色图片预览"
            />
        </>
    );
}
