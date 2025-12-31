import { useEffect, useRef } from 'react';
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
  const visibleClipsRef = useRef<TimelineTrackClip[]>([]);

  /**
   * 计算当前时间下可见的片段
   * @returns 当前播放头覆盖的片段列表
   */
  const getVisibleClipsAtTime = (time: number): TimelineTrackClip[] => {
    const visibleClips: TimelineTrackClip[] = [];

    // 遍历所有轨道
    for (const track of project.tracks) {
      // 遍历轨道上的所有片段
      for (const clip of track.clips) {
        const clipStart = clip.startInTimeline;
        const clipEnd = clip.startInTimeline + clip.duration;

        // 如果当前时间在片段范围内，或者片段与当前时间有重叠
        if (time >= clipStart && time < clipEnd) {
          visibleClips.push(clip);
        }
      }
    }

    return visibleClips;
  };

  /**
   * 更新当前可见的片段
   */
  const updateVisibleClips = () => {
    const newVisibleClips = getVisibleClipsAtTime(currentTime);

    // 比较新旧可见片段列表，只在变化时更新
    if (JSON.stringify(newVisibleClips) !== JSON.stringify(visibleClipsRef.current)) {
      visibleClipsRef.current = newVisibleClips;

      // 这里可以添加逻辑来预加载或切换视频
      // 例如：根据新的可见片段列表更新播放器的视频源
    }
  };

  /**
   * 动画循环函数
   * 每秒运行60次，更新当前时间
   */
  const tick = (timestamp: number) => {
    if (lastUpdateTimeRef.current === 0) {
      lastUpdateTimeRef.current = timestamp;
    }

    // 计算时间差（毫秒）
    const deltaTime = timestamp - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = timestamp;

    // 更新当前时间（转换为秒）
    if (isPlaying) {
      const newTime = currentTime + (deltaTime / 1000);

      // 检查是否到达项目结束
      if (newTime >= project.duration) {
        pause();
        seek(project.duration);
      } else {
        seek(newTime);
      }
    }

    // 更新可见片段
    updateVisibleClips();

    // 请求下一帧
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  // 启动和停止动画循环
  useEffect(() => {
    // 初始化动画循环
    animationFrameRef.current = requestAnimationFrame(tick);

    // 清理函数
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 当播放状态改变时，重置最后更新时间
  useEffect(() => {
    if (isPlaying) {
      lastUpdateTimeRef.current = 0;
    }
  }, [isPlaying]);

  // 返回当前可见的片段
  return { visibleClips: visibleClipsRef.current };
};
