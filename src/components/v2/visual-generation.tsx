import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import { Textarea } from '@/components/ui/textarea';

// Explicitly define TaskStatus if not available from types or import it if it exists
enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILURE = 'failed'
}

export function VisualGeneration() {
  const t = useTranslations('creation');
  const { creation, nextStep, updateShot, updateScene } = useCreationV2Store();
  const [regeneratingScenes, setRegeneratingScenes] = useState<Map<number, string>>(new Map());
  const [regeneratingShots, setRegeneratingShots] = useState<Map<number, string>>(new Map());
  const [editingShotId, setEditingShotId] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

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
            const updatedScene = await sceneApi.getScene(sceneId);
            if (updatedScene) {
                updateScene(sceneId, updatedScene);
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
            
            // Refresh shot data to get new image
            const updatedShot = await shotApi.getShot(shotId);
            if (updatedShot) {
                updateShot(shotId, updatedShot);
                toast.success("分镜重新生成完成");
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
      const prompt = editingShotId === shot.shot_id ? editPrompt : shot.image_prompt;
      const res = await shotApi.regenerateShot(shot.uuid, prompt);
      if (res.data.task_id) {
        setRegeneratingShots(prev => new Map(prev).set(shot.shot_id, res.data.task_id));
        toast.success("分镜生成任务已提交");
        setEditingShotId(null);
      }
    } catch (error) {
      toast.error("提交失败");
    }
  };

  const toggleEditShot = (shot: IShot) => {
    if (editingShotId === shot.shot_id) {
      setEditingShotId(null);
    } else {
      setEditingShotId(shot.shot_id);
      setEditPrompt(shot.image_prompt || "");
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
        <Accordion type="multiple" defaultValue={creation.scenes?.map(s => `scene-${s.scene_id}`) || []} className="w-full">
          {creation.scenes?.map((scene, index) => (
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
                                variant="secondary"
                                onClick={() => toggleEditShot(shot)}
                             >
                               编辑提示词
                             </Button>
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
                           {editingShotId === shot.shot_id ? (
                             <div className="space-y-2">
                               <Textarea 
                                  value={editPrompt} 
                                  onChange={(e) => setEditPrompt(e.target.value)} 
                                  className="text-xs h-20"
                               />
                               <div className="flex justify-end gap-2">
                                 <Button size="sm" variant="ghost" onClick={() => setEditingShotId(null)}>取消</Button>
                                 <Button size="sm" onClick={() => handleRegenerateShot(shot)}>生成</Button>
                               </div>
                             </div>
                           ) : (
                             <p className="text-xs text-muted-foreground line-clamp-3" title={shot.image_prompt}>
                                {shot.image_prompt || shot.description}
                             </p>
                           )}
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
