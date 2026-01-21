import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Image as ImageIcon, Edit2, Maximize2, Plus, X, Trash2, ListPlus, Film, Download, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IShot, INarrationItem } from '@/types/scene';
import { ICharacter } from '@/types/character';
import { IScene } from '@/types/scene';
import shotApi from '@/lib/api/shot';
import { toast } from "sonner";
import { VideoGenerationDialog } from "./video-generation-dialog";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";

interface ShotEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    shot: IShot;
    previousShot?: IShot;
    nextShot?: IShot;
    availableCharacters: ICharacter[];
    availableScenes: IScene[];
    onSuccess: () => void;
    onRegenerateImage: (shotId: string, imagePrompt?: string) => void;
    isRegenerating: boolean;
    aspectRatio?: "16:9" | "9:16";
    onNavigate?: (shot: IShot) => void;
}

import { useTimelineStore } from '@/stores/timeline';
import { cn } from '@/lib/utils';

export function ShotEditModal({
    isOpen,
    onClose,
    shot,
    previousShot,
    nextShot,
    availableCharacters,
    availableScenes,
    onSuccess,
    onRegenerateImage,
    isRegenerating,
    aspectRatio = "16:9",
    onNavigate
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
    const [videoDuration, setVideoDuration] = useState<string | number>(shot.video_duration || 5);

    // Video-related state
    const [videoPrompt, setVideoPrompt] = useState<string>('');
    const [isEditingVideoPrompt, setIsEditingVideoPrompt] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [isVideoConfigOpen, setIsVideoConfigOpen] = useState(false);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

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
            setVideoDuration(shot.video_duration || 5);
            setIsEditing(false); // Reset editing mode
            setIsEditingVideoPrompt(false);

            const history = (shot.extra_data as any)?.version_history || [];
            if (history.length > 0) {
                setSelectedVersionId(history[history.length - 1].version_id);
            } else {
                setSelectedVersionId(null);
            }
        }
    }, [isOpen, shot]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const shotUuid = shot.uuid || String(shot.shot_id);

            // Merge video_prompt into extra_data
            const updatedExtraData = {
                ...(shot.extra_data || {}),
                video_prompt: videoPrompt
            };

            await shotApi.updateShot(shotUuid, {
                description,
                narration,
                image_prompt: imagePrompt,
                scene_id: parseInt(sceneId),
                associated_characters: characterIds,
                video_duration: typeof videoDuration === 'string' ? parseFloat(videoDuration) || 5 : videoDuration,
                extra_data: updatedExtraData
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

        // Calculate duration based on text length (originally 3.5 chars/s, shortened by 1/3 to approx 5.2 chars/s, min 1.5s)
        const duration = Math.max(1.5, Math.ceil(item.内容.length / 5.2));
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
        // 直接使用当前编辑框里的 prompt，如果有就用，没有后端会自动生成
        onRegenerateImage(shotUuid, imagePrompt || undefined);
    };

    // Video generation handlers
    const handleGenerateVideo = async () => {
        if (!shot) return;
        setIsVideoConfigOpen(true);
    };

    const handleConfirmVideoGeneration = async (data: { lastFrameImageUrl?: string }) => {
        if (!shot) return;

        setIsGeneratingVideo(true);
        try {
            const shotUuid = shot.uuid || String(shot.shot_id);
            if (shot.video_url) {
                await shotApi.regenerateShotVideo(shotUuid, undefined, data.lastFrameImageUrl);
            } else {
                await shotApi.generateShotVideo(shotUuid, undefined, data.lastFrameImageUrl);
            }
            toast.success(t('videoGenerationStarted'));
            setIsVideoConfigOpen(false);

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
                <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 sm:max-w-[1000px] max-h-[90vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="flex items-center justify-between">
                            <span>{shot.title || `Shot ${shot.shot_number}`}</span>
                            <div className="flex items-center gap-2">
                                {/* Navigation Buttons */}
                                <div className="flex items-center gap-1 border border-slate-700 rounded-lg px-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => previousShot && onNavigate?.(previousShot)}
                                        disabled={!previousShot}
                                        className="h-7 px-3 text-slate-400 hover:text-white disabled:opacity-30"
                                    >
                                        <ChevronLeft size={14} className="mr-1" />
                                        {t('previousShot')}
                                    </Button>
                                    <div className="h-4 w-px bg-slate-700" />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => nextShot && onNavigate?.(nextShot)}
                                        disabled={!nextShot}
                                        className="h-7 px-3 text-slate-400 hover:text-white disabled:opacity-30"
                                    >
                                        {t('nextShot')}
                                        <ChevronRight size={14} className="ml-1" />
                                    </Button>
                                </div>
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
                            </div>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t('shotDetail')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                        {/* Left Column: Media Area */}
                        <div className="space-y-6">
                            {/* Image Area */}
                            <div className={cn(
                                "w-full rounded-lg bg-black overflow-hidden border border-slate-800 relative group",
                                aspectRatio === "9:16" ? "aspect-[9/16] max-h-[500px] mx-auto w-fit" : "aspect-video"
                            )}>
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
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">{t('videoPreview')}</Label>
                                    {(shot.extra_data as any)?.version_history?.length > 1 && (
                                        <Select
                                            value={selectedVersionId || undefined}
                                            onValueChange={setSelectedVersionId}
                                        >
                                            <SelectTrigger className="h-7 w-[180px] text-xs bg-slate-800 border-slate-700">
                                                <SelectValue placeholder={t('selectVersion') || "选择版本"} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                                                {((shot.extra_data as any).version_history as any[]).map((v, idx) => (
                                                    <SelectItem key={v.version_id} value={v.version_id} className="text-xs">
                                                        {t('version') || "版本"} {idx + 1} ({new Date(v.created_at).toLocaleString()})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {(() => {
                                    const history = (shot.extra_data as any)?.version_history || [];
                                    const selectedVersion = history.find((v: any) => v.version_id === selectedVersionId) ||
                                        (history.length > 0 ? history[history.length - 1] : null);

                                    // Fallback to current shot properties if no history exists
                                    const displayVideoUrl = selectedVersion?.video_url || shot.video_url;
                                    const displayAudioUrl = selectedVersion?.audio_url || shot.audio_url;

                                    if (displayVideoUrl) {
                                        return (
                                            <div className="space-y-2">
                                                <div className="relative group/video">
                                                    <video
                                                        key={displayVideoUrl}
                                                        src={displayVideoUrl}
                                                        controls
                                                        className="w-full rounded-lg bg-black border border-slate-800"
                                                        preload="metadata"
                                                    />
                                                    {displayAudioUrl && (
                                                        <div className="mt-2 p-2 rounded bg-slate-800/50 border border-slate-700 flex items-center gap-2">
                                                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Audio</div>
                                                            <audio src={displayAudioUrl} controls className="h-8 flex-1" />
                                                        </div>
                                                    )}
                                                </div>
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
                                                            a.href = displayVideoUrl;
                                                            a.download = `${shot.title || 'video'}_v${selectedVersionId || 'latest'}.mp4`;
                                                            a.click();
                                                        }}
                                                        className="border-slate-700 hover:bg-slate-800"
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        {t('downloadVideo')}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
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
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Right Column: Prompt & Form Area */}
                        <div className="space-y-4">
                            {/* Prompt Editing Area */}
                            <div className="space-y-3">
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
                                        <div className="text-sm text-slate-300 leading-relaxed min-h-[40px] max-h-[200px] overflow-y-auto break-all pr-1 scrollbar-thin scrollbar-thumb-orange-200/20 hover:scrollbar-thumb-orange-200/40">
                                            {imagePrompt || tCommon('none')}
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                                            <Film className="w-3 h-3" />
                                            {t('videoPrompt') || "视频提示词"}
                                        </Label>
                                        {!isEditing && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRegenerateVideoPrompt}
                                                disabled={isGeneratingPrompt}
                                                className="h-6 text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-500/10"
                                            >
                                                {isGeneratingPrompt ? (
                                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                ) : (
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                )}
                                                {t('regeneratePrompt') || "重新生成提示词"}
                                            </Button>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <AutosizeTextarea
                                            value={videoPrompt}
                                            onChange={(e) => setVideoPrompt(e.target.value)}
                                            placeholder={t('videoPromptPlaceholder') || "输入视频提示词..."}
                                            className="text-sm resize-none bg-white dark:bg-slate-950 border-purple-200 dark:border-purple-800/50 focus:border-purple-500"
                                            minRows={2}
                                            maxRows={10}
                                        />
                                    ) : (
                                        <div className="text-sm text-slate-300 leading-relaxed min-h-[40px] max-h-[200px] overflow-y-auto break-all pr-1 scrollbar-thin scrollbar-thumb-purple-200/20 hover:scrollbar-thumb-purple-200/40">
                                            {videoPrompt || t('clickToAddVideoPrompt') || tCommon('none')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Form Area */}
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
                                            step={0.1}
                                            value={videoDuration}
                                            onChange={(e) => setVideoDuration(e.target.value)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className="bg-slate-800 border-slate-700 h-9 text-sm"
                                        />
                                    ) : (
                                        <div className="text-sm text-slate-300 bg-slate-800/30 p-2 rounded-md border border-slate-800">
                                            {videoDuration}s
                                        </div>
                                    )}
                                </div>

                                {/* Character Selection */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">{t('characters')}</Label>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-3 rounded-md border border-slate-800">
                                            {availableCharacters.map((char) => {
                                                const isSelected = characterIds.includes(char.character_id!);
                                                return (
                                                    <div
                                                        key={char.character_id}
                                                        onClick={() => toggleCharacter(char.character_id!)}
                                                        className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-all border ${isSelected
                                                            ? "bg-blue-600/20 border-blue-500 text-blue-100"
                                                            : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-800"
                                                            }`}
                                                    >
                                                        <div className="w-8 h-8 rounded overflow-hidden bg-slate-800 shrink-0 border border-slate-700">
                                                            {char.image_url ? (
                                                                <img
                                                                    src={char.image_url}
                                                                    alt={char.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <ImageIcon size={14} className="opacity-20" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs truncate flex-1">{char.name}</span>
                                                        {isSelected ? (
                                                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                                                <X size={10} className="text-white" />
                                                            </div>
                                                        ) : (
                                                            <Plus size={12} className="opacity-30 shrink-0" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {availableCharacters.length === 0 && (
                                                <span className="text-xs text-slate-500 italic col-span-full">{t('noCharactersAvailable')}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {characterIds.filter(id => id !== undefined && id !== null).length > 0 ? characterIds.filter(id => id !== undefined && id !== null).map(id => {
                                                const char = availableCharacters.find(c => Number(c.character_id) === Number(id));
                                                return (
                                                    <Badge key={String(id)} variant="secondary" className="bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5 pl-1 py-0.5">
                                                        {char?.image_url && (
                                                            <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-700 shrink-0 border border-slate-600">
                                                                <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                                                            </div>
                                                        )}
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
                                                                            <div className="flex items-center gap-2">
                                                                                {char.image_url && (
                                                                                    <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-700 shrink-0 border border-slate-600">
                                                                                        <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                                                                                    </div>
                                                                                )}
                                                                                <span>{char.name}</span>
                                                                            </div>
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
                    <DialogTitle className="sr-only">图片预览</DialogTitle>
                    <DialogDescription className="sr-only">分镜图片预览</DialogDescription>
                    {shot.image_url && (
                        <img
                            src={shot.image_url}
                            alt="Preview"
                            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                        />
                    )}
                </DialogContent>
            </Dialog>

            <VideoGenerationDialog
                isOpen={isVideoConfigOpen}
                onClose={() => setIsVideoConfigOpen(false)}
                onConfirm={handleConfirmVideoGeneration}
                shot={shot}
                nextShot={nextShot}
                isGenerating={isGeneratingVideo}
            />
        </>
    );
}
