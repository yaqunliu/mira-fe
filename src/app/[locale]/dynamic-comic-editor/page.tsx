'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Timeline } from '@/components/business/timeline';
import { VideoPreview } from '@/components/business/video-preview';
import { AssetManager } from '@/components/business/asset-manager';
import { useTimelineStore } from '@/stores/timeline';
import { TimelineProject, TimelineTrack } from '@/types/timeline';
import { Loader2, ChevronLeft, User, Image as ImageIcon, Film, Music, Type, Map as LucideMap, Save, Sparkles, Pencil, Volume2, PenLine, RotateCcw, Maximize2, WandSparkles, Edit2, FolderOpen, FolderDown, HelpCircle, Download, History, Settings, Plus, Monitor, Smartphone } from 'lucide-react';
import { useTranslations, NextIntlClientProvider } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import creationApi from '@/lib/api/creation';
import characterApi from '@/lib/api/character';
import sceneApi from '@/lib/api/scene';
import shotApi from '@/lib/api/shot';
import taskApi from '@/lib/api/task';
import assetApi from '@/lib/api/asset';
import modelConfigApi from '@/lib/api/model-config';
import { ICreation } from '@/types/creation';
import { ICharacter } from '@/types/character';
import { IAsset } from '@/types/asset';
import { TaskStatus } from '@/types';
import { ensureMetadata, hasTriggeredCharacterAnalysis, createUpdatedMetadata, getStepStatus } from '@/utils/creation-metadata';
import { CustomTabs } from "@/components/ui/custom-tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { CharacterEditModal } from "@/components/modals/character-edit-modal";
import { SceneEditModal } from "@/components/modals/scene-edit-modal";
import { ShotEditModal } from "@/components/modals/shot-edit-modal";
import { VideoGenerationDialog } from "@/components/modals/video-generation-dialog";
import { ExportTriggerDialog } from "@/components/timeline/export-trigger-dialog";
import { ExportPreviewDialog } from "@/components/timeline/export-preview-dialog";
import { ImageHistoryDialog } from "@/components/timeline/image-history-dialog";
import { produce } from 'immer';
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ImagePreview } from "@/components/ui/image-preview";
import { cn, downloadFile } from "@/lib/utils";
// 移除服务器端函数导入，因为不能在客户端组件中使用

// API BASE URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 创建一个简单的消息对象作为 fallback
const fallbackMessages = {
    Editor: {
        initializing: "初始化中...",
        newProject: "新项目",
        analyzingCharacters: "正在分析角色...",
        analysisStarted: "分析已开始",
        analysisCompleted: "分析已完成",
        analysisFailed: "分析失败",
        analyzingScenes: "正在分析场景...",
        sceneAnalysisStarted: "场景分析已开始",
        sceneAnalysisCompleted: "场景分析已完成",
        sceneAnalysisFailed: "场景分析失败",
        regenerating: "重新生成中...",
        regenerationFailed: "重新生成失败",
        generationStarted: "生成已开始",
        sceneImagesGenerated: "场景图片已生成",
        generationFailed: "生成失败",
        analyzingShots: "正在分析分镜...",
        shotAnalysisStarted: "分镜分析已开始",
        shotAnalysisCompleted: "分镜分析已完成",
        shotAnalysisFailed: "分镜分析失败",
        shotImagesGenerated: "分镜图片已生成",
        videoGenerationStarted: "视频生成已开始",
        videoGenerated: "视频已生成",
        videoGenerationFailed: "视频生成失败",
        noShotsWithImages: "没有带图片的分镜",
        batchVideoGenerationStarted: "批量视频生成已开始",
        batchVideoGenerationCompleted: "批量视频生成已完成",
        needImageFirst: "请先生成分镜图片",
        videoAlreadyGenerating: "视频正在生成中",
        failedToFetchTaskData: "获取任务数据失败",
        failedToLoadTask: "加载任务失败",
        importedClips: "已导入片段",
        shots: "分镜",
        createdTracks: "已创建轨道",
        addedAssetsToTracks: "已添加素材到轨道",
        noAssetsAvailable: "没有可用素材",
        pleaseAnalyzeCharacters: "请分析角色",
        analyzeCharactersDescription: "分析角色后可以生成角色图片",
        analyzeCharacters: "分析角色",
        titleUpdated: "标题已更新",
        updateFailed: "更新失败",
        error: "错误",
        generatingDynamicComic: "正在生活动漫...",
        saveSuccess: "保存成功",
        saveFailed: "保存失败",
        modelSettings: "模型设置",
        usageGuide: "使用指南",
        landscape: "横版 (16:9)",
        portrait: "竖版 (9:16)",
        characters: "角色",
        scenes: "场景",
        assets: "素材"
    },
    common: {
        insufficientPoints: "点数不足"
    }
};

