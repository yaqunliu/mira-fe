import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Image as ImageIcon, Edit2, Maximize2, Plus, X, Trash2, ListPlus, Film, Download, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IShot, INarrationItem } from '@/types/scene';
import { ICharacter } from '@/types/character';
import { IScene } from '@/types/scene';
import shotApi from '@/lib/api/shot';
import { toast } from "sonner";

interface ShotEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    shot: IShot;
    availableCharacters: ICharacter[];
    availableScenes: IScene[];
    onSuccess: () => void;
    onRegenerateImage: (shotId: string, imagePrompt?: string) => void;
    isRegenerating: boolean;
}

import { useTimelineStore } from '@/stores/timeline';

export function ShotEditModal({ 
    isOpen, 
    onClose, 
    shot, 
    availableCharacters,
    availableScenes,
    onSuccess,
    onRegenerateImage,
    isRegenerating
}: ShotEditModalProps) {
    const t = useTranslations('Editor');
    const tCommon = useTranslations('common');
    const addClip = useTimelineStore(state => state.addClip);
    const tracks = useTimelineStore(state => state.project.tracks);
    const currentTime = useTimelineStore(state => state.currentTime);
    
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [description, setDescription] = useState(shot.description || '');
    const [narration, setNarration] = useState<INarrationItem[]>(shot.narration || []);
    const [imagePrompt, setImagePrompt] = useState(shot.image_prompt || '');
    const [sceneId, setSceneId] = useState<string>(String(shot.scene_id));
    const [characterIds, setCharacterIds] = useState<number[]>(
        shot.characters?.map(c => c.character_id) || []
    );
    const [duration, setDuration] = useState<number>(shot.duration || 5);

    // Video-related state
    const [videoPrompt, setVideoPrompt] = useState<string>('');
    const [isEditingVideoPrompt, setIsEditingVideoPrompt] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

    // Reset form when shot changes
    useEffect(() => {
        if (isOpen && shot) {
            setDescription(shot.description || '');
            setNarration(Array.isArray(shot.narration) ? shot.narration : []);
            setImagePrompt(shot.image_prompt || '');
            setSceneId(String(shot.scene_id));
            // Handle both full character objects (from shot.characters) or just IDs if that's what we get
            const ids = shot.characters?.map(c => c.character_id).filter(id => id !== undefined && id !== null) || (shot as any).associated_characters || [];
            setCharacterIds(ids);
            setVideoPrompt((shot.extra_data as any)?.video_prompt || '');
            setDuration(shot.duration || 5);
            setIsEditing(false); // Reset editing mode
            setIsEditingVideoPrompt(false);
        }
    }, [isOpen, shot]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const shotUuid = shot.uuid || String(shot.shot_id);
            await shotApi.updateShot(shotUuid, {
                description,
                narration,
                image_prompt: imagePrompt,
                scene_id: parseInt(sceneId),
                associated_characters: characterIds,
                duration: duration
            });

            toast.success(tCommon('save') + " " + tCommon('success'));
            setIsEditing(false);
            onSuccess();
        } catch (error: any) {
            console.error("Failed to update shot", error);
            toast.error(tCommon('error'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNarration = () => {
        setNarration(prev => [...prev, { 角色: '旁白', 内容: '' }]);
    };

    const handleUpdateNarration = (index: number, field: keyof INarrationItem, value: string) => {
        setNarration(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleRemoveNarration = (index: number) => {
        setNarration(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddToTrack = (item: INarrationItem) => {
        if (!item.内容) return;

        // Find a text track or create one if it doesn't exist
        let textTrack = tracks.find(t => t.type === 'text');

        if (!textTrack) {
            toast.error(tCommon('noTextTrackFound'));
            return;
        }

        // Calculate duration based on text length (approx 3.5 chars per second, min 2s)
        const duration = Math.max(2, Math.ceil(item.内容.length / 3.5));
        // 只显示纯文本内容,不显示角色名
        const displayText = item.内容;

        addClip(textTrack.id, {
            url: '', // Text clips don't need a URL
            text: displayText,
            startInTimeline: currentTime,
            duration: duration,
            sourceStart: 0,
            sourceEnd: duration,
            layer: textTrack.clips.length + 1,
        });

        toast.success(tCommon('addedToSubtitleTrack'));
    };

    const handleRegenerate = () => {
        const shotUuid = shot.uuid || String(shot.shot_id);
        // 如果正在编辑，使用当前编辑框里的 prompt
        onRegenerateImage(shotUuid, isEditing ? imagePrompt : undefined);
    };

    // Video generation handlers
    const handleGenerateVideo = async () => {
        if (!shot) return;

        setIsGeneratingVideo(true);
        try {
            const shotUuid = shot.uuid || String(shot.shot_id);
            await shotApi.generateShotVideo(shotUuid);
            toast.success(t('videoGenerationStarted'));
            // Refresh to update UI
            setTimeout(() => {
                onSuccess();
                setIsGeneratingVideo(false);
            }, 2000);
        } catch (error: any) {
            console.error('Failed to generate video:', error);
            if (error.response?.status === 402) {
                toast.error(tCommon('insufficientPoints'));
            } else {
                toast.error(t('failedToGenerateVideo'));
            }
            setIsGeneratingVideo(false);
        }
    };

    const handleRegenerateVideoPrompt = async () => {
        if (!shot) return;

        setIsGeneratingPrompt(true);
        try {
            const shotUuid = shot.uuid || String(shot.shot_id);
            await shotApi.generateVideoPrompt(shotUuid);
            toast.success(t('promptGenerationStarted'));

            // Poll for updated prompt
            setTimeout(async () => {
                onSuccess(); // Trigger parent refresh
                setIsGeneratingPrompt(false);
            }, 3000);
        } catch (error: any) {
            console.error('Failed to generate prompt:', error);
            toast.error(t('failedToGeneratePrompt'));
            setIsGeneratingPrompt(false);
        }
    };

    const handleSaveVideoPrompt = async () => {
        if (!shot) return;

        try {
            const shotUuid = shot.uuid || String(shot.shot_id);
            await shotApi.updateVideoPrompt(shotUuid, videoPrompt);
            toast.success(t('promptSaved'));
            setIsEditingVideoPrompt(false);
            onSuccess();
        } catch (error) {
            console.error('Failed to save video prompt:', error);
            toast.error(t('failedToSavePrompt'));
        }
    };

    const toggleCharacter = (id: number) => {
        if (!isEditing) return;
        setCharacterIds(prev => 
            prev.includes(id) 
                ? prev.filter(cid => cid !== id)
                : [...prev, id]
        );
    };

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Helper to get scene name
    const getSceneName = (id: string) => {
        const s = availableScenes.find(sc => String(sc.scene_id) === id);
        return s ? (s.title || s.location || `${t('scene')} ${s.scene_id}`) : id;
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>{shot.title || `Shot ${shot.shot_number}`}</span>
                            {!isEditing && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setIsEditing(true)}
                                    className="h-8 text-slate-400 hover:text-white"
                                >
                                    <Edit2 size={14} className="mr-2" />
                                    {t('editShot')}
                                </Button>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t('shotDetail')}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-2">
                        {/* Image Area */}
                        <div className="w-full aspect-video rounded-lg bg-black overflow-hidden border border-slate-800 relative group">
                            {isRegenerating ? (
                                <div className="w-full h-full flex items-center justify-center text-orange-500 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="text-sm">{tCommon('generating')}</span>
                                </div>
                            ) : shot.image_url ? (
                                <>
                                    <img 
                                        src={shot.image_url} 
                                        alt="Shot" 
                                        className="w-full h-full object-contain cursor-pointer" 
                                        onClick={() => setIsPreviewOpen(true)}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full"
                                        onClick={() => setIsPreviewOpen(true)}
                                    >
                                        <Maximize2 size={16} />
                                    </Button>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    <ImageIcon size={32} className="opacity-50 mb-2" />
                                    <span className="text-xs">{t('noShotImage')}</span>
                                </div>
                            )}
                            
                            {/* Regenerate Button */}
                            <Button
                                variant="secondary"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border border-white/10 backdrop-blur-md"
                                onClick={handleRegenerate}
                                disabled={isRegenerating}
                            >
                                <RotateCcw size={14} className={`mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
                                {t('regenerate')}
                            </Button>
                        </div>

                        {/* Video Preview Area */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('videoPreview')}</Label>
                            {shot.video_url ? (
                                <div className="space-y-2">
                                    <video
                                        src={shot.video_url}
                                        controls
                                        className="w-full rounded-lg bg-black border border-slate-800"
                                        preload="metadata"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleGenerateVideo}
                                            disabled={isGeneratingVideo}
                                            className="border-slate-700 hover:bg-slate-800"
                                        >
                                            {isGeneratingVideo ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                            )}
                                            {t('regenerateVideo')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = shot.video_url!;
                                                a.download = `${shot.title || 'video'}.mp4`;
                                                a.click();
                                            }}
                                            className="border-slate-700 hover:bg-slate-800"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            {t('downloadVideo')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                                    <Film className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                                    <p className="text-sm text-slate-500 mb-4">{t('noVideoYet')}</p>
                                    <Button
                                        onClick={handleGenerateVideo}
                                        disabled={isGeneratingVideo || !shot.image_url}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        {isGeneratingVideo ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Film className="w-4 h-4 mr-2" />
                                        )}
                                        {t('generateVideo')}
                                    </Button>
                                    {!shot.image_url && (
                                        <p className="text-xs text-red-500 mt-2">{t('needImageFirst')}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Video Prompt Editing Area */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">{t('videoPrompt')}</Label>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleRegenerateVideoPrompt}
                                    disabled={isGeneratingPrompt}
                                    className="h-7 text-xs text-slate-400 hover:text-white"
                                >
                                    {isGeneratingPrompt ? (
                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    ) : (
                                        <Sparkles className="w-3 h-3 mr-1" />
                                    )}
                                    {t('regeneratePrompt')}
                                </Button>
                            </div>

                            {isEditingVideoPrompt ? (
                                <>
                                    <Textarea
                                        value={videoPrompt}
                                        onChange={(e) => setVideoPrompt(e.target.value)}
                                        rows={6}
                                        className="font-mono text-sm bg-slate-800 border-slate-700 text-slate-200"
                                        placeholder={t('videoPromptPlaceholder')}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setVideoPrompt((shot.extra_data as any)?.video_prompt || '');
                                                setIsEditingVideoPrompt(false);
                                            }}
                                            className="h-8 text-slate-400 hover:text-white"
                                        >
                                            {tCommon('cancel')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSaveVideoPrompt}
                                            className="h-8 bg-blue-600 hover:bg-blue-700"
                                        >
                                            {tCommon('save')}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div
                                    className="p-3 bg-slate-800/50 rounded border border-slate-700 text-sm cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => setIsEditingVideoPrompt(true)}
                                >
                                    {videoPrompt || <span className="text-slate-500 italic">{t('clickToAddVideoPrompt')}</span>}
                                </div>
                            )}
                        </div>

                        {/* Form / Display Area */}
                        <div className="space-y-4">
                            {/* Scene Selection */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('scene')}</Label>
                                {isEditing ? (
                                    <Select value={sceneId} onValueChange={setSceneId}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700 h-9 text-sm">
                                            <SelectValue placeholder={t('scene')} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            {availableScenes.map((s) => (
                                                <SelectItem key={s.scene_id} value={String(s.scene_id)} className="text-slate-200 focus:bg-slate-700">
                                                    {s.title || s.location || `${t('scene')} ${s.scene_id}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm text-slate-300 bg-slate-800/30 p-2 rounded-md border border-slate-800">
                                        {getSceneName(sceneId)}
                                    </div>
                                )}
                            </div>

                            {/* Duration Input */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('duration')} ({tCommon('seconds')})</Label>
                                {isEditing ? (
                                    <Input
                                        type="number"
                                        min={1}
                                        max={60}
                                        step={0.5}
                                        value={duration}
                                        onChange={(e) => setDuration(parseFloat(e.target.value) || 5)}
                                        className="bg-slate-800 border-slate-700 h-9 text-sm"
                                    />
                                ) : (
                                    <div className="text-sm text-slate-300 bg-slate-800/30 p-2 rounded-md border border-slate-800">
                                        {duration}s
                                    </div>
                                )}
                            </div>

                            {/* Character Selection */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('characters')}</Label>
                                {isEditing ? (
                                    <div className="flex flex-wrap gap-2 bg-slate-800/50 p-3 rounded-md border border-slate-800">
                                        {availableCharacters.map((char) => {
                                            const isSelected = characterIds.includes(char.character_id!);
                                            return (
                                                <Badge
                                                    key={char.character_id}
                                                    variant={isSelected ? "default" : "outline"}
                                                    className={`cursor-pointer transition-all ${
                                                        isSelected 
                                                            ? "bg-blue-600 hover:bg-blue-500 border-transparent" 
                                                            : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                                                    }`}
                                                    onClick={() => toggleCharacter(char.character_id!)}
                                                >
                                                    {char.name}
                                                    {isSelected && <X size={12} className="ml-1 opacity-50" />}
                                                    {!isSelected && <Plus size={12} className="ml-1 opacity-50" />}
                                                </Badge>
                                            );
                                        })}
                                        {availableCharacters.length === 0 && (
                                            <span className="text-xs text-slate-500 italic">{t('noCharactersAvailable')}</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {characterIds.filter(id => id !== undefined && id !== null).length > 0 ? characterIds.filter(id => id !== undefined && id !== null).map(id => {
                                            const char = availableCharacters.find(c => Number(c.character_id) === Number(id));
                                            return (
                                                <Badge key={String(id)} variant="secondary" className="bg-slate-800 text-slate-300 border border-slate-700">
                                                    {char ? char.name : `ID: ${id}`}
                                                </Badge>
                                            );
                                        }) : (
                                            <span className="text-sm text-slate-500 italic">{tCommon('none')}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">{t('description')}</Label>
                                {isEditing ? (
                                    <Textarea 
                                        value={description} 
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-slate-800 border-slate-700 text-sm min-h-[80px]"
                                        placeholder={t('describeShot')}
                                    />
                                ) : (
                                    <div className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-3 rounded-md min-h-[40px]">
                                        {description || tCommon('none')}
                                    </div>
                                )}
                            </div>

                            {/* Narration/Dialogue */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-500">{t('narration')} / {t('dialogue')}</Label>
                                    {isEditing && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={handleAddNarration}
                                            className="h-6 text-[10px] text-blue-400 hover:text-blue-300"
                                        >
                                            <Plus size={10} className="mr-1" />
                                            {tCommon('add')}
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {narration.length > 0 ? narration.map((item, index) => (
                                        <div key={index} className="flex flex-col gap-2 p-2 bg-slate-800/50 rounded-md border border-slate-800 group">
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <div className="flex-1 flex gap-2">
                                                        <Select 
                                                            value={item.角色} 
                                                            onValueChange={(val) => handleUpdateNarration(index, '角色', val)}
                                                        >
                                                            <SelectTrigger className="w-[120px] h-8 bg-slate-800 border-slate-700 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                                                                <SelectItem value="旁白">{t('narration')}</SelectItem>
                                                                {availableCharacters.map(char => (
                                                                    <SelectItem key={char.character_id} value={char.name}>
                                                                        {char.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Textarea 
                                                            value={item.内容} 
                                                            onChange={(e) => handleUpdateNarration(index, '内容', e.target.value)}
                                                            className="bg-slate-800 border-slate-700 text-sm min-h-[40px] flex-1"
                                                            placeholder={t('dialoguePlaceholder')}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 text-sm text-slate-300">
                                                        <span className="font-bold text-blue-400 mr-2">{item.角色}：</span>
                                                        {item.内容}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isEditing && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleAddToTrack(item)}
                                                            className="h-8 px-3 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                        >
                                                            <ListPlus size={14} className="mr-1.5" />
                                                            <span className="text-xs font-medium">添加到轨道</span>
                                                        </Button>
                                                    )}
                                                    {isEditing && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveNarration(index)}
                                                            className="h-8 w-8 text-slate-500 hover:text-red-400"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-sm text-slate-500 italic p-3 bg-slate-800/30 rounded-md">
                                            {tCommon('none')}
                                        </div>
                                    )}
                                </div>
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
            </Dialog>

            {/* Fullscreen Preview */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent showCloseButton={true} className="bg-transparent border-0 shadow-none max-w-[95vw] max-h-[95vh] p-0 flex items-center justify-center">
                    {shot.image_url && (
                        <img 
                            src={shot.image_url} 
                            alt="Preview" 
                            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
