import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RotateCcw, Map as LucideMap, Save, Edit2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IScene } from '@/types/scene';
import sceneApi from '@/lib/api/scene';
import { toast } from "sonner";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { ImagePreview } from "@/components/ui/image-preview";
import { cn } from "@/lib/utils";

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

    const handleRegenerateClick = () => {
        const sceneUuid = scene.uuid || String(scene.scene_id);
        // 直接使用当前编辑框里的 prompt，如果有就用，没有后端会自动生成
        onRegenerateImage(sceneUuid, imagePrompt || undefined);
    };

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 sm:max-w-[1000px] max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center justify-between">
                        <span>{scene.location || t('sceneDisplay')}</span>
                        {!isEditing && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsEditing(true)}
                                className="h-8 text-slate-400 hover:text-white"
                            >
                                <Edit2 size={14} className="mr-2" />
                                {tCommon('edit')}
                            </Button>
                        )}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Edit scene details including location, time, and atmosphere.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                    {/* Left Column: Image Area */}
                    <div className="space-y-4">
                        <div className={cn(
                            "w-full rounded-lg bg-black overflow-hidden border border-slate-800 relative group",
                            aspectRatio === "9:16" ? "aspect-[9/16] max-h-[500px] mx-auto w-fit" : "aspect-video"
                        )}>
                            {isRegenerating ? (
                                <div className="w-full h-full flex items-center justify-center text-orange-500 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="text-sm">{tCommon('generating')}</span>
                                </div>
                            ) : scene.image_url ? (
                                <img 
                                    src={scene.image_url} 
                                    alt="Scene" 
                                    className="w-full h-full object-contain cursor-pointer"
                                    onClick={() => setIsPreviewOpen(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    <LucideMap size={32} className="opacity-50 mb-2" />
                                    <span className="text-xs">{t('noSceneImage')}</span>
                                </div>
                            )}
                            
                            {/* Regenerate Button */}
                            <Button
                                variant="secondary"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border border-white/10 backdrop-blur-md"
                                onClick={handleRegenerateClick}
                                disabled={isRegenerating}
                            >
                                <RotateCcw size={14} className={`mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                                {t('regenerate')}
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('location')}</Label>
                                {isEditing ? (
                                    <Input 
                                        value={location} 
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="bg-slate-800 border-slate-700 h-8 text-sm"
                                    />
                                ) : (
                                    <div className="text-sm font-medium">{location || '-'}</div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('time')}</Label>
                                {isEditing ? (
                                    <Input 
                                        value={timeSetting} 
                                        onChange={(e) => setTimeSetting(e.target.value)}
                                        className="bg-slate-800 border-slate-700 h-8 text-sm"
                                    />
                                ) : (
                                    <div className="text-sm font-medium">{timeSetting || '-'}</div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">{t('atmosphere')}</Label>
                            {isEditing ? (
                                <Input 
                                    value={atmosphere} 
                                    onChange={(e) => setAtmosphere(e.target.value)}
                                    className="bg-slate-800 border-slate-700 h-8 text-sm"
                                />
                            ) : (
                                <div className="text-sm font-medium">{atmosphere || '-'}</div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Prompt & Description Area */}
                    <div className="space-y-4">
                        {/* Prompt Editing Area */}
                        <div className="p-3 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 space-y-2">
                            <Label className="text-xs font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" />
                                {t('imagePrompt') || "生图提示词"}
                            </Label>
                            {isEditing ? (
                                <AutosizeTextarea 
                                    value={imagePrompt} 
                                    onChange={(e) => setImagePrompt(e.target.value)}
                                    placeholder={t('imagePromptPlaceholder') || "输入自定义生图提示词..."}
                                    className="text-sm resize-none bg-white dark:bg-slate-950 border-orange-200 dark:border-orange-800/50 focus:border-orange-500"
                                    minRows={2}
                                    maxRows={10}
                                />
                            ) : (
                                <div className="text-sm text-slate-300 leading-relaxed min-h-[40px] max-h-[300px] overflow-y-auto break-all pr-1 scrollbar-thin scrollbar-thumb-orange-200/20 hover:scrollbar-thumb-orange-200/40">
                                    {imagePrompt || tCommon('none')}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">{t('environmentDescription')} (Space Type)</Label>
                            {isEditing ? (
                                <Textarea 
                                    value={spaceType} 
                                    onChange={(e) => setSpaceType(e.target.value)}
                                    className="bg-slate-800 border-slate-700 text-sm min-h-[100px]"
                                />
                            ) : (
                                <div className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-2 rounded-md min-h-[60px] max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                                    {spaceType || tCommon('none')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                            {tCommon('cancel')}
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500">
                            {isSaving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            {tCommon('save')}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>

            <ImagePreview 
                open={isPreviewOpen} 
                onOpenChange={setIsPreviewOpen} 
                src={scene.image_url} 
                alt="Scene Preview"
            />
        </Dialog>
    );
}
