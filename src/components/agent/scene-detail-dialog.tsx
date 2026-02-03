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
    MapPin,
    Clock,
    Cloud,
    Palette,
    Timer,
    Film,
    Image as ImageIcon,
    Info,
} from "lucide-react";
import { IScene } from "@/types/scene";
import sceneApi from "@/lib/api/scene";
import { cn } from "@/lib/utils";
import { ImagePreview } from "@/components/ui/image-preview";
import { ImageVersionPreview } from "@/components/ui/image-version-preview";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SceneDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    scene: IScene | null;
    sceneNumber: number;
    onNavigatePrevious?: () => void;
    onNavigateNext?: () => void;
    hasPrevious?: boolean;
    hasNext?: boolean;
}

/**
 * 场景详情对话框
 */
export function SceneDetailDialog({
    isOpen,
    onClose,
    scene,
    sceneNumber,
    onNavigatePrevious,
    onNavigateNext,
    hasPrevious = false,
    hasNext = false,
}: SceneDetailDialogProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    if (!scene) return null;

    // 从 status_detail 中获取图片历史
    const imageHistory = ((scene as any).status_detail?.image_historys || []) as Array<{
        image_url: string;
        image_prompt?: string;
        created_at: string;
        task_id?: string;
    }>;

    const referenceImage = scene.image_url || (scene as any).reference_image_url;
    const shotCount = scene.shots?.length || 0;

    // 切换版本时加载对应的提示词
    const handleVersionChange = (version: {image_url: string; image_prompt?: string; created_at: string}) => {
        // Agent模式下只用于显示，不修改实际数据
    };

    // 应用版本作为最终图片
    const handleApplyVersion = async (version: {image_url: string; created_at: string}) => {
        try {
            await sceneApi.updateScene((scene as any).uuid || String(scene.scene_id), {
                image_url: version.image_url,
            } as any);
            toast.success("已应用新版本");
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
                <DialogContent className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 shadow-[8px_8px_24px_rgba(173,200,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] sm:max-w-[800px] max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="px-6 pt-5 pb-4 border-b border-purple-100 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 font-bold text-lg shadow-[2px_2px_6px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.8)]">
                                    #{sceneNumber}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold" style={{ color: '#111827' }}>
                                        {scene.title || `场景 ${sceneNumber}`}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm" style={{ color: '#6b7280' }}>
                                        {shotCount} 个分镜
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
                          场景图片
                        </TabsTrigger>
                        <TabsTrigger value="info" className="flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          场景信息
                        </TabsTrigger>
                      </TabsList>

                      <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-300 flex-1">
                        <TabsContent value="image" className="mt-0 space-y-6">
                          {/* 场景图片 */}
                          <ImageVersionPreview
                            currentImageUrl={referenceImage}
                            imageHistory={imageHistory}
                            onRegenerate={handleRegenerate}
                            onApplyVersion={handleApplyVersion}
                            onVersionChange={handleVersionChange}
                            entityType="scene"
                            entityName={scene.title}
                            className="rounded-xl"
                          />

                          {/* 图片提示词 */}
                          {scene.image_prompt && (
                            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                              <div className="text-sm font-medium text-purple-700 mb-2">场景提示词</div>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {scene.image_prompt}
                              </p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="info" className="mt-0 space-y-6">
                          {/* 场景描述 */}
                          {(scene as any).description && (
                            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                              <div className="text-sm font-medium text-gray-700 mb-2">场景描述</div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {(scene as any).description}
                              </p>
                            </div>
                          )}

                          {/* 环境描述 */}
                          {(scene as any).env_description && (
                            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                              <div className="text-sm font-medium text-gray-700 mb-2">环境描述</div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {(scene as any).env_description}
                              </p>
                            </div>
                          )}

                          {/* 空间描述 */}
                          {(scene as any).space_description && (
                            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                              <div className="text-sm font-medium text-gray-700 mb-2">空间描述</div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {(scene as any).space_description}
                              </p>
                            </div>
                          )}

                          {/* 场景内容/对白 */}
                          {(scene as any).content && (
                            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                              <div className="text-sm font-medium text-gray-700 mb-2">场景内容</div>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {(scene as any).content}
                              </p>
                            </div>
                          )}

                          {/* 场景属性 */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {scene.location && (
                              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                                <div className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                                  <MapPin size={12} />
                                  地点
                                </div>
                                <p className="text-sm text-blue-900 font-medium">{scene.location}</p>
                              </div>
                            )}
                            {scene.time_setting && (
                              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
                                <div className="text-xs text-orange-600 mb-1 flex items-center gap-1">
                                  <Clock size={12} />
                                  时间设定
                                </div>
                                <p className="text-sm text-orange-900 font-medium">{scene.time_setting}</p>
                              </div>
                            )}
                            {scene.space_type && (
                              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
                                <div className="text-xs text-indigo-600 mb-1 flex items-center gap-1">
                                  <Film size={12} />
                                  空间类型
                                </div>
                                <p className="text-sm text-indigo-900 font-medium">{scene.space_type}</p>
                              </div>
                            )}
                            {scene.atmosphere && (
                              <div className="p-3 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200">
                                <div className="text-xs text-pink-600 mb-1 flex items-center gap-1">
                                  <Palette size={12} />
                                  氛围
                                </div>
                                <p className="text-sm text-pink-900 font-medium">{scene.atmosphere}</p>
                              </div>
                            )}
                            {(scene as any).time_of_day && (
                              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                                <div className="text-xs text-amber-600 mb-1 flex items-center gap-1">
                                  <Clock size={12} />
                                  时段
                                </div>
                                <p className="text-sm text-amber-900 font-medium">{(scene as any).time_of_day}</p>
                              </div>
                            )}
                            {(scene as any).weather && (
                              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200">
                                <div className="text-xs text-cyan-600 mb-1 flex items-center gap-1">
                                  <Cloud size={12} />
                                  天气
                                </div>
                                <p className="text-sm text-cyan-900 font-medium">{(scene as any).weather}</p>
                              </div>
                            )}
                            {scene.duration && (
                              <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                                <div className="text-xs text-green-600 mb-1 flex items-center gap-1">
                                  <Timer size={12} />
                                  时长
                                </div>
                                <p className="text-sm text-green-900 font-medium">{scene.duration}</p>
                              </div>
                            )}
                          </div>
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
                alt="场景图片预览"
            />
        </>
    );
}
