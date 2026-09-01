"use client";

import { useTranslations } from 'next-intl'
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ICreation } from '@/types/creation';
import type { IShot } from '@/types/scene';
import { cn } from '@/lib/utils';

interface CanvasPreviewViewProps {
  creation: ICreation;
  highlightedElement: string | null;
}

interface PlaybackState {
  isPlaying: boolean;
  currentShotIndex: number;
  currentTime: number;
  duration: number;
  isAutoPlaying: boolean;
}

export function CanvasPreviewView({
  creation, highlightedElement }: CanvasPreviewViewProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentShotIndex: 0,
    currentTime: 0,
    duration: 0,
    isAutoPlaying: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const lastLoadedShotIndexRef = useRef<number>(-1);
  const preloadedNextShotRef = useRef<number>(-1);
  const isAutoPlayingRef = useRef(false);
  const videoEndedRef = useRef(false);
  const audioEndedRef = useRef(false);
  const audioTimeoutRef = useRef<number | null>(null);

  const allShots = getAllShotsInOrder(creation);
  const currentShot = allShots[playbackState.currentShotIndex];
  const hasVideo = currentShot?.video_url;
  const hasAudio = currentShot?.audio_url;

  useEffect(() => {
    isAutoPlayingRef.current = playbackState.isAutoPlaying;
  }, [playbackState.isAutoPlaying]);

  function getAllShotsInOrder(creation: ICreation): IShot[] {
    if (!creation.scenes) return [];
    const shots: IShot[] = [];
    creation.scenes.forEach(scene => {
      if (scene.shots) {
        scene.shots.forEach(shot => {
          shots.push({
            ...shot,
            title: shot.title || t("shotLabel", { n: shot.shot_number }),
          });
        });
      }
    });
    return shots;
  }

  const findNextValidShot = useCallback((index: number): number => {
    for (let i = index; i < allShots.length; i++) {
      if (allShots[i].video_url || allShots[i].audio_url) {
        return i;
      }
    }
    return -1;
  }, [allShots]);

  const safePlay = useCallback(async (element: HTMLVideoElement | HTMLAudioElement | null) => {
    if (!element || !element.src) return;
    try {
      playPromiseRef.current = element.play();
      await playPromiseRef.current;
    } catch (error) {
      console.log('Play interrupted or failed:', error);
      playPromiseRef.current = null;
    }
  }, []);

  const safePause = useCallback((element: HTMLVideoElement | HTMLAudioElement | null) => {
    if (!element) return;
    playPromiseRef.current = null;
    element.pause();
  }, []);

  const safeLoad = useCallback((element: HTMLVideoElement | HTMLAudioElement | null, src: string) => {
    if (!element) return;
    playPromiseRef.current = null;
    element.pause();
    element.src = src;
    element.load();
  }, []);

  const play = useCallback(() => {
    if (allShots.length === 0) return;

    if (playbackState.isPlaying) {
      setPlaybackState(prev => ({ ...prev, isPlaying: false, isAutoPlaying: false }));
      safePause(videoRef.current);
      safePause(audioRef.current);
      return;
    }

    if (!hasVideo && !hasAudio) {
      const nextIndex = findNextValidShot(playbackState.currentShotIndex + 1);
      if (nextIndex !== -1) {
        setPlaybackState(prev => ({ ...prev, currentShotIndex: nextIndex, isAutoPlaying: true, isPlaying: true }));
      }
      return;
    }

    setPlaybackState(prev => ({ ...prev, isPlaying: true, isAutoPlaying: true }));
    safePlay(videoRef.current);
    safePlay(audioRef.current);
  }, [allShots, playbackState, hasVideo, hasAudio, findNextValidShot, safePause, safePlay]);

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setPlaybackState(prev => ({
        ...prev,
        currentTime: videoRef.current?.currentTime || 0,
        duration: videoRef.current?.duration || 0,
      }));
    }
  }, []);

  const switchToNextShot = useCallback(() => {
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = null;
    }
    
    const nextIndex = findNextValidShot(playbackState.currentShotIndex + 1);
    console.log('[Preview] switchToNextShot: currentIndex=', playbackState.currentShotIndex, 'nextIndex=', nextIndex);
    if (nextIndex !== -1) {
      videoEndedRef.current = false;
      audioEndedRef.current = false;
      preloadedNextShotRef.current = -1;
      setPlaybackState(prev => ({
        ...prev,
        currentShotIndex: nextIndex,
        currentTime: 0,
        duration: 0,
        isAutoPlaying: true,
      }));
      console.log('[Preview] Switching to shot', nextIndex);
    } else {
      console.log('[Preview] No more shots, ending playback');
      videoEndedRef.current = false;
      audioEndedRef.current = false;
      preloadedNextShotRef.current = -1;
      setPlaybackState(prev => ({
        ...prev,
        isPlaying: false,
        isAutoPlaying: false,
        currentShotIndex: 0,
        currentTime: 0,
        duration: 0,
      }));
    }
  }, [findNextValidShot, playbackState.currentShotIndex]);

  const checkAndSwitchShot = useCallback(() => {
    console.log('[Preview] checkAndSwitchShot: videoEndedRef:', videoEndedRef.current, 'audioEndedRef:', audioEndedRef.current);
    const currentShot = allShots[playbackState.currentShotIndex];
    const hasVideo = currentShot?.video_url;
    const hasAudio = currentShot?.audio_url;
    
    const videoDone = !hasVideo || videoEndedRef.current;
    const audioDone = !hasAudio || audioEndedRef.current;
    
    if (videoDone && audioDone) {
      console.log('[Preview] Both video and audio done, switching to next shot');
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = null;
      }
      switchToNextShot();
    } else if (hasVideo && hasAudio && videoEndedRef.current && !audioEndedRef.current) {
      console.log('[Preview] Video done but audio not done, starting timeout');
      if (!audioTimeoutRef.current) {
        audioTimeoutRef.current = window.setTimeout(() => {
          console.log('[Preview] Audio timeout, forcing switch to next shot');
          audioTimeoutRef.current = null;
          audioEndedRef.current = true;
          switchToNextShot();
        }, 5000);
      }
    }
  }, [allShots, playbackState.currentShotIndex, switchToNextShot]);

  const handleVideoEnded = useCallback(() => {
    console.log('[Preview] Video ended event fired');
    videoEndedRef.current = true;
    checkAndSwitchShot();
  }, [checkAndSwitchShot]);

  const handleAudioEnded = useCallback(() => {
    console.log('[Preview] Audio ended event fired');
    audioEndedRef.current = true;
    checkAndSwitchShot();
  }, [checkAndSwitchShot]);

  useEffect(() => {
    const shotIndex = playbackState.currentShotIndex;
    console.log('[Preview] useEffect shotIndex:', shotIndex, 'lastLoaded:', lastLoadedShotIndexRef.current);
    
    if (lastLoadedShotIndexRef.current === shotIndex) {
      console.log('[Preview] Shot already loaded, skipping');
      return;
    }

    console.log('[Preview] Loading shot', shotIndex, 'hasVideo:', hasVideo, 'hasAudio:', hasAudio);
    videoEndedRef.current = false;
    audioEndedRef.current = false;
    setIsLoading(true);
    preloadedNextShotRef.current = -1;

    lastLoadedShotIndexRef.current = shotIndex;

    const video = videoRef.current;
    const audio = audioRef.current;
    
    if (video) {
      video.removeEventListener('ended', handleVideoEnded);
      video.addEventListener('ended', handleVideoEnded);
      video.removeEventListener('timeupdate', handleVideoTimeUpdate);
      video.addEventListener('timeupdate', handleVideoTimeUpdate);
      console.log('[Preview] Video event listeners attached');
    }
    
    if (audio) {
      audio.removeEventListener('ended', handleAudioEnded);
      audio.addEventListener('ended', handleAudioEnded);
      console.log('[Preview] Audio event listeners attached, src will be:', currentShot.audio_url);
    }

    const loadMedia = async () => {
      const loadPromises: Promise<void>[] = [];

      if (hasVideo && currentShot.video_url) {
        loadPromises.push(new Promise((resolve) => {
          if (video) {
            const onCanPlay = () => {
              console.log('[Preview] Video canplay event fired');
              video.removeEventListener('canplay', onCanPlay);
              resolve();
            };
            video.addEventListener('canplay', onCanPlay);
            console.log('[Preview] Loading video:', currentShot.video_url);
            safeLoad(video, currentShot.video_url!);
          } else {
            resolve();
          }
        }));
      }

      if (hasAudio && currentShot.audio_url) {
        loadPromises.push(new Promise((resolve) => {
          if (audio) {
            const onCanPlay = () => {
              console.log('[Preview] Audio canplay event fired');
              audio.removeEventListener('canplay', onCanPlay);
              resolve();
            };
            audio.addEventListener('canplay', onCanPlay);
            console.log('[Preview] Loading audio:', currentShot.audio_url);
            safeLoad(audio, currentShot.audio_url!);
          } else {
            resolve();
          }
        }));
      }

      await Promise.all(loadPromises);
      console.log('[Preview] Media loaded, isAutoPlaying:', isAutoPlayingRef.current, 'video.readyState:', video?.readyState, 'audio.readyState:', audio?.readyState);
      setIsLoading(false);

      if (isAutoPlayingRef.current && (hasVideo || hasAudio)) {
        console.log('[Preview] Starting playback');
        setTimeout(() => {
          const v = videoRef.current;
          const a = audioRef.current;
          console.log('[Preview] Before play - video.src:', v?.src?.substring(0, 50), 'audio.src:', a?.src?.substring(0, 50));
          console.log('[Preview] Before play - video.paused:', v?.paused, 'audio.paused:', a?.paused);
          safePlay(v);
          safePlay(a);
          console.log('[Preview] After play - video.paused:', v?.paused, 'audio.paused:', a?.paused);
        }, 100);
      }
    };

    loadMedia();
  }, [playbackState.currentShotIndex, hasVideo, hasAudio, currentShot, safeLoad, safePlay, handleVideoEnded, handleAudioEnded, handleVideoTimeUpdate]);

  useEffect(() => {
    if (!playbackState.isPlaying) return;
    
    const nextIndex = findNextValidShot(playbackState.currentShotIndex + 1);
    if (nextIndex === -1 || preloadedNextShotRef.current === nextIndex) return;
    
    const nextShot = allShots[nextIndex];
    if (!nextShot) return;
    
    preloadedNextShotRef.current = nextIndex;
    console.log('[Preview] Preloading next shot:', nextIndex);
    
    const preloadTimeout = setTimeout(() => {
      if (nextShot.video_url) {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.src = nextShot.video_url;
        console.log('[Preview] Preloaded video for shot', nextIndex);
      }
      
      if (nextShot.audio_url) {
        const audio = document.createElement('audio');
        audio.preload = 'auto';
        audio.src = nextShot.audio_url;
        console.log('[Preview] Preloaded audio for shot', nextIndex);
      }
    }, 1000);
    
    return () => clearTimeout(preloadTimeout);
  }, [playbackState.isPlaying, playbackState.currentShotIndex, allShots, findNextValidShot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('[contenteditable="true"]')) {
          return;
        }
        e.preventDefault();
        play();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [play]);

  const jumpToShot = (index: number) => {
    const validIndex = findNextValidShot(index);
    if (validIndex !== -1) {
      playPromiseRef.current = null;
      videoEndedRef.current = false;
      audioEndedRef.current = false;
      setPlaybackState(prev => ({
        ...prev,
        currentShotIndex: validIndex,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isAutoPlaying: true,
      }));
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = playbackState.duration > 0
    ? (playbackState.currentTime / playbackState.duration) * 100
    : 0;

  const displayImageUrl = currentShot?.image_url;

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3">
        {allShots.length === 0 ? (
          <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-bold mb-2">{t("noShotsHint")}</h3>
              <p className="text-sm text-gray-400">{t("createShotsHint")}</p>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "bg-black rounded-xl overflow-hidden relative",
                highlightedElement === 'video-preview' ? 'ring-4 ring-green-500 animate-pulse' : ''
              )}
            >
              <div className="aspect-video relative">
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-white text-sm">{t("loading")}</span>
                    </div>
                  </div>
                )}
                {hasVideo ? (
                  <video
                    ref={videoRef}
                    className="w-full h-full"
                    onTimeUpdate={handleVideoTimeUpdate}
                    onEnded={handleVideoEnded}
                    onPlay={() => setPlaybackState(prev => ({ ...prev, isPlaying: true }))}
                    onPause={() => {
                      if (!isAutoPlayingRef.current) {
                        setPlaybackState(prev => ({ ...prev, isPlaying: false, isAutoPlaying: false }));
                      }
                    }}
                    preload="auto"
                  />
                ) : displayImageUrl ? (
                  <div className="w-full h-full relative">
                    <img
                      src={displayImageUrl}
                      alt={currentShot?.title}
                      className="w-full h-full object-contain bg-black"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={play}
                          className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                          {playbackState.isPlaying ? '⏸️' : '▶️'}
                        </button>
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm mb-1">
                            {currentShot?.title || '未命名分镜'}
                          </div>
                          <div className="text-white/60 text-xs">{t("imagePreviewMode")}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : hasAudio ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-4 animate-pulse">🎵</div>
                      <h3 className="text-lg font-bold mb-2">{t("audioPreview")}</h3>
                      <p className="text-sm text-gray-400">{currentShot.title}</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-4">⏭️</div>
                      <h3 className="text-lg font-bold mb-2">{t("skipShot")}</h3>
                      <p className="text-sm text-gray-400">{currentShot?.title}</p>
                      <button
                        onClick={() => {
                          const next = findNextValidShot(playbackState.currentShotIndex + 1);
                          if (next !== -1) {
                            playPromiseRef.current = null;
                            setPlaybackState(prev => ({ ...prev, currentShotIndex: next, isPlaying: false, isAutoPlaying: true }));
                          }
                        }}
                        className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
                      >
                        播放下一个
                      </button>
                    </div>
                  </div>
                )}

                {hasAudio && !hasVideo && (
                  <audio
                    ref={audioRef}
                    onEnded={handleAudioEnded}
                    onPlay={() => setPlaybackState(prev => ({ ...prev, isPlaying: true }))}
                    onPause={() => {
                      if (!isAutoPlayingRef.current) {
                        setPlaybackState(prev => ({ ...prev, isPlaying: false, isAutoPlaying: false }));
                      }
                    }}
                    preload="auto"
                  />
                )}

                {hasVideo && hasAudio && (
                  <audio
                    ref={audioRef}
                    onEnded={handleAudioEnded}
                    onPlay={() => setPlaybackState(prev => ({ ...prev, isPlaying: true }))}
                    onPause={() => {
                      if (!isAutoPlayingRef.current) {
                        setPlaybackState(prev => ({ ...prev, isPlaying: false, isAutoPlaying: false }));
                      }
                    }}
                    preload="auto"
                  />
                )}

                {hasVideo && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={play}
                        className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                      >
                        {playbackState.isPlaying ? '⏸️' : '▶️'}
                      </button>
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm mb-1">
                          {currentShot?.title || '未命名分镜'}
                        </div>
                        <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-white text-sm">
                        {formatTime(playbackState.currentTime)} / {formatTime(playbackState.duration)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {allShots.length > 0 && (
        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm">分镜顺序</h3>
            <div className="text-xs text-gray-500">按空格键播放</div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin max-h-24">
            {allShots.map((shot, index) => {
              const isValid = shot.video_url || shot.audio_url;
              const isCurrent = index === playbackState.currentShotIndex;
              const isPast = index < playbackState.currentShotIndex;

              return (
                <button
                  key={shot.uuid || shot.shot_number}
                  onClick={() => jumpToShot(index)}
                  className={cn(
                    "flex-shrink-0 w-14 h-16 rounded-lg border-2 overflow-hidden transition-all relative",
                    isCurrent
                      ? "border-green-500 ring-2 ring-green-200"
                      : isPast
                      ? "border-gray-300 opacity-60"
                      : isValid
                      ? "border-gray-200 hover:border-gray-400"
                      : "border-dashed border-gray-300 opacity-40"
                  )}
                >
                  {shot.image_url ? (
                    <img
                      src={shot.image_url}
                      alt={shot.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-lg">🎞</span>
                    </div>
                  )}
                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 text-xs py-0.5 text-center",
                    isCurrent ? "bg-green-500 text-white" : "bg-black/50 text-white"
                  )}>
                    {shot.shot_number}
                  </div>
                  {!isValid && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-[10px] text-white">跳过</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
