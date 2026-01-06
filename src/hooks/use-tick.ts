import { useEffect, useRef, useState } from 'react';
import { useTimelineStore } from '../stores/timeline';
import { TimelineTrackClip } from '../types';

/**
 * 播放头逻辑Hook
 * 负责计算当前时间下应该显示的片段并同步时间轴位置
 */
export const useTick = () => {
  const {
    currentTime,
    isPlaying,
    project,
    play,
    pause,
    seek,
    updateClip
  } = useTimelineStore();

  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateTimeRef = useRef<number>(0);
  const [visibleClips, setVisibleClips] = useState<TimelineTrackClip[]>([]);

  /**
   * 计算当前时间下可见的片段
   * @returns 当前播放头覆盖的片段列表
   */
  const getVisibleClipsAtTime = (time: number): TimelineTrackClip[] => {
    const clips: TimelineTrackClip[] = [];

    // 遍历所有轨道
    for (const track of project.tracks) {
      // 遍历轨道上的所有片段
      for (const clip of track.clips) {
        const clipStart = clip.startInTimeline;
        const clipEnd = clip.startInTimeline + clip.duration;

        // 如果当前时间在片段范围内
        if (time >= clipStart && time < clipEnd) {
          clips.push(clip);
        }
      }
    }

    return clips;
  };

  /**
   * 更新当前可见的片段
   */
  const updateVisibleClips = () => {
    setVisibleClips(prev => {
      const newVisibleClips = getVisibleClipsAtTime(currentTime);
      
      // 比较新旧可见片段列表，只在变化时更新
      if (newVisibleClips.length !== prev.length) {
        return newVisibleClips;
      }

      // 长度相同时，检查 ID 是否一致
      const isSame = newVisibleClips.every((clip, index) => clip.id === prev[index]?.id);
      return isSame ? prev : newVisibleClips;
    });
  };

  // 启动和停止动画循环
  useEffect(() => {
    let animationFrame: number;
    
    const tick = (timestamp: number) => {
      const state = useTimelineStore.getState();
      
      if (!state.isPlaying) {
        lastUpdateTimeRef.current = 0;
        return;
      }

      // 获取视频轨道上当前正在播放的片段
      const videoTrack = state.project.tracks.find(t => t.id === 'track-video-main');
      const currentClip = videoTrack?.clips.find(clip => 
        state.currentTime >= clip.startInTimeline && 
        state.currentTime < clip.startInTimeline + clip.duration
      );

      // 关键优化：如果能找到对应的原生视频标签，使用视频的 currentTime 来驱动时间轴
      if (currentClip) {
        const videoElement = document.querySelector(`[data-media-id="${currentClip.id}"]`) as HTMLVideoElement;
        
        // 只有当视频正在正常播放且有进度时，才使用视频时间同步
        if (videoElement && !videoElement.paused && videoElement.readyState >= 2) {
          const actualTimelineTime = currentClip.startInTimeline + (videoElement.currentTime - currentClip.sourceStart);
          
          // 只有当偏差不太离谱时（比如 0.5s 内），才进行同步，否则说明视频在缓冲，时间轴应该等待
          const drift = Math.abs(actualTimelineTime - state.currentTime);
          if (drift < 0.5) {
            state.seek(actualTimelineTime);
            lastUpdateTimeRef.current = timestamp; // 更新基准，防止跳回系统计时
            animationFrame = requestAnimationFrame(tick);
            return;
          }
        }
      }

      // --- 备选方案：如果视频没加载好或处于缓冲，使用系统高精度计时 ---
      if (lastUpdateTimeRef.current === 0) {
        lastUpdateTimeRef.current = timestamp;
        animationFrame = requestAnimationFrame(tick);
        return;
      }

      const deltaTime = timestamp - lastUpdateTimeRef.current;
      if (deltaTime > 100) {
        lastUpdateTimeRef.current = timestamp;
        animationFrame = requestAnimationFrame(tick);
        return;
      }

      lastUpdateTimeRef.current = timestamp;
      const newTime = state.currentTime + (deltaTime / 1000);

      if (newTime >= state.project.duration) {
        state.pause();
        state.seek(state.project.duration);
        lastUpdateTimeRef.current = 0;
      } else {
        state.seek(newTime);
        animationFrame = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      lastUpdateTimeRef.current = 0;
      animationFrame = requestAnimationFrame(tick);
    } else {
      lastUpdateTimeRef.current = 0;
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying]);

  // 移除旧的 tick 定义和相关的 useEffect，因为它们已经被合并到了上面的循环中

  // 独立于 tick 更新可见片段，以便在暂停时 seek 也能正确更新预览
  useEffect(() => {
    updateVisibleClips();
  }, [currentTime, project.tracks]);

  // 返回当前可见的片段
  return { visibleClips };
};
