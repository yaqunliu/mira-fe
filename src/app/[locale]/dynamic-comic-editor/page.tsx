'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Timeline } from '@/components/business/timeline';
import { VideoPreview } from '@/components/business/video-preview';
import { useTimelineStore } from '@/stores/timeline';
import { TimelineProject, TimelineTrack } from '@/types/timeline';
import { Loader2, ChevronLeft, User, Image as ImageIcon, Film, Map as LucideMap, Save, Sparkles, Pencil, Volume2, PenLine, RotateCcw, Maximize2, WandSparkles, X, Edit2, TestTube2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import creationApi from '@/lib/api/creation';
import characterApi from '@/lib/api/character';
import sceneApi from '@/lib/api/scene';
import shotApi from '@/lib/api/shot';
import taskApi from '@/lib/api/task';
import { ICreation } from '@/types/creation';
import { ICharacter } from '@/types/character';
import { TaskStatus } from '@/types';
import { ensureMetadata, hasTriggeredCharacterAnalysis, createUpdatedMetadata } from '@/utils/creation-metadata';
import { CustomTabs } from "@/components/ui/custom-tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CharacterEditModal } from "@/components/modals/character-edit-modal";
import { SceneEditModal } from "@/components/modals/scene-edit-modal";
import { ShotEditModal } from "@/components/modals/shot-edit-modal";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// API BASE URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DynamicComicEditor() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const t = useTranslations('Editor');
    const tC = useTranslations('common');
    const taskId = searchParams.get('taskId');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState(t('initializing'));
    const [progress, setProgress] = useState(0);
    const [projectTitle, setProjectTitle] = useState(t('newProject'));
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [creation, setCreation] = useState<ICreation | null>(null);
    const [activeTab, setActiveTab] = useState("characters");
    
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
    const [regeneratingShots, setRegeneratingShots] = useState<Map<string, string>>(new Map());
    const [editingShot, setEditingShot] = useState<any | null>(null);
    
    // Image Preview State
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: "",
        description: "",
        onConfirm: () => {},
        variant: 'default' as 'default' | 'destructive'
    });

    const { importProject, project, addClip } = useTimelineStore();

    // 测试视频和音频URL
    const TEST_VIDEOS = [
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0001.mp4',
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0002.mp4',
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0003.mp4',
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0004.mp4',
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0005.mp4',
    ];

    const TEST_AUDIOS = [
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0001.mp3',
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0002.mp3',
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0003.mp3',
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0004.mp3',
        'https://novel-agent.cn-sh2.ufileos.com/test/testvideo/0005.mp3',
    ];

    // 加载测试媒体到时间轴
    const handleLoadTestMedia = () => {
        const videoTrack = project.tracks.find(t => t.id === 'track-video-main');
        const audioTrack = project.tracks.find(t => t.id === 'track-audio-main');
        
        if (!videoTrack || !audioTrack) {
            toast.error('无法找到视频或音频轨道');
            return;
        }

        // 清空现有片段
        videoTrack.clips = [];
        audioTrack.clips = [];
        
        let currentTime = 0;
        const clipDuration = 5; // 每个片段5秒
        
        // 添加视频片段
        TEST_VIDEOS.forEach((url, index) => {
            addClip('track-video-main', {
                url: url,
                startInTimeline: currentTime,
                duration: clipDuration,
                sourceStart: 0,
                sourceEnd: clipDuration,
            });
            currentTime += clipDuration;
        });
        
        // 添加音频片段
        currentTime = 0;
        TEST_AUDIOS.forEach((url, index) => {
            addClip('track-audio-main', {
                url: url,
                startInTimeline: currentTime,
                duration: clipDuration,
                sourceStart: 0,
                sourceEnd: clipDuration,
            });
            currentTime += clipDuration;
        });
        
        toast.success('测试媒体已加载！共5个视频和5个音频片段');
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
            
            const res = await creationApi.generatePlaybook(creation.uuid, "original");
            
            if (res && res.data && res.data.task_id) {
                toast.success(t('sceneAnalysisStarted'));
                pollPlaybookTask(res.data.task_id, creation.uuid);
            }
        } catch (error: any) {
            console.error("Failed to start scene analysis", error);
            toast.error(error.message || t('error'));
            setIsAnalyzingScenes(false);
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
                            setCreation(creationRes.data);
                        }
                    } else if (status === 'FAILURE' || status === 'REVOKED') {
                        toast.error(t('sceneAnalysisFailed'));
                        setIsAnalyzingScenes(false);
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
            // forceRegenerate = false, only generate missing images
            const res = await creationApi.generateSceneImages(creation.uuid, false);
            if (res && res.data && res.data.task_id) {
                toast.success(t('generationStarted'));
                pollSceneImageTask(res.data.task_id, creation.uuid);
            } else {
                 setIsGeneratingSceneImages(false);
            }
        } catch (error: any) {
            console.error("Failed to start scene image generation", error);
            toast.error(error.message || t('error'));
            setIsGeneratingSceneImages(false);
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
                        toast.success(t('sceneAnalysisCompleted')); // Or new message "Images Generated"
                        setIsGeneratingSceneImages(false);
                        // Reload creation
                        const creationRes = await creationApi.queryCreationById(creationUuid);
                        if (creationRes && creationRes.data) {
                            setCreation(creationRes.data);
                        }
                    } else if (status === 'FAILURE' || status === 'REVOKED') {
                        toast.error(t('generationFailed'));
                        setIsGeneratingSceneImages(false);
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
            
            const res = await creationApi.analyzeShots(creation.uuid);
            
            if (res && res.data && res.data.task_id) {
                toast.success(t('shotAnalysisStarted'));
                pollShotAnalysisTask(res.data.task_id, creation.uuid);
            }
        } catch (error: any) {
            console.error("Failed to start shot analysis", error);
            toast.error(error.message || t('error'));
            setIsAnalyzingShots(false);
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
                            setCreation(creationRes.data);
                        }
                    } else if (status === 'FAILURE' || status === 'REVOKED') {
                        toast.error(t('shotAnalysisFailed') || "Shot Analysis Failed");
                        setIsAnalyzingShots(false);
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
            // forceRegenerate = false
            const res = await creationApi.generateShots(creation.uuid, false);
            if (res && res.data && res.data.task_id) {
                toast.success(t('generationStarted'));
                pollShotImageTask(res.data.task_id, creation.uuid);
            } else {
                 setIsGeneratingShotImages(false);
            }
        } catch (error: any) {
            console.error("Failed to start shot image generation", error);
            toast.error(error.message || t('error'));
            setIsGeneratingShotImages(false);
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
                            setCreation(creationRes.data);
                        }
                    } else if (status === 'FAILURE' || status === 'REVOKED') {
                        toast.error(t('generationFailed'));
                        setIsGeneratingShotImages(false);
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

    const handleRegenerateShotImage = async (shotUuid: string, imagePrompt?: string) => {
        if (!shotUuid) return;

        try {
            const res = await shotApi.regenerateShotImage(shotUuid, imagePrompt);
            if (res.data && res.data.task_id) {
                setRegeneratingShots(prev => {
                    const newMap = new Map(prev);
                    newMap.set(shotUuid, res.data.task_id);
                    return newMap;
                });
                toast.success(t('regenerating'));
            }
        } catch (error: any) {
             toast.error(error.message || t('regenerationFailed'));
        }
    };

    const handleShotUpdateSuccess = async () => {
        if (creation?.uuid) {
            const res = await creationApi.queryCreationById(creation.uuid);
            if (res && res.data) {
                setCreation(res.data);
            }
        }
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
                                    }).then(() => console.log("Metadata initialized"));
                                    creationData = initializedCreation;
                                } catch (e) {
                                    console.error("Failed to persist metadata initialization", e);
                                }
                            }
                            
                            setCreation(creationData);
                            setProjectTitle(creationData.title || t('newProject'));

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
                            const charAnalysisStep = creationData.extra_data?.steps?.characterAnalysis;
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
            const duration = shot.duration || 5;

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
                            toast.success("Image regenerated successfully");
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
                            toast.success("Scene image regenerated successfully");
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

        regeneratingShots.forEach((taskId, shotId) => {
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
                                }
                            }
                            toast.success("Shot image regenerated successfully");
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
            const project = useTimelineStore.getState().project;
            
            const updateData: Partial<ICreation> = {
                timeline_config: project,
            };

            await creationApi.updateCreation(creation.uuid || taskId, updateData);
            toast.success(t('saveSuccess'));
        } catch (error) {
            console.error("Failed to save:", error);
            toast.error(t('saveFailed'));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
                <div className="w-full max-w-md px-8 text-center">
                    <div className="relative mb-8 flex justify-center">
                        <Loader2 className="w-16 h-16 animate-spin text-blue-500 opacity-20" />
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-blue-500">
                            {progress}%
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {t('generatingDynamicComic')}
                    </h2>
                    <p className="text-slate-400 mb-8 whitespace-pre-wrap min-h-[3em]">
                        {statusMessage}
                    </p>
                </div>
            </div>
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
        <div className="h-screen w-full flex flex-col bg-slate-950 font-sans text-slate-200">
            {/* Header */}
            <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 pl-16 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={projectTitle}
                                    onChange={(e) => setProjectTitle(e.target.value)}
                                    className="h-7 text-sm bg-slate-800 border-slate-700 text-white w-64"
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
                                <h1 className="text-sm font-bold text-white tracking-tight">{projectTitle}</h1>
                                <Pencil size={12} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Dynamic Comic Editor</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-purple-600/50 hover:bg-purple-900/30 text-purple-400 text-xs h-8 gap-2"
                        onClick={handleLoadTestMedia}
                    >
                        <TestTube2 size={14} />
                        加载测试媒体
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs h-8 gap-2"
                        onClick={handleSave}
                    >
                        <Save size={14} />
                        {t('save') || "保存"}
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8">
                        {t('exportVideo')}
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Section: Preview & Properties */}
                <div className="flex-1 flex min-h-0">
                    {/* Preview Area (Left) */}
                    <div className="flex-1 bg-black flex items-center justify-center relative border-r border-slate-800">
                        <VideoPreview />
                    </div>

                    {/* Properties Panel (Right) */}
                    <div className="w-[40%] bg-slate-900 flex flex-col border-l border-slate-800 shrink-0">
                        <div className="p-2">
                            <CustomTabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                                variant="segmented"
                                items={[
                                    {
                                        value: "characters",
                                        label: <div className="flex items-center gap-2"><User size={14} /><span>{t('characters')}</span></div>,
                                        content: null
                                    },
                                    {
                                        value: "scenes",
                                        label: <div className="flex items-center gap-2"><LucideMap size={14} /><span>{t('scenes')}</span></div>,
                                        content: null
                                    },
                                    {
                                        value: "shots",
                                        label: <div className="flex items-center gap-2"><ImageIcon size={14} /><span>{t('shots')}</span></div>,
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
                                            const isCharacterAnalysisProcessing = creation?.extra_data?.steps?.characterAnalysis?.status === 'processing';
                                            const hasNoCharacters = !!creation?.characters && creation.characters.length === 0;
                                            if (isCharacterAnalysisProcessing && hasNoCharacters) {
                                                return (
                                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                                        <div className="p-4 bg-slate-800/50 rounded-full">
                                                            <Loader2 size={28} className="text-blue-500 animate-spin" />
                                                        </div>
                                                        <div className="text-center space-y-1">
                                                            <p className="text-slate-300 font-medium">{t('analyzingCharacters')}</p>
                                                            <p className="text-slate-600 text-xs max-w-[260px] mx-auto">{t('analyzeCharactersDescription')}</p>
                                                        </div>
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
                                                    disabled={isGenerating}
                                                    className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-xs h-8 shadow-lg shadow-orange-500/20"
                                                    size="sm"
                                                >
                                                    <WandSparkles className="w-3 h-3 mr-2" />
                                                    {isGenerating ? t('generating') : t('generateAllImages')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isGenerating}
                                                    className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs h-8"
                                                    onClick={() => {
                                                        setConfirmDialog({
                                                            open: true,
                                                            title: t('reanalyzeConfirmTitle'),
                                                            description: t('reanalyzeConfirmDesc'),
                                                            onConfirm: () => creation && handleAnalyzeCharacters(creation),
                                                            variant: 'destructive'
                                                        });
                                                    }}
                                                    title={t('reanalyze')}
                                                >
                                                    <Sparkles size={12} />
                                                </Button>
                                            </div>
                                        )}

                                        {/* Appearance Characters */}
                                        {creation?.characters && creation.characters.filter((c: ICharacter) => c.body !== null && c.body !== "").length > 0 && (
                                            <div className="space-y-2 mb-6">
                                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                                                    <User size={10} />
                                                    {t('appearanceCharacters')}
                                                </h3>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                                                    {creation.characters.filter((c: ICharacter) => c.body !== null && c.body !== "").map((char: ICharacter) => (
                                                        <Card key={char.uuid || char.character_id} className="bg-slate-800/40 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700 transition-all group p-2">
                                                            <div className="flex gap-3 items-center">
                                                                {/* Avatar / Image */}
                                                                <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-slate-800 border border-slate-700 relative group-hover:border-slate-600 transition-colors">
                                                                    {regeneratingCharacters.has(char.uuid || String(char.character_id)) || char.status === 'generating' ? (
                                                                        <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                                                                            <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                                                                        </div>
                                                                    ) : char.image_url ? (
                                                                        <div className="relative w-full h-full group/image">
                                                                            <img 
                                                                                src={char.image_url} 
                                                                                alt={char.name} 
                                                                                className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500"
                                                                                onClick={() => handleImagePreview(char.image_url!)}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50">
                                                                            <ImageIcon size={14} className="opacity-30 mb-0.5" />
                                                                            <span className="text-[8px] opacity-50 scale-90">待生成</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <h4 className="font-medium text-slate-200 text-sm truncate leading-none">{char.name}</h4>
                                                                        <div className="flex items-center gap-1.5">
                                                                            {(regeneratingCharacters.has(char.uuid || String(char.character_id)) || char.status === 'generating') && (
                                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-orange-500/30 text-orange-400/70 shrink-0 font-normal">
                                                                                    {tC('generating')}
                                                                                </Badge>
                                                                            )}
                                                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-slate-700 text-slate-500 shrink-0 font-normal">
                                                                                {t('person')}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Actions */}
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-orange-400/80 hover:text-orange-400 hover:bg-slate-700/50 rounded-full"
                                                                        onClick={() => handleRegenerateSingleCharacter(char)}
                                                                        disabled={regeneratingCharacters.has(char.uuid || String(char.character_id)) || char.status === 'generating'}
                                                                        title={t('regenerate')}
                                                                    >
                                                                        <RotateCcw size={14} className={(regeneratingCharacters.has(char.uuid || String(char.character_id)) || char.status === 'generating') ? "animate-spin" : ""} />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-full"
                                                                        onClick={() => handleEditCharacter(char)}
                                                                        title={t('edit')}
                                                                    >
                                                                        <PenLine size={14} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </Card>
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
                                                        <Card key={char.uuid || char.character_id} className="bg-slate-900/30 border-slate-800/50 hover:bg-slate-900/50 hover:border-blue-900/30 transition-all p-2">
                                                            <div className="flex gap-2.5 items-center">
                                                                {/* Icon */}
                                                                <div className="w-8 h-8 shrink-0 rounded-full bg-blue-500/5 flex items-center justify-center text-blue-400/80 border border-blue-500/10">
                                                                    <Volume2 size={12} />
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <h4 className="font-medium text-slate-300 text-xs truncate leading-none">{char.name}</h4>
                                                                        <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-blue-500/5 text-blue-400/70 hover:bg-blue-500/10 font-normal">
                                                                            {t('voice')}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-500 line-clamp-1 truncate leading-tight">
                                                                        {char.voice_description || t('noVoiceDescription')}
                                                                    </p>
                                                                </div>

                                                                {/* Edit */}
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-6 w-6 text-slate-600 hover:text-slate-300 hover:bg-slate-800/50 rounded-full"
                                                                    onClick={() => handleEditCharacter(char)}
                                                                >
                                                                    <PenLine size={12} />
                                                                </Button>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Fallback Empty State */}
                                        {(() => {
                                            const isCharacterAnalysisProcessing = creation?.extra_data?.steps?.characterAnalysis?.status === 'processing';
                                            const hasNoCharacters = !!creation?.characters && creation.characters.length === 0;
                                            if (!hasNoCharacters) return null;
                                            if (isCharacterAnalysisProcessing) return null;
                                            return (
                                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                <div className="p-4 bg-slate-800/50 rounded-full">
                                                    <User size={32} className="text-slate-600" />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-slate-400 font-medium">{t('noCharacterData')}</p>
                                                    <p className="text-slate-600 text-xs max-w-[200px] mx-auto">{t('analyzeCharactersDescription')}</p>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => creation && handleAnalyzeCharacters(creation)}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white gap-2 mt-2"
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
                                        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                                            <DialogContent showCloseButton={false} className="bg-transparent border-0 shadow-none max-w-[90vw] max-h-[90vh] p-0 flex items-center justify-center">
                                                {previewImage && (
                                                    <img 
                                                        src={previewImage} 
                                                        alt="Preview" 
                                                        className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                                                    />
                                                )}
                                                <button 
                                                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                                    onClick={() => setIsPreviewOpen(false)}
                                                >
                                                    <X size={20} />
                                                </button>
                                            </DialogContent>
                                        </Dialog>
                                        
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
                                    </>
                                )}

                                {activeTab === "scenes" && (
                                    <>
                                        {/* Empty State / Parse Button */}
                                        {(!creation?.scenes || creation.scenes.length === 0) && (
                                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                <div className="p-4 bg-slate-800/50 rounded-full">
                                                    <LucideMap size={32} className="text-slate-600" />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-slate-400 font-medium">{t('noSceneData')}</p>
                                                    <p className="text-slate-600 text-xs max-w-[200px] mx-auto">{t('analyzeScenesDescription')}</p>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    onClick={handleAnalyzeScenes}
                                                    disabled={isAnalyzingScenes}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white gap-2 mt-2"
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
                                                        disabled={isGeneratingSceneImages}
                                                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text白 text-xs h-8 shadow-lg shadow-blue-500/20"
                                                        size="sm"
                                                    >
                                                        <WandSparkles className="w-3 h-3 mr-2" />
                                                        {isGeneratingSceneImages ? t('generating') : t('generateAllSceneImages')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={isGeneratingSceneImages}
                                                        className="border-slate-700 hover:bg-slate-800 text-slate-300 text-xs h-8"
                                                        onClick={() => {
                                                            setConfirmDialog({
                                                                open: true,
                                                                title: t('regenerateConfirmTitle') || "确认重新生成？",
                                                                description: t('regenerateConfirmDesc') || "重新生成后，当前的图片将无法找回。确定要继续吗？",
                                                                onConfirm: async () => {
                                                                    if (!creation?.uuid) return;
                                                                    try {
                                                                        const res = await creationApi.generateSceneImages(creation.uuid, true);
                                                                        if (res && res.data && res.data.task_id) {
                                                                            toast.success(t('regenerating') || "重新生成中...");
                                                                        }
                                                                    } catch (error: any) {
                                                                        toast.error(error.message || "Regeneration failed");
                                                                    }
                                                                },
                                                                variant: 'destructive'
                                                            });
                                                        }}
                                                    >
                                                        {t('regenerateAll') || "重新生成全部"}
                                                    </Button>
                                                </div>

                                                {creation.scenes.map((scene: any, idx: number) => (
                                                    <div 
                                                        key={scene.uuid || scene.scene_id}
                                                        onClick={() => setEditingScene(scene)}
                                                    >
                                                        <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-700 relative">
                                                            <div className="w-16 h-9 rounded bg-slate-700 overflow-hidden shrink-0 relative">
                                                                {regeneratingScenes.has(scene.uuid || String(scene.scene_id)) || scene.status === 'generating' ? (
                                                                    <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                                                                        <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                                                                    </div>
                                                                ) : scene.image_url ? (
                                                                    <img src={scene.image_url} alt={scene.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                                                                        <LucideMap size={16} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-sm font-medium text-slate-200 truncate">{t('sceneIndex', { index: idx + 1 })}: {scene.location}</div>
                                                                    {regeneratingScenes.has(scene.uuid || String(scene.scene_id)) && (
                                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-orange-500/30 text-orange-400/70 shrink-0 font-normal">
                                                                            {tC('generating')}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-slate-500 truncate">{scene.atmosphere} | {scene.time_setting}</div>
                                                            </div>
                                                            
                                                            {/* Hover Actions */}
                                                            <div className="hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2 gap-1 bg-slate-800/80 p-1 rounded-md backdrop-blur-sm">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-orange-400/80 hover:text-orange-400 hover:bg-slate-700/50 rounded-full"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRegenerateSceneImage(scene.uuid || String(scene.scene_id));
                                                                    }}
                                                                    disabled={regeneratingScenes.has(scene.uuid || String(scene.scene_id)) || scene.status === 'generating'}
                                                                    title={t('regenerate')}
                                                                >
                                                                    <RotateCcw size={12} className={(regeneratingScenes.has(scene.uuid || String(scene.scene_id)) || scene.status === 'generating') ? "animate-spin" : ""} />
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
                                            />
                                        )}
                                    </>
                                )}

                                {activeTab === "shots" && (
                                    <>
                                        {/* Empty State */}
                                        {(!creation?.scenes || creation.scenes.every((s: any) => !s.shots || s.shots.length === 0)) && (
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
                                                    <Button
                                                        onClick={handleGenerateShotImages}
                                                        disabled={isGeneratingShotImages}
                                                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs h-8 shadow-lg shadow-purple-500/20"
                                                        size="sm"
                                                    >
                                                        <WandSparkles className="w-3 h-3 mr-2" />
                                                        {isGeneratingShotImages ? t('generating') : t('generateAllShotImages')}
                                                    </Button>
                                                     {/* Re-analyze Button */}
                                                     <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={handleAnalyzeShots}
                                                        disabled={isAnalyzingShots}
                                                        className="border-slate-700 hover:bg-slate-800 text-slate-400 text-xs h-8"
                                                        title={t('reanalyzeShotsOverwrite')}
                                                    >
                                                        {isAnalyzingShots ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles size={12} />}
                                                    </Button>
                                                </div>

                                                {creation.scenes.map((scene: any, idx: number) => {
                                                     if (!scene.shots || scene.shots.length === 0) return null;
                                                     
                                                     // Sort shots by shot_number
                                                    const sortedShots = [...(scene.shots || [])].sort((a: any, b: any) => a.shot_number - b.shot_number);

                                                     return (
                                                        <div key={idx} className="space-y-2 mb-6">
                                                            <div className="flex items-center gap-2 px-1">
                                                                <Badge variant="outline" className="text-[10px] bg-slate-900/50 border-slate-700 text-slate-400">
                                                                    {t('sceneIndex', { index: idx + 1 })}
                                                                </Badge>
                                                                <span className="text-xs font-medium text-slate-500 truncate max-w-[200px]">{scene.location}</span>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {sortedShots.map((shot: any, shotIdx: number) => (
                                                                    <div 
                                                                        key={shot.uuid || shotIdx}
                                                                        className="group flex gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-700 relative bg-slate-900/20"
                                                                        onClick={() => setEditingShot(shot)}
                                                                    >
                                                                        {/* Image Thumbnail */}
                                                                        <div className="w-20 h-12 rounded bg-slate-800 overflow-hidden shrink-0 relative border border-slate-800">
                                                                            {regeneratingShots.has(shot.uuid || String(shot.shot_id)) || shot.status === 'generating' ? (
                                                                                <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                                                                                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                                                                                </div>
                                                                            ) : shot.image_url ? (
                                                                                <img src={shot.image_url} alt={`Shot ${shot.shot_number}`} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                                                                                    <ImageIcon size={16} className="opacity-50" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* Content */}
                                                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                                                            <div className="flex items-center gap-2">
                                                                                 <span className="text-[10px] font-bold text-slate-500">#{shot.shot_number}</span>
                                                                                 <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-slate-800 text-slate-400 shrink-0 font-normal">
                                                                                     {scene.title || scene.location || `Scene ${idx + 1}`}
                                                                                 </Badge>
                                                                                 {(regeneratingShots.has(shot.uuid || String(shot.shot_id)) || shot.status === 'generating') && (
                                                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-orange-500/30 text-orange-400/70 shrink-0 font-normal">
                                                                                        {tC('generating')}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                                                                {shot.description || shot.content || (shot.extra_data?.ai_output?.["简要剧情"]) || t('noDescription')}
                                                                            </div>
                                                                        </div>

                                                                        {/* Hover Actions */}
                                                                        <div className="hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2 gap-1 bg-slate-800/90 p-1 rounded-md backdrop-blur-sm shadow-xl border border-slate-700/50">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-orange-400/80 hover:text-orange-400 hover:bg-slate-700/50 rounded-full"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleRegenerateShotImage(shot.uuid || String(shot.shot_id));
                                                                                }}
                                                                                disabled={regeneratingShots.has(shot.uuid || String(shot.shot_id)) || shot.status === 'generating'}
                                                                                title={t('regenerate')}
                                                                            >
                                                                                <RotateCcw size={12} className={(regeneratingShots.has(shot.uuid || String(shot.shot_id)) || shot.status === 'generating') ? "animate-spin" : ""} />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-blue-400/80 hover:text-blue-400 hover:bg-slate-700/50 rounded-full"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingShot(shot);
                                                                                }}
                                                                                title={t('edit')}
                                                                            >
                                                                                <Edit2 size={12} />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                     );
                                                })}
                                            </div>
                                        )}

                                        {editingShot && (
                                            <ShotEditModal
                                                isOpen={!!editingShot}
                                                onClose={() => setEditingShot(null)}
                                                shot={editingShot}
                                                availableCharacters={creation?.characters || []}
                                                availableScenes={creation?.scenes || []}
                                                onSuccess={handleShotUpdateSuccess}
                                                onRegenerateImage={handleRegenerateShotImage}
                                                isRegenerating={regeneratingShots.has(editingShot.uuid || String(editingShot.shot_id)) || editingShot.status === 'generating'}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Bottom Section: Timeline */}
                <div className="h-[40%] min-h-[300px] border-t border-slate-800 bg-slate-900 shrink-0">
                    <Timeline />
                </div>
            </div>
        </div>
    );
}
