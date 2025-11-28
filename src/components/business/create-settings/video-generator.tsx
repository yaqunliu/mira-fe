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

  // 根据 creation 状态初始化组件阶段
  useEffect(() => {
    // 优先检查是否有正在执行的任务（从props传入的currentTaskId）
    // 有 currentTaskId 说明有任务正在进行，无论 status 是什么都应该恢复轮询
    // 即使有 initialVideoUrl，如果有任务ID，说明还在生成中，应该继续轮询任务状态
    if (currentTaskId) {
      setTaskId(currentTaskId);
      setStage("generating");
      console.log(`[VideoGenerator] 恢复任务轮询: taskId=${currentTaskId}`);
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
      return;
    }

    // 没有任务也没有视频URL时，根据 creation 状态判断
    switch (creationStatus) {
      case CreationStatus.COMPLETED:
      case CreationStatus.VIDEO_GENERATED:
        // 这些状态应该有视频数据，如果没有可能数据还没加载
        if (initialVideoUrl) {
          setStage("completed");
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
  }, [creationStatus, initialAudioUrl, initialVideoUrl, currentTaskId]);

  // 获取creation数据，用于获取voice_id和current_task_id
  const { data: creationData, refetch: refetchCreation } = useQuery({
    queryKey: ["creation", creationId, "voice"],
    queryFn: async () => {
      console.log(`[VideoGenerator] 获取creation数据: ${creationId}`);
      const response = await creationApi.queryCreationById(creationId);
      console.log(`[VideoGenerator] creation数据:`, response?.data);
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
    
    // 如果creation数据中有current_task_id，且当前没有设置taskId或stage不是generating，则恢复轮询
    if (taskIdFromCreation && (!taskId || stage !== "generating")) {
      console.log(`[VideoGenerator] 检测到任务ID，恢复轮询: taskId=${taskIdFromCreation}`);
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
    console.log(`[VideoGenerator] useEffect触发 - stage: ${stage}, voice_id: ${creationData?.voice_id}, selectedVoiceId: ${selectedVoiceId}`);
    
    // 加载已保存的语速
    if (creationData?.voice_speed !== undefined && creationData.voice_speed !== null) {
      setVoiceSpeed(creationData.voice_speed);
    }
    
    // 在idle或selecting阶段，如果creation数据中有voice_id，就加载并显示
    if ((stage === "idle" || stage === "selecting") && creationData?.voice_id) {
      const voiceId = creationData.voice_id;
      console.log(`[VideoGenerator] 找到voice_id: ${voiceId}`);
      
      // 从URL中提取voice_id（如果格式是 /api/v1/voices/xxx）
      const extractedVoiceId = voiceId.includes('/api/v1/voices/') 
        ? voiceId.replace('/api/v1/voices/', '')
        : voiceId;
      
      console.log(`[VideoGenerator] 提取的voice_id: ${extractedVoiceId}`);
      
      // 如果已经选中了相同的语音且已经有详情，就不重复加载
      if (selectedVoiceId === extractedVoiceId && selectedVoice?.id === extractedVoiceId) {
        console.log(`[VideoGenerator] 语音已加载，跳过`);
        return;
      }
      
      console.log(`[VideoGenerator] 开始获取语音详情: ${extractedVoiceId}`);
      // 获取语音详情并显示
      voiceApi.getVoiceDetail(extractedVoiceId)
        .then((voice) => {
          console.log(`[VideoGenerator] 语音详情获取成功:`, voice);
          if (voice && voice.id) {
            setSelectedVoiceId(voice.id);
            setSelectedVoice(voice);
            console.log(`[VideoGenerator] 加载上次使用的语音: ${voice.title}`);
          } else {
            console.error(`[VideoGenerator] 语音数据格式错误:`, voice);
          }
        })
        .catch((error) => {
          console.error("获取语音详情失败:", error);
          // 失败时不影响用户手动选择
        });
    } else if ((stage === "idle" || stage === "selecting") && !creationData?.voice_id) {
      console.log(`[VideoGenerator] 没有找到voice_id`);
    }
  }, [creationData?.voice_id, creationData?.voice_speed, stage, selectedVoiceId, selectedVoice]);

  // 处理语音选择
  const handleVoiceSelect = useCallback((voiceId: string, voice: VoiceItem) => {
    setSelectedVoiceId(voiceId);
    setSelectedVoice(voice);
    setErrorMessage(null);
  }, []);

  // 任务成功后获取最新的创作数据
  const fetchLatestCreationData = useCallback(async () => {
    if (!creationId) return;
    
    try {
      const response = await creationApi.queryCreationById(creationId);
      const creation = response?.data;
      
      if (creation?.audio_url) {
        setAudioUrl(creation.audio_url);
      }
      
      // 只有视频生成成功后才显示完成状态
      if (creation?.video_url) {
        setVideoUrl(creation.video_url);
        onVideoGenerated?.(creation.video_url);
        setStage("completed");
        toast.success(t("video.videoGenerationSuccess"));
      } else {
        // 视频还没生成完，继续保持生成状态
        toast.info(t("video.audioGenerationSuccess"));
      }
    } catch (error) {
      console.error("获取创作数据失败:", error);
      toast.error(t("errors.serverError"));
    }
  }, [creationId, onVideoGenerated]);

  // 轮询任务状态
  const { data: taskData } = useQuery({
    queryKey: ["audioTask", taskId],
    queryFn: async () => {
      const response = await taskApi.queryTaskStatus(taskId as string);
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
        fetchLatestCreationData();
        return false;
      }
      if (status === TaskStatus.FAILURE) {
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

  // 开始生成
  const handleStartGeneration = async () => {
    if (!selectedVoiceId || !creationId) {
      toast.error(t("video.selectVoice"));
      return;
    }

    setStage("generating");
    setErrorMessage(null);
    setProgress(null);

    try {
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
      } else {
        throw new Error(t("creation.taskIdNotFound"));
      }
    } catch (error) {
      console.error("启动生成任务失败:", error);
      setStage("failed");
      setErrorMessage(error instanceof Error ? error.message : t("video.generationFailedRetry"));
      toast.error(error instanceof Error ? error.message : t("video.generationFailedRetry"));
    }
  };

  // 重试生成（重新生成时弹出对话框询问是否重新生成音频）
  const handleRetry = () => {
    console.log(`[VideoGenerator] handleRetry 被调用`);
    setShowRegenerateDialog(true);
  };

  // 确认重新生成（不重新生成音频）
  const handleConfirmRegenerate = async () => {
    setShowRegenerateDialog(false);
    setForceRegenerateAudio(false);
    
    // 如果有已选择的语音，直接重新生成，不跳转
    if (selectedVoiceId) {
      // 重置状态但保持语音选择
      setTaskId(null);
      setProgress(null);
      setErrorMessage(null);
      setAudioUrl(null);
      setVideoUrl(null);
      // 直接调用生成函数
      await handleStartGeneration();
    } else {
      // 没有已选择的语音，跳转到选择界面
      setStage("idle");
      setTaskId(null);
      setProgress(null);
      setErrorMessage(null);
      setAudioUrl(null);
      setVideoUrl(null);
      // 强制重新获取creation数据，以便获取最新的voice_id
      await new Promise(resolve => setTimeout(resolve, 50));
      refetchCreation();
    }
  };

  // 确认重新生成音频（跳转到音频选择界面）
  const handleConfirmRegenerateAudio = () => {
    setShowRegenerateDialog(false);
    setForceRegenerateAudio(true);
    setStage("selecting");
    setTaskId(null);
    setProgress(null);
    setErrorMessage(null);
    setAudioUrl(null);
    setVideoUrl(null);
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
    <div className="w-full max-w-4xl mx-auto space-y-6 h-[calc(100vh-180px)] overflow-y-auto pb-24">
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
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20">
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
          <Card className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20">
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
              创作完成啦～
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
                      <span className="font-medium text-sm">音频预览</span>
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
                <span className="font-medium text-sm">视频预览</span>
              </div>
              <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-auto aspect-video"
                >
                  您的浏览器不支持视频播放。
                </video>
              </div>
            </div>
          )}

          {/* 没有视频和音频时的提示 */}
          {!videoUrl && !audioUrl && (
            <div className="text-center py-8 text-muted-foreground">
              <p>视频和音频数据加载中...</p>
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
                onClick={handleStartGeneration}
                disabled={!selectedVoiceId}
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
