import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Image as ImageIcon, ChevronRight } from "lucide-react";
import { useCreationV2Store } from '@/stores/creation-v2';
import { toast } from "sonner";
import sceneApi from '@/lib/api/scene';
import shotApi from '@/lib/api/shot';
import { IScene, IShot } from '@/types/scene';
import taskApi from '@/lib/api/task';

// Explicitly define TaskStatus if not available from types or import it if it exists
enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILURE = 'failed'
}

export function VisualGeneration() {
  const { creation, nextStep, updateShot, updateScene } = useCreationV2Store();
  const [regeneratingScenes, setRegeneratingScenes] = useState<Map<number, string>>(new Map());
  const [regeneratingShots, setRegeneratingShots] = useState<Map<number, string>>(new Map());

  // Polling for tasks
  useEffect(() => {
    const pollTasks = async () => {
      // Poll scene regeneration tasks
      regeneratingScenes.forEach(async (taskId, sceneId) => {
        try {
          const res = await taskApi.queryTaskStatus(taskId);
          const status = res.data.status as unknown as string;
          if (status === 'completed' || status === TaskStatus.SUCCESS || status === 'success') {
            setRegeneratingScenes(prev => {
              const newMap = new Map(prev);
              newMap.delete(sceneId);
              return newMap;
            });
            
            // Refresh scene data to get new image
            const response = await sceneApi.getSceneWithShots(String(sceneId));
            if (response.data) {
                updateScene(sceneId, response.data);
                toast.success("场景重新生成完成");
            }
          } else if (status === 'failed' || status === TaskStatus.FAILURE || status === 'failure') {
             setRegeneratingScenes(prev => {
              const newMap = new Map(prev);
              newMap.delete(sceneId);
              return newMap;
            });
            toast.error("场景图片生成失败");
          }
        } catch (e) {
          console.error(e);
        }
      });

      // Poll shot regeneration tasks
      regeneratingShots.forEach(async (taskId, shotId) => {
        try {
          const res = await taskApi.queryTaskStatus(taskId);
          const status = res.data.status as unknown as string;
          if (status === 'completed' || status === TaskStatus.SUCCESS || status === 'success') {
            setRegeneratingShots(prev => {
              const newMap = new Map(prev);
              newMap.delete(shotId);
              return newMap;
            });
            
            // Scene will be refreshed to get updated shot data
            // Find the scene that contains this shot and refresh it
            const scene = creation?.scenes?.find((s: any) =>
              s.shots?.some((shot: any) => shot.shot_id === shotId)
            );
            if (scene?.uuid) {
                const response = await sceneApi.getSceneWithShots(scene.uuid);
                if (response.data) {
                    updateScene(scene.scene_id, response.data);
                    toast.success("分镜重新生成完成");
                }
            }
          } else if (status === 'failed' || status === TaskStatus.FAILURE || status === 'failure') {
            setRegeneratingShots(prev => {
              const newMap = new Map(prev);
              newMap.delete(shotId);
              return newMap;
            });
            toast.error("分镜图片生成失败");
          }
        } catch (e) {
          console.error(e);
        }
      });
    };

    const interval = setInterval(pollTasks, 3000);
    return () => clearInterval(interval);
  }, [regeneratingScenes, regeneratingShots, updateScene, updateShot]);

  const handleRegenerateScene = async (e: React.MouseEvent, scene: IScene) => {
    e.stopPropagation();
    if (!scene.uuid) return;
    try {
      const res = await sceneApi.regenerateSceneImage(scene.uuid);
      if (res.data.task_id) {
        setRegeneratingScenes(prev => new Map(prev).set(scene.scene_id, res.data.task_id));
        toast.success("场景生成任务已提交");
      }
    } catch (error) {
      toast.error("提交失败");
    }
  };

  const handleRegenerateShot = async (shot: IShot) => {
    if (!shot.uuid) return;
    try {
      // 不再传递提示词，让后端重新生成
      const res = await shotApi.regenerateShotImage(shot.uuid);
      if (res.data.task_id) {
        setRegeneratingShots(prev => new Map(prev).set(shot.shot_id, res.data.task_id));
        toast.success("分镜生成任务已提交");
      }
    } catch (error) {
      toast.error("提交失败");
    }
  };

  if (!creation) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">视觉生成</h2>
          <p className="text-muted-foreground">检查并优化生成的场景与分镜图片</p>
        </div>
        <Button onClick={nextStep}>
          下一步：视频生成 <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="grid gap-6">
        <Accordion type="multiple" defaultValue={creation.scenes?.map((s: any) => `scene-${s.scene_id}`) || []} className="w-full">
          {creation.scenes?.map((scene: any, index: number) => (
            <AccordionItem key={scene.scene_id} value={`scene-${scene.scene_id}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 w-full pr-4">
                  <Badge variant="outline">场景 {index + 1}</Badge>
                  <span className="font-medium flex-1 text-left">{scene.title}</span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                     {/* Scene Image Preview in Header */}
                     {scene.image_url ? (
                        <img src={scene.image_url} alt={scene.title} className="w-10 h-10 object-cover rounded" />
                     ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                           <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                     )}
                     <Button 
                        size="sm" 
                        variant="ghost" 
                        disabled={regeneratingScenes.has(scene.scene_id)}
                        onClick={(e) => handleRegenerateScene(e, scene)}
                      >
                        {regeneratingScenes.has(scene.scene_id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-muted/30">
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {scene.shots?.map((shot: IShot) => (
                      <Card key={shot.shot_id} className="overflow-hidden">
                        <div className="aspect-video relative group">
                          {shot.image_url ? (
                            <img src={shot.image_url} alt={shot.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <Button 
                                size="sm" 
                                disabled={regeneratingShots.has(shot.shot_id)}
                                onClick={() => handleRegenerateShot(shot)}
                             >
                                {regeneratingShots.has(shot.shot_id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    重新生成
                                  </>
                                )}
                             </Button>
                          </div>
                        </div>
                        <CardContent className="p-3">
                           <div className="flex justify-between items-start mb-2">
                              <Badge variant="outline">分镜 {shot.shot_number}</Badge>
                           </div>
                           <p className="text-xs text-muted-foreground line-clamp-3">
                              {shot.description}
                           </p>
                        </CardContent>
                      </Card>
                    ))}
                 </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