export default function DynamicComicEditor() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // 尝试使用 useTranslations，如果失败则使用 fallback
    let t: (key: string, options?: any) => string;
    let tC: (key: string, options?: any) => string;
    
    try {
        t = useTranslations('Editor');
        tC = useTranslations('common');
    } catch (error) {
        // 如果无法获取上下文，使用 fallback
        t = (key: string) => (fallbackMessages.Editor as any)[key] || key;
        tC = (key: string) => (fallbackMessages.common as any)[key] || key;
    }
    const taskId = searchParams.get('taskId');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState(t('initializing'));
    const [progress, setProgress] = useState(0);
    const [projectTitle, setProjectTitle] = useState(t('newProject'));
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [creation, setCreation] = useState<ICreation | null>(null);
    const [activeTab, setActiveTab] = useState("characters");
    const [videoModel, setVideoModel] = useState<string>("");
    const [textToImageModel, setTextToImageModel] = useState<string>("");
    const [imageToImageModel, setImageToImageModel] = useState<string>("");
    const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
    const [visualStyle, setVisualStyle] = useState<string>("anime");

    // Fetch model configs
    const { data: modelConfigsData } = useQuery({
        queryKey: ["modelConfigs"],
        queryFn: () => modelConfigApi.getAllModels(),
    });

    const modelConfigs = modelConfigsData?.data || {
        video: [],
        text_to_image: [],
        image_to_image: [],
    };
    const videoModels = modelConfigs?.video || [];
    const textToImageModels = modelConfigs?.text_to_image || [];
    const imageToImageModels = modelConfigs?.image_to_image || [];

    // Asset Management State
    const [assets, setAssets] = useState<IAsset[]>([]);

    // Save State
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

    // Character Management State
    const [regeneratingCharacters, setRegeneratingCharacters] = useState<Map<string, string>>(new Map());
    const [editingCharacter, setEditingCharacter] = useState<ICharacter | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Scene Management State
    const [isAnalyzingScenes, setIsAnalyzingScenes] = useState(false);
    const [isGeneratingSceneImages, setIsGeneratingSceneImages] = useState(false);
    const [regeneratingScenes, setRegeneratingScenes] = useState<Map<string, string>>(new Map());
    const [editingScene, setEditingScene] = useState<any | null>(null);

    // Shot Management State
    const [isAnalyzingShots, setIsAnalyzingShots] = useState(false);
    const [isGeneratingShotImages, setIsGeneratingShotImages] = useState(false);
    const [regeneratingShots, setRegeneratingShots] = useState<Map<string, { taskId: string; frameType: 'start' | 'end' | 'both' }>>(new Map());
    const [editingShot, setEditingShot] = useState<any | null>(null);

    // Video Generation State
    const [isGeneratingAllVideos, setIsGeneratingAllVideos] = useState(false);
    const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
    const [selectedShotForVideo, setSelectedShotForVideo] = useState<any | null>(null);
    const [isGeneratingSingleVideo, setIsGeneratingSingleVideo] = useState(false);
    const [videoConfigDialog, setVideoConfigDialog] = useState<{
        isOpen: boolean;
        shot: any | null;
        nextShot: any | null;
        isRegenerate: boolean;
    }>({
        isOpen: false,
        shot: null,
        nextShot: null,
        isRegenerate: false
    });
    const [videoGenerationProgress, setVideoGenerationProgress] = useState({
        total: 0,
        completed: 0,
        success: 0,
        failed: 0
    });

    // Image Preview State
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Export Dialog State
    const [showExportTriggerDialog, setShowExportTriggerDialog] = useState(false);
    const [showExportPreviewDialog, setShowExportPreviewDialog] = useState(false);
    const [showImageHistoryDialog, setShowImageHistoryDialog] = useState(false);
    const [showModelSettings, setShowModelSettings] = useState(false);
    const [showTimeline, setShowTimeline] = useState(true);
    const [exportProgress, setExportProgress] = useState<{
        percent: number;
        status: string;
    } | null>(null);

    // Usage Guide Dialog State
    const [showUsageGuide, setShowUsageGuide] = useState(false);

    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: "",
        description: "",
        onConfirm: () => { },
        variant: 'default' as 'default' | 'destructive'
    });

    // Initialize models
    useEffect(() => {
        // 优先从 creation 获取已保存的模型
        const extraData = creation?.extra_data as any || {};
        const savedVideoModel = extraData?.video_model;
        const savedTextToImageModel = extraData?.text_to_image_model;
        const savedImageToImageModel = extraData?.image_to_image_model;
        const savedAspectRatio = extraData?.aspect_ratio;
        const savedVisualStyle = extraData?.visual_style;

        // Aspect Ratio
        if (savedAspectRatio && savedAspectRatio !== aspectRatio) {
            setAspectRatio(savedAspectRatio as "16:9" | "9:16");
        }

        // Visual Style
        if (savedVisualStyle && savedVisualStyle !== visualStyle) {
            setVisualStyle(savedVisualStyle);
        }

        // Video Model
        if (savedVideoModel && !videoModel) {
            setVideoModel(savedVideoModel);
        } else if (videoModels.length > 0 && !videoModel) {
            const defaultVideo = videoModels.find((m: any) => m.is_default) || videoModels[0];
            setVideoModel(defaultVideo.model_name);
        }

        // Text to Image Model
        if (savedTextToImageModel && !textToImageModel) {
            setTextToImageModel(savedTextToImageModel);
        } else if (textToImageModels.length > 0 && !textToImageModel) {
            const defaultModel = textToImageModels.find((m: any) => m.is_default) || textToImageModels[0];
            setTextToImageModel(defaultModel.model_name);
        }

        // Image to Image Model
        if (savedImageToImageModel && !imageToImageModel) {
            setImageToImageModel(savedImageToImageModel);
        } else if (imageToImageModels.length > 0 && !imageToImageModel) {
            const defaultModel = imageToImageModels.find((m: any) => m.is_default) || imageToImageModels[0];
            setImageToImageModel(defaultModel.model_name);
        }
    }, [videoModels, textToImageModels, imageToImageModels, videoModel, textToImageModel, imageToImageModel, creation?.extra_data]);

    const handleModelChange = async (type: 'video' | 'text_to_image' | 'image_to_image', newModel: string) => {
        if (type === 'video') setVideoModel(newModel);
        if (type === 'text_to_image') setTextToImageModel(newModel);
        if (type === 'image_to_image') setImageToImageModel(newModel);

        if (creation?.uuid) {
            try {
                const updatedExtraData = {
                    ...(creation.extra_data || {}),
                    [`${type}_model`]: newModel
                };
                // Special case for consistency with existing keys
                if (type === 'text_to_image') updatedExtraData.text_to_image_model = newModel;
                if (type === 'image_to_image') updatedExtraData.image_to_image_model = newModel;
                if (type === 'video') updatedExtraData.video_model = newModel;

                await creationApi.updateCreation(creation.uuid, {
                    extra_data: updatedExtraData
                });
                // 更新本地 creation 状态，防止重新初始化覆盖
                setCreation({
                    ...creation,
                    extra_data: updatedExtraData
                });
                toast.success("模型配置已更新");
            } catch (error) {
                console.error("Failed to update model:", error);
                toast.error("更新模型配置失败");
            }
        }
    };

    const handleStyleChange = async (newStyle: string) => {
        setVisualStyle(newStyle);
        if (creation?.uuid) {
            try {
                const updatedExtraData = {
                    ...(creation.extra_data || {}),
                    visual_style: newStyle
                };

                await creationApi.updateCreation(creation.uuid, {
                    extra_data: updatedExtraData
                });
                // 更新本地 creation 状态，防止重新初始化覆盖
                setCreation({
                    ...creation,
                    extra_data: updatedExtraData
                });
                toast.success("风格配置已更新");
            } catch (error) {
                console.error("Failed to update style:", error);
                toast.error("更新风格配置失败");
            }
        }
    };

    const handleAspectRatioChange = async (newRatio: "16:9" | "9:16") => {
        setAspectRatio(newRatio);
        if (creation?.uuid) {
            try {
                const updatedExtraData = {
                    ...(creation.extra_data || {}),
                    aspect_ratio: newRatio
                };
                await creationApi.updateCreation(creation.uuid, {
                    extra_data: updatedExtraData
                });
                setCreation({
                    ...creation,
                    extra_data: updatedExtraData
                });
                toast.success("创作比例已更新");
            } catch (error) {
                console.error("Failed to update aspect ratio:", error);
                toast.error("更新创作比例失败");
            }
        }
    };

    const { importProject, project, addClip, currentTime, addTrack } = useTimelineStore();
    const tracks = project.tracks;

    // 自动获取媒体时长并更新时间轴
    const updateClipDuration = (clipId: string, url: string) => {
        const isAudio = url.match(/\.(mp3|wav|ogg|m4a)$/i);
        const element = document.createElement(isAudio ? 'audio' : 'video');
        element.src = url;

        element.onloadedmetadata = () => {
            const duration = element.duration;
            console.log(`[Media Duration] ${url}: ${duration}s`);

            const state = useTimelineStore.getState();
            const newProject = produce(state.project, draft => {
                let targetTrackType: 'video' | 'audio' = isAudio ? 'audio' : 'video';
                let clipFound = false;

                draft.tracks.forEach(track => {
                    const clipIndex = track.clips.findIndex(c => c.id === clipId);
                    if (clipIndex !== -1) {
                        clipFound = true;
                        // 更新当前片段时长
                        track.clips[clipIndex].duration = duration;
                        track.clips[clipIndex].sourceEnd = duration;

                        // 重新计算该轨道后续所有片段的开始时间，确保紧密排列
                        let timePointer = 0;
                        track.clips.forEach(clip => {
                            clip.startInTimeline = timePointer;
                            timePointer += clip.duration;
                        });
                    }
                });

                if (clipFound) {
                    // 关键对齐逻辑：如果视频和音频是一一对应的（索引相同），强制让它们对齐
                    const videoTrack = draft.tracks.find(t => t.id === 'track-video-main');
                    const audioTrack = draft.tracks.find(t => t.id === 'track-audio-main');

                    if (videoTrack && audioTrack) {
                        const clipCount = Math.min(videoTrack.clips.length, audioTrack.clips.length);
                        let timePointer = 0;
                        for (let i = 0; i < clipCount; i++) {
                            const vClip = videoTrack.clips[i];
                            const aClip = audioTrack.clips[i];

                            // 以视频时长为基准进行强制对齐
                            const maxClipDuration = Math.max(vClip.duration, aClip.duration);

                            vClip.startInTimeline = timePointer;
                            vClip.duration = maxClipDuration;
                            vClip.sourceEnd = maxClipDuration;

                            aClip.startInTimeline = timePointer;
                            aClip.duration = maxClipDuration;
                            aClip.sourceEnd = maxClipDuration;

                            timePointer += maxClipDuration;
                        }
                    }
                }

                // 更新项目总时长
                let maxDuration = 30;
                draft.tracks.forEach(track => {
                    const lastClip = track.clips[track.clips.length - 1];
                    if (lastClip) {
                        maxDuration = Math.max(maxDuration, lastClip.startInTimeline + lastClip.duration);
                    }
                });
                draft.duration = maxDuration;
            });

            state.importProject(newProject);
        };
    };

    const handleTitleSave = async () => {
        if (!creation || !projectTitle.trim()) return;
        try {
            await creationApi.updateCreation(creation.uuid, { title: projectTitle });
            setCreation({ ...creation, title: projectTitle });
            setIsEditingTitle(false);
            toast.success(t('titleUpdated') || "标题已更新");
        } catch (error) {
            console.error("Failed to update title:", error);
            toast.error(t('updateFailed') || "更新失败");
        }
    };

    // Asset Management Functions
    const loadAssets = async (novelId: number | string) => {
        try {
            const res = await assetApi.getAssets(Number(novelId));
            if (res.success && res.data) {
                setAssets(res.data);
            }
        } catch (error) {
            console.error('Failed to load assets:', error);
        }
    };

    const handleAssetsChange = () => {
        if (creation?.novel_id) {
            loadAssets(creation.novel_id);
        }
    };

    const handleAnalyzeCharacters = async (currentCreation: ICreation) => {
        if (!currentCreation) return;

        try {
            toast.info(t('analyzingCharacters'));

            // 1. Update local metadata state to 'processing'
            const newMetadata = createUpdatedMetadata(currentCreation, 'characterAnalysis', {
                triggered: true,
                status: 'processing'
            });

            // 2. Persist metadata update
            await creationApi.updateCreation(currentCreation.uuid, {
                extra_data: newMetadata as any
            });

            // Update local state
            setCreation({ ...currentCreation, extra_data: newMetadata as any });

            // 3. Call actual API
            const res = await creationApi.analyzeCharacters(currentCreation.uuid);

            if (res && res.data && res.data.task_id) {
                const taskId = res.data.task_id;
                // Update with task_id
                const taskMetadata = createUpdatedMetadata({ ...currentCreation, extra_data: newMetadata as any }, 'characterAnalysis', {
                    taskId: taskId,
                    status: 'processing'
                });
                await creationApi.updateCreation(currentCreation.uuid, {
                    extra_data: taskMetadata as any
                });
                setCreation({ ...currentCreation, extra_data: taskMetadata as any });
                toast.success(t('analysisStarted'));

                // Start Polling
                pollAnalysisTask(taskId, currentCreation.uuid);
            }

        } catch (error) {
            console.error("Failed to start analysis", error);
            toast.error(t('error'));
            // Revert or set to failed
            const failedMetadata = createUpdatedMetadata(currentCreation, 'characterAnalysis', {
                status: 'failed',
                error: 'Failed to start'
            });
            setCreation({ ...currentCreation, extra_data: failedMetadata as any });
        }
    };

    const pollAnalysisTask = async (taskId: string, creationUuid: string) => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`);
                const data = await response.json();

                if (data.success) {
                    const status = data.data.status;
                    if (status === 'SUCCESS') {
                        toast.success(t('analysisCompleted'));
                        // Reload creation to get characters
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            setCreation(creationRes.data);
                            // Update metadata to success
                            const completedMetadata = createUpdatedMetadata(creationRes.data, 'characterAnalysis', {
                                status: 'success'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: completedMetadata as any
                            });
                        }
                    } else if (status === 'FAILURE' || status === 'REVOKED') {
                        toast.error(t('analysisFailed'));
                        // Reload to get latest state
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            const failedMetadata = createUpdatedMetadata(creationRes.data, 'characterAnalysis', {
                                status: 'failed',
                                error: data.data.message || 'Task failed'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: failedMetadata as any
                            });
                            setCreation({ ...creationRes.data, extra_data: failedMetadata as any });
                        }
                    } else {
                        // Continue polling
                        setTimeout(checkStatus, 2000);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        };
        checkStatus();
    };

    const handleAnalyzeScenes = async () => {
        if (!creation) return;

        try {
            setIsAnalyzingScenes(true);
            toast.info(t('analyzingScenes'));

            // 1. Update local metadata state to 'processing'
            const newMetadata = createUpdatedMetadata(creation, 'sceneAnalysis', {
                triggered: true,
                status: 'processing'
            });

            // 2. Persist metadata update
            await creationApi.updateCreation(creation.uuid, {
                extra_data: newMetadata as any
            });

            // Update local state
            setCreation({ ...creation, extra_data: newMetadata as any });

            const res = await creationApi.generatePlaybook(creation.uuid, "original");

            if (res && res.data && res.data.task_id) {
                const taskId = res.data.task_id;
                // Update with task_id
                const taskMetadata = createUpdatedMetadata({ ...creation, extra_data: newMetadata as any }, 'sceneAnalysis', {
                    taskId: taskId,
                    status: 'processing'
                });
                await creationApi.updateCreation(creation.uuid, {
                    extra_data: taskMetadata as any
                });
                setCreation(prev => prev ? { ...prev, extra_data: taskMetadata as any } : null);

                toast.success(t('sceneAnalysisStarted'));
                pollPlaybookTask(taskId, creation.uuid);
            }
        } catch (error: any) {
            console.error("Failed to start scene analysis", error);
            toast.error(error.message || t('error'));
            setIsAnalyzingScenes(false);
            // Set to failed
            const failedMetadata = createUpdatedMetadata(creation, 'sceneAnalysis', {
                status: 'failed',
                error: error.message || 'Failed to start'
            });
            setCreation(prev => prev ? { ...prev, extra_data: failedMetadata as any } : null);
        }
    };

    const pollPlaybookTask = async (taskId: string, creationUuid: string) => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`);
                const data = await response.json();

                if (data.success) {
                    const status = data.data.status;
                    if (status === 'SUCCESS') {
                        toast.success(t('sceneAnalysisCompleted'));
                        setIsAnalyzingScenes(false);
                        // Reload creation
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            // Update metadata to success
                            const completedMetadata = createUpdatedMetadata(creationRes.data, 'sceneAnalysis', {
                                status: 'success'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: completedMetadata as any
                            });
                            setCreation({ ...creationRes.data, extra_data: completedMetadata as any });
                        }
                    } else if (status === 'FAILURE' || status === 'REVOKED') {
                        toast.error(t('sceneAnalysisFailed'));
                        setIsAnalyzingScenes(false);
                        // Reload to get latest state
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            const failedMetadata = createUpdatedMetadata(creationRes.data, 'sceneAnalysis', {
                                status: 'failed',
                                error: data.data.message || 'Task failed'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: failedMetadata as any
                            });
                            setCreation({ ...creationRes.data, extra_data: failedMetadata as any });
                        }
                    } else {
                        // Continue polling
                        setTimeout(checkStatus, 2000);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
                setIsAnalyzingScenes(false);
            }
        };
        checkStatus();
    };

    const handleRegenerateSceneImage = async (sceneId: string) => {
        if (!sceneId) return;

        try {
            const res = await sceneApi.regenerateSceneImage(sceneId);
            if (res.data && res.data.task_id) {
                setRegeneratingScenes(prev => {
                    const newMap = new Map(prev);
                    newMap.set(sceneId, res.data.task_id);
                    return newMap;
                });
                toast.success(t('regenerating'));
            }
        } catch (error: any) {
            toast.error(error.message || t('regenerationFailed'));
        }
    };

    const handleSceneUpdateSuccess = async () => {
        if (creation?.uuid) {
            const res = await creationApi.queryCreationById(creation.uuid);
            if (res && res.data) {
                setCreation(res.data);
            }
        }
    };

    const handleGenerateSceneImages = async () => {
        if (!creation?.uuid) return;
        setIsGeneratingSceneImages(true);

        try {
            // 1. Update local metadata state to 'processing'
            const newMetadata = createUpdatedMetadata(creation, 'sceneImageGeneration', {
                triggered: true,
                status: 'processing'
            });

            // 2. Persist metadata update
            await creationApi.updateCreation(creation.uuid, {
                extra_data: newMetadata as any
            });

            // Update local state
            setCreation({ ...creation, extra_data: newMetadata as any });

            // forceRegenerate = false, only generate missing images
            const res = await creationApi.generateSceneImages(creation.uuid, false);
            if (res && res.data && res.data.task_id) {
                const taskId = res.data.task_id;
                // Update with task_id
                const taskMetadata = createUpdatedMetadata({ ...creation, extra_data: newMetadata as any }, 'sceneImageGeneration', {
                    taskId: taskId,
                    status: 'processing'
                });
                await creationApi.updateCreation(creation.uuid, {
                    extra_data: taskMetadata as any
                });
                setCreation(prev => prev ? { ...prev, extra_data: taskMetadata as any } : null);

                toast.success(t('generationStarted'));
                pollSceneImageTask(taskId, creation.uuid);
            } else {
                setIsGeneratingSceneImages(false);
            }
        } catch (error: any) {
            console.error("Failed to start scene image generation", error);
            toast.error(error.message || t('error'));
            setIsGeneratingSceneImages(false);
            // Set to failed
            const failedMetadata = createUpdatedMetadata(creation, 'sceneImageGeneration', {
                status: 'failed',
                error: error.message || 'Failed to start'
            });
            setCreation(prev => prev ? { ...prev, extra_data: failedMetadata as any } : null);
        }
    };

    const pollSceneImageTask = async (taskId: string, creationUuid: string) => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`);
                const data = await response.json();

                if (data.success) {
                    const status = data.data.status;
                    if (status === 'SUCCESS') {
                        toast.success(t('sceneImagesGenerated') || "Scene images generated");
                        setIsGeneratingSceneImages(false);
                        // Reload creation
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            // Update metadata to success
                            const completedMetadata = createUpdatedMetadata(creationRes.data, 'sceneImageGeneration', {
                                status: 'success'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: completedMetadata as any
                            });
                            setCreation({ ...creationRes.data, extra_data: completedMetadata as any });
                        }
                    } else if (status === 'FAILURE' || status === 'REVOKED') {
                        toast.error(t('generationFailed'));
                        setIsGeneratingSceneImages(false);
                        // Reload to get latest state
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            const failedMetadata = createUpdatedMetadata(creationRes.data, 'sceneImageGeneration', {
                                status: 'failed',
                                error: data.data.message || 'Task failed'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: failedMetadata as any
                            });
                            setCreation({ ...creationRes.data, extra_data: failedMetadata as any });
                        }
                    } else {
                        // Continue polling
                        setTimeout(checkStatus, 3000);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
                setIsGeneratingSceneImages(false);
            }
        };
        checkStatus();
    };

    // Shot Logic
    const handleAnalyzeShots = async () => {
        if (!creation) return;

        try {
            setIsAnalyzingShots(true);
            toast.info(t('analyzingShots') || "Analyzing Shots...");

            // 1. Update local metadata state to 'processing'
            const newMetadata = createUpdatedMetadata(creation, 'shotAnalysis', {
                triggered: true,
                status: 'processing'
            });

            // 2. Persist metadata update
            await creationApi.updateCreation(creation.uuid, {
                extra_data: newMetadata as any
            });

            // Update local state
            setCreation({ ...creation, extra_data: newMetadata as any });

            const res = await creationApi.analyzeShots(creation.uuid);

            if (res && res.data && res.data.task_id) {
                const taskId = res.data.task_id;
                // Update with task_id
                const taskMetadata = createUpdatedMetadata({ ...creation, extra_data: newMetadata as any }, 'shotAnalysis', {
                    taskId: taskId,
                    status: 'processing'
                });
                await creationApi.updateCreation(creation.uuid, {
                    extra_data: taskMetadata as any
                });
                setCreation(prev => prev ? { ...prev, extra_data: taskMetadata as any } : null);

                toast.success(t('shotAnalysisStarted'));
                pollShotAnalysisTask(taskId, creation.uuid);
            }
        } catch (error: any) {
            console.error("Failed to start shot analysis", error);
            toast.error(error.message || t('error'));
            setIsAnalyzingShots(false);
            // Set to failed
            const failedMetadata = createUpdatedMetadata(creation, 'shotAnalysis', {
                status: 'failed',
                error: error.message || 'Failed to start'
            });
            setCreation(prev => prev ? { ...prev, extra_data: failedMetadata as any } : null);
        }
    };

    const pollShotAnalysisTask = async (taskId: string, creationUuid: string) => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`);
                const data = await response.json();

                if (data.success) {
                    const status = data.data.status;
                    if (status === 'SUCCESS') {
                        toast.success(t('shotAnalysisCompleted') || "Shot Analysis Completed");
                        setIsAnalyzingShots(false);
                        // Reload creation
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            // Update metadata to success
                            const completedMetadata = createUpdatedMetadata(creationRes.data, 'shotAnalysis', {
                                status: 'success'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: completedMetadata as any
                            });
                            setCreation({ ...creationRes.data, extra_data: completedMetadata as any });
                        }
                    } else if (status === 'FAILURE' || status === 'REVOKED') {
                        toast.error(t('shotAnalysisFailed') || "Shot Analysis Failed");
                        setIsAnalyzingShots(false);
                        // Reload to get latest state
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            const failedMetadata = createUpdatedMetadata(creationRes.data, 'shotAnalysis', {
                                status: 'failed',
                                error: data.data.message || 'Task failed'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: failedMetadata as any
                            });
                            setCreation({ ...creationRes.data, extra_data: failedMetadata as any });
                        }
                    } else {
                        setTimeout(checkStatus, 2000);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
                setIsAnalyzingShots(false);
            }
        };
        checkStatus();
    };

    const handleGenerateShotImages = async () => {
        if (!creation?.uuid) return;
        setIsGeneratingShotImages(true);

        try {
            // 1. Update local metadata state to 'processing'
            const newMetadata = createUpdatedMetadata(creation, 'shotImageGeneration', {
                triggered: true,
                status: 'processing'
            });

            // 2. Persist metadata update
            await creationApi.updateCreation(creation.uuid, {
                extra_data: newMetadata as any
            });

            // Update local state
            setCreation({ ...creation, extra_data: newMetadata as any });

            // forceRegenerate = false
            const res = await creationApi.generateShots(creation.uuid, false);
            if (res && res.data && res.data.task_id) {
                const taskId = res.data.task_id;
                // Update with task_id
                const taskMetadata = createUpdatedMetadata({ ...creation, extra_data: newMetadata as any }, 'shotImageGeneration', {
                    taskId: taskId,
                    status: 'processing'
                });
                await creationApi.updateCreation(creation.uuid, {
                    extra_data: taskMetadata as any
                });
                setCreation(prev => prev ? { ...prev, extra_data: taskMetadata as any } : null);

                toast.success(t('generationStarted'));
                pollShotImageTask(taskId, creation.uuid);
            } else {
                setIsGeneratingShotImages(false);
            }
        } catch (error: any) {
            console.error("Failed to start shot image generation", error);
            toast.error(error.message || t('error'));
            setIsGeneratingShotImages(false);
            // Set to failed
            const failedMetadata = createUpdatedMetadata(creation, 'shotImageGeneration', {
                status: 'failed',
                error: error.message || 'Failed to start'
            });
            setCreation(prev => prev ? { ...prev, extra_data: failedMetadata as any } : null);
        }
    };

    const pollShotImageTask = async (taskId: string, creationUuid: string) => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`);
                const data = await response.json();

                if (data.success) {
                    const status = data.data.status;
                    if (status === 'SUCCESS') {
                        toast.success(t('shotImagesGenerated'));
                        setIsGeneratingShotImages(false);
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            // Update metadata to success
                            const completedMetadata = createUpdatedMetadata(creationRes.data, 'shotImageGeneration', {
                                status: 'success'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: completedMetadata as any
                            });
                            setCreation({ ...creationRes.data, extra_data: completedMetadata as any });
                        }
                    } else if (status === 'FAILURE' || status === 'REVOKED') {
                        toast.error(t('generationFailed'));
                        setIsGeneratingShotImages(false);
                        // Reload to get latest state
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            const failedMetadata = createUpdatedMetadata(creationRes.data, 'shotImageGeneration', {
                                status: 'failed',
                                error: data.data.message || 'Task failed'
                            });
                            await creationApi.updateCreation(creationUuid, {
                                extra_data: failedMetadata as any
                            });
                            setCreation({ ...creationRes.data, extra_data: failedMetadata as any });
                        }
                    } else {
                        setTimeout(checkStatus, 3000);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
                setIsGeneratingShotImages(false);
            }
        };
        checkStatus();
    };

    const handleRegenerateShotImage = async (shotUuid: string, imagePrompt?: string, frameType?: 'start' | 'end' | 'both') => {
        if (!shotUuid) return;

        try {
            const res = await shotApi.regenerateShotImage(shotUuid, imagePrompt, undefined, frameType);
            if (res.data && res.data.task_id) {
                setRegeneratingShots(prev => {
                    const newMap = new Map(prev);
                    newMap.set(shotUuid, { taskId: res.data.task_id, frameType: frameType || 'both' });
                    return newMap;
                });
                toast.success(t('regenerating'));
            }
        } catch (error: any) {
            toast.error(error.message || t('regenerationFailed'));
        }
    };

    // Video Generation Handlers
    const handleGenerateAllVideos = async () => {
        if (!creation) return;

        if (!creation.uuid) {
            console.error('Creation UUID is missing:', creation);
            toast.error('创作项目UUID缺失，无法生成视频');
            return;
        }

        // Count shots with images
        let shotsWithImages = 0;
        creation.scenes.forEach((scene: any) => {
            scene.shots?.forEach((shot: any) => {
                if (shot.image_url) shotsWithImages++;
            });
        });

        if (shotsWithImages === 0) {
            toast.warning(t('noShotsWithImages'));
            return;
        }

        setIsGeneratingAllVideos(true);
        setVideoGenerationProgress({
            total: shotsWithImages,
            completed: 0,
            success: 0,
            failed: 0
        });

        try {
            const response = await creationApi.generateAllVideos(creation.uuid);
            toast.success(t('batchVideoGenerationStarted'));

            // Start polling batch video generation
            pollBatchVideoGeneration(response.data.task_id);
        } catch (error: any) {
            console.error('Failed to start batch video generation:', error);
            if (error.response?.status === 402) {
                toast.error(tC('insufficientPoints'));
            } else {
                toast.error(t('failedToStartBatchGeneration'));
            }
            setIsGeneratingAllVideos(false);
        }
    };

    // Check if video is currently generating and within 1 hour
    const isVideoGenerating = (shot: any): boolean => {
        console.log('🔍 isVideoGenerating called for shot:', {
            shot_id: shot.shot_id,
            has_status_detail: !!shot.status_detail,
            status_detail: shot.status_detail,
            video_status: shot.status_detail?.video_status,
            video_updated_at: shot.status_detail?.video_updated_at
        });

        if (!shot.status_detail?.video_status) {
            console.log('❌ No status_detail or video_status, returning false');
            return false;
        }
        if (shot.status_detail.video_status !== 'generating') {
            console.log(`❌ video_status is '${shot.status_detail.video_status}', not 'generating', returning false`);
            return false;
        }

        // Check if under 1 hour
        if (!shot.status_detail.video_updated_at) {
            // 没有更新时间但状态是generating，仍然认为在生成中
            console.log('✅ Video generating without timestamp, returning true');
            return true;
        }

        try {
            // 后端返回的时间可能没有时区信息，需要补充 'Z' 表示 UTC 时间
            let timeStr = shot.status_detail.video_updated_at;
            // 如果时间字符串没有时区信息（不包含 'Z' 或 '+' 或 '-'），添加 'Z'
            if (!timeStr.includes('Z') && !timeStr.includes('+') && !timeStr.match(/-\d{2}:\d{2}$/)) {
                timeStr = timeStr + 'Z';
            }

            const updatedAt = new Date(timeStr);
            const now = new Date();
            const updatedAtTime = updatedAt.getTime();
            const nowTime = now.getTime();
            const diffMs = nowTime - updatedAtTime;
            const hoursSince = diffMs / (1000 * 60 * 60);

            const isGenerating = hoursSince < 1;
            console.log('⏰ Time check:', {
                shot_id: shot.shot_id,
                updated_at_string: shot.status_detail.video_updated_at,
                updated_at_parsed: timeStr,
                updated_at_date: updatedAt.toISOString(),
                now: now.toISOString(),
                updated_at_ms: updatedAtTime,
                now_ms: nowTime,
                diff_ms: diffMs,
                hours_since: hoursSince.toFixed(2),
                is_generating: isGenerating,
                check: `${hoursSince.toFixed(2)} < 1 = ${isGenerating}`
            });

            return isGenerating;
        } catch (error) {
            console.error('Error in isVideoGenerating:', error);
            // 如果解析失败，但状态是generating，保守地认为还在生成
            console.log('✅ Error parsing time, but status is generating, returning true');
            return true;
        }
    };

    const handleGenerateShotVideo = async (shot: any) => {
        if (!shot.image_url) {
            toast.warning(t('needImageFirst'));
            return;
        }

        // Check if video is already generating
        if (isVideoGenerating(shot)) {
            toast.warning(t('videoAlreadyGenerating'));
            return;
        }

        // Find next shot for tail frame selection
        let nextShot: any = null;
        if (creation?.scenes) {
            let foundCurrent = false;
            for (const scene of creation.scenes) {
                if (scene.shots) {
                    for (const s of scene.shots) {
                        if (foundCurrent) {
                            nextShot = s;
                            break;
                        }
                        if (s.shot_id === shot.shot_id || s.uuid === shot.uuid) {
                            foundCurrent = true;
                        }
                    }
                }
                if (nextShot) break;
            }
        }

        setVideoConfigDialog({
            isOpen: true,
            shot,
            nextShot,
            isRegenerate: !!shot.video_url
        });
    };

    const handleConfirmVideoGeneration = async (data: { lastFrameImageUrl?: string }) => {
        const { shot, isRegenerate } = videoConfigDialog;
        if (!shot) return;

        setIsGeneratingSingleVideo(true);
        try {
            const shotUuid = shot.uuid || String(shot.shot_id);
            if (isRegenerate) {
                await shotApi.regenerateShotVideo(shotUuid, videoModel, data.lastFrameImageUrl);
            } else {
                await shotApi.generateShotVideo(shotUuid, videoModel, data.lastFrameImageUrl);
            }

            toast.success(t('videoGenerationStarted'));
            setVideoConfigDialog({ ...videoConfigDialog, isOpen: false });

            // Immediately refresh to show generating status
            if (creation?.uuid) {
                const res = await creationApi.queryCreationById(creation.uuid);
                if (res && res.data) {
                    setCreation(res.data);
                }
            }

            // Start polling for video generation status
            pollSingleVideoGeneration(shot.shot_id || shot.uuid);
        } catch (error: any) {
            console.error('Failed to generate video:', error);
            if (error.response?.status === 402) {
                toast.error(tC('insufficientPoints'));
            } else {
                toast.error(t('failedToGenerateVideo'));
            }
        } finally {
            setIsGeneratingSingleVideo(false);
        }
    };

    const pollSingleVideoGeneration = (shotIdentifier: string | number) => {
        const pollInterval = setInterval(async () => {
            try {
                // Refresh creation data to get updated shot status
                if (creation?.uuid) {
                    const res = await creationApi.queryCreationById(creation.uuid);
                    if (res && res.data) {
                        setCreation(res.data);

                        // Find the shot being generated
                        let targetShot: any = null;
                        for (const scene of res.data.scenes) {
                            for (const shot of scene.shots) {
                                if (shot.shot_id === shotIdentifier || shot.uuid === shotIdentifier) {
                                    targetShot = shot;
                                    break;
                                }
                            }
                            if (targetShot) break;
                        }

                        // Check if generation is complete or failed
                        if (targetShot) {
                            const videoStatus = targetShot.status_detail?.video_status;

                            if (videoStatus === 'completed' || targetShot.video_url) {
                                clearInterval(pollInterval);
                                toast.success(t('videoGenerated'));
                            } else if (videoStatus === 'failed') {
                                clearInterval(pollInterval);
                                toast.error(t('videoGenerationFailed'));
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to poll video generation status:', error);
            }
        }, 5000); // Poll every 5 seconds

        // 30 minutes timeout
        setTimeout(() => {
            clearInterval(pollInterval);
        }, 1800000);
    };

    const pollBatchVideoGeneration = (taskId: string) => {
        const pollInterval = setInterval(async () => {
            try {
                // Refresh creation data
                if (creation?.uuid) {
                    const res = await creationApi.queryCreationById(creation.uuid);
                    if (res && res.data) {
                        setCreation(res.data);

                        // Count progress
                        let completed = 0;
                        let success = 0;
                        let failed = 0;

                        res.data.scenes.forEach((scene: any) => {
                            scene.shots?.forEach((shot: any) => {
                                if (shot.image_url) {
                                    if (shot.video_url) {
                                        completed++;
                                        success++;
                                    } else if (getVideoGenerationStatus(shot) === 'failed') {
                                        completed++;
                                        failed++;
                                    }
                                }
                            });
                        });

                        setVideoGenerationProgress(prev => ({
                            ...prev,
                            completed,
                            success,
                            failed
                        }));

                        // Check if all completed
                        if (completed >= videoGenerationProgress.total) {
                            clearInterval(pollInterval);
                            setIsGeneratingAllVideos(false);
                            toast.success(t('batchVideoGenerationCompleted', { success, failed }));
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to poll batch generation:', error);
            }
        }, 5000);

        // 1 hour timeout
        setTimeout(() => {
            clearInterval(pollInterval);
            setIsGeneratingAllVideos(false);
        }, 3600000);
    };

    const getVideoGenerationStatus = (shot: any): 'idle' | 'generating' | 'completed' | 'failed' => {
        // 首先检查是否已有视频
        if (shot.video_url) return 'completed';

        // 检查 status_detail 中的 video_status
        if (shot.status_detail?.video_status === 'generating') {
            // 检查是否在1小时内
            if (shot.status_detail.video_updated_at) {
                try {
                    // 后端返回的时间可能没有时区信息，需要补充 'Z' 表示 UTC 时间
                    let timeStr = shot.status_detail.video_updated_at;
                    // 如果时间字符串没有时区信息（不包含 'Z' 或 '+' 或 '-'），添加 'Z'
                    if (!timeStr.includes('Z') && !timeStr.includes('+') && !timeStr.match(/-\d{2}:\d{2}$/)) {
                        timeStr = timeStr + 'Z';
                    }

                    const updatedAt = new Date(timeStr);
                    const now = new Date();
                    const hoursSince = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

                    // 调试日志
                    console.log('📹 Video generation status check:', {
                        shot_id: shot.shot_id,
                        video_status: shot.status_detail.video_status,
                        updated_at_original: shot.status_detail.video_updated_at,
                        updated_at_parsed: timeStr,
                        updated_at_date: updatedAt.toISOString(),
                        now: now.toISOString(),
                        hours_since: hoursSince.toFixed(2),
                        result: hoursSince < 1 ? 'generating ✅' : 'failed (timeout) ❌'
                    });

                    if (hoursSince < 1) {
                        return 'generating';
                    } else {
                        // 超过1小时，认为失败
                        return 'failed';
                    }
                } catch (error) {
                    console.error('Error parsing video_updated_at:', error);
                    // 如果时间解析失败，仍然返回generating
                    return 'generating';
                }
            }
            // 没有更新时间，但状态是generating，仍然返回generating
            return 'generating';
        }

        // 检查是否已标记为failed
        if (shot.status_detail?.video_status === 'failed') return 'failed';

        // 兼容性检查：旧的 extra_data 格式
        const extraData = shot.extra_data as any;
        if (extraData?.video_generation_status === 'generating') return 'generating';
        if (extraData?.video_generation_status === 'failed') return 'failed';

        return 'idle';
    };

    const handleImportAllToTimeline = () => {
        if (!creation) return;

        // 收集所有有视频的shots并按shot_number排序
        const shotsWithVideo: any[] = [];
        creation.scenes.forEach((scene: any) => {
            scene.shots?.forEach((shot: any) => {
                if (shot.video_url) {
                    shotsWithVideo.push(shot);
                }
            });
        });

        if (shotsWithVideo.length === 0) {
            toast.warning(t('noShotsWithVideo'));
            return;
        }

        // 按shot_number排序
        shotsWithVideo.sort((a, b) => a.shot_number - b.shot_number);

        // 检查clip是否与轨道上的其他clips重叠
        const hasOverlap = (track: any, startTime: number, duration: number): boolean => {
            const endTime = startTime + duration;
            return track.clips.some((clip: any) => {
                const clipEnd = clip.startInTimeline + clip.duration;
                // 检查是否有时间重叠
                return !(endTime <= clip.startInTimeline || startTime >= clipEnd);
            });
        };

        // 找到可以放置clip的轨道（无重叠）
        const findAvailableTrack = (type: 'video' | 'audio', startTime: number, duration: number): any => {
            const typedTracks = tracks.filter(t => t.type === type);

            // 先检查现有轨道
            for (const track of typedTracks) {
                if (!hasOverlap(track, startTime, duration)) {
                    return track;
                }
            }

            // 如果所有现有轨道都有重叠，创建新轨道
            const trackName = type === 'video'
                ? `${t('videoTrack')} ${typedTracks.length + 1}`
                : `${t('audioTrack')} ${typedTracks.length + 1}`;
            addTrack(type, trackName);

            // 等待轨道创建后返回（需要重新获取tracks）
            // 由于addTrack是同步的，我们可以立即重新查找
            const updatedTracks = tracks.filter(t => t.type === type);
            return updatedTracks[updatedTracks.length - 1];
        };

        // 确保至少有一条视频轨道和一条音频轨道
        let videoTracks = tracks.filter(t => t.type === 'video');
        let audioTracks = tracks.filter(t => t.type === 'audio');

        if (videoTracks.length === 0) {
            addTrack('video', t('videoTrack'));
        }
        if (audioTracks.length === 0) {
            addTrack('audio', t('audioTrack'));
        }

        // 计算当前时间轴的位置（从currentTime开始排列）
        let currentPosition = currentTime;
        let createdVideoTracks = 0;
        let createdAudioTracks = 0;

        // 逐个添加到时间轴
        shotsWithVideo.forEach((shot) => {
            const duration = shot.video_duration || 5;

            // 找到可用的视频轨道
            const videoTrack = findAvailableTrack('video', currentPosition, duration);
            if (videoTrack) {
                addClip(videoTrack.id, {
                    url: shot.video_url,
                    startInTimeline: currentPosition,
                    duration: duration,
                    sourceStart: 0,
                    sourceEnd: duration,
                    layer: videoTrack.clips.length + 1,
                    volume: 0, // 视频静音
                });
            } else {
                // 如果找不到轨道，创建新轨道
                const newTrackName = `${t('videoTrack')} ${videoTracks.length + createdVideoTracks + 1}`;
                addTrack('video', newTrackName);
                createdVideoTracks++;
                const newTrack = tracks.filter(t => t.type === 'video').pop();
                if (newTrack) {
                    addClip(newTrack.id, {
                        url: shot.video_url,
                        startInTimeline: currentPosition,
                        duration: duration,
                        sourceStart: 0,
                        sourceEnd: duration,
                        layer: 1,
                        volume: 0,
                    });
                }
            }

            // 添加音频（如果有）
            if (shot.audio_url) {
                const audioTrack = findAvailableTrack('audio', currentPosition, duration);
                if (audioTrack) {
                    addClip(audioTrack.id, {
                        url: shot.audio_url,
                        startInTimeline: currentPosition,
                        duration: duration,
                        sourceStart: 0,
                        sourceEnd: duration,
                        layer: audioTrack.clips.length + 1,
                        volume: 1, // 默认音量100%
                    });
                } else {
                    // 如果找不到轨道，创建新轨道
                    const newTrackName = `${t('audioTrack')} ${audioTracks.length + createdAudioTracks + 1}`;
                    addTrack('audio', newTrackName);
                    createdAudioTracks++;
                    const newTrack = tracks.filter(t => t.type === 'audio').pop();
                    if (newTrack) {
                        addClip(newTrack.id, {
                            url: shot.audio_url,
                            startInTimeline: currentPosition,
                            duration: duration,
                            sourceStart: 0,
                            sourceEnd: duration,
                            layer: 1,
                            volume: 1,
                        });
                    }
                }
            }

            // 移动到下一个位置
            currentPosition += duration;
        });

        const tracksCreated = createdVideoTracks + createdAudioTracks;
        const message = tracksCreated > 0
            ? `${t('importedClips')}: ${shotsWithVideo.length} ${t('shots')} (${t('createdTracks')}: ${tracksCreated})`
            : `${t('importedClips')}: ${shotsWithVideo.length} ${t('shots')}`;
        toast.success(message);
    };

    const handleShotUpdateSuccess = async () => {
        if (creation?.uuid) {
            const res = await creationApi.queryCreationById(creation.uuid);
            if (res && res.data) {
                setCreation(res.data);
            }
        }
    };

    // 一键添加分镜所有素材到播放头位置
    const handleAddShotToTracks = (shot: any) => {
        let addedCount = 0;

        // 计算时长
        const durationInSeconds = shot.video_duration || 5;

        // 使用当前播放头位置作为起始时间
        const startTime = currentTime;

        // 1. 添加视频到第一个视频轨道
        if (shot.video_url) {
            const videoTrack = project.tracks.find(t => t.type === 'video');
            if (videoTrack) {
                addClip(videoTrack.id, {
                    url: shot.video_url,
                    startInTimeline: startTime,
                    duration: durationInSeconds,
                    sourceStart: 0,
                    sourceEnd: durationInSeconds,
                    layer: videoTrack.clips.length + 1,
                    volume: 0,
                });
                addedCount++;
            }
        }

        // 2. 添加音频到第一个音频轨道
        if (shot.audio_url) {
            const audioTrack = project.tracks.find(t => t.type === 'audio');
            if (audioTrack) {
                addClip(audioTrack.id, {
                    url: shot.audio_url,
                    startInTimeline: startTime,
                    duration: durationInSeconds,
                    sourceStart: 0,
                    sourceEnd: durationInSeconds,
                    layer: audioTrack.clips.length + 1,
                    volume: 1,
                });
                addedCount++;
            }
        }

        // 3. 添加字幕到第一个文字轨道 - 每条台词单独添加
        if (shot.narration && shot.narration.length > 0) {
            const textTrack = project.tracks.find(t => t.type === 'text');
            if (textTrack) {
                let currentStartTime = startTime;

                // 遍历每条台词，单独添加到轨道
                shot.narration.forEach((narrationItem: any) => {
                    const subtitleText = narrationItem.内容 || narrationItem.content || '';

                    if (subtitleText.trim()) {
                        // 根据文本长度估算时长（原本按 7 字/秒计算，现缩短 1/3，按约 10.5 字/秒计算）
                        const textLength = subtitleText.length;
                        const estimatedDuration = Math.max(1.5, textLength / 10.5);

                        addClip(textTrack.id, {
                            url: '',
                            text: subtitleText,
                            startInTimeline: currentStartTime,
                            duration: estimatedDuration,
                            sourceStart: 0,
                            sourceEnd: estimatedDuration,
                            layer: textTrack.clips.length + 1,
                            volume: 1,
                        });

                        addedCount++;
                        // 下一条台词的起始时间 = 当前结束时间
                        currentStartTime += estimatedDuration;
                    }
                });
            }
        }

        if (addedCount > 0) {
            toast.success(t('addedAssetsToTracks', { count: addedCount }));
        } else {
            toast.warning(t('noAssetsAvailable'));
        }

        return addedCount;
    };

    const ensureMandatoryTracks = (project: TimelineProject): TimelineProject => {
        const mandatoryTracks = [
            { id: 'track-video-main', type: 'video', name: 'Video', isLocked: true },
            { id: 'track-audio-main', type: 'audio', name: 'Audio', isLocked: true },
            { id: 'track-text-main', type: 'text', name: 'Subtitles', isLocked: true }
        ];

        const newTracks = [...project.tracks];
        let hasChanges = false;

        mandatoryTracks.forEach(req => {
            const exists = newTracks.find(t => t.id === req.id);
            if (!exists) {
                newTracks.unshift({
                    ...req,
                    clips: []
                } as TimelineTrack);
                hasChanges = true;
            } else {
                // Ensure it is locked
                if (!exists.isLocked) {
                    exists.isLocked = true;
                    hasChanges = true;
                }
            }
        });

        if (!hasChanges) return project;

        return {
            ...project,
            tracks: newTracks
        };
    };

    // 轮询项目详情
    useEffect(() => {
        if (!creation?.uuid) return;

        const intervalId = setInterval(async () => {
            try {
                // 静默更新，不触发 loading
                // 排除 timeline_config，避免覆盖用户正在编辑的时间轴，并减少传输数据量
                const res = await creationApi.queryCreationById(creation.uuid, true);
                if (res && res.data) {
                    // 比较关键数据是否变化，避免不必要的重渲染
                    setCreation(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(res.data)) {
                            return res.data;
                        }
                        return prev;
                    });
                }
            } catch (e) {
                console.error("Failed to poll creation details", e);
            }
        }, 4000); // 每4秒轮询一次

        return () => clearInterval(intervalId);
    }, [creation?.uuid]);

    // 监控导出进度
    useEffect(() => {
        if (!creation?.extra_data?.steps?.videoExport) {
            setExportProgress(null);
            return;
        }

        const exportStep = creation.extra_data.steps.videoExport;

        if (exportStep.status === 'processing' && exportStep.progress) {
            setExportProgress({
                percent: exportStep.progress.percent || 0,
                status: exportStep.progress.status || '处理中...'
            });
        } else {
            setExportProgress(null);
        }
    }, [creation?.extra_data?.steps?.videoExport]);

    useEffect(() => {
        if (!taskId) {
            setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                // 1. Try to fetch as Creation (UUID)
                try {
                    // Check if taskId is a valid UUID format (simple check)
                    if (taskId.length > 20) {
                        const creationRes = await creationApi.queryCreationById(taskId);
                        if (creationRes && creationRes.data) {
                            let creationData = creationRes.data;

                            // Metadata Initialization
                            const initializedCreation = ensureMetadata(creationData);
                            // Check if we need to update the backend (deep comparison is expensive, checking if reference changed is enough as ensureMetadata returns new object only if changed)
                            if (initializedCreation !== creationData) {
                                try {
                                    // Async update, don't await to block rendering
                                    creationApi.updateCreation(initializedCreation.uuid, {
                                        extra_data: initializedCreation.extra_data
                                    });
                                    creationData = initializedCreation;
                                } catch (e) {
                                    console.error("Failed to persist metadata initialization", e);
                                }
                            }

                            setCreation(creationData);
                            setProjectTitle(creationData.title || t('newProject'));

                            // Load assets
                            loadAssets(creationData.novel_id);

                            // Initialize Project
                            if (creationData.timeline_config) {
                                let project = creationData.timeline_config;
                                project = ensureMandatoryTracks(project);
                                importProject(project);
                            } else {
                                const project = convertToTimelineProject(creationData);
                                importProject(project);
                            }

                            // Check if character analysis is needed
                            // Re-check logic: if triggered but processing/idle, we might need to poll or show processing state
                            const charAnalysisStep = getStepStatus(creationData, 'characterAnalysis');
                            if (charAnalysisStep) {
                                if (charAnalysisStep.status === 'processing' && charAnalysisStep.taskId) {
                                    // If processing with a taskId, resume polling
                                    pollAnalysisTask(charAnalysisStep.taskId, creationData.uuid);
                                    // Maybe set a local processing state to show spinner instead of button?
                                    // For now, pollAnalysisTask will handle success toast/update.
                                } else if (!hasTriggeredCharacterAnalysis(creationData)) {
                                    // Not triggered yet
                                    setTimeout(() => {
                                        toast.info(t('pleaseAnalyzeCharacters'), {
                                            description: t('analyzeCharactersDescription'),
                                            duration: 5000,
                                            action: {
                                                label: t('analyzeCharacters'),
                                                onClick: () => handleAnalyzeCharacters(creationData)
                                            }
                                        });
                                    }, 1000);
                                }
                            } else if (!hasTriggeredCharacterAnalysis(creationData)) {
                                setTimeout(() => {
                                    toast.info(t('pleaseAnalyzeCharacters'), {
                                        description: t('analyzeCharactersDescription'),
                                        duration: 5000,
                                        action: {
                                            label: t('analyzeCharacters'),
                                            onClick: () => handleAnalyzeCharacters(creationData)
                                        }
                                    });
                                }, 1000);
                            }

                            setLoading(false);
                            return; // Successfully loaded creation
                        }
                    }
                } catch (e) {
                    console.warn("Failed to fetch creation by ID, falling back to Task API", e);
                }

                // 2. Fallback: Poll as Task ID (Legacy / Generation Task)
                await fetchTaskResult();

            } catch (err) {
                console.error("Error loading editor data:", err);
                setError(t('failedToFetchTaskData'));
                setLoading(false);
            }
        };

        const fetchTaskResult = async () => {
            const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`);
            const data = await response.json();

            if (data.success) {
                const taskData = data.data;
                const status = taskData.status;

                if (status === 'SUCCESS' && taskData.resource) {
                    const resource = taskData.resource;
                    const creation = resource.creation;

                    if (creation) {
                        setCreation(creation);
                        setProjectTitle(creation.title || t('newProject'));

                        if (creation.timeline_config) {
                            let project = creation.timeline_config;
                            project = ensureMandatoryTracks(project);
                            importProject(project);
                        } else {
                            const project = convertToTimelineProject(creation);
                            importProject(project);
                        }
                        setLoading(false);
                    }
                } else if (status === 'FAILURE' || status === 'REVOKED') {
                    setError(taskData.message || t('failedToLoadTask'));
                    setLoading(false);
                } else {
                    // Processing
                    if (taskData.message) setStatusMessage(taskData.message);
                    if (taskData.progress?.percent !== undefined) {
                        setProgress(taskData.progress.percent);
                    } else if (taskData.percent !== undefined) {
                        setProgress(taskData.percent);
                    }
                    setTimeout(fetchTaskResult, 2000);
                }
            } else {
                throw new Error(data.message || t('failedToLoadTask'));
            }
        };

        loadData();
    }, [taskId, importProject]);

    const convertToTimelineProject = (backendResult: any): TimelineProject => {
        // Handle both Creation object (with shots/scenes) and direct shot_data list
        let shots: any[] = [];

        if (backendResult.scenes) {
            // Flatten scenes to shots
            shots = backendResult.scenes.flatMap((scene: any) => scene.shots || []);
        } else if (backendResult.shots) {
            shots = backendResult.shots;
        } else if (backendResult.shot_data) {
            shots = backendResult.shot_data;
        } else if (Array.isArray(backendResult)) {
            shots = backendResult;
        }

        const videoTrack: TimelineTrack = {
            id: 'track-video-main',
            type: 'video',
            name: 'Video',
            isLocked: true,
            clips: []
        };

        const audioTrack: TimelineTrack = {
            id: 'track-audio-main',
            type: 'audio',
            name: 'Audio',
            isLocked: true,
            clips: []
        };

        const textTrack: TimelineTrack = {
            id: 'track-text-main',
            type: 'text',
            name: 'Subtitles',
            isLocked: true,
            clips: []
        };

        let currentTime = 0;

        shots.forEach((shot: any, index: number) => {
            const duration = shot.video_duration || 5;

            // Video Clip
            const videoUrl = shot.video_url || shot.image_url || (shot["视频本地路径"] ? `${API_BASE_URL}/static/videos/${shot["视频本地路径"].split('/').pop()}` : null);

            if (videoUrl) {
                videoTrack.clips.push({
                    id: `clip-video-${index}`,
                    url: videoUrl,
                    startInTimeline: currentTime,
                    duration: duration,
                    sourceStart: 0,
                    sourceEnd: duration,
                    layer: 1
                });
            }

            // Audio Clip
            const audioUrl = shot.audio_url || (shot["音频本地路径"] ? `${API_BASE_URL}/static/audio/${shot["音频本地路径"].split('/').pop()}` : null);

            if (audioUrl) {
                audioTrack.clips.push({
                    id: `clip-audio-${index}`,
                    url: audioUrl,
                    startInTimeline: currentTime,
                    duration: duration,
                    sourceStart: 0,
                    sourceEnd: duration,
                    layer: 1
                });
            }

            // Subtitle Clip
            if (shot.dialogue) {
                textTrack.clips.push({
                    id: `clip-text-${index}`,
                    url: '', // Text clips don't need URL
                    text: shot.dialogue,
                    startInTimeline: currentTime,
                    duration: duration,
                    sourceStart: 0,
                    sourceEnd: duration,
                    layer: 1
                });
            }

            currentTime += duration;
        });

        return {
            projectId: `project-${taskId}`,
            duration: Math.max(currentTime + 10, 30),
            fps: 30,
            tracks: [videoTrack, audioTrack, textTrack]
        };
    };

    // Character Management Logic
    const handleEditCharacter = (character: ICharacter) => {
        setEditingCharacter(character);
        setIsEditModalOpen(true);
    };

    const handleCharacterUpdateSuccess = async () => {
        if (creation?.uuid) {
            const res = await creationApi.queryCreationById(creation.uuid);
            if (res && res.data) {
                setCreation(res.data);
            }
        }
    };

    const handleImagePreview = (url: string) => {
        setPreviewImage(url);
        setIsPreviewOpen(true);
    };

    const handleRegenerateSingleCharacter = async (character: ICharacter) => {
        if (!creation?.uuid) return;

        const characterUuid = character.uuid || (character.character_id ? String(character.character_id) : '');
        if (!characterUuid) return;

        const performRegeneration = async () => {
            try {
                const response = await characterApi.regenerateCharacterImage(
                    characterUuid,
                    creation.extra_data?.visual_style || "anime",
                    creation.uuid
                );

                if (response.data && response.data.task_id) {
                    setRegeneratingCharacters(prev => {
                        const newMap = new Map(prev);
                        newMap.set(characterUuid, response.data!.task_id);
                        return newMap;
                    });
                    toast.success(t('regenerating') || "重新生成中...");
                }
            } catch (error: any) {
                toast.error(error.message || "Failed to start regeneration");
            }
        };

        // 如果已经有图片，弹出确认框
        if (character.image_url) {
            setConfirmDialog({
                open: true,
                title: t('regenerateConfirmTitle') || "确认重新生成？",
                description: t('regenerateConfirmDesc') || "重新生成后，当前的图片将无法找回。确定要继续吗？",
                onConfirm: performRegeneration,
                variant: 'destructive'
            });
        } else {
            performRegeneration();
        }
    };

    const gengerateCharacterImages = async (charactersToGenerate: ICharacter[]) => {
        if (!creation?.uuid) return;
        setIsGenerating(true);

        try {
            const characterIds = charactersToGenerate.map(c =>
                c.uuid || (c.character_id ? String(c.character_id) : '')
            ).filter(id => id);

            const response = await characterApi.generateCharacterImages(
                characterIds,
                creation.extra_data?.visual_style || "anime",
                creation.uuid,
                false // force_regenerate
            );

            // For batch generation, we might want to track a main task or just rely on polling the creation
            // Assuming the API returns a main task ID or we just poll the creation
            if (response.data && response.data.task_id) {
                toast.success(t('generationStarted') || "生成任务已开始");
                // Here we could track the main task, but simpler to just poll creation or rely on the polling effect
                // However, to show "Generating" state, we might need to know when it finishes.
                // For now, let's just set isGenerating to false after a timeout or when creation updates.
                // Or better, track the task if possible.
                // Since we don't have a dedicated state for "Batch Generation Task", we'll just let the global poller handle updates
                // and maybe set a timeout to clear loading state.
                setTimeout(() => setIsGenerating(false), 5000);
            } else {
                setIsGenerating(false);
            }

        } catch (error: any) {
            setIsGenerating(false);
            toast.error(error.message || "Generation failed");
        }
    };

    const regenerateAllCharacterImages = async (charactersToGenerate: ICharacter[]) => {
        if (!creation?.uuid) return;
        setIsGenerating(true);

        try {
            const characterIds = charactersToGenerate.map(c =>
                c.uuid || (c.character_id ? String(c.character_id) : '')
            ).filter(id => id);

            const response = await characterApi.generateCharacterImages(
                characterIds,
                creation.extra_data?.visual_style || "anime",
                creation.uuid,
                true
            );
            if (response.data && response.data.task_id) {
                toast.success(t('regenerating') || "重新生成中...");
                setTimeout(() => setIsGenerating(false), 5000);
            } else {
                setIsGenerating(false);
            }
        } catch (error: any) {
            setIsGenerating(false);
            toast.error(error.message || "Regeneration failed");
        }
    };

    // Poll regenerating characters
    useEffect(() => {
        if (regeneratingCharacters.size === 0) return;

        const intervals: NodeJS.Timeout[] = [];

        regeneratingCharacters.forEach((taskId, characterUuid) => {
            const interval = setInterval(async () => {
                try {
                    const response = await taskApi.queryTaskStatus(taskId);
                    const apiResponse = response?.data as any;
                    let rawTask = apiResponse?.data || (apiResponse?.task_id ? apiResponse : null);

                    if (rawTask) {
                        if (rawTask.status === TaskStatus.SUCCESS) {
                            setRegeneratingCharacters(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(characterUuid);
                                return newMap;
                            });
                            handleCharacterUpdateSuccess();
                            toast.success(t('regenerateImageSuccess'));
                        } else if (rawTask.status === TaskStatus.FAILURE) {
                            setRegeneratingCharacters(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(characterUuid);
                                return newMap;
                            });
                            toast.error(rawTask.message || "Regeneration failed");
                        }
                    }
                } catch (error) {
                    console.error("Task polling failed", error);
                }
            }, 2000);
            intervals.push(interval);
        });

        return () => intervals.forEach(clearInterval);
    }, [regeneratingCharacters]);

    // Poll regenerating scenes
    useEffect(() => {
        if (regeneratingScenes.size === 0) return;

        const intervals: NodeJS.Timeout[] = [];

        regeneratingScenes.forEach((taskId, sceneId) => {
            const interval = setInterval(async () => {
                try {
                    const response = await taskApi.queryTaskStatus(taskId);
                    const apiResponse = response?.data as any;
                    let rawTask = apiResponse?.data || (apiResponse?.task_id ? apiResponse : null);

                    if (rawTask) {
                        if (rawTask.status === TaskStatus.SUCCESS) {
                            setRegeneratingScenes(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(sceneId);
                                return newMap;
                            });
                            // Refresh creation to get new image url
                            if (creation?.uuid) {
                                const res = await creationApi.queryCreationById(creation.uuid);
                                if (res && res.data) {
                                    setCreation(res.data);
                                }
                            }
                            toast.success(t('regenerateSceneImageSuccess'));
                        } else if (rawTask.status === TaskStatus.FAILURE) {
                            setRegeneratingScenes(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(sceneId);
                                return newMap;
                            });
                            toast.error(rawTask.message || "Regeneration failed");
                        }
                    }
                } catch (error) {
                    console.error("Task polling failed", error);
                }
            }, 2000);
            intervals.push(interval);
        });

        return () => intervals.forEach(clearInterval);
    }, [regeneratingScenes, creation?.uuid]);

    // Poll regenerating shots
    useEffect(() => {
        if (regeneratingShots.size === 0) return;

        const intervals: NodeJS.Timeout[] = [];

        regeneratingShots.forEach(({ taskId }, shotId) => {
            const interval = setInterval(async () => {
                try {
                    const response = await taskApi.queryTaskStatus(taskId);
                    const apiResponse = response?.data as any;
                    let rawTask = apiResponse?.data || (apiResponse?.task_id ? apiResponse : null);

                    if (rawTask) {
                        if (rawTask.status === TaskStatus.SUCCESS) {
                            setRegeneratingShots(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(shotId);
                                return newMap;
                            });
                            // Refresh creation
                            if (creation?.uuid) {
                                const res = await creationApi.queryCreationById(creation.uuid);
                                if (res && res.data) {
                                    setCreation(res.data);
                                    // Also update editingShot if it's the same shot being edited
                                    if (editingShot && (editingShot.uuid === shotId || String(editingShot.shot_id) === shotId)) {
                                        // Find the updated shot from the refreshed creation
                                        const updatedShot = res.data.scenes?.flatMap((scene: any) =>
                                            scene.shots?.map((s: any) => ({ ...s, _sceneTitle: scene.title })) || []
                                        ).find((s: any) => s.uuid === shotId || String(s.shot_id) === shotId);
                                        if (updatedShot) {
                                            setEditingShot(updatedShot);
                                        }
                                    }
                                }
                            }
                            toast.success(t('regenerateShotImageSuccess'));
                        } else if (rawTask.status === TaskStatus.FAILURE) {
                            setRegeneratingShots(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(shotId);
                                return newMap;
                            });
                            toast.error(rawTask.message || "Regeneration failed");
                        }
                    }
                } catch (error) {
                    console.error("Task polling failed", error);
                }
            }, 2000);
            intervals.push(interval);
        });

        return () => intervals.forEach(clearInterval);
    }, [regeneratingShots, creation?.uuid]);

    const handleSave = async () => {
        if (!creation || !taskId) return;

        try {
            setSaveStatus('saving');
            const project = useTimelineStore.getState().project;

            const updateData: Partial<ICreation> = {
                timeline_config: project,
            };

            await creationApi.updateCreation(creation.uuid || taskId, updateData);
            setSaveStatus('saved');
            setHasUnsavedChanges(false);
            setLastSavedTime(new Date());
            toast.success(t('saveSuccess'));
        } catch (error) {
            console.error("Failed to save:", error);
            setSaveStatus('unsaved');
            toast.error(t('saveFailed'));
        }
    };

    // Track timeline changes to mark as unsaved
    useEffect(() => {
        const unsubscribe = useTimelineStore.subscribe((state) => {
            if (state.project && !loading) {
                setHasUnsavedChanges(true);
                setSaveStatus('unsaved');
            }
        });
        return unsubscribe;
    }, [loading]);

    // Auto-save every 20 seconds
    useEffect(() => {
        if (!creation || !taskId || loading) return;

        const autoSaveInterval = setInterval(() => {
            if (hasUnsavedChanges) {
                handleSave();
            }
        }, 20000); // 20 seconds

        return () => clearInterval(autoSaveInterval);
    }, [hasUnsavedChanges, creation, taskId, loading]);

    // Warn user before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Keyboard shortcut: Ctrl/Cmd + S to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault(); // Prevent browser's default save dialog
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [creation, taskId]); // Dependencies needed for handleSave

    if (loading) {
        return (
            <TooltipProvider>
                <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
                    <div className="w-full max-w-md px-8 text-center">
                        <div className="relative mb-8 flex justify-center">
                            <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {t('generatingDynamicComic')}
                        </h2>
                        <p className="text-slate-400 mb-8 whitespace-pre-wrap min-h-[3em]">
                            {statusMessage}
                        </p>
                    </div>
                </div>
            </TooltipProvider>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="text-center text-red-500">
                    <p className="text-xl font-bold mb-2">{t('error')}</p>
                    <p>{error}</p>
                    <Button onClick={() => router.back()} variant="outline" className="mt-4 border-red-500 text-red-500 hover:bg-red-950">
                        返回
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="h-screen w-full flex flex-col bg-gradient-to-b from-[#FDBCB4]/10 to-white font-sans text-gray-900">
                {/* Header */}
                <div className="h-14 bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.7)] px-4 pl-16 flex items-center justify-between shrink-0 z-20">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-[#ADD8E6]/30 rounded-full transition-colors text-gray-600"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            {isEditingTitle ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={projectTitle}
                                        onChange={(e) => setProjectTitle(e.target.value)}
                                        className="h-7 text-sm bg-[#ADD8E6]/30 border-[#ADD8E6] text-gray-900 w-64"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleTitleSave();
                                            if (e.key === 'Escape') {
                                                setProjectTitle(creation?.title || t('newProject'));
                                                setIsEditingTitle(false);
                                            }
                                        }}
                                        autoFocus
                                        onBlur={handleTitleSave}
                                    />
                                </div>
                            ) : (
                                <div className="group flex items-center gap-2 cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                                    <h1 className="text-sm font-bold text-gray-900 tracking-tight">{projectTitle}</h1>
                                    <Pencil size={12} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Dynamic Comic Editor</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Aspect Ratio Selector */}
                        <div className="flex items-center bg-[#ADD8E6]/30 border border-[#ADD8E6] rounded-md px-1 h-8">
                            <Select value={aspectRatio} onValueChange={(value) => handleAspectRatioChange(value as "16:9" | "9:16")}>
                                <SelectTrigger className="border-0 bg-transparent hover:bg-[#ADD8E6]/50 focus:ring-0 focus:ring-offset-0 text-gray-700 text-xs h-7 gap-2 px-2">
                                    <div className="flex items-center gap-1.5">
                                        {aspectRatio === "16:9" ? <Monitor size={12} className="text-[#22C55E]" /> : <Smartphone size={12} className="text-[#22C55E]" />}
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-white border-[#ADD8E6] text-gray-900 min-w-[120px]">
                                    <SelectItem value="16:9" className="focus:bg-[#ADD8E6]/30 focus:text-gray-900 text-xs py-1.5 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <Monitor size={12} className="text-gray-600" />
                                            <span>{t('landscape') || '横版 (16:9)'}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="9:16" className="focus:bg-[#ADD8E6]/30 focus:text-gray-900 text-xs py-1.5 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <Smartphone size={12} className="text-gray-600" />
                                            <span>{t('portrait') || '竖版 (9:16)'}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Model Settings Button */}
                        <button
                            className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                            onClick={() => setShowModelSettings(true)}
                        >
                            <Settings size={14} className="text-[#22C55E]" />
                            <span>{t('modelSettings') || '模型设置'}</span>
                        </button>

                        <button
                            className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                            onClick={() => setShowUsageGuide(true)}
                        >
                            <HelpCircle size={14} className="text-[#22C55E]" />
                            <span>{t('usageGuide')}</span>
                        </button>
                        <button
                            className={cn(
                                "h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm",
                                saveStatus === 'saving' && "text-[#22C55E] border-[#22C55E]/50",
                                saveStatus === 'unsaved' && "text-amber-500 border-amber-500/50"
                            )}
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                        >
                            {saveStatus === 'saving' ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            <span>{saveStatus === 'saving' ? '保存中...' : '保存'}</span>
                        </button>
                        <button
                            className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                            onClick={() => setShowExportPreviewDialog(true)}
                        >
                            <History size={14} />
                            <span>导出历史</span>
                        </button>
                        <button
                            className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-purple-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-purple-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                            onClick={() => setShowImageHistoryDialog(true)}
                        >
                            <ImageIcon size={14} className="text-purple-500" />
                            <span>图片历史</span>
                        </button>
                        <button
                            className="h-9 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                            onClick={() => setShowTimeline(!showTimeline)}
                        >
                            <Monitor size={14} className={showTimeline ? "text-blue-500" : "text-gray-400"} />
                            <span>{showTimeline ? '隐藏时间轴' : '显示时间轴'}</span>
                        </button>
                        <Button
                            size="sm"
                            className={cn(
                                "text-white text-xs h-8 gap-2",
                                exportProgress
                                    ? "bg-gradient-to-r from-[#22C55E] to-[#22C55E]/80 hover:from-[#22C55E]/90 hover:to-[#22C55E]/70"
                                    : "bg-gradient-to-r from-[#22C55E] to-[#22C55E]/80 hover:from-[#22C55E]/90 hover:to-[#22C55E]/70"
                            )}
                            onClick={() => setShowExportTriggerDialog(true)}
                        >
                            {exportProgress ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>导出中 {exportProgress.percent}%</span>
                                </>
                            ) : (
                                <>
                                    <Download size={14} />
                                    导出视频
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Section: Preview & Properties */}
                    <div className="flex-1 flex min-h-0">
                        {/* Preview Area (Left) */}
                        <div className="flex-1 bg-white flex items-center justify-center relative border-r border-[#ADD8E6]/30">
                            <VideoPreview />
                        </div>

                        {/* Properties Panel (Right) */}
                        <div className="w-[40%] bg-white flex flex-col shadow-[8px_8px_16px_rgba(173,221,230,0.3),-8px_-8px_16px_rgba(255,255,255,0.7)] shrink-0">
                            <div className="p-2">
                                <CustomTabs
                                    value={activeTab}
                                    onValueChange={setActiveTab}
                                    variant="segmented"
                                    items={[
                                        {
                                            value: "characters",
                                            label: <div className="flex items-center gap-2"><User size={14} className="text-[#22C55E]" /><span>{t('characters')}</span></div>,
                                            content: null
                                        },
                                        {
                                            value: "scenes",
                                            label: <div className="flex items-center gap-2"><LucideMap size={14} className="text-[#22C55E]" /><span>{t('scenes')}</span></div>,
                                            content: null
                                        },
                                        {
                                            value: "shots",
                                            label: <div className="flex items-center gap-2"><ImageIcon size={14} className="text-[#22C55E]" /><span>{t('shots')}</span></div>,
                                            content: null
                                        },
                                        {
                                            value: "assets",
                                            label: <div className="flex items-center gap-2"><FolderOpen size={14} className="text-[#22C55E]" /><span>素材</span></div>,
                                            content: null
                                        }
                                    ]}
                                    className="w-full"
                                />
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-2">
                                    {activeTab === "characters" && (
                                        <>
                                            {/* Character Analysis Processing Indicator */}
                                            {(() => {
                                                if (!creation) return null;
                                                const step = getStepStatus(creation, 'characterAnalysis');
                                                const isCharacterAnalysisProcessing = step?.status === 'processing' || step?.status === 'pending';
                                                const hasNoCharacters = !!creation?.characters && creation.characters.length === 0;

                                                if (isCharacterAnalysisProcessing) {
                                                    return (
                                                        <div className={cn(
                                                            "flex flex-col items-center justify-center gap-3 bg-[#ADD8E6]/30 rounded-lg border border-[#ADD8E6]/50 mb-4",
                                                            hasNoCharacters ? "py-12" : "py-4"
                                                        )}>
                                                            <div className={cn("bg-[#ADD8E6]/50 rounded-full", hasNoCharacters ? "p-4" : "p-2")}>
                                                                <Loader2 size={hasNoCharacters ? 28 : 16} className="text-[#22C55E] animate-spin" />
                                                            </div>
                                                            <div className="text-center space-y-1">
                                                                <p className={cn("text-gray-700 font-medium", hasNoCharacters ? "text-base" : "text-sm")}>
                                                                    {t('analyzingCharacters')}
                                                                    {step.status === 'failed' && step.error === 'timeout' && ` (${t('timeout') || '超时'})`}
                                                                </p>
                                                                {hasNoCharacters && (
                                                                    <p className="text-gray-600 text-xs max-w-[260px] mx-auto">{t('analyzeCharactersDescription')}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Character Image Generation Indicator */}
                                            {(() => {
                                                if (!creation) return null;
                                                const step = getStepStatus(creation, 'characterImageGeneration');
                                                const isProcessing = step?.status === 'processing' || step?.status === 'pending';
                                                if (isProcessing) {
                                                    return (
                                                        <div className="flex items-center justify-center gap-3 py-4 bg-[#ADD8E6]/30 rounded-lg border border-[#ADD8E6]/50 mb-4">
                                                            <div className="p-2 bg-[#ADD8E6]/50 rounded-full">
                                                                <Loader2 size={16} className="text-[#22C55E] animate-spin" />
                                                            </div>
                                                            <p className="text-gray-700 text-sm font-medium">{t('generatingCharacters') || '角色生成中...'}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Generate All Button */}
                                            {creation?.characters && creation.characters.filter((c: ICharacter) => c.body !== null && c.body !== "").length > 0 && (
                                                <div className="mb-4 flex gap-2">
                                                    <Button
                                                        onClick={() => gengerateCharacterImages(creation.characters.filter((c: ICharacter) => c.body !== null && c.body !== ""))}
                                                        disabled={isGenerating || (creation && getStepStatus(creation, 'characterImageGeneration').status === 'processing')}
                                                        className="flex-1 bg-gradient-to-r from-[#22C55E] to-[#22C55E]/80 hover:from-[#22C55E]/90 hover:to-[#22C55E]/70 text-white text-xs h-8 shadow-lg shadow-[#22C55E]/20"
                                                        size="sm"
                                                    >
                                                        <WandSparkles className="w-3 h-3 mr-2" />
                                                        {isGenerating ? t('generating') : t('generateAllImages')}
                                                    </Button>
                                                    {/* Re-analyze Button: With text and smaller than Generate All */}
                                                    {creation.characters.length > 0 && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isGenerating || (creation && getStepStatus(creation, 'characterAnalysis').status === 'processing')}
                                                            className="border-[#ADD8E6] hover:bg-[#ADD8E6]/30 text-gray-700 h-8 px-3 text-xs gap-1.5"
                                                            onClick={() => {
                                                                setConfirmDialog({
                                                                    open: true,
                                                                    title: t('reanalyzeConfirmTitle'),
                                                                    description: t('reanalyzeConfirmDesc'),
                                                                    onConfirm: () => creation && handleAnalyzeCharacters(creation),
                                                                    variant: 'destructive'
                                                                });
                                                            }}
                                                        >
                                                            {(() => {
                                                                const step = creation && getStepStatus(creation, 'characterAnalysis');
                                                                const isAnalyzing = step?.status === 'processing' || step?.status === 'pending';
                                                                return isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles size={14} />;
                                                            })()}
                                                            {t('reanalyzeCharacters')}
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Appearance Characters */}
                                            {creation?.characters && creation.characters.filter((c: ICharacter) => c.body !== null && c.body !== "").length > 0 && (
                                                <div className="space-y-2 mb-6">
                                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                                                        <User size={10} />
                                                        {t('appearanceCharacters')}
                                                    </h3>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {creation.characters.filter((c: ICharacter) => c.body !== null && c.body !== "").map((char: ICharacter) => (
                                                            <div key={char.uuid || char.character_id} className="bg-gradient-to-br from-white to-pink-50 border border-pink-100 hover:bg-gradient-to-br from-white to-pink-100 transition-all group overflow-hidden flex flex-col relative shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_18px_rgba(0,0,0,0.12),-6px_-6px_18px_rgba(255,255,255,0.9)] hover:-translate-y-0.5 rounded-xl p-4">
                                                                {/* Avatar / Image (Optimized for 3-column grid, landscape, adaptive height) */}
                                                                <div className="w-full h-auto shrink-0 bg-white relative group-hover:border-[#FDBCB4]/60 transition-colors">
                                                                    {regeneratingCharacters.has(char.uuid || String(char.character_id)) || char.status === 'generating' ? (
                                                                        <div className={cn(
                                                                            "w-full flex items-center justify-center bg-[#FDBCB4]/50",
                                                                            "aspect-[16/9]"
                                                                        )}>
                                                                            <Loader2 className="w-4 h-4 text-[#22C55E] animate-spin" />
                                                                        </div>
                                                                    ) : char.image_url ? (
                                                                        <div className="relative w-full h-auto group/image">
                                                                            <img
                                                                                src={char.image_url}
                                                                                alt={char.name}
                                                                                className="w-full h-auto object-contain bg-white/30 cursor-pointer hover:scale-105 transition-transform duration-500 block"
                                                                                onClick={() => handleImagePreview(char.image_url!)}
                                                                            />
                                                                            {/* Hover Actions Overlay */}
                                                                            <div className="absolute inset-0 bg-[#22C55E]/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-row items-center justify-center gap-2">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                                                                                    onClick={() => handleImagePreview(char.image_url!)}
                                                                                    title={t('preview')}
                                                                                >
                                                                                    <Maximize2 size={14} />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                                                                                    onClick={() => handleEditCharacter(char)}
                                                                                    title={t('edit')}
                                                                                >
                                                                                    <PenLine size={14} />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                                                                                    onClick={() => handleRegenerateSingleCharacter(char)}
                                                                                    disabled={regeneratingCharacters.has(char.uuid || String(char.character_id)) || char.status === 'generating'}
                                                                                    title={t('regenerate')}
                                                                                >
                                                                                    <RotateCcw size={14} className={(regeneratingCharacters.has(char.uuid || String(char.character_id)) || char.status === 'generating') ? "animate-spin" : ""} />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                                                                                    onClick={() => setShowImageHistoryDialog(true)}
                                                                                    title="查看历史"
                                                                                >
                                                                                    <History size={14} />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="relative w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#FDBCB4]/30 group">
                                                                            <ImageIcon size={14} className="opacity-50 mb-2" />
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="text-[10px] text-white bg-[#22C55E]/70 hover:bg-[#22C55E]/90 px-2 py-1 rounded-full mt-1"
                                                                                onClick={() => handleRegenerateSingleCharacter(char)}
                                                                                disabled={regeneratingCharacters.has(char.uuid || String(char.character_id)) || char.status === 'generating'}
                                                                            >
                                                                                {t('generate') || '生成'}
                                                                            </Button>
                                                                            {/* Hover Actions Overlay */}
                                                                            <div className="absolute inset-0 bg-[#22C55E]/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-row items-center justify-center gap-2">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                                                                                    onClick={() => handleEditCharacter(char)}
                                                                                    title={t('edit')}
                                                                                >
                                                                                    <PenLine size={14} />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                                                                                    onClick={() => handleRegenerateSingleCharacter(char)}
                                                                                    disabled={regeneratingCharacters.has(char.uuid || String(char.character_id)) || char.status === 'generating'}
                                                                                    title={t('generate') || '生成'}
                                                                                >
                                                                                    <ImageIcon size={14} />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Bottom Info (Minimal) */}
                                                                <div className="p-1 bg-[#22C55E]/80 backdrop-blur-sm absolute bottom-0 left-0 right-0 border-t border-[#22C55E]/50">
                                                                    <p className="text-[9px] text-white truncate text-center font-medium">{char.name}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Voice Characters */}
                                            {creation?.characters && creation.characters.filter((c: ICharacter) => c.body === null || c.body === "").length > 0 && (
                                                <div className="space-y-2 pt-2 border-t border-slate-800/50">
                                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                                                        <Volume2 size={10} />
                                                        {t('voiceCharacters')}
                                                    </h3>
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                                                        {creation.characters.filter((c: ICharacter) => c.body === null || c.body === "").map((char: ICharacter) => (
                                                            <div key={char.uuid || char.character_id} className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 hover:bg-gradient-to-br from-white to-blue-100 transition-all p-4 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_18px_rgba(0,0,0,0.12),-6px_-6px_18px_rgba(255,255,255,0.9)] hover:-translate-y-0.5 rounded-xl">
                                                                <div className="flex gap-2.5 items-center">
                                                                    {/* Icon */}
                                                                    <div className="w-8 h-8 shrink-0 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] border border-[#22C55E]/30">
                                                                        <Volume2 size={12} />
                                                                    </div>

                                                                    {/* Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                            <h4 className="font-medium text-gray-700 text-xs truncate leading-none">{char.name}</h4>
                                                                            <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 font-normal">
                                                                                {t('voice')}
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-[10px] text-gray-600 line-clamp-1 truncate leading-tight">
                                                                            {char.voice_description || t('noVoiceDescription')}
                                                                        </p>
                                                                    </div>

                                                                    {/* Edit */}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-gray-600 hover:text-gray-700 hover:bg-[#ADD8E6]/30 rounded-full"
                                                                        onClick={() => handleEditCharacter(char)}
                                                                    >
                                                                        <PenLine size={12} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Fallback Empty State */}
                                            {(() => {
                                                const isCharacterAnalysisProcessing = creation && getStepStatus(creation, 'characterAnalysis').status === 'processing';
                                                const hasNoCharacters = !!creation?.characters && creation.characters.length === 0;
                                                if (!hasNoCharacters) return null;
                                                if (isCharacterAnalysisProcessing) return null;
                                                return (
                                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                        <div className="p-4 bg-[#ADD8E6]/50 rounded-full">
                                                            <User size={32} className="text-[#22C55E]" />
                                                        </div>
                                                        <div className="text-center space-y-1">
                                                            <p className="text-gray-700 font-medium">{t('noCharacterData')}</p>
                                                            <p className="text-gray-600 text-xs max-w-[200px] mx-auto">{t('analyzeCharactersDescription')}</p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => creation && handleAnalyzeCharacters(creation)}
                                                            className="bg-gradient-to-r from-[#22C55E] to-[#22C55E]/80 hover:from-[#22C55E]/90 hover:to-[#22C55E]/70 text-white gap-2 mt-2"
                                                        >
                                                            <Sparkles size={14} />
                                                            {t('analyzeCharacters')}
                                                        </Button>
                                                    </div>
                                                );
                                            })()}

                                            {/* Edit Modal */}
                                            {editingCharacter && (
                                                <CharacterEditModal
                                                    isOpen={isEditModalOpen}
                                                    onClose={() => setIsEditModalOpen(false)}
                                                    character={editingCharacter}
                                                    onSuccess={handleCharacterUpdateSuccess}
                                                />
                                            )}

                                            {/* Image Preview Modal */}
                                            <ImagePreview
                                                open={isPreviewOpen}
                                                onOpenChange={setIsPreviewOpen}
                                                src={previewImage || ""}
                                            />
                                        </>
                                    )}

                                    {activeTab === "scenes" && (
                                        <>
                                            {/* Scene Analysis/Generation Processing Indicators */}
                                            {(() => {
                                                if (!creation) return null;
                                                const analysisStep = getStepStatus(creation, 'sceneAnalysis');
                                                const imageStep = getStepStatus(creation, 'sceneImageGeneration');
                                                const isAnalyzing = analysisStep?.status === 'processing' || analysisStep?.status === 'pending';
                                                const isGenerating = imageStep?.status === 'processing' || imageStep?.status === 'pending';
                                                const hasNoScenes = !creation?.scenes || creation.scenes.length === 0;

                                                if (isAnalyzing || (isGenerating && hasNoScenes)) {
                                                    return (
                                                        <div className={cn(
                                                            "flex flex-col items-center justify-center gap-3 bg-[#ADD8E6]/30 rounded-lg border border-[#ADD8E6]/50 mb-4",
                                                            hasNoScenes ? "py-12" : "py-4"
                                                        )}>
                                                            <div className={cn("bg-[#ADD8E6]/50 rounded-full", hasNoScenes ? "p-4" : "p-2")}>
                                                                <Loader2 size={hasNoScenes ? 32 : 16} className={cn("animate-spin", isAnalyzing ? "text-[#22C55E]" : "text-[#22C55E]")} />
                                                            </div>
                                                            <div className="text-center space-y-1">
                                                                <p className={cn("text-gray-700 font-medium", hasNoScenes ? "text-base" : "text-sm")}>
                                                                    {isAnalyzing ? t('analyzingScenes') : t('generatingSceneImages') || '场景图生成中...'}
                                                                    {analysisStep.status === 'failed' && analysisStep.error === 'timeout' && ` (${t('timeout') || '超时'})`}
                                                                </p>
                                                                {hasNoScenes && (
                                                                    <p className="text-gray-600 text-xs max-w-[200px] mx-auto">{t('analyzeScenesDescription')}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                if (isGenerating && !hasNoScenes) {
                                                    return (
                                                        <div className="flex items-center justify-center gap-3 py-4 bg-[#ADD8E6]/30 rounded-lg border border-[#ADD8E6]/50 mb-4">
                                                            <div className="p-2 bg-[#ADD8E6]/50 rounded-full">
                                                                <Loader2 size={16} className="text-[#22C55E] animate-spin" />
                                                            </div>
                                                            <p className="text-gray-700 text-sm font-medium">{t('generatingSceneImages') || '场景图生成中...'}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Empty State / Parse Button */}
                                            {(!creation?.scenes || creation.scenes.length === 0) && !isAnalyzingScenes && (creation && getStepStatus(creation, 'sceneAnalysis').status !== 'processing') && (
                                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                    <div className="p-4 bg-[#ADD8E6]/50 rounded-full">
                                                        <LucideMap size={32} className="text-[#22C55E]" />
                                                    </div>
                                                    <div className="text-center space-y-1">
                                                        <p className="text-gray-700 font-medium">{t('noSceneData')}</p>
                                                        <p className="text-gray-600 text-xs max-w-[200px] mx-auto">{t('analyzeScenesDescription')}</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleAnalyzeScenes}
                                                        disabled={isAnalyzingScenes}
                                                        className="bg-gradient-to-r from-[#22C55E] to-[#22C55E]/80 hover:from-[#22C55E]/90 hover:to-[#22C55E]/70 text-white gap-2 mt-2"
                                                    >
                                                        {isAnalyzingScenes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles size={14} />}
                                                        {isAnalyzingScenes ? t('analyzingScenes') : t('analyzeScenes')}
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Scene List */}
                                            {creation?.scenes && creation.scenes.length > 0 && (
                                                <div className="space-y-2">
                                                    {/* Generate All Scenes Button */}
                                                    <div className="mb-4 flex gap-2">
                                                        <Button
                                                        onClick={handleGenerateSceneImages}
                                                        disabled={isGeneratingSceneImages || (creation && getStepStatus(creation, 'sceneImageGeneration').status === 'processing')}
                                                        className="flex-1 bg-gradient-to-r from-[#22C55E] to-[#22C55E]/80 hover:from-[#22C55E]/90 hover:to-[#22C55E]/70 text-white text-xs h-8 shadow-lg shadow-[#22C55E]/20"
                                                        size="sm"
                                                    >
                                                        <WandSparkles className="w-3 h-3 mr-2" />
                                                        {isGeneratingSceneImages ? t('generating') : t('generateAllSceneImages')}
                                                    </Button>
                                                        {/* Re-analyze Button: With text and smaller than Generate All */}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isGeneratingSceneImages || isAnalyzingScenes || (creation && getStepStatus(creation, 'sceneAnalysis').status === 'processing')}
                                                            className="border-[#ADD8E6] hover:bg-[#ADD8E6]/30 text-gray-700 h-8 px-3 text-xs gap-1.5"
                                                            onClick={() => {
                                                                setConfirmDialog({
                                                                    open: true,
                                                                    title: t('reanalyzeScenesConfirmTitle'),
                                                                    description: t('reanalyzeScenesConfirmDesc'),
                                                                    onConfirm: handleAnalyzeScenes,
                                                                    variant: 'destructive'
                                                                });
                                                            }}
                                                        >
                                                            {isAnalyzingScenes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles size={14} />}
                                                            {t('reanalyzeScenes')}
                                                        </Button>
                                                    </div>

                                                    {creation.scenes.map((scene: any, idx: number) => (
                                                        <div
                                                            key={scene.uuid || scene.scene_id}
                                                            onClick={() => setEditingScene(scene)}
                                                        >
                                                            <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[#ADD8E6]/30 cursor-pointer transition-colors border border-transparent hover:border-[#ADD8E6] relative claymorphism-sm">
                                                                <div className={cn(
                                                                    "rounded bg-[#FDBCB4]/30 overflow-hidden shrink-0 relative",
                                                                    "w-16 h-9"
                                                                )}>
                                                                    {regeneratingScenes.has(scene.uuid || String(scene.scene_id)) || scene.status === 'generating' ? (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#22C55E]/30 backdrop-blur-[1px]">
                                                                            <Loader2 className="w-3.5 h-3.5 text-[#22C55E] animate-spin mb-0.5" />
                                                                            <span className="text-[8px] text-[#22C55E] font-medium scale-90">{tC('generating')}</span>
                                                                        </div>
                                                                    ) : scene.image_url ? (
                                                                        <img src={scene.image_url} alt={scene.title} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#FDBCB4]/30 text-gray-500">
                                                                            <LucideMap size={16} className="opacity-50 mb-0.5" />
                                                                            <span className="text-[8px] opacity-50 scale-90">
                                                                                {(creation && getStepStatus(creation, 'sceneImageGeneration').status === 'processing') ? tC('generating') : '待生成'}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="text-sm font-medium text-gray-700 truncate">{t('sceneIndex', { index: idx + 1 })}: {scene.location}</div>
                                                                        {regeneratingScenes.has(scene.uuid || String(scene.scene_id)) && (
                                                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-[#22C55E]/30 text-[#22C55E] shrink-0 font-normal">
                                                                                {tC('generating')}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-600 truncate">{scene.atmosphere} | {scene.time_setting}</div>
                                                                </div>

                                                                {/* Hover Actions */}
                                                                <div className="hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2 gap-1 bg-[#22C55E]/80 p-1 rounded-md backdrop-blur-sm">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-white hover:text-white hover:bg-white/20 rounded-full"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRegenerateSceneImage(scene.uuid || String(scene.scene_id));
                                                                        }}
                                                                        disabled={regeneratingScenes.has(scene.uuid || String(scene.scene_id)) || scene.status === 'generating'}
                                                                        title={t('regenerate')}
                                                                    >
                                                                        <RotateCcw size={12} className={(regeneratingScenes.has(scene.uuid || String(scene.scene_id)) || scene.status === 'generating') ? "animate-spin" : ""} />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-white hover:text-white hover:bg-white/20 rounded-full"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setShowImageHistoryDialog(true);
                                                                        }}
                                                                        title="查看历史"
                                                                    >
                                                                        <History size={12} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {editingScene && (
                                                <SceneEditModal
                                                    isOpen={!!editingScene}
                                                    onClose={() => setEditingScene(null)}
                                                    scene={editingScene}
                                                    onSuccess={handleSceneUpdateSuccess}
                                                    onRegenerateImage={handleRegenerateSceneImage}
                                                    isRegenerating={regeneratingScenes.has(editingScene.uuid || String(editingScene.scene_id))}
                                                    aspectRatio={aspectRatio}
                                                />
                                            )}
                                        </>
                                    )}

                                    {activeTab === "shots" && (
                                        <>
                                            {/* Shot Analysis/Generation Processing Indicators */}
                                            {(() => {
                                                if (!creation) return null;
                                                const analysisStep = getStepStatus(creation, 'shotAnalysis');
                                                const imageStep = getStepStatus(creation, 'shotImageGeneration');
                                                const isAnalyzing = analysisStep?.status === 'processing' || analysisStep?.status === 'pending';
                                                const isGenerating = imageStep?.status === 'processing' || imageStep?.status === 'pending';
                                                const hasNoShots = !creation?.scenes || creation.scenes.every((s: any) => !s.shots || s.shots.length === 0);

                                                if (isAnalyzing || (isGenerating && hasNoShots)) {
                                                    return (
                                                        <div className={cn(
                                                            "flex flex-col items-center justify-center gap-3 bg-slate-800/30 rounded-lg border border-slate-700/50 mb-4",
                                                            hasNoShots ? "py-12" : "py-4"
                                                        )}>
                                                            <div className={cn("bg-slate-800/50 rounded-full", hasNoShots ? "p-4" : "p-2")}>
                                                                <Loader2 size={hasNoShots ? 32 : 16} className={cn("animate-spin", isAnalyzing ? "text-blue-500" : "text-orange-500")} />
                                                            </div>
                                                            <div className="text-center space-y-1">
                                                                <p className={cn("text-slate-300 font-medium", hasNoShots ? "text-base" : "text-sm")}>
                                                                    {isAnalyzing ? t('analyzingShots') : t('generatingShotImages') || '分镜图生成中...'}
                                                                    {analysisStep.status === 'failed' && analysisStep.error === 'timeout' && ` (${t('timeout') || '超时'})`}
                                                                </p>
                                                                {hasNoShots && (
                                                                    <p className="text-slate-600 text-xs max-w-[200px] mx-auto">{t('analyzeShotsDescription')}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                if (isGenerating && !hasNoShots) {
                                                    return (
                                                        <div className="flex items-center justify-center gap-3 py-4 bg-slate-800/30 rounded-lg border border-slate-700/50 mb-4">
                                                            <div className="p-2 bg-slate-800/50 rounded-full">
                                                                <Loader2 size={16} className="text-orange-500 animate-spin" />
                                                            </div>
                                                            <p className="text-slate-300 text-sm font-medium">{t('generatingShotImages') || '分镜图生成中...'}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Empty State / Parse Button */}
                                            {(!creation?.scenes || creation.scenes.every((s: any) => !s.shots || s.shots.length === 0)) && !isAnalyzingShots && creation?.extra_data?.steps?.shotAnalysis?.status !== 'processing' && (
                                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                    <div className="p-4 bg-slate-800/50 rounded-full">
                                                        <Film size={32} className="text-slate-600" />
                                                    </div>
                                                    <div className="text-center space-y-1">
                                                        <p className="text-slate-400 font-medium">{t('noShotData')}</p>
                                                        <p className="text-slate-600 text-xs max-w-[200px] mx-auto">{t('analyzeShotsDesc')}</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleAnalyzeShots}
                                                        disabled={isAnalyzingShots || !creation?.scenes || creation.scenes.length === 0}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white gap-2 mt-2"
                                                    >
                                                        {isAnalyzingShots ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles size={14} />}
                                                        {isAnalyzingShots ? t('analyzingShots') : t('analyzeShotsBtn')}
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Shot List */}
                                            {creation?.scenes && creation.scenes.some((s: any) => s.shots && s.shots.length > 0) && (
                                                <div className="space-y-4">
                                                    {/* Actions Toolbar */}
                                                    <div className="flex gap-2 mb-4">
                                                        <button
                                                            onClick={handleGenerateShotImages}
                                                            disabled={isGeneratingShotImages || creation?.extra_data?.steps?.shotImageGeneration?.status === 'processing'}
                                                            className="flex-1 h-10 px-4 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.15),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                                                        >
                                                            <WandSparkles size={14} />
                                                            <span>{isGeneratingShotImages ? t('generating') : t('generateAllShotImages')}</span>
                                                        </button>
                                                        {/* <Button
                                                        onClick={handleGenerateAllVideos}
                                                        disabled={isGeneratingAllVideos}
                                                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-xs h-8 shadow-lg shadow-blue-500/20"
                                                        size="sm"
                                                    >
                                                        {isGeneratingAllVideos ? (
                                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                                        ) : (
                                                            <Film className="w-3 h-3 mr-2" />
                                                        )}
                                                        {t('generateAllVideos')}
                                                    </Button> */}
                                                        {(() => {
                                                            // 统计有视频的shots数量
                                                            let shotsWithVideo = 0;
                                                            let totalShots = 0;
                                                            creation?.scenes.forEach((scene: any) => {
                                                                scene.shots?.forEach((shot: any) => {
                                                                    totalShots++;
                                                                    if (shot.video_url) shotsWithVideo++;
                                                                });
                                                            });
                                                            const allVideosReady = totalShots > 0 && shotsWithVideo === totalShots;

                                                            return allVideosReady && (
                                                                <button
                                                                    onClick={handleImportAllToTimeline}
                                                                    className="flex-1 h-10 px-4 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.15),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                                                                >
                                                                    <FolderOpen size={14} />
                                                                    <span>{t('importAllToTimeline')}</span>
                                                                </button>
                                                            );
                                                        })()}
                                                        {/* Re-analyze Button: With text and smaller than Generate All */}
                                                        <button
                                                            disabled={isAnalyzingShots}
                                                            className="h-10 px-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100 text-gray-700 font-medium hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                                                            onClick={() => {
                                                                // 检查状态（包含超时逻辑）
                                                                const stepStatus = getStepStatus(creation, 'shotAnalysis');

                                                                // 如果正在处理中且未超时，显示提示
                                                                if (stepStatus.status === 'processing') {
                                                                    toast.warning(t('shotAnalysisInProgress') || '分镜解析正在进行中，请稍候...');
                                                                    return;
                                                                }

                                                                // 否则显示确认对话框
                                                                setConfirmDialog({
                                                                    open: true,
                                                                    title: t('reanalyzeConfirmTitle'),
                                                                    description: t('reanalyzeConfirmDesc'),
                                                                    onConfirm: handleAnalyzeShots,
                                                                    variant: 'destructive'
                                                                });
                                                            }}
                                                        >
                                                            {isAnalyzingShots ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                            <span>{t('reanalyzeShots')}</span>
                                                        </button>
                                                    </div>

                                                    {/* Video Generation Progress Bar */}
                                                    {isGeneratingAllVideos && (
                                                        <Card className="bg-slate-900/50 border-purple-500/30 mb-4">
                                                            <CardContent className="pt-4">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                                                        <span className="text-sm font-medium text-slate-200">
                                                                            {t('generatingVideos')} {videoGenerationProgress.completed}/{videoGenerationProgress.total}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Badge variant="default" className="bg-green-600 text-white">
                                                                            {videoGenerationProgress.success} {t('success')}
                                                                        </Badge>
                                                                        <Badge variant="destructive">
                                                                            {videoGenerationProgress.failed} {t('failed')}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <Progress
                                                                    value={(videoGenerationProgress.completed / videoGenerationProgress.total) * 100}
                                                                    className="h-2"
                                                                />
                                                            </CardContent>
                                                        </Card>
                                                    )}

                                                    {/* All Shots List - Flattened and sorted by shot_number */}
                                                    <div className="grid grid-cols-1 gap-2 mb-6">
                                                        {(() => {
                                                            const allShots: any[] = [];
                                                            creation.scenes.forEach((scene: any, sceneIdx: number) => {
                                                                if (scene.shots) {
                                                                    scene.shots.forEach((shot: any) => {
                                                                        allShots.push({
                                                                            ...shot,
                                                                            _sceneTitle: scene.title || scene.location || t('sceneIndex', { index: sceneIdx + 1 }),
                                                                            _sceneIdx: sceneIdx
                                                                        });
                                                                    });
                                                                }
                                                            });

                                                            return allShots
                                                                .sort((a, b) => a.shot_number - b.shot_number)
                                                                .map((shot: any, shotIdx: number) => (
                                                                    <div
                                                                        key={shot.uuid || shotIdx}
                                                                        className="group flex gap-3 p-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-all border border-blue-100 hover:border-blue-200 relative bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_18px_rgba(0,0,0,0.12),-6px_-6px_18px_rgba(255,255,255,0.9)] hover:-translate-y-0.5"
                                                                        draggable={!!(shot.video_url || shot.audio_url || (shot.narration && shot.narration.length > 0))}
                                                                        onDragStart={(e) => {
                                                                            const hasContent = shot.video_url || shot.audio_url || (shot.narration && shot.narration.length > 0);
                                                                            if (!hasContent) {
                                                                                e.preventDefault();
                                                                                return;
                                                                            }
                                                                            e.dataTransfer.setData('application/json', JSON.stringify({
                                                                                type: 'shot',
                                                                                shot: shot,
                                                                                shotNumber: shot.shot_number
                                                                            }));
                                                                            e.dataTransfer.effectAllowed = 'copy';
                                                                        }}
                                                                        onClick={() => setEditingShot(shot)}
                                                                    >
                                                                        {/* Image Thumbnails: Start Frame + End Frame */}
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            {/* Start Frame Thumbnail */}
                                                                            <div className={cn(
                                                                                "rounded-lg bg-white overflow-hidden relative border border-blue-100 shadow-[2px_2px_8px_rgba(0,0,0,0.08),-2px_-2px_8px_rgba(255,255,255,0.9)]",
                                                                                aspectRatio === "9:16" ? "w-10 h-16" : "w-16 h-10"
                                                                            )}>
                                                                                {regeneratingShots.has(shot.uuid || String(shot.shot_id)) || shot.status === 'generating' ? (
                                                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-[2px]">
                                                                                        <Loader2 className="w-3 h-3 text-green-500 animate-spin mb-0.5" />
                                                                                        <span className="text-[7px] text-green-600 font-medium scale-90">{tC('generating')}</span>
                                                                                    </div>
                                                                                ) : shot.image_url ? (
                                                                                    <>
                                                                                        <img src={shot.image_url} alt={`Shot ${shot.shot_number}`} className="w-full h-full object-cover" />
                                                                                        {/* Video Generating Overlay Badge */}
                                                                                        {isVideoGenerating(shot) && (
                                                                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-[2px]">
                                                                                                <div className="flex flex-col items-center">
                                                                                                    <Loader2 className="w-3 h-3 text-green-500 animate-spin mb-0.5" />
                                                                                                    <span className="text-[6px] text-green-600 font-medium">生成中</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-white to-blue-50 text-gray-500">
                                                                                        <ImageIcon size={12} className="opacity-50 mb-0.5" />
                                                                                        <span className="text-[6px] opacity-50 scale-90">首帧</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Arrow Indicator */}
                                                                            <div className="text-slate-600 text-[8px]">→</div>

                                                                            {/* End Frame Thumbnail */}
                                                                            <div className={cn(
                                                                                "rounded-lg bg-white overflow-hidden relative border border-blue-100 shadow-[2px_2px_8px_rgba(0,0,0,0.08),-2px_-2px_8px_rgba(255,255,255,0.9)]",
                                                                                aspectRatio === "9:16" ? "w-10 h-16" : "w-16 h-10"
                                                                            )}>
                                                                                {(() => {
                                                                                    const regenInfo = regeneratingShots.get(shot.uuid || String(shot.shot_id));
                                                                                    const isEndFrameGenerating = regenInfo && (regenInfo.frameType === 'end' || regenInfo.frameType === 'both');

                                                                                    if (isEndFrameGenerating) {
                                                                                        return (
                                                                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-[2px]">
                                                                                                <Loader2 className="w-3 h-3 text-green-500 animate-spin mb-0.5" />
                                                                                                <span className="text-[7px] text-green-600 font-medium scale-90">{tC('generating')}</span>
                                                                                            </div>
                                                                                        );
                                                                                    }

                                                                                    if ((shot.extra_data as any)?.end_frame_image_url) {
                                                                                        return (
                                                                                            <img
                                                                                                src={(shot.extra_data as any).end_frame_image_url}
                                                                                                alt={`Shot ${shot.shot_number} End Frame`}
                                                                                                className="w-full h-full object-cover"
                                                                                            />
                                                                                        );
                                                                                    }

                                                                                    return (
                                                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-white to-blue-50 text-gray-500">
                                                                                            <ImageIcon size={12} className="opacity-50 mb-0.5" />
                                                                                            <span className="text-[6px] opacity-50 scale-90">尾帧</span>
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>

                                                                        {/* Content */}
                                                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="text-[10px] font-bold text-gray-700">#{shot.shot_number}</span>
                                                                                <span className="text-[9px] px-1.5 py-0.5 h-4 bg-blue-100 text-blue-800 shrink-0 font-normal rounded-full">
                                                                                    {shot._sceneTitle}
                                                                                </span>
                                                                                {shot.video_duration && (
                                                                                    <span className="text-[9px] px-1.5 py-0.5 h-4 bg-green-100 text-green-800 shrink-0 font-normal rounded-full">
                                                                                        {shot.video_duration}s
                                                                                    </span>
                                                                                )}
                                                                                {(regeneratingShots.has(shot.uuid || String(shot.shot_id)) || shot.status === 'generating') && (
                                                                                    <span className="text-[9px] px-1.5 py-0.5 h-4 bg-orange-100 text-orange-800 shrink-0 font-normal rounded-full flex items-center gap-1">
                                                                                        <Loader2 className="w-2 h-2 animate-spin" />
                                                                                        {tC('generating')}
                                                                                    </span>
                                                                                )}
                                                                                {/* Video Status Badge */}
                                                                                {shot.video_url && (
                                                                                    <span className="text-[9px] px-1.5 py-0.5 h-4 bg-blue-100 text-blue-800 shrink-0 font-normal rounded-full flex items-center gap-1">
                                                                                        <Film className="w-2 h-2" />
                                                                                        视频
                                                                                    </span>
                                                                                )}
                                                                                {/* Audio Status Badge */}
                                                                                {shot.audio_url && (
                                                                                    <span className="text-[9px] px-1.5 py-0.5 h-4 bg-green-100 text-green-800 shrink-0 font-normal rounded-full flex items-center gap-1">
                                                                                        <Music className="w-2 h-2" />
                                                                                        音频
                                                                                    </span>
                                                                                )}
                                                                                {/* Subtitle Status Badge */}
                                                                                {shot.narration && shot.narration.length > 0 && (
                                                                                    <span className="text-[9px] px-1.5 py-0.5 h-4 bg-amber-100 text-amber-800 shrink-0 font-normal rounded-full flex items-center gap-1">
                                                                                        <Type className="w-2 h-2" />
                                                                                        字幕
                                                                                    </span>
                                                                                )}
                                                                                {/* Video Generating Badge */}
                                                                                {getVideoGenerationStatus(shot) === 'generating' && (
                                                                                    <span className="text-[9px] px-1.5 py-0.5 h-4 bg-green-100 text-green-800 animate-pulse shrink-0 font-normal rounded-full flex items-center gap-1">
                                                                                        <Loader2 className="w-2 h-2 animate-spin" />
                                                                                        生成中
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-xs text-gray-700 leading-relaxed max-h-[40px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-blue">
                                                                                {shot.description || shot.content || (shot.extra_data?.ai_output?.["简要剧情"]) || t('noDescription')}
                                                                            </div>
                                                                        </div>

                                                                        {/* Hover Actions */}
                                                                        <div className="hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2 gap-1 bg-gradient-to-br from-white to-blue-50 p-1 rounded-xl shadow-[8px_8px_24px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.9)] border border-blue-100 backdrop-blur-sm">
                                                                            <button
                                                                                className="h-6 w-6 text-orange-500 hover:text-orange-600 hover:bg-orange-100 rounded-full flex items-center justify-center transition-all duration-200"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleRegenerateShotImage(shot.uuid || String(shot.shot_id), undefined, 'both');
                                                                                }}
                                                                                disabled={regeneratingShots.has(shot.uuid || String(shot.shot_id)) || shot.status === 'generating'}
                                                                                title={t('regenerate')}
                                                                            >
                                                                                <RotateCcw size={12} className={(regeneratingShots.has(shot.uuid || String(shot.shot_id)) || shot.status === 'generating') ? "animate-spin" : ""} />
                                                                            </button>
                                                                            <button
                                                                                className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-100 rounded-full flex items-center justify-center transition-all duration-200"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingShot(shot);
                                                                                }}
                                                                                title={t('edit')}
                                                                            >
                                                                                <Edit2 size={12} />
                                                                            </button>
                                                                            <button
                                                                                className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-full flex items-center justify-center transition-all duration-200"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleGenerateShotVideo(shot);
                                                                                }}
                                                                                disabled={!shot.image_url || isVideoGenerating(shot)}
                                                                                title={shot.video_url ? t('regenerateVideo') : t('generateVideo')}
                                                                            >
                                                                                {isVideoGenerating(shot) ? (
                                                                                    <Loader2 size={12} className="animate-spin" />
                                                                                ) : (
                                                                                    <Film size={12} />
                                                                                )}
                                                                            </button>
                                                                            <button
                                                                                className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-green-100 rounded-full flex items-center justify-center transition-all duration-200"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleAddShotToTracks(shot);
                                                                                }}
                                                                                disabled={!shot.video_url && !shot.audio_url && (!shot.narration || shot.narration.length === 0)}
                                                                                title={t('addToTracks')}
                                                                            >
                                                                                <Plus size={12} />
                                                                            </button>
                                                                            <button
                                                                                className="h-6 w-6 text-purple-500 hover:text-purple-600 hover:bg-purple-100 rounded-full flex items-center justify-center transition-all duration-200"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setShowImageHistoryDialog(true);
                                                                                }}
                                                                                title="查看历史"
                                                                            >
                                                                                <History size={12} />
                                                                            </button>
                                                                            <button
                                                                                className="h-6 w-6 text-purple-500 hover:text-purple-600 hover:bg-purple-100 rounded-full flex items-center justify-center transition-all duration-200"
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    if (!shot.video_url && !shot.audio_url) {
                                                                                        toast.error(t('noDownloadableResources'));
                                                                                        return;
                                                                                    }
                                                                                    toast.info(shot.audio_url ? t('preparingDownloadVideoAudio') : t('preparingDownloadVideo'));
                                                                                    const formattedNumber = String(shot.shot_number || 0).padStart(4, '0');
                                                                                    if (shot.video_url) await downloadFile(shot.video_url, `${formattedNumber}_video.mp4`);
                                                                                    if (shot.audio_url) await downloadFile(shot.audio_url, `${formattedNumber}_audio.mp3`);
                                                                                }}
                                                                                title={t('oneClickDownload')}
                                                                            >
                                                                                <FolderDown size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ));
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {editingShot && (
                                                <ShotEditModal
                                                    isOpen={!!editingShot}
                                                    onClose={() => setEditingShot(null)}
                                                    shot={editingShot}
                                                    previousShot={(() => {
                                                        if (!creation?.scenes) return undefined;
                                                        let previousShot: any = null;
                                                        for (const scene of creation.scenes) {
                                                            if (scene.shots) {
                                                                for (const s of scene.shots) {
                                                                    if (s.shot_id === editingShot.shot_id || s.uuid === editingShot.uuid) {
                                                                        return previousShot;
                                                                    }
                                                                    previousShot = s;
                                                                }
                                                            }
                                                        }
                                                        return undefined;
                                                    })()}
                                                    nextShot={(() => {
                                                        if (!creation?.scenes) return undefined;
                                                        let foundCurrent = false;
                                                        for (const scene of creation.scenes) {
                                                            if (scene.shots) {
                                                                for (const s of scene.shots) {
                                                                    if (foundCurrent) return s;
                                                                    if (s.shot_id === editingShot.shot_id || s.uuid === editingShot.uuid) {
                                                                        foundCurrent = true;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        return undefined;
                                                    })()}
                                                    availableCharacters={creation?.characters || []}
                                                    availableScenes={creation?.scenes || []}
                                                    onSuccess={handleShotUpdateSuccess}
                                                    onRegenerateImage={handleRegenerateShotImage}
                                                    regeneratingFrameType={regeneratingShots.get(editingShot.uuid || String(editingShot.shot_id))?.frameType || (editingShot.status === 'generating' ? 'both' : null)}
                                                    isVideoGenerating={editingShot.status_detail?.video_status === 'generating'}
                                                    onVideoGenerationStart={() => {
                                                        // Update editingShot's video_status to 'generating' immediately
                                                        setEditingShot((prev: any) => prev ? {
                                                            ...prev,
                                                            status_detail: {
                                                                ...prev.status_detail,
                                                                video_status: 'generating'
                                                            }
                                                        } : null);
                                                    }}
                                                    aspectRatio={aspectRatio}
                                                    onNavigate={(shot) => setEditingShot(shot)}
                                                />
                                            )}
                                        </>
                                    )}

                                    {/* Assets Tab */}
                                    {activeTab === "assets" && creation?.novel_id && (
                                        <div className="h-full -m-4">
                                            <AssetManager
                                                novelId={Number(creation.novel_id)}
                                                assets={assets}
                                                onAssetsChange={handleAssetsChange}
                                            />
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Bottom Section: Timeline */}
                    {showTimeline && (
                        <div className="h-[40%] min-h-[300px] border-t border-slate-800 bg-slate-900 shrink-0">
                            <Timeline />
                        </div>
                    )}
                </div>

                {/* Global Confirm Dialog - works across all tabs */}
                <ConfirmDialog
                    open={confirmDialog.open}
                    onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
                    title={confirmDialog.title}
                    description={confirmDialog.description}
                    onConfirm={confirmDialog.onConfirm}
                    confirmText={tC('confirm')}
                    cancelText={tC('cancel')}
                    variant={confirmDialog.variant}
                />

                {/* Export Trigger Dialog */}
                {taskId && (
                    <ExportTriggerDialog
                        creationId={taskId}
                        isOpen={showExportTriggerDialog}
                        onClose={() => setShowExportTriggerDialog(false)}
                    />
                )}

                {/* Export Preview Dialog */}
                {taskId && (
                    <ExportPreviewDialog
                        creationId={taskId}
                        isOpen={showExportPreviewDialog}
                        onClose={() => setShowExportPreviewDialog(false)}
                    />
                )}

                {/* Image History Dialog */}
                {taskId && (
                    <ImageHistoryDialog
                        creationId={taskId}
                        isOpen={showImageHistoryDialog}
                        onClose={() => setShowImageHistoryDialog(false)}
                    />
                )}

                {/* Usage Guide Dialog */}
                <Dialog open={showUsageGuide} onOpenChange={setShowUsageGuide}>
                    <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[8px_8px_24px_rgba(173,221,230,0.3),-8px_-8px_24px_rgba(255,255,255,0.9)] text-gray-900 rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg">
                                <HelpCircle className="h-5 w-5 text-blue-500" />
                                {t('usageGuideTitle')}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                {t('usageGuideDesc') || '如何使用动态漫编辑器进行创作的指南'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {/* Step 1 */}
                            <div className="flex gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 font-bold flex-shrink-0">
                                    1
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white mb-1">{t('usageStep1')}</h3>
                                    <p className="text-sm text-slate-400">{t('usageStep1Desc')}</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 font-bold flex-shrink-0">
                                    2
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white mb-1">{t('usageStep2')}</h3>
                                    <p className="text-sm text-slate-400">{t('usageStep2Desc')}</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600/20 text-green-400 font-bold flex-shrink-0">
                                    3
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white mb-1">{t('usageStep3')}</h3>
                                    <p className="text-sm text-slate-400">{t('usageStep3Desc')}</p>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="flex gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 font-bold flex-shrink-0">
                                    4
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white mb-1">{t('usageStep4')}</h3>
                                    <p className="text-sm text-slate-400">{t('usageStep4Desc')}</p>
                                </div>
                            </div>

                            {/* Step 5 */}
                            <div className="flex gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-600/20 text-pink-400 font-bold flex-shrink-0">
                                    5
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white mb-1">{t('usageStep5')}</h3>
                                    <p className="text-sm text-slate-400">{t('usageStep5Desc')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => setShowUsageGuide(false)} className="h-10 px-4 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2">
                                <Save size={14} />
                                <span className="text-sm">{tC('ok')}</span>
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Model Settings Dialog */}
                <Dialog open={showModelSettings} onOpenChange={setShowModelSettings}>
                    <DialogContent className="sm:max-w-[500px] bg-white border border-gray-200 shadow-[8px_8px_24px_rgba(0,0,0,0.1),-8px_-8px_24px_rgba(255,255,255,0.9)] text-gray-900 rounded-2xl">
                        <DialogHeader className="text-left">
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold justify-start text-left">
                                <Settings className="h-5 w-5 text-blue-500" />
                                <div className='text-gray-600'>{t('modelSettings') || '模型设置'}</div>
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                                {t('modelSettingsDesc') || '配置用于视频、文生图和图生图的 AI 模型'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-6">


                            {/* Video Model */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Film className="w-4 h-4 text-purple-400" />
                                    {t('videoModel') || '视频生成模型'}
                                </Label>
                                <Select value={videoModel} onValueChange={(val) => handleModelChange('video', val)}>
                                    <SelectTrigger className="w-full bg-white border border-gray-200 text-gray-900 hover:bg-gray-50">
                                        <SelectValue placeholder="选择视频模型" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-gray-200 shadow-[8px_8px_24px_rgba(0,0,0,0.1),-8px_-8px_24px_rgba(255,255,255,0.9)] text-gray-900 ">
                                        {videoModels.map((model: any) => (
                                            <SelectItem
                                                key={model.model_name}
                                                value={model.model_name}
                                                className="justify-start"
                                            >
                                                <div className="flex flex-col gap-0.5 items-start w-full">
                                                    <span className="font-medium text-left">{model.display_name}</span>
                                                    {model.description && (
                                                        <span className="text-[10px] text-gray-600 line-clamp-1 text-left">{model.description}</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Text to Image Model */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Type className="w-4 h-4 text-blue-400" />
                                    {t('textToImageModel') || '文生图模型'}
                                </Label>
                                <Select value={textToImageModel} onValueChange={(val) => handleModelChange('text_to_image', val)}>
                                    <SelectTrigger className="w-full bg-white border border-gray-200 text-gray-900 hover:bg-gray-50">
                                        <SelectValue placeholder="选择文生图模型" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-gray-200 shadow-[8px_8px_24px_rgba(0,0,0,0.1),-8px_-8px_24px_rgba(255,255,255,0.9)] text-gray-900">
                                        {textToImageModels.map((model: any) => (
                                            <SelectItem
                                                key={model.model_name}
                                                value={model.model_name}
                                                className="justify-start"
                                            >
                                                <div className="flex flex-col gap-0.5 items-start w-full">
                                                    <span className="font-medium text-left">{model.display_name}</span>
                                                    {model.description && (
                                                        <span className="text-[10px] text-gray-600 line-clamp-1 text-left">{model.description}</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Image to Image Model */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-green-400" />
                                    {t('imageToImageModel') || '图生图模型'}
                                </Label>
                                <Select value={imageToImageModel} onValueChange={(val) => handleModelChange('image_to_image', val)}>
                                    <SelectTrigger className="w-full bg-white border border-gray-200 text-gray-900 hover:bg-gray-50">
                                        <SelectValue placeholder="选择图生图模型" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-gray-200 shadow-[8px_8px_24px_rgba(0,0,0,0.1),-8px_-8px_24px_rgba(255,255,255,0.9)] text-gray-900">
                                        {imageToImageModels.map((model: any) => (
                                            <SelectItem
                                                key={model.model_name}
                                                value={model.model_name}
                                                className="justify-start"
                                            >
                                                <div className="flex flex-col gap-0.5 items-start w-full">
                                                    <span className="font-medium text-left">{model.display_name}</span>
                                                    {model.description && (
                                                        <span className="text-[10px] text-gray-600 line-clamp-1 text-left">{model.description}</span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Visual Style */}
                            <div className="space-y-3 pt-4 border-t border-slate-700/50">
                                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                    创作风格
                                </Label>
                                <Select value={visualStyle} onValueChange={handleStyleChange}>
                                    <SelectTrigger className="w-full bg-white border border-gray-200 text-gray-900 hover:bg-gray-50">
                                        <SelectValue placeholder="选择创作风格" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-gray-200 shadow-[8px_8px_24px_rgba(0,0,0,0.1),-8px_-8px_24px_rgba(255,255,255,0.9)] text-gray-900">
                                        <SelectItem value="realism" className="justify-start">
                                            <div className="flex flex-col gap-0.5 items-start w-full">
                                                <span className="font-medium text-left">写实主义</span>
                                                <span className="text-[10px] text-gray-600 line-clamp-1 text-left">真实人物的AI真人剧</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="cyberpunk" className="justify-start">
                                            <div className="flex flex-col gap-0.5 items-start w-full">
                                                <span className="font-medium text-left">赛博朋克动画</span>
                                                <span className="text-[10px] text-gray-600 line-clamp-1 text-left">未来科幻赛博朋克风格</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="ukiyoe" className="justify-start">
                                            <div className="flex flex-col gap-0.5 items-start w-full">
                                                <span className="font-medium text-left">浮世绘</span>
                                                <span className="text-[10px] text-gray-600 line-clamp-1 text-left">传统日本浮世绘风格</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="watercolor" className="justify-start">
                                            <div className="flex flex-col gap-0.5 items-start w-full">
                                                <span className="font-medium text-left">水彩画风格</span>
                                                <span className="text-[10px] text-gray-600 line-clamp-1 text-left">柔和细腻的水彩画风格</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="anime" className="justify-start">
                                            <div className="flex flex-col gap-0.5 items-start w-full">
                                                <span className="font-medium text-left">日漫风格</span>
                                                <span className="text-[10px] text-gray-600 line-clamp-1 text-left">经典日本动漫风格</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={() => setShowModelSettings(false)} className="h-10 px-4 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2">
                                <Save size={14} />
                                <span className="text-sm">{tC('ok')}</span>
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Video Generation Config Dialog */}
                {videoConfigDialog.shot && (
                    <VideoGenerationDialog
                        isOpen={videoConfigDialog.isOpen}
                        onClose={() => setVideoConfigDialog({ ...videoConfigDialog, isOpen: false })}
                        onConfirm={handleConfirmVideoGeneration}
                        shot={videoConfigDialog.shot}
                        nextShot={videoConfigDialog.nextShot}
                        isGenerating={isGeneratingSingleVideo}
                        aspectRatio={aspectRatio}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
