"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Volume2,
  Wand,
  Play,
  Pause,
  Check,
  Video,
  Music,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VoiceSelector } from "./voice-selector";
import creationApi from "@/lib/api/creation";
import taskApi from "@/lib/api/task";
import voiceApi from "@/lib/api/voice";
import type { VoiceItem } from "@/types/voice";
import { TaskStatus } from "@/types";
import { CreationStatus } from "@/types/creation";
import { useTranslations } from "next-intl";
import { useTaskSubmission } from "@/hooks/use-task-submission";

interface VideoGeneratorProps {
  creationId: string;
  // creation 数据，用于判断初始状态
  creationStatus?: CreationStatus;
  initialAudioUrl?: string;
  initialVideoUrl?: string;
  currentTaskId?: string;
  onVideoGenerated?: (videoUrl: string) => void;
}

// 任务进度类型
interface TaskProgress {
  total: number;
  completed: number;
  success_count: number;
  failed_count: number;
  status: string;
  stage: string;
}

// 任务状态响应类型
interface TaskStatusResponse {
  task_id: string;
  task_type: string;
  status: string;
  message: string;
  progress: TaskProgress | null;
  resource: {
    type?: string;
    creation_id?: number;
    creation?: {
      creation_id: number;
      title: string;
      status: string;
      video_url?: string;
      audio_url?: string;
    };
  } | null;
  error?: string;
}

// 生成阶段
type GenerationStage = "idle" | "selecting" | "generating" | "completed" | "failed";

