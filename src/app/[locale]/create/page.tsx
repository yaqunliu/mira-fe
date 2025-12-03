"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ProgressWrapper,
  useProgressSteps,
  type ProgressStep,
} from "@/components/business/progress-wrapper";
import { NovelUpload } from "@/components/business/novel-upload";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { StorySetting } from "@/components/business/create-settings/story-setting";
import { ScriptSetting } from "@/components/business/create-settings/script-setting";
import { CharacterSetting } from "@/components/business/create-settings/character-setting";
import { StoryboardImages } from "@/components/business/create-settings/storyboard-images";
import { VideoGenerator } from "@/components/business/create-settings/video-generator";
import { mockVideos } from "@/lib/mock-video-data";
import creationApi from "@/lib/api/creation";
import taskApi from "@/lib/api/task";
import { useQuery } from "@tanstack/react-query";
import { ICreation, CreationStatus } from "@/types/creation";
import { ICharacter } from "@/types/character";
import ModuleLoading from "@/components/ui/module-loading";
import { toast } from "sonner";
import { TaskStatus, TaskType, SceneGroup, ShotsTaskResponse } from "@/types";
import { IScene } from "@/types/scene";
import { useTaskSubmission } from "@/hooks/use-task-submission";

// 将轮询任务返回的分镜数据转换为 StoryboardImages 组件需要的格式
function transformShotsToSceneGroups(shotsData: ShotsTaskResponse): SceneGroup[] {
  return shotsData.scenes.map((scene) => ({
    scene_id: String(scene.scene_id),
    scene_title: scene.title,
    images: scene.shots.map((shot) => ({
      image_id: String(shot.shot_id),
      title: shot.title,
      image_url: shot.image_url || "",
      prompt: shot.image_prompt || shot.prompt || "", // 优先使用 image_prompt
      narration: shot.narration || "",
      status: shot.status === "completed" ? "completed" 
            : shot.status === "failed" ? "failed" 
            : shot.status === "generating" ? "generating" 
            : "generating",
    })),
  }));
}

// 将 Creation 中的 scenes 数据转换为 StoryboardImages 组件需要的格式
function transformCreationScenesToSceneGroups(scenes: IScene[]): SceneGroup[] {
  return scenes.map((scene) => ({
    scene_id: String(scene.scene_id),
    scene_title: scene.title,
    images: scene.shots.map((shot) => ({
      image_id: String(shot.shot_id),
      title: shot.title,
      image_url: shot.image_url || "",
      prompt: shot.image_prompt || "", // 注意：IShot 中字段名是 image_prompt
      narration: shot.narration || "",
      status: (shot.image_url ? "completed" : "pending") as "pending" | "generating" | "completed" | "failed",
    })),
  }));
}

