import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Image as ImageIcon, ChevronRight } from "lucide-react";
import { useCreationV2Store } from '@/stores/creation-v2';
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
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
                toast.success(t("scene.regenerateSuccess"));
            }
          } else if (status === 'failed' || status === TaskStatus.FAILURE || status === 'failure') {
             setRegeneratingScenes(prev => {
              const newMap = new Map(prev);
              newMap.delete(sceneId);
              return newMap;
            });
            toast.error(t("scene.imageGenerationFailed"));
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
                    toast.success(t("storyboard.regenerateShotSuccess"));
                }
            }
          } else if (status === 'failed' || status === TaskStatus.FAILURE || status === 'failure') {
            setRegeneratingShots(prev => {
              const newMap = new Map(prev);
              newMap.delete(shotId);
              return newMap;
            });
            toast.error(t("storyboard.shotImageGenerationFailed"));
          }
        } catch (e) {
          console.error(e);
        }
      });
    };

    const interval = setInterval(pollTasks, 3000);
    return () => clearInterval(interval);
  }, [regeneratingScenes, regeneratingShots, updateScene, updateShot, creation?.scenes, t]);

  const handleRegenerateScene = async (e: React.MouseEvent, scene: IScene) => {
    e.stopPropagation();
    if (!scene.uuid) return;
    try {
      const res = await sceneApi.regenerateSceneImage(scene.uuid);
      if (res.data.task_id) {
        setRegeneratingScenes(prev => new Map(prev).set(scene.scene_id, res.data.task_id));
        toast.success(t("scene.generationTaskSubmitted"));
      }
    } catch (error) {
      toast.error(t("common.submitFailed"));
    }
  };

  const handleRegenerateShot = async (shot: IShot) => {
    if (!shot.uuid) return;
    try {
      // 不再传递提示词，让后端重新生成
      const res = await shotApi.regenerateShotImage(shot.uuid);
      if (res.data.task_id) {
        setRegeneratingShots(prev => new Map(prev).set(shot.shot_id, res.data.task_id));
        toast.success(t("storyboard.generationTaskSubmitted"));
      }
    } catch (error) {
      toast.error(t("common.submitFailed"));
    }
  };

  if (!creation) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] bg-clip-text text-transparent">{t("createVideo.visualGeneration")}</h2>
          <p className="text-gray-600">{t("createVideo.visualGenerationDesc")}</p>
        </div>
        <Button onClick={nextStep} className="bg-gradient-to-r from-[#FDBCB4] to-[#ADD8E6] hover:from-[#F9A899] hover:to-[#93C5FD] text-gray-800 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200 hover:scale-105 rounded-xl">
          {t("createVideo.nextStepVideoGeneration")} <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <div className="grid gap-6">
        <Accordion type="multiple" defaultValue={creation.scenes?.map((s: any) => `scene-${s.scene_id}`) || []} className="w-full">
          {creation.scenes?.map((scene: any, index: number) => (
            <AccordionItem key={scene.scene_id} value={`scene-${scene.scene_id}`} className="border-0 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-300 rounded-2xl mb-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 w-full pr-4">
                  <Badge variant="outline" className="bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 text-gray-700 rounded-full shadow-[2px_2px_4px_rgba(173,221,230,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)]">{t("scene.sceneNumber", { number: index + 1 })}</Badge>
                  <span className="font-medium flex-1 text-left text-gray-800">{scene.title}</span>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                     {/* Scene Image Preview in Header */}
                     {scene.image_url ? (
                        <img src={scene.image_url} alt={scene.title} className="w-10 h-10 object-cover rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.7)]" />
                     ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-white to-blue-50 rounded-xl flex items-center justify-center shadow-[4px_4px_8px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.7)]">
                           <ImageIcon className="w-4 h-4 text-[#ADD8E6]" />
                        </div>
                     )}
                     <Button 
                        size="sm" 
                        variant="secondary" 
                        disabled={regeneratingScenes.has(scene.scene_id)}
                        onClick={(e) => handleRegenerateScene(e, scene)}
                        className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200 hover:scale-105 rounded-xl"
                      >
                        {regeneratingScenes.has(scene.scene_id) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#ADD8E6]" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-[#FDBCB4]" />
                        )}
                      </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-gradient-to-br from-white to-blue-50/80">
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {scene.shots?.map((shot: IShot) => (
                      <Card key={shot.shot_id} className="overflow-hidden border-0 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.1),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-300 rounded-2xl">
                        <div className="aspect-video relative group">
                          {shot.image_url ? (
                            <img src={shot.image_url} alt={shot.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-white to-blue-50 flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-[#ADD8E6]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <Button 
                                size="sm" 
                                disabled={regeneratingShots.has(shot.shot_id)}
                                onClick={() => handleRegenerateShot(shot)}
                                className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.15),-6px_-6px_16px_rgba(255,255,255,0.9)] transition-all duration-200 hover:scale-105 rounded-xl"
                             >
                                {regeneratingShots.has(shot.shot_id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-[#ADD8E6]" />
                                ) : (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 text-[#FDBCB4]" />
                                    {t("common.regenerate")}
                                  </>
                                )}
                             </Button>
                          </div>
                        </div>
                        <CardContent className="p-3">
                           <div className="flex justify-between items-start mb-2">
                              <Badge variant="outline" className="bg-gradient-to-r from-[#FDBCB4]/20 to-[#ADD8E6]/20 text-gray-700 rounded-full shadow-[2px_2px_4px_rgba(173,221,230,0.2),-1px_-1px_2px_rgba(255,255,255,0.7)]">{t("storyboard.shotNumber", { number: shot.shot_number })}</Badge>
                           </div>
                           <div className="text-xs text-gray-700 max-h-[60px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                              {shot.description}
                           </div>
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
