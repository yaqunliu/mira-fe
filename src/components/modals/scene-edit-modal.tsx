import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Edit2, Sparkles, X, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IScene } from '@/types/scene';
import sceneApi from '@/lib/api/scene';
import { toast } from "sonner";
import { ImagePreview } from "@/components/ui/image-preview";
import { ImageVersionPreview } from "@/components/ui/image-version-preview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SceneEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    scene: IScene;
    onSuccess: () => void;
    onRegenerateImage: (sceneId: string, imagePrompt?: string) => void;
    isRegenerating: boolean;
    aspectRatio?: "16:9" | "9:16";
}

export function SceneEditModal({
    isOpen,
    onClose,
    scene,
    onSuccess,
    onRegenerateImage,
    isRegenerating,
    aspectRatio = "16:9"
}: SceneEditModalProps) {
    const t = useTranslations('Editor');
    const tCommon = useTranslations('common');

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [location, setLocation] = useState(scene.location || '');
    const [timeSetting, setTimeSetting] = useState(scene.time_setting || '');
    const [atmosphere, setAtmosphere] = useState(scene.atmosphere || '');
    const [spaceType, setSpaceType] = useState(scene.space_type || '');
    const [imagePrompt, setImagePrompt] = useState(scene.image_prompt || '');

    // Reset form when scene changes
    useEffect(() => {
        if (isOpen && scene) {
            setLocation(scene.location || '');
            setTimeSetting(scene.time_setting || '');
            setAtmosphere(scene.atmosphere || '');
            setSpaceType(scene.space_type || '');
            setImagePrompt(scene.image_prompt || '');
            setIsEditing(false); // Reset editing mode
        }
    }, [isOpen, scene]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const sceneUuid = scene.uuid || String(scene.scene_id);
            await sceneApi.updateScene(sceneUuid, {
                scene_setting: {
                    location,
                    time: timeSetting,
                    atmosphere,
                    space: spaceType
                },
                image_prompt: imagePrompt
            });

            toast.success(tCommon('save') + " " + tCommon('success'));
            setIsEditing(false);
            onSuccess();
        } catch (error: any) {
            console.error("Failed to update scene", error);
            toast.error(tCommon('error'));
        } finally {
            setIsSaving(false);
        }
    };

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const imageHistory = ((scene as any).status_detail?.image_historys || []) as Array<{
        image_url: string;
        image_prompt?: string;
        created_at: string;
        task_id?: string
    }>;

    // 切换版本时加载对应的提示词
    const handleVersionChange = (version: {image_url: string; image_prompt?: string; created_at: string}) => {
        if (version.image_prompt) {
            setImagePrompt(version.image_prompt);
        }
    };

    const handleRegenerate = async () => {
        // 生成前先自动保存
        try {
            const sceneUuid = scene.uuid || String(scene.scene_id);
            await sceneApi.updateScene(sceneUuid, {
                scene_setting: {
                    location,
                    time: timeSetting,
                    atmosphere,
                    space: spaceType
                },
                image_prompt: imagePrompt
            });
            toast.success("自动保存成功");
        } catch (error: any) {
            console.error("自动保存失败", error);
            toast.error("自动保存失败，请手动保存后重试");
            return;
        }

        const sceneUuid = scene.uuid || String(scene.scene_id);
        onRegenerateImage(sceneUuid, imagePrompt || undefined);
    };

    const handleApplyVersion = async (version: {image_url: string; image_prompt?: string; created_at: string}) => {
        try {
            const sceneUuid = scene.uuid || String(scene.scene_id);
            await sceneApi.updateScene(sceneUuid, {
                image_url: version.image_url,
            } as any);
            toast.success("已应用新版本");
            onSuccess();
        } catch (error) {
            console.error("Failed to apply version:", error);
            toast.error("应用失败，请重试");
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent showCloseButton={false} className="sm:max-w-5xl max-w-[95vw] bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] text-gray-900 max-h-[90vh] flex flex-col rounded-2xl">
                    <DialogHeader className="flex-shrink-0 pb-4 border-b border-blue-100">
                        <DialogTitle className="flex items-center justify-between w-full pr-2">
                            <span className="text-xl font-bold text-gray-900">{scene.location || t('sceneDisplay')}</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 text-gray-700 font-medium"
                                >
                                    <X size={14} />
                                    <span className="text-sm">{tCommon('close')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`h-9 px-4 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {isSaving && <Loader2 size={14} className="animate-spin" />}
                                    <Save size={14} />
                                    <span className="text-sm">{tCommon('save')}</span>
                                </button>
                            </div>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Edit scene details including location, time, and atmosphere.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="image" className="mt-4 flex-1 flex flex-col overflow-hidden">
                      <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
                        <TabsTrigger value="image" className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          场景图片
                        </TabsTrigger>
                        <TabsTrigger value="info" className="flex items-center gap-2">
                          <Edit2 className="w-4 h-4" />
                          基本信息
                        </TabsTrigger>
                      </TabsList>

                      <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue flex-1">
                        <TabsContent value="image" className="mt-0">
                          <div className="grid grid-cols-2 gap-4">
                            <ImageVersionPreview
                              currentImageUrl={scene.image_url}
                              imageHistory={imageHistory}
                              onRegenerate={handleRegenerate}
                              onApplyVersion={handleApplyVersion}
                              onVersionChange={handleVersionChange}
                              isRegenerating={isRegenerating}
                              entityType="scene"
                              entityName={scene.location}
                            />

                            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-pink-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-orange-100 space-y-2">
                              <Label className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                {t('imagePrompt') || "生图提示词"}
                              </Label>
                              <textarea
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                placeholder={t('imagePromptPlaceholder') || "输入自定义生图提示词..."}
                                className="w-full text-sm resize-none bg-gradient-to-br from-white to-orange-50 border border-orange-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all duration-200 rounded-lg p-3 h-[calc(100%-28px)]"
                              />
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="info" className="space-y-4 mt-0">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">{t('location')}</Label>
                              <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full h-9 px-3 text-sm rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">{t('time')}</Label>
                              <input
                                type="text"
                                value={timeSetting}
                                onChange={(e) => setTimeSetting(e.target.value)}
                                className="w-full h-9 px-3 text-sm rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">{t('atmosphere')}</Label>
                            <input
                              type="text"
                              value={atmosphere}
                              onChange={(e) => setAtmosphere(e.target.value)}
                              className="w-full h-9 px-3 text-sm rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">{t('environmentDescription')} (Space Type)</Label>
                            <textarea
                              value={spaceType}
                              onChange={(e) => setSpaceType(e.target.value)}
                              className="w-full text-sm resize-none bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 rounded-lg p-3 min-h-[100px]"
                            />
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <ImagePreview
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                src={scene.image_url}
                alt="Scene Preview"
            />

        </>
    );
}
