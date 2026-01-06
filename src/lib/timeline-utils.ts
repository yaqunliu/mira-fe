import { TimelineTrack, TimelineTrackClip } from '@/types/timeline';

/**
 * 查找吸附点
 * @param targetTime 目标时间（片段开始时间）
 * @param duration 片段时长
 * @param track 当前轨道
 * @param excludeClipId 排除的片段ID（被拖拽的片段）
 * @param threshold 吸附阈值（秒）
 * @param extraSnapPoints 额外的吸附点（如播放头）
 * @returns 吸附后的开始时间，以及吸附的信息
 */
export function findSnapPoint(
  targetTime: number,
  duration: number,
  track: TimelineTrack,
  excludeClipId: string,
  threshold: number = 0.2,
  extraSnapPoints: number[] = []
): { time: number; snapped: boolean; snapTime?: number } {
  const snapPoints: number[] = [0, ...extraSnapPoints]; // 0秒和额外点
  
  // 收集所有其他片段的开始和结束时间作为吸附点
  track.clips.forEach(clip => {
    if (clip.id !== excludeClipId) {
      snapPoints.push(clip.startInTimeline);
      snapPoints.push(clip.startInTimeline + clip.duration);
    }
  });
  
  let closestStartTime: number = targetTime;
  let snapped = false;
  let snapTime: number | undefined = undefined;
  let minDistance = threshold;
  
  // 检查片段开始位置 (targetTime) 对齐到任何吸附点
  for (const point of snapPoints) {
    const distance = Math.abs(targetTime - point);
    if (distance < minDistance) {
      minDistance = distance;
      closestStartTime = point;
      snapped = true;
      snapTime = point;
    }
  }
  
  // 检查片段结束位置 (targetTime + duration) 对齐到任何吸附点
  const targetEndTime = targetTime + duration;
  for (const point of snapPoints) {
    const distance = Math.abs(targetEndTime - point);
    if (distance < minDistance) {
      minDistance = distance;
      closestStartTime = point - duration;
      snapped = true;
      snapTime = point;
    }
  }
  
  return { time: closestStartTime, snapped, snapTime };
}

/**
 * 检查片段是否与其他片段重叠
 * @param startTime 片段开始时间
 * @param duration 片段时长
 * @param track 当前轨道
 * @param excludeClipId 排除的片段ID
 * @returns 是否重叠
 */
export function checkOverlap(
  startTime: number,
  duration: number,
  track: TimelineTrack,
  excludeClipId: string
): boolean {
  const endTime = startTime + duration;
  
  for (const clip of track.clips) {
    if (clip.id === excludeClipId) continue;
    
    const clipStart = clip.startInTimeline;
    const clipEnd = clip.startInTimeline + clip.duration;
    
    // 检查是否重叠
    if (
      (startTime < clipEnd && endTime > clipStart) || // 部分重叠
      (startTime <= clipStart && endTime >= clipEnd) // 完全包含
    ) {
      return true;
    }
  }
  
  return false;
}

/**
 * 找到不重叠的最近位置
 * @param preferredTime 首选时间
 * @param duration 片段时长
 * @param track 当前轨道
 * @param excludeClipId 排除的片段ID
 * @returns 调整后的时间
 */
export function findNonOverlappingPosition(
  preferredTime: number,
  duration: number,
  track: TimelineTrack,
  excludeClipId: string
): number {
  // 如果没有重叠，直接返回
  if (!checkOverlap(preferredTime, duration, track, excludeClipId)) {
    return preferredTime;
  }
  
  // 收集所有其他片段并排序
  const otherClips = track.clips
    .filter(clip => clip.id !== excludeClipId)
    .sort((a, b) => a.startInTimeline - b.startInTimeline);
  
  // 尝试在片段之间找到空隙
  for (let i = 0; i < otherClips.length; i++) {
    const clip = otherClips[i];
    const clipEnd = clip.startInTimeline + clip.duration;
    
    // 检查当前片段之后是否有足够空间
    const nextClip = otherClips[i + 1];
    const availableEnd = nextClip ? nextClip.startInTimeline : Infinity;
    
    if (availableEnd - clipEnd >= duration) {
      // 有足够空间，放在这里
      return clipEnd;
    }
  }
  
  // 如果找不到空隙，放在最后一个片段之后
  if (otherClips.length > 0) {
    const lastClip = otherClips[otherClips.length - 1];
    return lastClip.startInTimeline + lastClip.duration;
  }
  
  // 如果没有其他片段，返回0
  return 0;
}
