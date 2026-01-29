import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Image as ImageIcon, Edit2, Maximize2, Plus, X, Trash2, ListPlus, Film, Download, Sparkles, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IShot, INarrationItem } from '@/types/scene';
import { ICharacter } from '@/types/character';
import { IScene } from '@/types/scene';
import shotApi from '@/lib/api/shot';
import { toast } from "sonner";
import { VideoGenerationDialog } from "./video-generation-dialog";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { ImagePreview } from "@/components/ui/image-preview";
import { ShotImageHistoryDialog } from "@/components/timeline/shot-image-history-dialog";

interface ShotEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    shot: IShot;
    previousShot?: IShot;
    nextShot?: IShot;
    availableCharacters: ICharacter[];
    availableScenes: IScene[];
    onSuccess: () => void;
    onRegenerateImage: (shotId: string, imagePrompt?: string, frameType?: 'start' | 'end' | 'both') => void;
    regeneratingFrameType?: 'start' | 'end' | 'both' | null;
    isVideoGenerating?: boolean;
    onVideoGenerationStart?: () => void;
    aspectRatio?: "16:9" | "9:16";
    onNavigate?: (shot: IShot) => void;
}

import { useTimelineStore } from '@/stores/timeline';
import { cn } from '@/lib/utils';

// 辅助函数：安全解析台词数据
const parseNarration = (data: any): INarrationItem[] => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'string' && data.trim()) {
        try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            console.error("Failed to parse narration JSON", e);
        }
    }
    return [];
};

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
    regeneratingFrameType,
    isVideoGenerating: isVideoGeneratingProp,
    onVideoGenerationStart,
    aspectRatio = "16:9",
    onNavigate
}: ShotEditModalProps) {
    const t = useTranslations('Editor');
    const tCommon = useTranslations('common');
    const addClip = useTimelineStore(state => state.addClip);
    const tracks = useTimelineStore(state => state.project.tracks);
    const currentTime = useTimelineStore(state => state.currentTime);

    // Refs for video and audio elements
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [description, setDescription] = useState(shot.description || '');
    const [narration, setNarration] = useState<INarrationItem[]>(parseNarration(shot.narration));
    const [imagePrompt, setImagePrompt] = useState(shot.image_prompt || '');
    const [endFrameImagePrompt, setEndFrameImagePrompt] = useState((shot.extra_data as any)?.end_frame_image_prompt || '');
    const [sceneId, setSceneId] = useState<string>(String(shot.scene_id));
    const [characterIds, setCharacterIds] = useState<number[]>(
        shot.characters?.map(c => c.character_id) || []
    );
    const [videoDuration, setVideoDuration] = useState<string | number>(shot.video_duration || 5);

    // Video-related state
    const [videoPrompt, setVideoPrompt] = useState<string>('');
    const [appearanceElements, setAppearanceElements] = useState<string[]>([]);
    const [isEditingVideoPrompt, setIsEditingVideoPrompt] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [isVideoConfigOpen, setIsVideoConfigOpen] = useState(false);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [isEndFramePreviewOpen, setIsEndFramePreviewOpen] = useState(false);
    const [isImageHistoryOpen, setIsImageHistoryOpen] = useState(false);

    // Play both video and audio simultaneously
    const handlePlayBoth = () => {
        if (videoRef.current) {
            videoRef.current.play().catch(error => {
                console.error('Error playing video:', error);
            });
        }
        if (audioRef.current) {
            audioRef.current.play().catch(error => {
                console.error('Error playing audio:', error);
            });
        }
    };

    // Reset form when shot changes
    useEffect(() => {
        if (isOpen && shot) {
            setDescription(shot.description || '');
            setNarration(parseNarration(shot.narration));
            setImagePrompt(shot.image_prompt || '');
            setSceneId(String(shot.scene_id));
            // Handle both full character objects (from shot.characters) or just IDs if that's what we get
            const ids = shot.characters?.map(c => c.character_id).filter(id => id !== undefined && id !== null) || (shot as any).associated_characters || [];
            setCharacterIds(ids);
            setVideoPrompt((shot.extra_data as any)?.video_prompt || '');
            setEndFrameImagePrompt((shot.extra_data as any)?.end_frame_image_prompt || '');

            // Try to get appearance_elements from root extra_data, fallback to ai_output
            const extra = shot.extra_data as any;
            const elements = extra?.appearance_elements || extra?.ai_output?.['出镜元素'] || [];
            setAppearanceElements(elements);

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

            // Merge video_prompt and appearance_elements into extra_data
            const updatedExtraData = {
                ...(shot.extra_data || {}),
                video_prompt: videoPrompt,
                appearance_elements: appearanceElements,
                end_frame_image_prompt: endFrameImagePrompt
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
        onRegenerateImage(shotUuid, imagePrompt || undefined, 'start');
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
            // Notify parent to update video generating status immediately
            onVideoGenerationStart?.();
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

    const handleUpdateAppearanceElement = (index: number, value: string) => {
        setAppearanceElements(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleAddAppearanceElement = () => {
        setAppearanceElements(prev => [...prev, '']);
    };

    const handleRemoveAppearanceElement = (index: number) => {
        setAppearanceElements(prev => prev.filter((_, i) => i !== index));
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
                <DialogContent className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] text-gray-900 sm:max-w-[1000px] max-h-[90vh] flex flex-col rounded-2xl">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="flex items-center justify-between">
                            <span className="text-xl font-semibold">{shot.title || `Shot ${shot.shot_number}`}</span>
                            <div className="flex items-center gap-3">
                                {/* Navigation Buttons */}
                                <div className="flex items-center gap-1 rounded-xl bg-gradient-to-br from-white to-blue-100 border border-blue-200 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.9)] px-2">
                                    <button
                                        onClick={() => previousShot && onNavigate?.(previousShot)}
                                        disabled={!previousShot}
                                        className={`h-8 px-4 rounded-lg flex items-center gap-2 transition-all duration-200 ${!previousShot ? 'opacity-60 cursor-not-allowed text-gray-500' : 'hover:bg-blue-100 hover:shadow-[2px_2px_8px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]'}`}
                                    >
                                        <ChevronLeft size={16} className="text-gray-700" />
                                        <span className="text-sm font-medium text-gray-900">{t('previousShot')}</span>
                                    </button>
                                    <div className="h-4 w-px bg-blue-200" />
                                    <button
                                        onClick={() => nextShot && onNavigate?.(nextShot)}
                                        disabled={!nextShot}
                                        className={`h-8 px-4 rounded-lg flex items-center gap-2 transition-all duration-200 ${!nextShot ? 'opacity-60 cursor-not-allowed text-gray-500' : 'hover:bg-blue-100 hover:shadow-[2px_2px_8px_rgba(0,0,0,0.1),-2px_-2px_8px_rgba(255,255,255,0.9)]'}`}
                                    >
                                        <span className="text-sm font-medium text-gray-900">{t('nextShot')}</span>
                                        <ChevronRight size={16} className="text-gray-700" />
                                    </button>
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="h-9 px-4 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2"
                                    >
                                        <Edit2 size={14} />
                                        <span className="text-sm">{t('editShot')}</span>
                                    </button>
                                )}
                            </div>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t('shotDetail')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue">
                        {/* Left Column: Media Area */}
                        <div className="space-y-6">
                            {/* Image Area */}
                            <div className={cn(
                                "w-full rounded-xl bg-gradient-to-br from-white to-blue-50 overflow-hidden border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] relative group",
                                "aspect-video"
                            )}>
                                {shot.image_url ? (
                                    <>
                                        <img
                                            src={shot.image_url}
                                            alt="Shot"
                                            className="w-full h-full object-contain cursor-pointer"
                                            onClick={() => setIsPreviewOpen(true)}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                        <button
                                            onClick={() => setIsPreviewOpen(true)}
                                            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 rounded-full p-2 hover:scale-105 transition-all duration-200"
                                        >
                                            <Maximize2 size={18} className="text-gray-700" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        <ImageIcon size={32} className="opacity-50 mb-2" />
                                        <span className="text-xs">{t('noShotImage')}</span>
                                    </div>
                                )}

                                {/* Generating Overlay */}
                                {(regeneratingFrameType === 'start' || regeneratingFrameType === 'both') && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-[2px] rounded-xl">
                                        <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-2" />
                                        <span className="text-sm text-green-600 font-medium">{tCommon('generating')}</span>
                                    </div>
                                )}

                                {/* Regenerate Button */}
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={handleRegenerate}
                                        disabled={regeneratingFrameType === 'start' || regeneratingFrameType === 'both'}
                                        className="bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                                    >
                                        <RotateCcw size={14} />
                                        {t('regenerate')}
                                    </button>
                                    <button
                                        onClick={() => setIsImageHistoryOpen(true)}
                                        className="bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                                    >
                                        <History size={14} />
                                        历史
                                    </button>
                                </div>
                            </div>

                            {/* End Frame Image Area */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700">尾帧图片</Label>
                                <div className={cn(
                                    "w-full rounded-xl bg-gradient-to-br from-white to-blue-50 overflow-hidden border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] relative group",
                                    "aspect-video"
                                )}>
                                    {(shot.extra_data as any)?.end_frame_image_url ? (
                                        <>
                                            <img
                                                src={(shot.extra_data as any).end_frame_image_url}
                                                alt="End Frame"
                                                className="w-full h-full object-contain cursor-pointer"
                                                onClick={() => setIsEndFramePreviewOpen(true)}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                            <button
                                                onClick={() => setIsEndFramePreviewOpen(true)}
                                                className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 rounded-full p-2 hover:scale-105 transition-all duration-200"
                                            >
                                                <Maximize2 size={18} className="text-gray-700" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                            <ImageIcon size={32} className="opacity-50 mb-2" />
                                            <span className="text-xs">暂无尾帧图片</span>
                                        </div>
                                    )}

                                    {/* Generating Overlay */}
                                    {(regeneratingFrameType === 'end' || regeneratingFrameType === 'both') && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-[2px] rounded-xl">
                                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                            <span className="text-sm text-blue-600 font-medium">{tCommon('generating')}</span>
                                        </div>
                                    )}

                                    {/* Regenerate End Frame Button */}
                                    <button
                                        onClick={() => {
                                            const shotUuid = shot.uuid || String(shot.shot_id);
                                            onRegenerateImage(shotUuid, endFrameImagePrompt || undefined, 'end');
                                        }}
                                        disabled={regeneratingFrameType === 'end' || regeneratingFrameType === 'both'}
                                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-700 hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                                    >
                                        <RotateCcw size={14} />
                                        {t('regenerate')}
                                    </button>
                                </div>
                            </div>

                            {/* Video Preview Area */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium text-gray-700">{t('videoPreview')}</Label>
                                    {(shot.extra_data as any)?.version_history?.length > 1 && (
                                        <Select
                                            value={selectedVersionId || undefined}
                                            onValueChange={setSelectedVersionId}
                                        >
                                            <SelectTrigger className="h-8 w-[180px] text-xs bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
                                                <SelectValue placeholder={t('selectVersion') || "选择版本"} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)]">
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
                                            <div className="space-y-3">
                                                <div className="relative group/video">
                                                    <video
                                                        ref={videoRef}
                                                        key={displayVideoUrl}
                                                        src={displayVideoUrl}
                                                        controls
                                                        className="w-full rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]"
                                                        preload="metadata"
                                                    />
                                                    {displayAudioUrl && (
                                                        <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] flex items-center gap-2">
                                                            <div className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Audio</div>
                                                            <audio ref={audioRef} src={displayAudioUrl} controls className="h-8 flex-1" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={handlePlayBoth}
                                                        className="flex-1 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 px-3 py-2 text-sm flex items-center justify-center gap-1.5"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        播放视频和音频
                                                    </button>
                                                    <button
                                                        onClick={handleGenerateVideo}
                                                        disabled={isGeneratingVideo}
                                                        className="flex-1 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 px-3 py-2 text-sm font-medium text-gray-700 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-1.5"
                                                    >
                                                        {isGeneratingVideo ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <RotateCcw className="w-4 h-4" />
                                                        )}
                                                        {t('regenerateVideo')}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const a = document.createElement('a');
                                                            a.href = displayVideoUrl;
                                                            a.download = `${shot.title || 'video'}_v${selectedVersionId || 'latest'}.mp4`;
                                                            a.click();
                                                        }}
                                                        className="flex-1 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 px-3 py-2 text-sm font-medium text-gray-700 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-1.5"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        {t('downloadVideo')}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Show loading if video is generating
                                    const isVideoInProgress = isGeneratingVideo || isVideoGeneratingProp;

                                    if (isVideoInProgress) {
                                        return (
                                            <div className="rounded-xl bg-gradient-to-br from-white to-blue-50 border-2 border-dashed border-green-200 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] p-8 text-center">
                                                <Loader2 className="w-12 h-12 mx-auto mb-2 text-green-500 animate-spin" />
                                                <p className="text-sm text-green-600 mb-2">视频生成中...</p>
                                                <p className="text-xs text-gray-500">生成完成后将自动刷新</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="rounded-xl bg-gradient-to-br from-white to-blue-50 border-2 border-dashed border-blue-200 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] p-8 text-center">
                                            <Film className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                                            <p className="text-sm text-gray-600 mb-4">{t('noVideoYet')}</p>
                                            <button
                                                onClick={handleGenerateVideo}
                                                disabled={isGeneratingVideo || !shot.image_url}
                                                className="rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 px-6 py-2.5 flex items-center justify-center gap-2 mx-auto"
                                            >
                                                {isGeneratingVideo ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Film className="w-4 h-4" />
                                                )}
                                                {t('generateVideo')}
                                            </button>
                                            {!shot.image_url && (
                                                <p className="text-xs text-red-500 mt-2">{t('needImageFirst')}</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Right Column: Prompt & Form Area */}
                        <div className="space-y-5">
                            {/* Prompt Editing Area */}
                            <div className="space-y-4">
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
                                        <div className="text-sm text-gray-700 leading-relaxed min-h-[80px] max-h-[200px] overflow-y-auto break-all pr-2 scrollbar-thin scrollbar-thumb-blue">
                                            {imagePrompt || tCommon('none')}
                                        </div>
                                    )}
                                </div>

                                {/* End Frame Image Prompt */}
                                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 space-y-2">
                                    <Label className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3" />
                                        尾帧图片提示词
                                    </Label>
                                    {isEditing ? (
                                        <textarea
                                            value={endFrameImagePrompt}
                                            onChange={(e) => setEndFrameImagePrompt(e.target.value)}
                                            placeholder="输入尾帧图片提示词..."
                                            className="w-full text-sm resize-none bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 rounded-lg p-3 min-h-[80px]"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-700 leading-relaxed min-h-[80px] max-h-[200px] overflow-y-auto break-all pr-2 scrollbar-thin scrollbar-thumb-blue">
                                            {endFrameImagePrompt || tCommon('none')}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-purple-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                                            <Film className="w-3 h-3" />
                                            {t('videoPrompt') || "视频提示词"}
                                        </Label>
                                        {!isEditing && (
                                            <button
                                                onClick={handleRegenerateVideoPrompt}
                                                disabled={isGeneratingPrompt}
                                                className="h-7 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg px-2 flex items-center gap-1 transition-all duration-200"
                                            >
                                                {isGeneratingPrompt ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-3 h-3" />
                                                )}
                                                {t('regeneratePrompt') || "重新生成提示词"}
                                            </button>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <textarea
                                            value={videoPrompt}
                                            onChange={(e) => setVideoPrompt(e.target.value)}
                                            placeholder={t('videoPromptPlaceholder') || "输入视频提示词..."}
                                            className="w-full text-sm resize-none bg-gradient-to-br from-white to-purple-50 border border-purple-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 rounded-lg p-3 min-h-[80px]"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-700 leading-relaxed min-h-[80px] max-h-[200px] overflow-y-auto break-all pr-2 scrollbar-thin scrollbar-thumb-blue">
                                            {videoPrompt || t('clickToAddVideoPrompt') || tCommon('none')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Form Area */}
                            <div className="space-y-4">
                                {/* Scene Selection */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">{t('scene')}</Label>
                                    {isEditing ? (
                                        <Select value={sceneId} onValueChange={setSceneId}>
                                            <SelectTrigger className="h-9 text-sm bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
                                                <SelectValue placeholder={t('scene')} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)]">
                                                {availableScenes.map((s) => (
                                                    <SelectItem key={s.scene_id} value={String(s.scene_id)} className="text-sm">
                                                        {s.title || s.location || `${t('scene')} ${s.scene_id}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="text-sm text-gray-700 bg-gradient-to-br from-white to-blue-50 p-2 rounded-xl border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
                                            {getSceneName(sceneId)}
                                        </div>
                                    )}
                                </div>

                                {/* Duration Input */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">{t('duration')} ({tCommon('seconds')})</Label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            step={0.1}
                                            value={videoDuration}
                                            onChange={(e) => setVideoDuration(e.target.value)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className="w-full h-9 px-3 text-sm rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-700 bg-gradient-to-br from-white to-blue-50 p-2 rounded-xl border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
                                            {videoDuration}s
                                        </div>
                                    )}
                                </div>

                                {/* Character Selection */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">{t('characters')}</Label>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-2 bg-gradient-to-br from-white to-blue-50 p-3 rounded-xl border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
                                            {availableCharacters.map((char) => {
                                                const isSelected = characterIds.includes(char.character_id!);
                                                return (
                                                    <div
                                                        key={char.character_id}
                                                        onClick={() => toggleCharacter(char.character_id!)}
                                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${isSelected
                                                            ? "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200 text-blue-700"
                                                            : "bg-gradient-to-br from-white to-blue-50 border-blue-100 text-gray-700 hover:border-blue-200"
                                                            }`}
                                                    >
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-[2px_2px_6px_rgba(0,0,0,0.05),-2px_-2px_6px_rgba(255,255,255,0.8)] border border-blue-100 shrink-0">
                                                            {char.image_url ? (
                                                                <img
                                                                    src={char.image_url}
                                                                    alt={char.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <ImageIcon size={14} className="opacity-40" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs truncate flex-1 font-medium">{char.name}</span>
                                                        {isSelected ? (
                                                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0 shadow-[2px_2px_4px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.8)]">
                                                                <X size={10} className="text-white" />
                                                            </div>
                                                        ) : (
                                                            <Plus size={12} className="opacity-40 shrink-0 text-gray-500" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {availableCharacters.length === 0 && (
                                                <span className="text-xs text-gray-500 italic col-span-full">{t('noCharactersAvailable')}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {characterIds.filter(id => id !== undefined && id !== null).length > 0 ? characterIds.filter(id => id !== undefined && id !== null).map(id => {
                                                const char = availableCharacters.find(c => Number(c.character_id) === Number(id));
                                                return (
                                                    <span key={String(id)} className="bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 flex items-center gap-1.5">
                                                        {char?.image_url && (
                                                            <div className="w-4 h-4 rounded-full overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-[2px_2px_4px_rgba(0,0,0,0.05),-1px_-1px_3px_rgba(255,255,255,0.8)] border border-blue-100 shrink-0">
                                                                <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                                                            </div>
                                                        )}
                                                        {char ? char.name : `ID: ${id}`}
                                                    </span>
                                                );
                                            }) : (
                                                <span className="text-sm text-gray-500 italic">{tCommon('none')}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Appearance Elements */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium text-gray-700">出镜元素 (手机、包包等道具)</Label>
                                        {isEditing && (
                                            <button
                                                onClick={handleAddAppearanceElement}
                                                className="h-7 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg px-2 flex items-center gap-1 transition-all duration-200"
                                            >
                                                <Plus size={10} />
                                                {tCommon('add')}
                                            </button>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <div className="flex flex-wrap gap-2 bg-gradient-to-br from-white to-blue-50 p-3 rounded-xl border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
                                            {Array.isArray(appearanceElements) && appearanceElements.map((element, index) => (
                                                <div key={index} className="flex items-center gap-1 bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-lg px-2 py-1 shadow-[2px_2px_6px_rgba(0,0,0,0.05),-2px_-2px_6px_rgba(255,255,255,0.8)]">
                                                    <input
                                                        value={element}
                                                        onChange={(e) => handleUpdateAppearanceElement(index, e.target.value)}
                                                        className="h-6 w-24 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-200 text-xs"
                                                        placeholder="元素名称"
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveAppearanceElement(index)}
                                                        className="h-4 w-4 text-gray-500 hover:text-red-500 transition-colors duration-200"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!Array.isArray(appearanceElements) || appearanceElements.length === 0) && (
                                                <span className="text-xs text-gray-500 italic">暂无元素</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {Array.isArray(appearanceElements) && appearanceElements.length > 0 ? appearanceElements.map((element, index) => (
                                                <span key={index} className="bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 rounded-lg px-2 py-1 text-xs font-medium text-gray-700">
                                                    {element}
                                                </span>
                                            )) : (
                                                <span className="text-sm text-gray-500 italic">{tCommon('none')}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">{t('description')}</Label>
                                    {isEditing ? (
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full text-sm resize-none bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 rounded-lg p-3 min-h-[80px]"
                                            placeholder={t('describeShot')}
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-700 leading-relaxed bg-gradient-to-br from-white to-blue-50 p-3 rounded-lg border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] min-h-[80px]">
                                            {description || tCommon('none')}
                                        </div>
                                    )}
                                </div>

                                {/* Narration/Dialogue */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium text-gray-700">{t('narration')} / {t('dialogue')}</Label>
                                        {isEditing && (
                                            <button
                                                onClick={handleAddNarration}
                                                className="h-7 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg px-2 flex items-center gap-1 transition-all duration-200"
                                            >
                                                <Plus size={10} />
                                                {tCommon('add')}
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {Array.isArray(narration) && narration.length > 0 ? narration.map((item, index) => (
                                            <div key={index} className="flex flex-col gap-2 p-3 bg-gradient-to-br from-white to-blue-50 rounded-xl border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] group">
                                                <div className="flex items-center gap-2">
                                                    {isEditing ? (
                                                        <div className="flex-1 flex gap-2">
                                                            <Select
                                                                value={item.角色}
                                                                onValueChange={(val) => handleUpdateNarration(index, '角色', val)}
                                                            >
                                                                <SelectTrigger className="w-[120px] h-8 bg-gradient-to-br from-white to-blue-50 border border-blue-100 text-xs shadow-[2px_2px_6px_rgba(0,0,0,0.05),-2px_-2px_6px_rgba(255,255,255,0.8)]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)]">
                                                                    <SelectItem value="旁白">{t('narration')}</SelectItem>
                                                                    {availableCharacters.map(char => (
                                                                        <SelectItem key={char.character_id} value={char.name}>
                                                                            <div className="flex items-center gap-2">
                                                                                {char.image_url && (
                                                                                    <div className="w-4 h-4 rounded-full overflow-hidden bg-gradient-to-br from-white to-blue-50 shrink-0 border border-blue-100 shadow-[2px_2px_4px_rgba(0,0,0,0.05),-1px_-1px_3px_rgba(255,255,255,0.8)]">
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
                                                                className="w-full text-sm resize-none bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 rounded-lg p-3 min-h-[40px] flex-1"
                                                                placeholder={t('dialoguePlaceholder')}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 text-sm text-gray-700">
                                                            <span className="font-bold text-blue-600 mr-2">{item.角色}：</span>
                                                            {item.内容}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {!isEditing && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleAddToTrack(item)}
                                                                className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
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
                                            <div className="text-sm text-gray-500 italic p-3 bg-gradient-to-br from-white to-blue-50 rounded-lg border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
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
            <ImagePreview
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                src={shot.image_url}
                alt="Preview"
            />

            {/* End Frame Fullscreen Preview */}
            <ImagePreview
                open={isEndFramePreviewOpen}
                onOpenChange={setIsEndFramePreviewOpen}
                src={(shot.extra_data as any)?.end_frame_image_url}
                alt="End Frame Preview"
            />

            <VideoGenerationDialog
                isOpen={isVideoConfigOpen}
                onClose={() => setIsVideoConfigOpen(false)}
                onConfirm={handleConfirmVideoGeneration}
                shot={shot}
                nextShot={nextShot}
                isGenerating={isGeneratingVideo}
                aspectRatio={aspectRatio}
            />

            <ShotImageHistoryDialog
                isOpen={isImageHistoryOpen}
                onClose={() => setIsImageHistoryOpen(false)}
                shotUuid={shot.uuid || String(shot.shot_id)}
                onSuccess={onSuccess}
            />
        </>
    );
}
