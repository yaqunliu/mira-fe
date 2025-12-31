"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCreationV2Store } from "@/stores/creation-v2";
import { IScene, IShot } from "@/types/scene";
import { ShotItem } from "@/components/business/shot-item";
import { ChevronDown, ChevronUp, Clock, Layers, ArrowRight, Loader2 } from "lucide-react";
import creationApi from "@/lib/api/creation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTaskSubmission } from "@/hooks/use-task-submission";

export function SceneBreakdown() {
  const t = useTranslations();
  const { creation, nextStep, updateShot } = useCreationV2Store();
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  const scenes = creation?.scenes || [];
  const characters = creation?.characters || [];

  const toggleScene = (sceneId: number) => {
    const newExpanded = new Set(expandedScenes);
    if (newExpanded.has(sceneId)) {
      newExpanded.delete(sceneId);
    } else {
      newExpanded.add(sceneId);
    }
    setExpandedScenes(newExpanded);
  };

  const handleShotUpdate = (sceneId: number, updatedShot: IShot) => {
    updateShot(updatedShot.shot_id, updatedShot);
  };

  const handleGenerateVisuals = async () => {
    if (!creation?.uuid && !creation?.creation_id) return;
    
    // Check points logic could be added here similar to original file
    
    setIsGenerating(true);
    try {
        // Calculate total shots
        const shotCount = scenes.reduce((acc, scene) => acc + (scene.shots?.length || 0), 0);
        
        const response = await creationApi.generateShots(creation.uuid || creation.creation_id, shotCount);
        
        if (response.data?.task_id) {
            toast.success(t("creation.shotsGenerationStart"));
            // We can move to next step immediately to show progress
            nextStep();
        }
    } catch (error: any) {
        toast.error(error.message || t("common.error"));
    } finally {
        setIsGenerating(false);
    }
  };

  const { submit: submitGenerate, isSubmitting } = useTaskSubmission(handleGenerateVisuals, {
      enableDebounce: true
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("createVideo.script")}</h2>
      </div>

      <div className="space-y-4">
        {scenes.map((scene: IScene, index: number) => (
          <Card key={scene.scene_id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer bg-muted/50 hover:bg-muted transition-colors p-4"
              onClick={() => toggleScene(scene.scene_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{t("scene.sceneDisplay")} {index + 1}</Badge>
                  <CardTitle className="text-base">{scene.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                     <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {scene.duration}</span>
                     <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {scene.shots?.length || 0} {t("scene.shots")}</span>
                  </div>
                </div>
                {expandedScenes.has(scene.scene_id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedScenes.has(scene.scene_id) && (
                <CardContent className="p-4 space-y-4">
                    {/* Scene Details */}
                    <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">{scene.time_setting}</Badge>
                        <Badge variant="secondary">{scene.location}</Badge>
                        <Badge variant="secondary">{scene.space_type}</Badge>
                        <Badge variant="secondary">{scene.atmosphere}</Badge>
                    </div>
                    
                    {/* Shots List */}
                    <div className="space-y-3">
                        {scene.shots?.map((shot, sIndex) => (
                            <ShotItem 
                                key={shot.shot_id} 
                                shot={shot} 
                                index={sIndex} 
                                availableCharacters={characters}
                                onUpdate={(updated) => handleShotUpdate(scene.scene_id, updated)}
                            />
                        ))}
                    </div>
                </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end container mx-auto z-10">
          <Button onClick={submitGenerate} size="lg" className="gap-2" disabled={isSubmitting || isGenerating}>
              {isSubmitting || isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("createVideo.generateShotImages")} <ArrowRight className="w-4 h-4" />
          </Button>
      </div>
    </div>
  );
}