export default function CreateCreation() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const creationIdFromUrl = searchParams?.get("creationId") || "";
  const [creationId, setCreationId] = useState<string>(creationIdFromUrl);
  const prevPathnameRef = useRef<string | null>(null);
  const prevCreationIdRef = useRef<string | null>(null);
  const isRefreshingRef = useRef<boolean>(false); // 标记是否正在刷新，避免重复调用
  const hasInitializedRef = useRef<boolean>(false); // 标记是否已经初始化过，避免首次加载时的重复调用
  const lastQueryTimeRef = useRef<number>(0); // 记录上次查询的时间，用于防抖
  const queryExecutionCountRef = useRef<Map<string, number>>(new Map()); // 记录每个 creationId 的查询次数

  // 分镜生成任务相关状态
  const [shotsTaskId, setShotsTaskId] = useState<string | null>(null);
  const [isGeneratingShots, setIsGeneratingShots] = useState(false);
  const [storyboardData, setStoryboardData] = useState<SceneGroup[]>([]);
  
  // 防止重复提交任务的标志
  const [isResubmitting, setIsResubmitting] = useState(false);

  // 同步 URL 参数到 state（不在这里刷新数据，由路由监听统一处理）
  useEffect(() => {
    if (creationIdFromUrl && creationIdFromUrl !== creationId) {
      setCreationId(creationIdFromUrl);
      setIsResubmitting(false); // 重置重新提交标志
      // 注意：不在这里调用 invalidateQueries，由路由监听统一处理，避免重复调用
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creationIdFromUrl]); // 只依赖 URL 参数，不依赖 creationId state
  
  // 当 creationId 变化时，重置重新提交标志
  useEffect(() => {
    setIsResubmitting(false);
  }, [creationId]);

  // 创建步骤数据（不需要预定义status）
  const initialSteps = [
    {
      id: "story",
      title: t("createVideo.story"),
    },
    {
      id: "character",
      title: t("createVideo.character"),
    },
    {
      id: "script",
      title: t("createVideo.script"),
    },
    {
      id: "material",
      title: t("createVideo.storyboard"),
    },
    {
      id: "video",
      title: t("createVideo.video"),
    },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  // 使用 useMemo 来稳定 queryKey，避免不必要的重新创建
  const queryKey = useMemo(() => ["creation", creationId] as const, [creationId]);
  
  // 使用一个标志来防止首次加载时的重复调用
  const shouldEnableQuery = useMemo(() => {
    if (!creationId) return false;
    // 如果是首次加载且已经初始化过，延迟启用以避免重复调用
    if (!hasInitializedRef.current) {
      // 首次加载，立即启用
      return true;
    }
    return true;
  }, [creationId]);
  
  const { data: curCreationResponse, isLoading, refetch: refetchCreation } = useQuery({
    queryKey,
    queryFn: () => {
      const now = Date.now();
      const timeSinceLastQuery = now - lastQueryTimeRef.current;
      const count = queryExecutionCountRef.current.get(creationId) || 0;
      queryExecutionCountRef.current.set(creationId, count + 1);
      
      // 如果距离上次查询不到 100ms，可能是重复调用（React 严格模式）
      if (timeSinceLastQuery < 100 && lastQueryTimeRef.current > 0 && count === 1) {
        // 注意：这是 React 严格模式在开发环境中的正常行为，生产环境不会发生
      }
      
      lastQueryTimeRef.current = now;
      isRefreshingRef.current = false; // 查询执行时重置标记
      return creationApi.queryCreationById(creationId);
    },
    enabled: shouldEnableQuery && !!creationId,
    staleTime: 0, // 数据立即过期，确保每次都会重新获取
    refetchOnMount: false, // 禁用自动 refetch，由路由监听统一处理
    refetchOnWindowFocus: false, // 禁用自动 refetch，由路由监听统一处理
    // 注意：当 queryKey 中的 creationId 变化时，useQuery 会自动触发查询
    // 这是正常的，我们只需要在重新进入相同 creationId 时手动刷新
    refetchInterval: (query) => {
      if (query.state.data?.data?.current_task_id) {
        return 4000;
      }
      return false;
    },
    // 使用 gcTime (原 cacheTime) 来避免缓存导致的问题
    gcTime: 0, // 立即清除缓存，确保每次都重新获取
    // 添加防重复调用的逻辑
    retry: 1,
    retryDelay: 0,
    // 使用 structuralSharing 来避免不必要的重新渲染
    structuralSharing: true,
  });
  const curCreation = useMemo(() => curCreationResponse?.data as ICreation, [curCreationResponse]);

  // 监听路由和 creationId 变化，当进入或重新进入创作页面时强制刷新创作数据
  useEffect(() => {
    const createPath = `/${locale}/create`;
    const isCreatePage = pathname === createPath;
    
    if (!isCreatePage) {
      // 不在创作页面，只更新路径，保留 creationId 以便下次判断
      prevPathnameRef.current = pathname;
      // 注意：不清空 prevCreationIdRef，以便重新进入时能正确判断
      return;
    }
    
    if (!creationId) {
      // 在创作页面但没有 creationId，更新路径并清空 creationId
      prevPathnameRef.current = pathname;
      prevCreationIdRef.current = null;
      return;
    }

    const wasNotCreatePage = prevPathnameRef.current && prevPathnameRef.current !== createPath;
    const creationIdChanged = prevCreationIdRef.current !== null && prevCreationIdRef.current !== creationId;
    const isFirstLoad = prevPathnameRef.current === null;
    const isSameCreationId = prevCreationIdRef.current !== null && prevCreationIdRef.current === creationId;

    // 处理逻辑：
    // 1. 首次进入创作页面 - 让 useQuery 自动处理（queryKey 变化会自动触发），但需要防止重复调用
    // 2. creationId 发生了变化 - 让 useQuery 自动处理（queryKey 变化会自动触发）
    // 3. 从其他页面返回到创作页面，且 creationId 相同 - 需要手动刷新
    if (isFirstLoad) {
      // 首次进入，让 useQuery 自动处理，不手动调用 invalidateQueries
      // 但需要标记已经初始化，避免重复调用
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
      }
    } else if (creationIdChanged) {
      // creationId 变化时，useQuery 的 queryKey 变化会自动触发重新查询
    } else if (wasNotCreatePage && isSameCreationId) {
      // 从其他页面返回，且 creationId 相同，需要强制刷新
      // 使用 invalidateQueries 会触发重新查询
      queryClient.invalidateQueries({ 
        queryKey: ["creation", creationId],
        refetchType: 'active' // 只刷新活动的查询
      });
    }

    // 更新上一个路径和 creationId（在最后更新，确保下次能正确判断）
    prevPathnameRef.current = pathname;
    prevCreationIdRef.current = creationId;
  }, [pathname, locale, creationId, queryClient]);

  // 监听页面可见性变化，当从其他标签页返回时刷新创作数据
  useEffect(() => {
    if (!creationId) return;

    const handleVisibilityChange = () => {
      // 当页面从隐藏变为可见时，强制刷新创作数据
      if (document.visibilityState === "visible" && pathname === `/${locale}/create`) {
        // invalidateQueries 会自动触发重新获取
        queryClient.invalidateQueries({ queryKey: ["creation", creationId] });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, locale, creationId, queryClient]);

  // 轮询分镜生成任务状态
  const { data: shotsTaskData } = useQuery({
    queryKey: ["shotsTask", shotsTaskId],
    queryFn: () => taskApi.queryShotsTask(shotsTaskId as string),
    enabled: !!shotsTaskId && isGeneratingShots,
    retry: 2, // 失败时最多重试2次
    refetchInterval: (query) => {
      // 如果查询出错，停止轮询
      if (query.state.error) {
        console.error("查询任务状态失败:", query.state.error);
        setIsGeneratingShots(false);
        setShotsTaskId(null);
        toast.error(t("creation.queryTaskFailed"));
        refetchCreation(); // 刷新创作数据
        return false;
      }
      
      const taskStatus = query.state.data?.data?.status;
        if (taskStatus === TaskStatus.SUCCESS || taskStatus === TaskStatus.FAILURE) {
          setIsGeneratingShots(false);
          if (taskStatus === TaskStatus.SUCCESS) {
            toast.success(t("creation.shotsGenerationSuccess"));
          } else {
            toast.error(t("creation.shotsGenerationFailed"));
          }
          return false;
        }
      return 2000; // 每2秒轮询一次
    },
  });

  // 当分镜任务数据更新时，更新 storyboardData
  useEffect(() => {
    if (shotsTaskData?.data?.scenes) {
      const transformedData = transformShotsToSceneGroups(shotsTaskData.data);
      setStoryboardData(transformedData);
    }
  }, [shotsTaskData]);

  // 当 curCreation 加载完成且进入分镜步骤时，从 scenes 初始化 storyboardData
  useEffect(() => {
    // 只有在分镜数据为空，且 creation 有 scenes 数据，且不在生成中时才初始化
    if (
      storyboardData.length === 0 &&
      !isGeneratingShots &&
      curCreation?.scenes &&
      curCreation.scenes.length > 0 &&
      curCreation.scenes.some(scene => scene.shots && scene.shots.length > 0)
    ) {
      const transformedData = transformCreationScenesToSceneGroups(curCreation.scenes);
      setStoryboardData(transformedData);
    }
  }, [curCreation?.scenes, storyboardData.length, isGeneratingShots]);

  // 检查所有分镜是否都有图片
  const checkAllShotsHaveImages = useCallback(() => {
    if (!curCreation?.scenes || curCreation.scenes.length === 0) {
      return false;
    }
    
    // 检查所有场景的所有分镜是否都有图片
    return curCreation.scenes.every(scene => 
      scene.shots && scene.shots.length > 0 && 
      scene.shots.every(shot => shot.image_url && shot.image_url.trim() !== "")
    );
  }, [curCreation?.scenes]);

  // 根据 current_task_id 恢复任务状态
  useEffect(() => {
    const restoreTaskState = async () => {
      // 如果有正在执行的任务，查询任务类型并跳转到对应步骤
      if (curCreation?.current_task_id) {
        try {
          const taskResponse = await taskApi.queryTaskStatus(curCreation.current_task_id);
          const task = taskResponse?.data;
          
          if (task) {
            const taskType = task.taskType;
            const taskStatus = task.status;
            
            // 如果任务还在进行中，根据任务类型跳转到对应步骤
            if (taskStatus !== TaskStatus.SUCCESS && taskStatus !== TaskStatus.FAILURE) {
              if (taskType === TaskType.SHOT_IMAGE_GENERATION) {
                // 分镜图片生成任务，跳转到分镜步骤并恢复轮询
                setShotsTaskId(curCreation.current_task_id);
                setIsGeneratingShots(true);
                setCurrentStep(3);
                return; // 有任务时直接返回，不走 status 逻辑
              } else if (taskType === TaskType.SCENE_DESCRIPTION_GENERATION) {
                // 分镜描述生成任务，跳转到脚本步骤（步骤2）
                setCurrentStep(2);
                return;
              } else if (taskType === TaskType.CHARACTER_IMAGE_GENERATION) {
                // 角色图片生成任务，跳转到角色设置步骤
                setCurrentStep(1);
                return;
              } else if (taskType === TaskType.AUDIO_GENERATION || taskType === TaskType.VIDEO_SYNTHESIS) {
                // 音频/视频生成任务，跳转到视频步骤
                setCurrentStep(4);
                return;
              } else if (taskType === TaskType.NOVEL_UPLOAD) {
                // 小说上传/分析任务，状态是 CREATED 时，跳转到角色设置步骤显示分析进度
                setCurrentStep(1);
                return;
              } else if (curCreation?.status === CreationStatus.CREATED && 
                         (!curCreation?.scenes || curCreation.scenes.length === 0)) {
                // 创建任务（分析阶段），状态是 CREATED 且没有分镜，跳转到角色设置步骤
                // 这是一个兜底逻辑，处理未知任务类型但状态是 CREATED 的情况
                setCurrentStep(1);
                return;
              }
              // 注意：PLAYBOOK_GENERATED 状态如果有任务，应该已经通过上面的任务类型判断处理了
              // 如果任务类型不匹配，继续执行后续的 status 逻辑
              
              // 如果状态是 PLAYBOOK_GENERATED、没有角色、且有 current_task_id，
              // 说明在生成分镜图（因为没有角色，跳过了角色图生成步骤）
              if (curCreation?.status === CreationStatus.PLAYBOOK_GENERATED && 
                  curCreation?.current_task_id &&
                  (!curCreation?.characters || curCreation.characters.length === 0)) {
                setShotsTaskId(curCreation.current_task_id);
                setIsGeneratingShots(true);
                setCurrentStep(3);
                return;
              }
              
              // 如果状态是 CHARACTER_GENERATED 且有 current_task_id，即使任务类型不匹配，
              // 也假设是分镜生成任务（因为角色图生成后通常就是分镜生成）
              if (curCreation?.status === CreationStatus.CHARACTER_GENERATED && curCreation?.current_task_id) {
                setShotsTaskId(curCreation.current_task_id);
                setIsGeneratingShots(true);
                setCurrentStep(3);
                return;
              }
            } else {
              // 任务已完成（SUCCESS 或 FAILURE），但如果有 current_task_id 且是分镜生成任务，
              // 说明应该跳转到分镜步骤查看结果
              if (taskType === TaskType.SHOT_IMAGE_GENERATION) {
                setShotsTaskId(curCreation.current_task_id);
                setIsGeneratingShots(false); // 任务已完成，不再生成中
                setCurrentStep(3);
                return;
              }
              
              // 如果状态是 PLAYBOOK_GENERATED、没有角色、且有 current_task_id，假设是分镜生成任务
              if (curCreation?.status === CreationStatus.PLAYBOOK_GENERATED && 
                  curCreation?.current_task_id &&
                  (!curCreation?.characters || curCreation.characters.length === 0)) {
                setShotsTaskId(curCreation.current_task_id);
                setIsGeneratingShots(false); // 任务已完成，不再生成中
                setCurrentStep(3);
                return;
              }
              
              // 如果状态是 CHARACTER_GENERATED 且有 current_task_id，即使任务类型不匹配，
              // 也假设是分镜生成任务，跳转到分镜步骤查看结果
              if (curCreation?.status === CreationStatus.CHARACTER_GENERATED && curCreation?.current_task_id) {
                setShotsTaskId(curCreation.current_task_id);
                setIsGeneratingShots(false);
                setCurrentStep(3);
                return;
              }
            }
          } else {
            // 任务查询成功但返回的 task 为空，根据状态进行兜底处理
            // 如果状态是 PLAYBOOK_GENERATED、没有角色、且有 current_task_id，假设是分镜生成任务
            if (curCreation?.status === CreationStatus.PLAYBOOK_GENERATED && 
                curCreation?.current_task_id &&
                (!curCreation?.characters || curCreation.characters.length === 0)) {
              setShotsTaskId(curCreation.current_task_id);
              setIsGeneratingShots(true);
              setCurrentStep(3);
              return;
            }
            if (curCreation?.status === CreationStatus.CHARACTER_GENERATED && curCreation?.current_task_id) {
              setShotsTaskId(curCreation.current_task_id);
              setIsGeneratingShots(true);
              setCurrentStep(3);
              return;
            }
          }
        } catch (error) {
          console.error("查询任务状态失败:", error);
          // 查询失败时，根据状态和 current_task_id 进行兜底处理
          if (curCreation?.current_task_id) {
            // 如果状态是 PLAYBOOK_GENERATED、没有角色、且有 current_task_id，假设是分镜生成任务
            if (curCreation?.status === CreationStatus.PLAYBOOK_GENERATED &&
                (!curCreation?.characters || curCreation.characters.length === 0)) {
              setShotsTaskId(curCreation.current_task_id);
              setIsGeneratingShots(true);
              setCurrentStep(3);
              return;
            } else if (curCreation?.status === CreationStatus.CHARACTER_GENERATED) {
              // 状态是 CHARACTER_GENERATED 且有 current_task_id，很可能是分镜生成任务
              setShotsTaskId(curCreation.current_task_id);
              setIsGeneratingShots(true);
              setCurrentStep(3);
              return;
            } else if (curCreation?.status === CreationStatus.CREATED) {
              // 状态是 CREATED 且有 current_task_id，很可能是初始分析任务
              setCurrentStep(1);
              return;
            }
          }
        }
      }
      
      // 检查状态是 CREATED 但没有分镜信息的情况（可能是分析失败）
      if ((curCreation?.status === CreationStatus.CREATED || curCreation?.status === CreationStatus.PLAYBOOK_GENERATED) &&
          (!curCreation?.scenes || curCreation.scenes.length === 0) &&
          !curCreation?.current_task_id &&
          creationId &&
          !isResubmitting) {
        setIsResubmitting(true);
        // 先跳转到角色设置步骤，显示分析进度
        setCurrentStep(1);
        // 重新提交创建任务，带上 creation_id 重新开始分析
        creationApi.createCreation({
          novelId: curCreation.novel_id,
          chapterId: curCreation.chapter_id,
          creationId: creationId,
        }).then((response) => {
          const newCreationId = response?.data?.creation_id || response?.data;
          if (newCreationId) {
            toast.success(t("creation.characterAnalysisStart") || "重新开始分析任务已提交");
            // 刷新创作数据以获取最新的任务ID
            refetchCreation();
          } else {
            throw new Error(t("creation.taskIdNotFound") || "未获取到创作ID");
          }
          setIsResubmitting(false);
        }).catch((error) => {
          console.error("重新提交创建任务失败:", error);
          toast.error(error.message || t("errors.generationFailed"));
          setIsResubmitting(false);
        });
        return; // 提前返回，不执行后续的步骤设置逻辑
      }
      
      // 没有任务或任务已完成，根据 status 设置步骤
      // 注意：如果状态是 CHARACTER_GENERATED 且有 current_task_id，应该已经在上面处理了
      switch (curCreation?.status) {
        case CreationStatus.CREATED:
          // 如果存在 current_task_id，说明有任务在进行，应该已经在上面处理了
          // 如果没有 current_task_id，根据内容决定步骤
          if (curCreation?.current_task_id) {
            // 有 current_task_id 但上面的任务查询没有匹配到，可能是查询失败或任务类型未知
            // 跳转到角色设置步骤，让用户看到分析进度
            setCurrentStep(1);
          } else if (curCreation?.scenes && curCreation.scenes.length > 0) {
            // 有分镜，跳转到脚本步骤
            setCurrentStep(2);
          } else if (curCreation?.characters && curCreation.characters.length > 0) {
            // 没有分镜但有角色信息，跳转到角色设置步骤
            setCurrentStep(1);
          } else {
            // 没有分镜也没有角色信息，保持在步骤0等待重新提交
            setCurrentStep(0);
          }
          break;
        case CreationStatus.PLAYBOOK_GENERATED:
          // 角色分析完成（playbook已生成）
          // 如果没有角色且有 current_task_id，说明在生成分镜图（跳过了角色图生成步骤）
          if ((!curCreation?.characters || curCreation.characters.length === 0) && 
              curCreation?.current_task_id) {
            setShotsTaskId(curCreation.current_task_id);
            setIsGeneratingShots(true);
            setCurrentStep(3);
          } else {
            // 有角色或没有任务，跳转到角色设置步骤
            // 如果确实没有角色，用户可以在角色设置步骤中看到"暂无角色"的提示，然后继续下一步
            setCurrentStep(1);
          }
          break;
        case CreationStatus.CHARACTER_GENERATED:
          // 如果状态是 CHARACTER_GENERATED 且有 current_task_id，说明有分镜生成任务在进行
          // 这种情况应该已经在上面处理了，如果没有处理到，说明任务查询失败或任务类型不匹配
          // 作为兜底，如果有 current_task_id，假设是分镜生成任务，跳转到分镜步骤
          if (curCreation?.current_task_id) {
            setShotsTaskId(curCreation.current_task_id);
            setIsGeneratingShots(true);
            setCurrentStep(3);
          } else {
            // 没有 current_task_id 时，跳转到脚本步骤
            setCurrentStep(2);
          }
          break;
        case CreationStatus.SCENE_GENERATED:
          setCurrentStep(3);
          break;
        // voice_selected 及之后的状态都跳转到视频步骤
        case CreationStatus.VOICE_SELECTED:
        case CreationStatus.AUDIO_GENERATED:
        case CreationStatus.VIDEO_GENERATED:
        case CreationStatus.COMPLETED:
          setCurrentStep(4);
          break;
        default:
          setCurrentStep(0);
          break;
      }
    };

    if (curCreation) {
      restoreTaskState();
    }
  }, [curCreation, creationId, locale, router, t]);

  const { steps, nextStep } = useProgressSteps(initialSteps, {
    currentStep,
    onStepChange: setCurrentStep,
  });

  // 触发分镜生成的内部函数
  const generateShotsInternal = useCallback(async () => {
    if (!creationId) {
      toast.error(t("creation.creationIdNotFound"));
      return;
    }

    // 计算分镜数量（每个分镜需要一个图片，所以图片数量等于分镜数量）
    const shotCount = curCreation?.scenes?.reduce((total, scene) => {
      return total + (scene.shots?.length || 0)
    }, 0) || 0

    // 检查积分是否充足
    const { checkAndNotifyPoints } = await import('@/lib/utils/points-check')
    const pointsAvailable = await checkAndNotifyPoints(
      {
        operation_type: 'generate_image',
        image_count: shotCount,
      },
      t
    )

    if (!pointsAvailable) {
      throw new Error('积分不足')
    }

    setIsGeneratingShots(true);
    toast.info(t("creation.shotsGenerationStart"));
    
    // 传递 image_count 参数，图片数量等于分镜数量
    const response = await creationApi.generateShots(creationId, shotCount);
    const taskId = response?.data?.task_id;
    
    if (taskId) {
      setShotsTaskId(taskId);
      nextStep(); // 先跳转到分镜页面
    } else {
      throw new Error(t("creation.taskIdNotFound"));
    }
  }, [creationId, nextStep, t, curCreation?.scenes]);

  // 使用任务提交 hook 包装分镜生成函数
  const { submit: handleGenerateShots, isSubmitting: isSubmittingShots } = useTaskSubmission(
    generateShotsInternal,
    {
      debounceDelay: 500,
      enableDebounce: true,
      onError: (error) => {
        console.error("Generate shots error:", error);
        toast.error(error.message || t("creation.shotsGenerationError"));
        setIsGeneratingShots(false);
      },
    }
  );

  // 同步 isSubmittingShots 到 isGeneratingShots（用于向后兼容）
  useEffect(() => {
    if (!isSubmittingShots && isGeneratingShots) {
      // 如果提交完成但 isGeneratingShots 仍为 true，说明任务已启动，保持状态
      // 这里不需要重置，因为任务已经在进行中
    }
  }, [isSubmittingShots, isGeneratingShots]);

  // 处理脚本步骤完成（点击下一步）
  const handleScriptComplete = useCallback(() => {
    // 检查所有分镜是否都有图片
    if (checkAllShotsHaveImages()) {
      // 如果所有分镜都有图片，直接进入下一步，不提交生成请求
      nextStep();
    } else {
      // 如果有分镜没有图片，提交生成分镜图请求
      handleGenerateShots();
    }
  }, [checkAllShotsHaveImages, handleGenerateShots, nextStep]);

  const handleStepChange = (stepIndex: number, step: ProgressStep) => {
    setCurrentStep(stepIndex);
  };

  const handleComplete = () => {
    // 这里可以添加完成后的逻辑，比如跳转到结果页面
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StorySetting />;
      case 1:
        return (
          <CharacterSetting
            characters={curCreation?.characters as ICharacter[] || []}
            currentTaskId={curCreation?.current_task_id}
            onComplete={() => {
              nextStep();
            }}
            handleUpdate={refetchCreation}
          />
        );

      case 2:
        return (
          <ScriptSetting
            data={curCreation?.scenes || []}
            onComplete={handleScriptComplete}
            isLoading={isGeneratingShots}
          />
        );
      case 3:
        return (
          <StoryboardImages
            data={storyboardData}
            isGenerating={isGeneratingShots}
            progress={shotsTaskData?.data?.progress}
            onComplete={() => {
              nextStep();
            }}
          />
        );
      case 4:
        return (
          <VideoGenerator
            creationId={creationId}
            creationStatus={curCreation?.status}
            initialAudioUrl={curCreation?.audio_url}
            initialVideoUrl={curCreation?.video_url}
            currentTaskId={curCreation?.current_task_id}
            onVideoGenerated={() => {
              nextStep();
            }}
          />
        );
    }
  };

  return (
    <div className="container mx-auto overflow-y-hidden">
      <div
        className="flex items-center gap-1 m-3"
        onClick={() => router.push(`/${locale}`)}
      >
        <ChevronLeft className="w-4 h-4 text-primary" />
        <h1 className="text-lg text-gradient-primary">
          {t("createVideo.createAnimation")}
        </h1>
      </div>
      <div className="h-[1px] w-full divider-primary mb-4" />
      <ModuleLoading loading={isLoading}>
        <ProgressWrapper
          steps={steps}
          currentStep={currentStep}
          orientation="horizontal"
          variant="default"
          size="sm"
          showNavigation={false}
          onStepChange={handleStepChange}
          onComplete={handleComplete}
          className="px-6"
        />
        <div>{renderStepContent()}</div>
      </ModuleLoading>
    </div>
  );
}
