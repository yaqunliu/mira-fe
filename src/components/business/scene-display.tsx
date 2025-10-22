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
} from "lucide-react";
import { Scene, SceneData } from "@/types";
import { StoryboardItem } from "./storyboard-item";
import { cn } from "@/lib/utils";

interface SceneDisplayProps {
  data: any;
  className?: string;
}

export function SceneDisplay({ data, className }: SceneDisplayProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(
    new Set(data.length > 0 ? [data[0].scene_id] : [])
  );
  const [scenes, setScenes] = useState(data);
  console.log(data);

  const toggleScene = (sceneId: string) => {
    const newExpanded = new Set(expandedScenes);
    if (newExpanded.has(sceneId)) {
      newExpanded.delete(sceneId);
    } else {
      newExpanded.add(sceneId);
    }
    setExpandedScenes(newExpanded);
  };

  const isExpanded = (sceneId: string) => expandedScenes.has(sceneId);

  const handleStoryboardUpdate = (sceneId: string, updatedStoryboard: any) => {
    setScenes((prevScenes: any) =>
      prevScenes.map((scene: any) =>
        scene.scene_id === sceneId
          ? {
              ...scene,
              storyboard_list: scene.storyboard_list.map((sb: any) =>
                sb.storyboard_id === updatedStoryboard.storyboard_id
                  ? updatedStoryboard
                  : sb
              ),
            }
          : scene
      )
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-4">
        {scenes.map((scene: any) => (
          <Card
            key={scene.scene_id}
            className={cn(
              "overflow-hidden p-0 border-orange-500/20 dark:border-orange-500/20",
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
                      <Badge variant="secondary" className="text-xs bg-gray-400/50">
                        {`场景 ${scene.scene_id}`}
                      </Badge>
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {scene.scene_title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        {scene.scene_duration}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <Layers className="h-4 w-4" />
                        {scene.storyboard_list.length} 个分镜
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
                            {`${scene.scene_setting.time}`}
                        </div>
                    </Badge>
                    <Badge variant="destructive" className="text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {`${scene.scene_setting.address}`}
                      </div>
                    </Badge>
                    <Badge variant="destructive" className="text-xs">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {`${scene.scene_setting.space}`}
                      </div>
                    </Badge>
                    <Badge variant="destructive" className="text-xs">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {`${scene.scene_setting.atmosphere}`}
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
                    分镜列表 ({scene.storyboard_list.length} 个)
                  </div>

                  <div className="w-full overflow-x-auto">
                    <div className="flex space-x-3 pb-4" style={{ width: 'max-content' }}>
                        {scene.storyboard_list.map((storyboard: any, index: number) => (
                          <div key={storyboard.storyboard_id} className="w-[65vw] md:w-[240px] lg:w-[300px] flex-shrink-0">
                            <StoryboardItem
                              storyboard={storyboard}
                              index={index}
                              onUpdate={(updatedStoryboard) => 
                                handleStoryboardUpdate(scene.scene_id, updatedStoryboard)
                              }
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
