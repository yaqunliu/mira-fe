"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useCreationV2Store } from "@/stores/creation-v2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VoiceSelector } from "@/components/business/create-settings/voice-selector";
import { Timeline } from "@/components/business/timeline";
import { useTimelineStore } from "@/stores/timeline";
import videoApi from "@/lib/api/video";
import shotApi from "@/lib/api/shot";
import sceneApi from "@/lib/api/scene";
import taskApi from "@/lib/api/task";
import { toast } from "sonner";
import { Loader2, Video, AlertCircle, CheckCircle2, RefreshCw, Play, Pause, Mic, Download, Volume2, FolderDown, RotateCcw, Pencil, Clapperboard, Plus } from "lucide-react";
import { TimelineProject, TimelineTrack, TimelineTrackClip, TaskStatus } from "@/types";
import { IScene, IShot } from "@/types/scene";
import { Badge } from "@/components/ui/badge";
import { downloadFile } from "@/lib/utils";

interface FlattenedShot extends IShot {
  sceneTitle: string;
  sceneId: number;
}

export function VideoGeneration() {
  const { creation, updateShot, updateScene } = useCreationV2Store();
  const { importProject, currentTime, isPlaying, seek, play: playTimeline, pause: pauseTimeline } = useTimelineStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Local state for UI that doesn't need to be in store
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Regeneration state
  const [regeneratingShotVideos, setRegeneratingShotVideos] = useState<Map<number, string>>(new Map()); // shotId -> taskId
  const [regeneratingSceneVideos, setRegeneratingSceneVideos] = useState<Map<number, string>>(new Map()); // sceneId -> taskId
  const [regeneratingShotAudios, setRegeneratingShotAudios] = useState<Map<number, string>>(new Map()); // shotId -> taskId
  const [playingShotId, setPlayingShotId] = useState<number | null>(null);
  const [playingAudioShotId, setPlayingAudioShotId] = useState<number | null>(null);
  const shotVideoRefs = useRef<{ [key: number]: HTMLVideoElement }>({});
  const shotAudioRefs = useRef<{ [key: number]: HTMLAudioElement }>({});

  // Sync video player with timeline state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle video time update
  const handleTimeUpdate = () => {
     if (videoRef.current) {
        const time = videoRef.current.currentTime;
        // Sync timeline to video time
        if (Math.abs(time - currentTime) > 0.1) {
            seek(time);
        }
     }
  };

  // Sync timeline seek to video
  useEffect(() => {
     if (videoRef.current) {
         if (Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
             videoRef.current.currentTime = currentTime;
         }
     }
  }, [currentTime]);

  const populateTimeline = useCallback(() => {
    if (!creation?.scenes) return;

    // Check if we already have a project with tracks
    const currentProject = useTimelineStore.getState().project;
    const isProjectEmpty = currentProject.tracks.length === 0 || currentProject.tracks.every(t => t.clips.length === 0);

    if (!isProjectEmpty) {
        // Update existing clips instead of overwriting
        creation.scenes.forEach((scene: IScene) => {
            scene.shots?.forEach((shot: IShot) => {
                const videoClipId = `shot-${shot.shot_id}`;
                const audioClipId = `audio-${shot.shot_id}`;
                
                // Find video track
                const videoTrack = currentProject.tracks.find(t => t.type === 'video');
                if (videoTrack) {
                    const clip = videoTrack.clips.find(c => c.id === videoClipId);
                    if (clip && shot.video_url && clip.url !== shot.video_url) {
                         useTimelineStore.getState().updateClip(videoClipId, { url: shot.video_url });
                    }
                }
                
                // Find audio track
                const audioTrack = currentProject.tracks.find(t => t.type === 'audio');
                if (audioTrack) {
                    const clip = audioTrack.clips.find(c => c.id === audioClipId);
                    if (clip && shot.audio_url && clip.url !== shot.audio_url) {
                         useTimelineStore.getState().updateClip(audioClipId, { url: shot.audio_url });
                    }
                }
            });
        });
        return;
    }

    const videoTrack: TimelineTrack = {
      id: 'video-track-main',
      type: 'video',
      name: '主视频轨道',
      clips: []
    };

    const audioTrack: TimelineTrack = {
      id: 'audio-track-main',
      type: 'audio',
      name: '配音轨道',
      clips: []
    };

    let currentTime = 0;
    let totalDuration = 0;

    creation.scenes.forEach((scene: IScene) => {
      scene.shots?.forEach((shot: IShot) => {
        const duration = shot.video_duration || 5; // Default to 5s if missing
        
        // Add video clip
        if (shot.video_url || shot.image_url) {
          const videoClip: TimelineTrackClip = {
            id: `shot-${shot.shot_id}`,
            url: shot.video_url || shot.image_url || '',
            startInTimeline: currentTime,
            duration: duration,
            sourceStart: 0,
            sourceEnd: duration,
            layer: 1
          };
          videoTrack.clips.push(videoClip);
        }

        // Add audio clip if exists
        if (shot.audio_url) {
          const audioClip: TimelineTrackClip = {
            id: `audio-${shot.shot_id}`,
            url: shot.audio_url,
            startInTimeline: currentTime,
            duration: duration, // Assuming audio matches video duration for now
            sourceStart: 0,
            sourceEnd: duration,
            layer: 1
          };
          audioTrack.clips.push(audioClip);
        }

        currentTime += duration;
      });
    });

    totalDuration = currentTime;

    const project: TimelineProject = {
      projectId: creation.uuid || 'temp-project',
      duration: totalDuration + 5, // Add some buffer
      fps: 30,
      tracks: [videoTrack, audioTrack]
    };

    importProject(project);
  }, [creation, importProject]);

  // Initialize state based on creation data
  useEffect(() => {
    if (creation) {
      // If we have a final video URL, we consider it generated
      // Note: The backend might store the final video URL in a specific field.
      // For now, let's check if we have any shots with video_url
      const hasVideos = creation.scenes?.some((scene: IScene) => 
        scene.shots?.some((shot: IShot) => !!shot.video_url)
      );
      
      if (hasVideos) {
        setHasGenerated(true);
        populateTimeline();
      }
    }
  }, [creation, populateTimeline]);

  // Polling logic
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isGenerating && creation?.uuid) {
      pollInterval = setInterval(async () => {
        try {
          const res = await videoApi.getProgress(creation.uuid);
          const data = res.data;

          // Handle progress which might be undefined or have different structure
          const progressVal = data.progress?.completed 
             ? (data.progress.completed / data.progress.total) * 100 
             : 0;
          
          setProgress(progressVal);
          setStatusMessage(data.message || getStatusMessage(data.status || 'pending'));

          if (data.status === 'completed') {
            setIsGenerating(false);
            setHasGenerated(true);
            // Assuming results contain video_url or we get it from creation update
            setVideoUrl(data.results?.video_url || null);
            toast.success("视频生成完成！");
            populateTimeline();
          } else if (data.status === 'failed') {
            setIsGenerating(false);
            setError("视频生成失败");
            toast.error("视频生成失败");
          }
        } catch (err) {
          console.error("Failed to poll progress:", err);
        }
      }, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isGenerating, creation?.uuid, populateTimeline]);

  // Poll individual shot video regeneration tasks
  useEffect(() => {
    const pollTasks = async () => {
      regeneratingShotVideos.forEach(async (taskId, shotId) => {
        try {
          const res = await taskApi.queryTaskStatus(taskId);
          const status = res.data.status as unknown as string;
          if (status === 'completed' || status === TaskStatus.SUCCESS) {
            setRegeneratingShotVideos(prev => {
              const newMap = new Map(prev);
              newMap.delete(shotId);
              return newMap;
            });
            
            // Get the result video URL
            // Assuming the task result contains the video URL or we need to re-fetch the shot
            // For now, let's assume the task result has `video_url` or `result.video_url`
            const resultVideoUrl = res.data.resource?.video_url || res.data.resource?.url; // Adjust based on actual API response
            
            if (resultVideoUrl) {
                updateShot(shotId, { video_url: resultVideoUrl });
                toast.success("分镜视频重新生成完成");
                // Refresh timeline
                populateTimeline();
            } else {
                // If URL is not in task result, we might need to reload the creation or shot
                // But let's hope update is enough. If not, trigger a reload.
                 toast.success("分镜视频重新生成完成 (请刷新查看)");
            }

          } else if (status === 'failed' || status === TaskStatus.FAILURE) {
            setRegeneratingShotVideos(prev => {
              const newMap = new Map(prev);
              newMap.delete(shotId);
              return newMap;
            });
            toast.error("分镜视频生成失败");
          }
        } catch (e) {
          console.error(e);
        }
      });
    };

    const interval = setInterval(pollTasks, 3000);
    return () => clearInterval(interval);
  }, [regeneratingShotVideos, updateShot, populateTimeline]);

  // Poll shot audio regeneration tasks
  useEffect(() => {
    const pollTasks = async () => {
      regeneratingShotAudios.forEach(async (taskId, shotId) => {
        try {
          const res = await taskApi.queryTaskStatus(taskId);
          const status = res.data.status as unknown as string;
          if (status === 'completed' || status === TaskStatus.SUCCESS) {
            setRegeneratingShotAudios(prev => {
              const newMap = new Map(prev);
              newMap.delete(shotId);
              return newMap;
            });
            
            // Get the result audio URL
            const resultAudioUrl = res.data.resource?.audio_url || res.data.resource?.url;
            
            if (resultAudioUrl) {
                updateShot(shotId, { audio_url: resultAudioUrl });
                toast.success("分镜音频重新生成完成");
                populateTimeline();
            } else {
                 toast.success("分镜音频重新生成完成 (请刷新查看)");
            }

          } else if (status === 'failed' || status === TaskStatus.FAILURE) {
            setRegeneratingShotAudios(prev => {
              const newMap = new Map(prev);
              newMap.delete(shotId);
              return newMap;
            });
            toast.error("分镜音频生成失败");
          }
        } catch (e) {
          console.error(e);
        }
      });
    };

    const interval = setInterval(pollTasks, 3000);
    return () => clearInterval(interval);
  }, [regeneratingShotAudios, updateShot, populateTimeline]);

  // Poll scene video regeneration tasks
  useEffect(() => {
    const pollTasks = async () => {
      regeneratingSceneVideos.forEach(async (taskId, sceneId) => {
        try {
          const res = await taskApi.queryTaskStatus(taskId);
          const status = res.data.status as unknown as string;
          if (status === TaskStatus.SUCCESS || status === 'completed') {
            setRegeneratingSceneVideos(prev => {
              const newMap = new Map(prev);
              newMap.delete(sceneId);
              return newMap;
            });
            
            toast.success("场景视频重新生成完成");
            
            // Refresh scene data
            const scene = creation?.scenes?.find((s: IScene) => s.scene_id === sceneId);
            if (scene?.uuid) {
              try {
                const sceneRes = await sceneApi.getSceneWithShots(scene.uuid);
                if (sceneRes.data) {
                  updateScene(sceneId, sceneRes.data);
                  populateTimeline(); // Refresh timeline with new videos
                }
              } catch (err) {
                console.error("Failed to refresh scene data", err);
              }
            }
            
          } else if (status === TaskStatus.FAILURE || status === 'failed') {
            setRegeneratingSceneVideos(prev => {
              const newMap = new Map(prev);
              newMap.delete(sceneId);
              return newMap;
            });
            toast.error("场景视频生成失败");
          }
        } catch (e) {
          console.error(e);
        }
      });
    };

    const interval = setInterval(pollTasks, 3000);
    return () => clearInterval(interval);
  }, [regeneratingSceneVideos, creation?.scenes, updateScene, populateTimeline]);

  const handleRegenerateShotVideo = async (shot: IShot) => {
    if (!shot.uuid) return;
    try {
      const res = await shotApi.regenerateShotVideo(shot.uuid);
      if (res.data.task_id) {
        setRegeneratingShotVideos(prev => new Map(prev).set(shot.shot_id, res.data.task_id));
        toast.success("分镜视频生成任务已提交");
      }
    } catch (error) {
      toast.error("提交失败");
    }
  };

  const handleRegenerateShotAudio = async (shot: IShot) => {
    if (!shot.uuid) return;
    try {
      const res = await shotApi.generateShotAudio(shot.uuid);
      if (res.data.task_id) {
        setRegeneratingShotAudios(prev => new Map(prev).set(shot.shot_id, res.data.task_id));
        toast.success("分镜音频生成任务已提交");
      }
    } catch (error) {
      toast.error("提交失败");
    }
  };

  const handleRegenerateSceneVideos = async (scene: IScene, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!scene.uuid) return;
    try {
      const res = await sceneApi.regenerateSceneVideos(scene.uuid);
      if (res.data.task_id) {
        setRegeneratingSceneVideos(prev => new Map(prev).set(scene.scene_id, res.data.task_id));
        toast.success("场景视频生成任务已提交");
      }
    } catch (error) {
      toast.error("提交失败");
    }
  };

  const togglePlayShot = (shotId: number) => {
    const video = shotVideoRefs.current[shotId];
    if (!video) return;

    if (playingShotId === shotId) {
      video.pause();
      setPlayingShotId(null);
    } else {
      // Pause currently playing if any
      if (playingShotId && shotVideoRefs.current[playingShotId]) {
        shotVideoRefs.current[playingShotId].pause();
      }
      video.play();
      setPlayingShotId(shotId);
    }
  };

  const togglePlayAudio = (shotId: number) => {
    const audio = shotAudioRefs.current[shotId];
    if (!audio) return;

    if (playingAudioShotId === shotId) {
      audio.pause();
      setPlayingAudioShotId(null);
    } else {
      // Pause other playing audios
      if (playingAudioShotId && shotAudioRefs.current[playingAudioShotId]) {
        shotAudioRefs.current[playingAudioShotId].pause();
      }
      audio.play();
      setPlayingAudioShotId(shotId);
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending': return "等待处理...";
      case 'processing': return "正在生成视频...";
      case 'completed': return "生成完成";
      case 'failed': return "生成失败";
      default: return "处理中...";
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
  };

  const handleGenerate = async () => {
    if (!creation?.uuid) return;
    if (!selectedVoiceId) {
      toast.error("请先选择一个配音");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setProgress(0);
      setStatusMessage("提交任务中...");

      await videoApi.selectVoiceAndGenerate(creation.uuid, {
        voice_id: selectedVoiceId,
        force_regenerate: true
      });

      toast.success("视频生成任务已开始");
    } catch (err) {
      console.error("Failed to start generation:", err);
      setIsGenerating(false);
      setError("启动生成任务失败");
      toast.error("启动生成任务失败");
    }
  };

  if (!creation) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">视频生成</h2>
          <p className="text-muted-foreground">选择配音并生成最终视频</p>
        </div>
      </div>

      {!hasGenerated && !isGenerating ? (
        <Card>
          <CardHeader>
            <CardTitle>选择配音</CardTitle>
            <CardDescription>为您的视频选择一个合适的旁白配音</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-[400px] overflow-y-auto border rounded-md p-4">
              <VoiceSelector
                selectedVoiceId={selectedVoiceId}
                onSelect={handleVoiceSelect}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                size="lg" 
                onClick={handleGenerate}
                disabled={!selectedVoiceId}
                className="w-full sm:w-auto"
              >
                <Video className="w-4 h-4 mr-2" />
                开始生成视频
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {isGenerating && (
            <Card>
              <CardContent className="py-10">
                <div className="max-w-md mx-auto space-y-6 text-center">
                  <div className="relative w-20 h-20 mx-auto">
                    <Loader2 className="w-20 h-20 animate-spin text-primary opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">{Math.round(progress)}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">{statusMessage}</h3>
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      正在处理视频生成任务，这可能需要几分钟时间...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-bold">生成失败</span>
              </div>
              <p className="mt-1 text-sm">{error}</p>
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => setIsGenerating(false)}>
                  返回重试
                </Button>
              </div>
            </div>
          )}

          {hasGenerated && !isGenerating && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-bold">生成完成</span>
                  <span className="text-sm">您的视频已成功生成，您可以在下方预览和调整。</span>
                </div>
                <Button 
                  variant="link" 
                  className="px-2 h-auto text-green-700 underline"
                  onClick={() => setIsGenerating(false)}
                >
                  重新生成
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">预览</h3>
                  {videoUrl && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={async () => {
                        toast.info("正在准备下载完整视频...");
                        await downloadFile(videoUrl, `creation_${creation.uuid}_final.mp4`);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      下载完整视频
                    </Button>
                  )}
                </div>
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative group">
                  {videoUrl ? (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full h-full object-contain"
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => pauseTimeline()}
                      controls={false} // Custom controls via timeline
                      onClick={() => isPlaying ? pauseTimeline() : playTimeline()}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <p>视频生成中...</p>
                    </div>
                  )}
                  {/* Overlay play button */}
                  {!isPlaying && videoUrl && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors cursor-pointer"
                      onClick={() => playTimeline()}
                    >
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform">
                         <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[20px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-[300px] border rounded-lg overflow-hidden shadow-sm bg-background">
                  <Timeline />
                </div>

                {/* Shot List for Individual Regeneration */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h3 className="text-lg font-medium mb-4">分镜视频列表</h3>
                  <div className="space-y-4">
                    {/* Flatten and sort all shots by shot_number */}
                    {creation.scenes
                      ?.flatMap((scene: IScene) =>
                        (scene.shots || []).map((shot: IShot) => ({
                          ...shot,
                          sceneTitle: scene.title,
                          sceneId: scene.scene_id
                        }))
                      )
                      .sort((a: FlattenedShot, b: FlattenedShot) => (a.shot_number || 0) - (b.shot_number || 0))
                      .map((shot: FlattenedShot) => (
                        <div key={shot.shot_id} className="group relative flex gap-4 items-start border p-3 rounded bg-background hover:border-blue-500/50 transition-colors">
                          <div className="w-40 aspect-video bg-black rounded relative overflow-hidden shrink-0">
                            {shot.video_url ? (
                              <>
                                <video
                                  ref={el => { if (el) shotVideoRefs.current[shot.shot_id] = el; }}
                                  src={shot.video_url}
                                  className="w-full h-full object-contain"
                                  onEnded={() => setPlayingShotId(null)}
                                />
                                <div
                                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer"
                                  onClick={() => togglePlayShot(shot.shot_id)}
                                >
                                  {playingShotId === shot.shot_id ? (
                                    <Pause className="w-8 h-8 text-white opacity-80" />
                                  ) : (
                                    <Play className="w-8 h-8 text-white opacity-80" />
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                无视频
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-32">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-muted-foreground shrink-0">#{shot.shot_number}</span>
                              <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                                <span className="text-sm font-medium truncate">{shot.sceneTitle || "场景"}</span>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none h-5 px-1.5 text-[10px]">
                                  8s
                                </Badge>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {shot.video_url && (
                                    <Badge variant="secondary" className="bg-blue-500 text-white border-none gap-1 h-5 px-2 text-[10px]">
                                      <Video className="w-3 h-3" />
                                      视频
                                    </Badge>
                                  )}
                                  {shot.audio_url && (
                                    <Badge variant="secondary" className="bg-green-500 text-white border-none gap-1 h-5 px-2 text-[10px]">
                                      <Mic className="w-3 h-3" />
                                      音频
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="bg-orange-500 text-white border-none gap-1 h-5 px-2 text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    字幕
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed max-h-[80px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                              {shot.description || shot.image_prompt}
                            </div>
                          </div>

                          {/* 悬浮操作面板：强制显示 5 个按钮 */}
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-2xl z-[100]">
                            <button
                              type="button"
                              className="h-8 w-8 flex items-center justify-center text-orange-400 hover:text-orange-300 hover:bg-white/10 rounded-full transition-colors"
                              title="重新生成图片"
                              onClick={(e) => {
                                e.stopPropagation();
                                // 重置逻辑
                              }}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="h-8 w-8 flex items-center justify-center text-blue-400 hover:text-blue-300 hover:bg-white/10 rounded-full transition-colors"
                              title="编辑"
                              onClick={(e) => {
                                e.stopPropagation();
                                // 编辑逻辑
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={regeneratingShotVideos.has(shot.shot_id)}
                              className="h-8 w-8 flex items-center justify-center text-purple-400 hover:text-purple-300 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateShotVideo(shot);
                              }}
                              title="生成视频"
                            >
                              <Clapperboard className={`w-4 h-4 ${regeneratingShotVideos.has(shot.shot_id) ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              type="button"
                              className="h-8 w-8 flex items-center justify-center text-green-500 hover:text-green-400 hover:bg-white/10 rounded-full transition-colors"
                              title="添加到轨道"
                              onClick={(e) => {
                                e.stopPropagation();
                                // 添加逻辑
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="h-8 w-8 flex items-center justify-center text-green-500 hover:text-green-400 hover:bg-white/10 rounded-full transition-colors"
                              title="一键下载"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!shot.video_url && !shot.audio_url) {
                                  toast.error("暂无可下载的资源");
                                  return;
                                }
                                toast.info(shot.audio_url ? "正在准备下载视频和音频..." : "正在准备下载视频...");
                                const formattedNumber = String(shot.shot_number || 0).padStart(4, '0');
                                if (shot.video_url) await downloadFile(shot.video_url, `${formattedNumber}_video.mp4`);
                                if (shot.audio_url) await downloadFile(shot.audio_url, `${formattedNumber}_audio.mp3`);
                              }}
                            >
                              <FolderDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
