"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
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
    Palette,
    Film,
    Image as ImageIcon,
    Info,
    Save,
    X,
    Loader2,
    Sparkles,
} from "lucide-react";
import { IScene } from "@/types/scene";
import sceneApi from "@/lib/api/scene";
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

interface SceneDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    scene: IScene | null;
    sceneNumber: number;
    onNavigatePrevious?: () => void;
    onNavigateNext?: () => void;
    hasPrevious?: boolean;
    hasNext?: boolean;
    onRefresh?: () => void;
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
    onRefresh,
}: SceneDetailDialogProps) {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const form = useForm({
        defaultValues: {
            location: scene?.location || "",
            timeSetting: scene?.time_setting || "",
            atmosphere: scene?.atmosphere || "",
            spaceType: scene?.space_type || "",
            imagePrompt: (scene as any)?.image_prompt || "",
        },
    });

    // 当 scene 变化时，重置表单值
    useEffect(() => {
        if (scene) {
            form.reset({
                location: scene.location || "",
                timeSetting: scene.time_setting || "",
                atmosphere: scene.atmosphere || "",
                spaceType: scene.space_type || "",
                imagePrompt: (scene as any)?.image_prompt || "",
            });
        }
    }, [scene, form]);

    if (!scene) return null;

    const imageHistory = ((scene as any).status_detail?.image_historys || []) as Array<{
        image_url: string;
        image_prompt?: string;
        created_at: string;
        task_id?: string;
    }>;

    const referenceImage = scene.image_url || (scene as any).reference_image_url;
    const shotCount = scene.shots?.length || 0;

    const handleVersionChange = (version: {image_url: string; image_prompt?: string; created_at: string}) => {
        if (version.image_prompt) {
            form.setValue("imagePrompt", version.image_prompt);
        }
    };

    const handleApplyVersion = async (version: {image_url: string; created_at: string}) => {
        try {
            await sceneApi.updateScene((scene as any).uuid || String(scene.scene_id), {
                image_url: version.image_url,
            } as any);
            toast.success("已应用新版本");
            onRefresh?.();
        } catch (error) {
            console.error("Failed to apply version:", error);
            toast.error("应用失败，请重试");
        }
    };

    const handleSave = async (values: any) => {
        setIsSaving(true);
        try {
            await sceneApi.updateScene((scene as any).uuid || String(scene.scene_id), {
                scene_setting: {
                    location: values.location,
                    time: values.timeSetting,
                    atmosphere: values.atmosphere,
                    space: values.spaceType,
                },
                image_prompt: values.imagePrompt,
            } as any);
            toast.success("保存成功");
            onRefresh?.();
        } catch (error) {
            console.error("Failed to save scene:", error);
            toast.error("保存失败，请重试");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const sceneUuid = (scene as any).uuid || String(scene.scene_id);
            await sceneApi.updateScene(sceneUuid, {
                image_prompt: form.getValues("imagePrompt") || scene.image_prompt,
            } as any);
            await sceneApi.regenerateSceneImage(
                sceneUuid,
                form.getValues("imagePrompt") || scene.image_prompt || ""
            );
            toast.success("正在生成场景图片，请稍候...");
        } catch (error) {
            console.error("Failed to regenerate scene image:", error);
            toast.error("生成失败，请重试");
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent showCloseButton={false} className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 shadow-[8px_8px_24px_rgba(173,200,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] sm:max-w-[800px] max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="px-6 pt-5 pb-4 border-b border-purple-100 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 font-bold text-lg shadow-[2px_2px_6px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.8)]">
                                    #{sceneNumber}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold" style={{ color: '#111827' }}>
                                        {scene.title || scene.location || `场景 ${sceneNumber}`}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm" style={{ color: '#6b7280' }}>
                                        {shotCount} 个分镜
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
                                <button
                                    onClick={onClose}
                                    className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 text-gray-700 font-medium"
                                >
                                    <X size={14} />
                                    <span className="text-sm">关闭</span>
                                </button>
                                <button
                                    onClick={form.handleSubmit(handleSave)}
                                    disabled={isSaving}
                                    className={cn(
                                        "h-9 px-4 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2",
                                        isSaving ? "opacity-60 cursor-not-allowed" : ""
                                    )}
                                >
                                    {isSaving && <Loader2 size={14} className="animate-spin" />}
                                    <Save size={14} />
                                    <span className="text-sm">保存</span>
                                </button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Content with Tabs */}
                    <FormProvider {...form}>
                    <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden px-6 py-4">
                      <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0 bg-white/50">
                        <TabsTrigger value="info" className="flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          场景信息
                        </TabsTrigger>
                        <TabsTrigger value="image" className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          场景图片
                        </TabsTrigger>
                      </TabsList>

                      <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-300 flex-1">
                        {/* 场景信息 Tab */}
                        <TabsContent value="info" className="mt-0 space-y-4">
                          {/* 场景属性 - 改为多行文本 */}
                          <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
                              <div className="text-xs text-orange-600 mb-2 flex items-center gap-1">
                                <Clock size={12} />
                                时间设定
                              </div>
                              <FormField
                                control={form.control}
                                name="timeSetting"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <textarea
                                        {...field}
                                        className="w-full px-2 py-2 rounded border border-orange-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none min-h-[60px]"
                                        placeholder="例如：清晨、黄昏、深夜..."
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                              <div className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                                <MapPin size={12} />
                                地点
                              </div>
                              <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <textarea
                                        {...field}
                                        className="w-full px-2 py-2 rounded border border-blue-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px]"
                                        placeholder="例如：城市街道、咖啡厅、公园..."
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
                              <div className="text-xs text-indigo-600 mb-2 flex items-center gap-1">
                                <Film size={12} />
                                空间类型
                              </div>
                              <FormField
                                control={form.control}
                                name="spaceType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <textarea
                                        {...field}
                                        className="w-full px-2 py-2 rounded border border-indigo-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[60px]"
                                        placeholder="例如：室内、室外、半开放空间..."
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200">
                              <div className="text-xs text-pink-600 mb-2 flex items-center gap-1">
                                <Palette size={12} />
                                氛围
                              </div>
                              <FormField
                                control={form.control}
                                name="atmosphere"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <textarea
                                        {...field}
                                        className="w-full px-2 py-2 rounded border border-pink-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none min-h-[60px]"
                                        placeholder="例如：温馨、紧张、宁静..."
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </TabsContent>

                        {/* 场景图片 Tab */}
                        <TabsContent value="image" className="mt-0 space-y-6">
                          {/* 场景图片 | 场景提示词 左右布局 */}
                          <div className="grid grid-cols-2 gap-6 items-stretch">
                            {/* 左侧：场景图片 */}
                            <div className="space-y-3 flex flex-col">
                              <div className="text-sm font-medium text-gray-700">场景图片</div>
                              <div className="flex-1">
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
                              </div>
                            </div>

                            {/* 右侧：场景提示词 */}
                            <div className="space-y-3 flex flex-col">
                              <div className="text-sm font-medium text-gray-700">场景图片提示词</div>
                              <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 flex flex-col">
                                <FormField
                                  control={form.control}
                                  name="imagePrompt"
                                  render={({ field }) => (
                                    <FormItem className="flex-1 flex flex-col">
                                      <FormControl>
                                        <textarea
                                          {...field}
                                          className="flex-1 w-full px-3 py-2 rounded-lg bg-white border border-purple-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          placeholder="输入场景生成提示词..."
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </div>
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
                alt="场景图片预览"
            />
        </>
    );
}
