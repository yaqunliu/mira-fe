"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IScene, IShot } from "@/types/scene";
import { ShotItem } from "../shot-item";

interface ScriptSettingProps {
  data: IScene[];
  className?: string;
  onComplete: () => void;
}

export function ScriptSetting({
  data,
  className,
  onComplete,
}: ScriptSettingProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(
    new Set(data.length > 0 ? [data[0].scene_id] : [])
  );
  const [scenes, setScenes] = useState(data);

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
              storyboard_list: scene.storyboard_list.map((sb: any) =>
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
    <div className={cn("space-y-4 h-[calc(100vh-136px)]", className)}>
      <div className="space-y-4 h-full overflow-y-auto pb-22 px-6">
        <h3 className="text-base font-semib100">{`故事分为${scenes.length}个场景`}</h3>
        {scenes.map((scene: IScene, index: number) => (
          <Card
            key={scene.scene_id}
            className={cn(
              "overflow-hidden p-0 border-orange-500/20 dark:border-orange-500/20"
            )}
          >
            <CardHeader
              className="cursor-pointer bg-primary-gradient-secondary transition-colors p-3"
              onClick={() => toggleScene(scene.scene_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gray-400/50"
                      >
                        {`场景 ${index + 1}`}
                      </Badge>
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {scene.title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        {scene.duration}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <Layers className="h-4 w-4" />
                        {scene.shots.length} 个分镜
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
                    场景设置
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-2">
                    <Badge variant="destructive" className="text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {`${scene.time_setting}`}
                      </div>
                    </Badge>
                    <Badge variant="destructive" className="text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {`${scene.location}`}
                      </div>
                    </Badge>
                    <Badge variant="destructive" className="text-xs">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {`${scene.space_type}`}
                      </div>
                    </Badge>
                    <Badge variant="destructive" className="text-xs">
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

                  <div className="w-full overflow-x-auto">
                    <div
                      className="flex space-x-3 pb-4"
                      style={{ width: "max-content" }}
                    >
                      {scene.shots.map(
                        (shot: IShot, index: number) => (
                          <div
                            key={shot.shot_id}
                            className="w-[65vw] md:w-[240px] lg:w-[300px] flex-shrink-0"
                          >
                            <ShotItem
                              shot={shot}
                              index={index}
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
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      {/* 底部操作浮层 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center">
            {/* 右侧操作按钮 */}

            <Button
              onClick={() => {
                // 下一步操作
                onComplete();
              }}
              className="bg-orange-400/80 hover:bg-orange-600 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed w-[120px]"
            >
              下一步
              <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
