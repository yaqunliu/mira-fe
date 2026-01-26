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

      <div className="space-y-6">
        {scenes.map((scene: IScene, index: number) => (
          <div key={scene.scene_id} className="rounded-2xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] overflow-hidden transition-all duration-200 hover:scale-[1.01]">
            <div
              className="cursor-pointer p-6 transition-colors"
              onClick={() => toggleScene(scene.scene_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="px-3 py-1 rounded-xl bg-gradient-to-br from-pink-100 to-pink-50 border border-pink-100 shadow-[2px_2px_8px_rgba(0,0,0,0.05),-2px_-2px_8px_rgba(255,255,255,0.8)] text-sm font-medium">{t("scene.sceneDisplay")} {index + 1}</span>
                  <h3 className="text-lg font-semibold">{scene.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                     <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {scene.duration}</span>
                     <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {scene.shots?.length || 0} {t("scene.shots")}</span>
                  </div>
                </div>
                {expandedScenes.has(scene.scene_id) ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
              </div>
            </div>
            {expandedScenes.has(scene.scene_id) && (
                <div className="p-6 space-y-4 border-t border-blue-100">
                    {/* Scene Details */}
                    <div className="flex flex-wrap gap-3 text-xs">
                        <span className="px-3 py-1 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[2px_2px_6px_rgba(0,0,0,0.05),-2px_-2px_6px_rgba(255,255,255,0.8)]">{scene.time_setting}</span>
                        <span className="px-3 py-1 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[2px_2px_6px_rgba(0,0,0,0.05),-2px_-2px_6px_rgba(255,255,255,0.8)]">{scene.location}</span>
                        <span className="px-3 py-1 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[2px_2px_6px_rgba(0,0,0,0.05),-2px_-2px_6px_rgba(255,255,255,0.8)]">{scene.space_type}</span>
                        <span className="px-3 py-1 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[2px_2px_6px_rgba(0,0,0,0.05),-2px_-2px_6px_rgba(255,255,255,0.8)]">{scene.atmosphere}</span>
                    </div>
                    
                    {/* Shots List */}
                    <div className="space-y-4">
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
                </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-br from-white to-blue-50 border-t border-blue-100 flex justify-end container mx-auto z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button 
            onClick={submitGenerate} 
            disabled={isSubmitting || isGenerating}
            className={`px-8 py-3 rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 ${(isSubmitting || isGenerating) ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
              {isSubmitting || isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("createVideo.generateShotImages")} <ArrowRight className="w-4 h-4" />
          </button>
      </div>
    </div>
  );
}
