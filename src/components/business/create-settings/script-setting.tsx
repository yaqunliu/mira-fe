"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  MapPin,
  Calendar,
  Building,
  Eye,
  ChevronDown,
  ChevronUp,
  Film,
  Layers,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IScene, IShot } from "@/types/scene";
import { ICharacter } from "@/types/character";
import { ShotItem } from "../shot-item";
import { useTranslations } from "next-intl";
import creationApi from "@/lib/api/creation";
import taskApi from "@/lib/api/task";
import { useQuery } from "@tanstack/react-query";
import { TaskStatus } from "@/types";
import { toast } from "sonner";
import ModuleLoading from "@/components/ui/module-loading";

interface ScriptSettingProps {
  data: IScene[];
  className?: string;
  onComplete: () => void;
  isLoading?: boolean;
  creationId?: string;
  onDataUpdate?: (scenes: IScene[]) => void;
  characters?: ICharacter[];
  onGenerateShots?: () => void;
}

export function ScriptSetting({
  data,
  className,
  onComplete,
  isLoading = false,
  creationId,
  onDataUpdate,
  characters = [],
  onGenerateShots,
}: ScriptSettingProps) {
  const t = useTranslations();
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(
    new Set(data.length > 0 ? [data[0].scene_id] : [])
  );
  const [scenes, setScenes] = useState(data);
  const [isGeneratingPlaybook, setIsGeneratingPlaybook] = useState(false);
  const [playbookTaskId, setPlaybookTaskId] = useState<string | null>(null);


  // 当外部数据更新时，同步到本地状态
  useEffect(() => {
    if (data && data.length > 0) {
      setScenes(data);
      if (onDataUpdate) {
        onDataUpdate(data);
      }
    }
  }, [data, onDataUpdate]);

  // 轮询分镜拆分任务状态
  const { data: playbookTaskData } = useQuery({
    queryKey: ["playbookTask", playbookTaskId],
    queryFn: () => taskApi.queryTaskStatus(playbookTaskId as string),
    enabled: !!playbookTaskId && isGeneratingPlaybook,
    retry: 2,
    refetchInterval: (query) => {
      if (query.state.error) {
        setIsGeneratingPlaybook(false);
        setPlaybookTaskId(null);
        toast.error(t("creation.queryTaskFailed"));
        return false;
      }
      
      const taskStatus = query.state.data?.data?.status;
      if (taskStatus === TaskStatus.SUCCESS || taskStatus === TaskStatus.FAILURE) {
        setIsGeneratingPlaybook(false);
        if (taskStatus === TaskStatus.SUCCESS) {
          toast.success(t("creation.playbookGenerationSuccess"));
          // 成功后刷新数据
          if (onDataUpdate) {
            // 通知父组件刷新数据
            onDataUpdate([]); // 先清空，让父组件重新加载
          }
        } else {
          toast.error(t("creation.playbookGenerationFailed"));
        }
        setPlaybookTaskId(null);
        return false;
      }
      return 2000; // 每2秒轮询一次
    },
  });

  // 处理开始生成分镜
  const handleGeneratePlaybook = async () => {
    if (!creationId) {
      toast.error(t("creation.creationIdRequired"));
      return;
    }

    try {
      setIsGeneratingPlaybook(true);
      const response = await creationApi.generatePlaybook(creationId, "original");
      if (response.data?.task_id) {
        setPlaybookTaskId(response.data.task_id);
        toast.info(t("creation.playbookGenerationStarted"));
      } else {
        throw new Error(t("creation.taskIdNotFound"));
      }
    } catch (error: any) {
      setIsGeneratingPlaybook(false);
      toast.error(error.message || t("creation.playbookGenerationFailed"));
    }
  };

  const toggleScene = (sceneId: number) => {
    const newExpanded = new Set(expandedScenes);
    if (newExpanded.has(sceneId)) {
      newExpanded.delete(sceneId);
    } else {
      newExpanded.add(sceneId);
    }
    setExpandedScenes(newExpanded);
  };

  const isExpanded = (sceneId: number) => expandedScenes.has(sceneId);

  const handleStoryboardUpdate = (sceneId: number, updatedShot: IShot) => {
    setScenes((prevScenes: any) =>
      prevScenes.map((scene: any) =>
        scene.scene_id === sceneId
          ? {
              ...scene,
              shots: (scene.shots || []).map((sb: any) =>
                sb.shot_id === updatedShot.shot_id
                  ? updatedShot
                  : sb
              ),
            }
          : scene
      )
    );
  };

  return (
    <div className="h-[calc(100vh-136px)] min-h-0 flex flex-col relative">
      {/* 装饰性背景 */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-indigo-400/10 dark:bg-indigo-400/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-pink-400/10 dark:bg-pink-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <ModuleLoading
        loading={isLoading || isGeneratingPlaybook}
        coverFlowContainer={true}
        text={isGeneratingPlaybook ? t("creation.playbookGenerationStarted") : t("common.loading")}
      >
        <div className={cn("space-y-4 h-full min-h-0 flex flex-col relative z-10", className)}>
          <div className="space-y-4 h-full min-h-0 flex-1 overflow-y-auto pb-22 px-6">
            <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-indigo-400 dark:to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
              <Film className="w-5 h-5 text-indigo-500" />
              {t("scene.totalScenes", { count: scenes.length })}
            </h3>
            {scenes.map((scene: IScene, index: number) => (
              <Card
                key={scene.scene_id}
                className={cn(
                  "overflow-hidden p-0 border-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                )}
              >
                <CardHeader
                  className="cursor-pointer bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 transition-all duration-200 p-3"
                  onClick={() => toggleScene(scene.scene_id)}
                >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-white/80 dark:bg-gray-400/50 text-gray-700 dark:text-gray-300"
                      >
                        {t("scene.sceneDisplay")} {index + 1}
                      </Badge>
                      <CardTitle className="text-lg font-semibold text-white dark:text-gray-100">
                        {scene.title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-sm text-white/90 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        {scene.duration}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-white/90 dark:text-gray-400">
                        <Layers className="h-4 w-4" />
                        {scene.shots.length} {t("scene.shots")}
                      </div>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  {isExpanded(scene.scene_id) ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </CardHeader>

            {isExpanded(scene.scene_id) && (
              <CardContent className="space-y-3 px-3">
                {/* 场景设置信息 */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-stone-400 flex items-center gap-2">
                    {t("scene.sceneSettings")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {`${scene.time_setting}`}
                      </div>
                    </Badge>
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {`${scene.location}`}
                      </div>
                    </Badge>
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {`${scene.space_type}`}
                      </div>
                    </Badge>
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {`${scene.atmosphere}`}
                      </div>
                    </Badge>
                  </div>

                  {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Calendar className="h-4 w-4" />
                        时间
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 pl-6">
                        {scene.scene_setting.time}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <MapPin className="h-4 w-4" />
                        地点
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 pl-6">
                        {scene.scene_setting.address}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Building className="h-4 w-4" />
                        空间
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 pl-6">
                        {scene.scene_setting.space}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Eye className="h-4 w-4" />
                        氛围
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 pl-6">
                        {scene.scene_setting.atmosphere}
                      </p>
                    </div>
                  </div> */}
                </div>

                <Separator />

                {/* 分镜列表 */}
                <div className="space-y-3">
                  <div className="text-md font-semibold text-gray-900 dark:text-stone-400 flex items-center gap-2">
                    分镜列表 ({scene.shots.length} 个)
                  </div>

                  <div className="w-full space-y-3">
                    {scene.shots.map(
                      (shot: IShot, index: number) => (
                        <div
                          key={shot.shot_id}
                          className="w-full"
                        >
                          <ShotItem
                            shot={shot}
                            index={index}
                            availableCharacters={characters || []}
                            onUpdate={(updatedShot: IShot) =>
                              handleStoryboardUpdate(
                                scene.scene_id,
                                updatedShot
                              )
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      {/* 底部操作浮层 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-t-2 border-indigo-200/50 dark:border-indigo-700/50 shadow-2xl backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center">
            {/* 右侧操作按钮 */}

            {scenes.length === 0 ? (
              // 如果没有分镜数据，显示"开始生成分镜"按钮
              <Button
                onClick={handleGeneratePlaybook}
                disabled={isGeneratingPlaybook || isLoading}
                className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white px-6 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all duration-200 hover:scale-105 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-[160px]"
              >
                {isGeneratingPlaybook || isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {t("common.generating")}
                  </>
                ) : (
                  <>
                    {t("creation.startGeneratePlaybook")}
                    <ArrowRight className="w-4 h-4 mr-1" />
                  </>
                )}
              </Button>
            ) : (
              // 如果有分镜数据，显示"生成分镜图片"按钮
              <Button
                onClick={() => {
                  // 检查所有角色是否都有图片
                  if (characters && characters.length > 0) {
                    const charactersWithoutImage = characters.filter(
                      (character) => !character.image_url
                    );

                    if (charactersWithoutImage.length > 0) {
                      // 如果有角色没有生成图片，显示提示
                      const characterNames = charactersWithoutImage
                        .map((c) => c.name)
                        .join("、");
                      toast.error(
                        t("character.pleaseGenerateAllCharacterImages", {
                          characters: characterNames,
                        })
                      );
                      return;
                    }
                  }

                  // 所有角色都有图片，调用生成分镜图片的回调
                  onGenerateShots?.();
                }}
                disabled={isLoading || isGeneratingPlaybook}
                className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white px-4 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all duration-200 hover:scale-105 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
              >
                {isLoading || isGeneratingPlaybook ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {t("common.generating")}
                  </>
                ) : (
                  <>
                    {t("createVideo.generateShotImages")}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
        </div>
      </ModuleLoading>
    </div>
  );
}
