'use client';

import React, { useRef, useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { useTimelineStore } from '@/stores/timeline';
import { Film, Volume2, VolumeX } from 'lucide-react';

export const VideoPreview: React.FC = () => {
  const { currentTime, project, isPlaying, seek } = useTimelineStore();
  const videoPlayerRef = useRef<any>(null);
  const audioPlayerRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const lastUpdateTimeRef = useRef<number>(0);

  // 查找当前时间对应的视频片段
  const getCurrentVideoClip = () => {
    const videoTrack = project.tracks.find(t => t.type === 'video');
    if (!videoTrack) return null;
    
    return videoTrack.clips.find(clip => 
      currentTime >= clip.startInTimeline && 
      currentTime < clip.startInTimeline + clip.duration
    );
  };

  // 查找当前时间对应的音频片段
  const getCurrentAudioClip = () => {
    const audioTrack = project.tracks.find(t => t.type === 'audio');
    if (!audioTrack) return null;
    
    return audioTrack.clips.find(clip => 
      currentTime >= clip.startInTimeline && 
      currentTime < clip.startInTimeline + clip.duration
    );
  };

  const currentVideoClip = getCurrentVideoClip();
  const currentAudioClip = getCurrentAudioClip();

  // 计算当前片段内的播放位置
  const getClipPlaybackPosition = (clip: any) => {
    if (!clip) return 0;
    const offset = currentTime - clip.startInTimeline;
    return clip.sourceStart + offset;
  };

  // 当 currentTime 变化时，同步播放器
  useEffect(() => {
    if (!isPlaying) {
      // 如果不在播放状态，手动seek到正确位置
      const videoPosition = getClipPlaybackPosition(currentVideoClip);
      const audioPosition = getClipPlaybackPosition(currentAudioClip);
      
      if (videoPlayerRef.current && currentVideoClip) {
        videoPlayerRef.current.seekTo(videoPosition, 'seconds');
      }
      if (audioPlayerRef.current && currentAudioClip) {
        audioPlayerRef.current.seekTo(audioPosition, 'seconds');
      }
    }
  }, [currentTime, currentVideoClip?.id, currentAudioClip?.id, isPlaying]);

  // 播放器进度回调 - 用于同步时间轴
  const handleVideoProgress = (state: any) => {
    if (!isPlaying || !currentVideoClip) return;
    
    // 避免频繁更新，每100ms更新一次
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 100) return;
    lastUpdateTimeRef.current = now;
    
    const newTime = currentVideoClip.startInTimeline + state.playedSeconds - currentVideoClip.sourceStart;
    
    // 如果播放到片段结束，跳到下一秒
    if (newTime >= currentVideoClip.startInTimeline + currentVideoClip.duration) {
      seek(currentVideoClip.startInTimeline + currentVideoClip.duration);
    } else {
      seek(newTime);
    }
  };

  return (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
      {/* 视频播放器 */}
      {currentVideoClip ? (
        <div className="w-full h-full flex items-center justify-center">
          <ReactPlayer
            ref={videoPlayerRef}
            url={currentVideoClip.url}
            playing={isPlaying}
            volume={0} // 视频静音，音频由独立的音频轨道播放
            muted={true}
            width="100%"
            height="100%"
            progressInterval={100}
            onProgress={handleVideoProgress}
            onEnded={() => {
              // 播放结束，跳到下一个片段
              if (currentVideoClip) {
                seek(currentVideoClip.startInTimeline + currentVideoClip.duration);
              }
            }}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        </div>
      ) : (
        <div className="text-slate-600 flex flex-col items-center">
          <Film size={48} className="mb-4 opacity-50" />
          <p className="text-sm">当前时间没有视频片段</p>
          <p className="text-xs text-slate-700 mt-2">请点击"加载测试媒体"按钮</p>
        </div>
      )}

      {/* 隐藏的音频播放器 */}
      {currentAudioClip && (
        <div className="hidden">
          <ReactPlayer
            ref={audioPlayerRef}
            url={currentAudioClip.url}
            playing={isPlaying}
            volume={isMuted ? 0 : 1}
            muted={isMuted}
            progressInterval={100}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* 音量控制按钮 */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all z-10 border border-white/10"
        title={isMuted ? '取消静音' : '静音'}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* 时间显示 */}
      <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded text-white text-sm font-mono border border-white/10">
        {formatTime(currentTime)} / {formatTime(project.duration)}
      </div>

      {/* 当前片段信息 */}
      {currentVideoClip && (
        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded text-white text-xs border border-white/10">
          <div className="flex items-center gap-2">
            <Film size={12} />
            <span>Clip {currentVideoClip.id}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
