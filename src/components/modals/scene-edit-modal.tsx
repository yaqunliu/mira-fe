import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RotateCcw, Map as LucideMap, Save, Edit2, Sparkles, X, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IScene } from '@/types/scene';
import sceneApi from '@/lib/api/scene';
import { toast } from "sonner";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { ImagePreview } from "@/components/ui/image-preview";
import { cn } from "@/lib/utils";
import { SceneImageHistoryDialog } from "@/components/timeline/scene-image-history-dialog";

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
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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

    const handleRegenerateClick = () => {
        const sceneUuid = scene.uuid || String(scene.scene_id);
        // 直接使用当前编辑框里的 prompt，如果有就用，没有后端会自动生成
        onRegenerateImage(sceneUuid, imagePrompt || undefined);
    };

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] text-gray-900 sm:max-w-[1000px] max-h-[90vh] flex flex-col rounded-2xl">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="flex items-center justify-between">
                            <span className="text-xl font-semibold">{scene.location || t('sceneDisplay')}</span>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="h-9 px-4 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2"
                                >
                                    <Edit2 size={14} />
                                    <span className="text-sm">{tCommon('edit')}</span>
                                </button>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Edit scene details including location, time, and atmosphere.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 overflow-y-auto pr-2">
                        {/* Left Column: Image Area */}
                        <div className="space-y-4">
                            <div className={cn(
                                "w-full rounded-xl bg-gradient-to-br from-white to-blue-50 overflow-hidden border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] relative group",
                                "aspect-video"
                            )}>
                                {isRegenerating ? (
                                    <div className="w-full h-full flex items-center justify-center text-green-500 gap-2 bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-[2px] rounded-xl">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <span className="text-sm font-medium">{tCommon('generating')}</span>
                                    </div>
                                ) : scene.image_url ? (
                                    <>
                                        <img
                                            src={scene.image_url}
                                            alt="Scene"
                                            className="w-full h-full object-contain cursor-pointer"
                                            onClick={() => setIsPreviewOpen(true)}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        <LucideMap size={32} className="opacity-50 mb-2" />
                                        <span className="text-xs">{t('noSceneImage')}</span>
                                    </div>
                                )}

                                {/* Regenerate Button */}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    {scene.image_url && (
                                        <button
                                            onClick={() => setIsHistoryOpen(true)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                                        >
                                            <History size={14} />
                                            历史
                                        </button>
                                    )}
                                    <button
                                        onClick={handleRegenerateClick}
                                        disabled={isRegenerating}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                                    >
                                        <RotateCcw size={14} className={isRegenerating ? "animate-spin" : ""} />
                                        {t('regenerate')}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">{t('location')}</Label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className="w-full h-9 px-3 text-sm rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                        />
                                    ) : (
                                        <div className="text-sm font-medium bg-gradient-to-br from-white to-blue-50 p-2 rounded-xl shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">{location || '-'}</div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">{t('time')}</Label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={timeSetting}
                                            onChange={(e) => setTimeSetting(e.target.value)}
                                            className="w-full h-9 px-3 text-sm rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                        />
                                    ) : (
                                        <div className="text-sm font-medium bg-gradient-to-br from-white to-blue-50 p-2 rounded-xl shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">{timeSetting || '-'}</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">{t('atmosphere')}</Label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={atmosphere}
                                        onChange={(e) => setAtmosphere(e.target.value)}
                                        className="w-full h-9 px-3 text-sm rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                    />
                                ) : (
                                    <div className="text-sm font-medium bg-gradient-to-br from-white to-blue-50 p-2 rounded-xl shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">{atmosphere || '-'}</div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Prompt & Description Area */}
                        <div className="space-y-4">
                            {/* Prompt Editing Area */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-pink-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-orange-100 space-y-2">
                                <Label className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" />
                                    {t('imagePrompt') || "生图提示词"}
                                </Label>
                                {isEditing ? (
                                    <textarea
                                        value={imagePrompt}
                                        onChange={(e) => setImagePrompt(e.target.value)}
                                        placeholder={t('imagePromptPlaceholder') || "输入自定义生图提示词..."}
                                        className="w-full text-sm resize-none bg-gradient-to-br from-white to-orange-50 border border-orange-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all duration-200 rounded-lg p-3 min-h-[80px]"
                                    />
                                ) : (
                                    <div className="text-sm text-gray-700 leading-relaxed min-h-[80px] max-h-[200px] overflow-y-auto break-all pr-2">
                                        {imagePrompt || tCommon('none')}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">{t('environmentDescription')} (Space Type)</Label>
                                {isEditing ? (
                                    <textarea
                                        value={spaceType}
                                        onChange={(e) => setSpaceType(e.target.value)}
                                        className="w-full text-sm resize-none bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 rounded-lg p-3 min-h-[100px]"
                                    />
                                ) : (
                                    <div className="text-sm text-gray-700 leading-relaxed bg-gradient-to-br from-white to-blue-50 p-3 rounded-xl border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] min-h-[100px] max-h-[200px] overflow-y-auto pr-2">
                                        {spaceType || tCommon('none')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <DialogFooter className="mt-4 flex gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                                className="flex-1 h-10 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <X size={14} />
                                <span className="text-sm">{tCommon('cancel')}</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 h-10 px-4 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                <Save size={14} />
                                <span className="text-sm">{tCommon('save')}</span>
                            </button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            <ImagePreview
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                src={scene.image_url}
                alt="Scene Preview"
            />

            <SceneImageHistoryDialog
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                sceneUuid={scene.uuid || String(scene.scene_id)}
                onSuccess={onSuccess}
            />
        </>
    );
}