export function VideoGenerator({
  creationId,
  creationStatus,
  initialAudioUrl,
  initialVideoUrl,
  currentTaskId,
  onVideoGenerated,
}: VideoGeneratorProps) {
  const t = useTranslations();
  // 语音选择状态
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceItem | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1);

  // 任务状态
  const [taskId, setTaskId] = useState<string | null>(currentTaskId || null);
  const [stage, setStage] = useState<GenerationStage>("idle");
  const [progress, setProgress] = useState<TaskProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 结果数据
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null);

  // 音频预览状态
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 重新生成对话框状态
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [forceRegenerateAudio, setForceRegenerateAudio] = useState(false);
  
  // 标记是否正在手动触发生成（防止 useEffect 重置 stage）
  const isManuallyGeneratingRef = useRef(false);
  // 标记是否已经完成视频生成（防止重复调用和重复提示）
  const isVideoCompletedRef = useRef(false);

  // 根据 creation 状态初始化组件阶段
  // 注意：如果 stage 已经是 "generating" 或正在手动生成，不要重置它
  useEffect(() => {
    // 如果正在手动生成中，不要重置 stage（避免打断用户操作）
    if (isManuallyGeneratingRef.current || stage === "generating") {
      return;
    }

    // 优先检查是否有正在执行的任务（从props传入的currentTaskId）
    // 有 currentTaskId 说明有任务正在进行，无论 status 是什么都应该恢复轮询
    // 即使有 initialVideoUrl，如果有任务ID，说明还在生成中，应该继续轮询任务状态
    if (currentTaskId) {
      setTaskId(currentTaskId);
      setStage("generating");
      // 即使有初始URL，也先设置，但保持生成状态
      if (initialAudioUrl) setAudioUrl(initialAudioUrl);
      if (initialVideoUrl) setVideoUrl(initialVideoUrl);
      return;
    }

    // 没有任务时，检查是否有视频URL，有则显示完成状态
    if (initialVideoUrl) {
      setStage("completed");
      if (initialAudioUrl) setAudioUrl(initialAudioUrl);
      setVideoUrl(initialVideoUrl);
      // 标记已完成
      isVideoCompletedRef.current = true;
      return;
    }

    // 没有任务也没有视频URL时，根据 creation 状态判断
    switch (creationStatus) {
      case CreationStatus.COMPLETED:
      case CreationStatus.VIDEO_GENERATED:
        // 这些状态应该有视频数据，如果没有可能数据还没加载
        if (initialVideoUrl) {
          setStage("completed");
          // 标记已完成
          isVideoCompletedRef.current = true;
        } else {
          // 没有视频URL，保持 idle 状态让用户重新操作
          setStage("idle");
        }
        break;
      case CreationStatus.AUDIO_GENERATED:
      case CreationStatus.VOICE_SELECTED:
        // 状态已更新但没有 taskId，可能任务已完成
        setStage("idle");
        break;
      default:
        setStage("idle");
        break;
    }
  }, [creationStatus, initialAudioUrl, initialVideoUrl, currentTaskId, stage]);

  // 获取creation数据，用于获取voice_id和current_task_id
  const { data: creationData, refetch: refetchCreation } = useQuery({
    queryKey: ["creation", creationId, "voice"],
    queryFn: async () => {
      const response = await creationApi.queryCreationById(creationId);
      return response?.data;
    },
    enabled: !!creationId,
    // 如果有任务在进行，定期刷新以获取最新状态
    refetchInterval: (query) => {
      const data = query.state.data;
      // 如果有current_task_id，说明有任务在进行，定期刷新
      if (data?.current_task_id) {
        return 5000; // 每5秒刷新一次
      }
      return false;
    },
  });

  // 监听creationData中的current_task_id，如果检测到有任务在进行，自动恢复轮询
  useEffect(() => {
    const taskIdFromCreation = creationData?.current_task_id;
    
    // 如果已经有视频URL，说明已经完成，不应该恢复轮询
    if (creationData?.video_url || isVideoCompletedRef.current) {
      return;
    }
    
    // 如果creation数据中有current_task_id，且当前没有设置taskId或stage不是generating，则恢复轮询
    if (taskIdFromCreation && (!taskId || stage !== "generating")) {
      setTaskId(taskIdFromCreation);
      setStage("generating");
      // 如果有音频或视频URL，也设置一下
      if (creationData?.audio_url && !audioUrl) {
        setAudioUrl(creationData.audio_url);
      }
      if (creationData?.video_url && !videoUrl) {
        setVideoUrl(creationData.video_url);
      }
    }
  }, [creationData?.current_task_id, taskId, stage, creationData?.audio_url, creationData?.video_url, audioUrl, videoUrl]);

  // 自动加载并显示上次使用的语音信息和语速
  useEffect(() => {
    // 加载已保存的语速
    if (creationData?.voice_speed !== undefined && creationData.voice_speed !== null) {
      setVoiceSpeed(creationData.voice_speed);
    }
    
    // 在idle或selecting阶段，如果creation数据中有voice_id，就加载并显示
    if ((stage === "idle" || stage === "selecting") && creationData?.voice_id) {
      const voiceId = creationData.voice_id;
      
      // 从URL中提取voice_id（如果格式是 /api/v1/voices/xxx）
      const extractedVoiceId = voiceId.includes('/api/v1/voices/') 
        ? voiceId.replace('/api/v1/voices/', '')
        : voiceId;
      
      // 如果已经选中了相同的语音且已经有详情，就不重复加载
      if (selectedVoiceId === extractedVoiceId && selectedVoice?.id === extractedVoiceId) {
        return;
      }
      
      // 获取语音详情并显示
      voiceApi.getVoiceDetail(extractedVoiceId)
        .then((voice) => {
          if (voice && voice.id) {
            setSelectedVoiceId(voice.id);
            setSelectedVoice(voice);
          }
        })
        .catch((error) => {
          console.error("获取语音详情失败:", error);
          // 失败时不影响用户手动选择
        });
    }
  }, [creationData?.voice_id, creationData?.voice_speed, stage, selectedVoiceId, selectedVoice]);

  // 处理语音选择
  const handleVoiceSelect = useCallback((voiceId: string, voice: VoiceItem) => {
    setSelectedVoiceId(voiceId);
    setSelectedVoice(voice);
    setErrorMessage(null);
  }, []);

  // 处理任务完成后的数据更新（只调用一次，不再重试）
  const handleTaskComplete = useCallback(async () => {
    if (!creationId || isVideoCompletedRef.current) {
      return;
    }

    // 刷新 creation 数据（使用 React Query 的 refetch，自动更新缓存）
    const result = await refetchCreation();
    const creation = result.data;

    if (creation?.audio_url) {
      setAudioUrl(creation.audio_url);
    }

    // 只有视频生成成功后才显示完成状态
    if (creation?.video_url) {
      // 标记已完成，防止重复调用
      isVideoCompletedRef.current = true;
      // 清除 taskId，停止轮询
      setTaskId(null);
      setVideoUrl(creation.video_url);
      setStage("completed");
      // 只在第一次完成时显示提示和调用回调
      onVideoGenerated?.(creation.video_url);
      toast.success(t("video.videoGenerationSuccess"));
    } else if (creation?.audio_url && !audioUrl) {
      // 如果只有音频但没有视频，显示音频生成成功提示
      toast.info(t("video.audioGenerationSuccess"));
    }
  }, [creationId, refetchCreation, onVideoGenerated, audioUrl, t]);

  // 轮询任务状态
  const { data: taskData } = useQuery({
    queryKey: ["audioTask", taskId],
    queryFn: async () => {
      const response = await taskApi.queryTaskStatus(taskId as string);
      // response 本身就是 {data: {...}, message: string}
      return response.data as unknown as TaskStatusResponse;
    },
    enabled: !!taskId && stage === "generating",
    retry: 2,
    refetchInterval: (query) => {
      if (query.state.error) {
        console.error("查询任务状态失败:", query.state.error);
        setStage("failed");
        setErrorMessage("查询任务状态失败，请刷新页面重试");
        return false;
      }

      const status = query.state.data?.status;
      if (status === TaskStatus.SUCCESS) {
        // 任务成功，重新获取创作数据以拿到最新的音视频 URL
        // 重置手动生成标记
        isManuallyGeneratingRef.current = false;
        // 处理任务完成（只调用一次，不再重试）
        handleTaskComplete();
        return false;
      }
      if (status === TaskStatus.FAILURE) {
        // 重置手动生成标记
        isManuallyGeneratingRef.current = false;
        setStage("failed");
        setErrorMessage(query.state.data?.error || t("video.generationFailedRetry"));
        toast.error(t("video.generationFailedRetry"));
        return false;
      }
      return 2000; // 每2秒轮询一次
    },
  });

  // 更新进度
  useEffect(() => {
    if (taskData?.progress) {
      setProgress(taskData.progress);
    }
  }, [taskData]);

  // 开始生成的内部函数
  const startGenerationInternal = useCallback(async () => {
    if (!selectedVoiceId || !creationId) {
      toast.error(t("video.selectVoice"));
      throw new Error(t("video.selectVoice"));
    }

    // 检查音频生成积分
    // 从创作数据中获取所有旁白文本并计算字节数
    let totalTextBytes = 0
    if (creationData?.scenes) {
      const encoder = new TextEncoder()
      creationData.scenes.forEach((scene) => {
        scene.shots?.forEach((shot) => {
          if (shot.narration) {
            totalTextBytes += encoder.encode(shot.narration).length
          }
        })
      })
    }
    
    // 如果没有旁白文本，使用默认估算值
    if (totalTextBytes === 0) {
      totalTextBytes = 5000
    }
    
    const { checkAndNotifyPoints } = await import('@/lib/utils/points-check')
    const pointsAvailable = await checkAndNotifyPoints(
      {
        operation_type: 'generate_audio',
        text_bytes: totalTextBytes,
      },
      t
    )

    if (!pointsAvailable) {
      throw new Error('积分不足')
    }

    setStage("generating");
    setErrorMessage(null);
    setProgress(null);

    toast.info(t("video.audioGenerationStart"));
    const response = await creationApi.selectVoiceAndGenerateAudio(
      creationId,
      selectedVoiceId,
      voiceSpeed,
      forceRegenerateAudio
    );
    const newTaskId = response?.data?.task_id;

    if (newTaskId) {
      setTaskId(newTaskId);
      // 重置强制重新生成标志
      setForceRegenerateAudio(false);
      // 任务已成功启动，重置手动生成标记（之后通过 taskId 管理状态）
      isManuallyGeneratingRef.current = false;
    } else {
      // 任务启动失败，重置手动生成标记
      isManuallyGeneratingRef.current = false;
      throw new Error(t("creation.taskIdNotFound"));
    }
  }, [selectedVoiceId, creationId, creationData, voiceSpeed, forceRegenerateAudio, t]);

  // 使用任务提交 hook 包装生成函数
  const { submit: handleStartGeneration, isSubmitting: isSubmittingGeneration } = useTaskSubmission(
    startGenerationInternal,
    {
      debounceDelay: 500,
      enableDebounce: true,
      onError: (error) => {
        console.error("启动生成任务失败:", error);
        // 重置手动生成标记
        isManuallyGeneratingRef.current = false;
        setStage("failed");
        setErrorMessage(error.message || t("video.generationFailedRetry"));
        toast.error(error.message || t("video.generationFailedRetry"));
      },
    }
  );

  // 重试生成（重新生成时弹出对话框询问是否重新生成音频）
  const handleRetry = () => {
    setShowRegenerateDialog(true);
  };

  // 确认重新生成（只重新生成视频，不重新生成音频）
  const handleConfirmRegenerate = async () => {
    setShowRegenerateDialog(false);
    setForceRegenerateAudio(false);
    
    // 重置状态
    setTaskId(null);
    setProgress(null);
    setErrorMessage(null);
    setAudioUrl(null);
    setVideoUrl(null);
    // 重置完成标记
    isVideoCompletedRef.current = false;
    
    // 获取创作数据（如果还没有，使用快速接口获取）
    let currentCreationData = creationData;
    if (!currentCreationData && creationId) {
      try {
        const response = await creationApi.queryCreationSimple(creationId);
        currentCreationData = response?.data;
      } catch (error) {
        console.error("获取创作数据失败:", error);
        toast.error("获取创作信息失败");
        return;
      }
    }
    
    // 从创作信息中获取 voice_id 和 voice_speed
    if (!currentCreationData?.voice_id) {
      toast.error("创作信息中没有语音ID");
      return;
    }
    
    const voiceId = currentCreationData.voice_id;
    // 从URL中提取voice_id（如果格式是 /api/v1/voices/xxx）
    const voiceIdToUse = voiceId.includes('/api/v1/voices/') 
      ? voiceId.replace('/api/v1/voices/', '')
      : voiceId;
    
    const voiceSpeedToUse = currentCreationData.voice_speed ?? 1;
    
    // 设置语音和语速
    setSelectedVoiceId(voiceIdToUse);
    setVoiceSpeed(voiceSpeedToUse);
    
    // 标记正在手动生成，防止 useEffect 重置 stage
    isManuallyGeneratingRef.current = true;
    
    // 立即设置生成状态，直接显示生成界面
    setStage("generating");
    setErrorMessage(null);
    setProgress(null);
    
    // 直接调用 select-voice 接口（forceRegenerateAudio = false 表示不重新生成音频）
    try {
      toast.info(t("video.audioGenerationStart"));
      const response = await creationApi.selectVoiceAndGenerateAudio(
        creationId,
        voiceIdToUse,
        voiceSpeedToUse,
        false // forceRegenerateAudio = false，不重新生成音频
      );
      
      const newTaskId = response?.data?.task_id;
      if (newTaskId) {
        setTaskId(newTaskId);
        // 任务已成功启动，重置手动生成标记（之后通过 taskId 管理状态）
        isManuallyGeneratingRef.current = false;
      } else {
        throw new Error(t("creation.taskIdNotFound"));
      }
    } catch (error) {
      // 如果生成失败，重置标记和状态
      isManuallyGeneratingRef.current = false;
      setStage("failed");
      setErrorMessage(error instanceof Error ? error.message : t("video.generationFailedRetry"));
      toast.error(error instanceof Error ? error.message : t("video.generationFailedRetry"));
    }
  };

  // 确认重新生成音频（跳转到音频选择界面）
  const handleConfirmRegenerateAudio = () => {
    setShowRegenerateDialog(false);
    setForceRegenerateAudio(true);
    // 标记正在手动操作，防止 useEffect 重置 stage
    isManuallyGeneratingRef.current = true;
    setStage("selecting");
    setTaskId(null);
    setProgress(null);
    setErrorMessage(null);
    setAudioUrl(null);
    setVideoUrl(null);
    // 重置完成标记
    isVideoCompletedRef.current = false;
    // 清空已选择的语音，让用户重新选择
    setSelectedVoiceId(null);
    setSelectedVoice(null);
  };

  // 播放/暂停音频预览
  const toggleAudioPreview = useCallback(() => {
    if (!audioUrl) return;

    if (isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setIsPlayingAudio(false);
      } else {
        audioRef.current.src = audioUrl;
      }
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  }, [audioUrl, isPlayingAudio]);

  // 组件卸载时清理音频
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 计算进度百分比
  const completedCount = progress?.completed ?? progress?.success_count ?? 0;
  const totalCount = progress?.total ?? 0;
  const progressPercent = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 h-[calc(100vh-180px)] overflow-y-auto pb-24">
      {/* 阶段 1: 选择语音 */}
      {(stage === "idle" || stage === "selecting") && (
        <div className="space-y-6 px-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-orange-500" />
              {t("video.selectVoice")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("video.previewAudio")}
            </p>
          </div>

          <VoiceSelector
            selectedVoiceId={selectedVoiceId}
            onSelect={handleVoiceSelect}
          />

          {/* 已选择的语音信息 */}
          {selectedVoice && (
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      已选择: {selectedVoice.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedVoice.author?.nickname || "未知作者"} ·{" "}
                      {selectedVoice.task_count.toLocaleString()} 次使用
                    </p>
                  </div>
                </div>
                
                {/* 语速设置 */}
                <div className="pt-3 border-t border-orange-200 dark:border-orange-800">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">
                        {t("video.voiceSpeed")}
                      </label>
                      <span className="text-sm text-muted-foreground">
                        {voiceSpeed.toFixed(1)}x
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={voiceSpeed}
                          onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 bg-zinc-200 dark:bg-zinc-700"
                          style={{
                            background: `linear-gradient(to right, rgb(251 146 60) 0%, rgb(251 146 60) ${(voiceSpeed / 2) * 100}%, transparent ${(voiceSpeed / 2) * 100}%, transparent 100%)`
                          }}
                        />
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={voiceSpeed}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0 && value <= 2) {
                            setVoiceSpeed(value);
                          }
                        }}
                        className="w-20 text-center"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      调整语音播放速度，范围 0-2，默认 1.0
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 阶段 2: 生成中 - 进度展示 */}
      {stage === "generating" && (
        <div className="space-y-6 px-6">
          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* 标题和状态 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                      <Music className="absolute inset-0 m-auto w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{t("video.generatingAudio")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {progress?.status || t("common.loading")}
                      </p>
                    </div>
                  </div>
                  {selectedVoice && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      {selectedVoice.title}
                    </Badge>
                  )}
                </div>

                {/* 进度条 */}
                <div className="space-y-2">
                  <Progress value={progressPercent} className="h-2" />
                  {progress && (
                    <div className="flex justify-end gap-3 text-xs text-muted-foreground">
                      {(progress.success_count ?? 0) > 0 && (
                        <span className="text-green-600">
                          {progress.success_count} 成功
                        </span>
                      )}
                      {(progress.failed_count ?? 0) > 0 && (
                        <span className="text-red-600">
                          {progress.failed_count} 失败
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 提示 */}
                <p className="text-xs text-center text-muted-foreground">
                  {t("video.generatingPleaseWait")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 阶段 3: 生成失败 */}
      {stage === "failed" && (
        <div className="space-y-6 px-6">
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-700 dark:text-red-400">
                    {t("video.generationFailed")}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {errorMessage || t("errors.generationFailed")}
                  </p>
                </div>
                <Button onClick={handleRetry} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {t("video.retryGeneration")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 阶段 4: 生成完成 - 预览 */}
      {stage === "completed" && (
        <div className="space-y-6 px-6">
          {/* 完成提示 */}
          <div className="flex items-center justify-center gap-2 py-4">
            <Wand className="w-6 h-6 text-orange-500/80" />
            <div className="text-2xl font-bold text-gradient-primary">
              {t("video.creationCompleted")}
            </div>
          </div>

          {/* 音频预览 */}
          {audioUrl && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleAudioPreview}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                      isPlayingAudio
                        ? "bg-orange-500 text-white"
                        : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                    )}
                  >
                    {isPlayingAudio ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{t("video.audioPreview")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("video.previewAudio")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 视频预览 */}
          {videoUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">{t("video.videoPreview")}</span>
              </div>
              <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-auto aspect-video"
                >
                  {t("video.browserNotSupportVideo")}
                </video>
              </div>
            </div>
          )}

          {/* 没有视频和音频时的提示 */}
          {!videoUrl && !audioUrl && (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("video.loadingData")}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-center gap-4 pt-4">
            <Button onClick={handleRetry} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {t("common.regenerate")}
            </Button>
            <Button className="bg-primary-gradient gap-2">
              {t("common.publish")}
            </Button>
          </div>
        </div>
      )}

      {/* 底部操作浮层 - 仅在选择阶段显示 */}
      {(stage === "idle" || stage === "selecting") && selectedVoiceId && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-center">
              <Button
                onClick={() => handleStartGeneration()}
                disabled={isSubmittingGeneration || !selectedVoiceId}
                className="bg-orange-400/80 hover:bg-orange-600 text-white px-8 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
              >
                {t("video.startGenerationButton")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 重新生成对话框 */}
      {showRegenerateDialog && (
        <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("video.regenerateVideoTitle")}</DialogTitle>
              <DialogDescription>
                {t("video.regenerateAudioDescription")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleConfirmRegenerate}
              >
                {t("video.regenerateVideoOnly")}
              </Button>
              <Button
                onClick={handleConfirmRegenerateAudio}
                className="bg-orange-400/80 hover:bg-orange-600 text-white"
              >
                {t("video.regenerateAudioAndVideo")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
