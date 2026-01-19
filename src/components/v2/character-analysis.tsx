"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreationV2Store } from "@/stores/creation-v2";
import { CharacterEditModal } from "@/components/modals/character-edit-modal";
import { ICharacter } from "@/types/character";
import { PenLine, ArrowRight, RotateCcw } from "lucide-react";
import characterApi from "@/lib/api/character";
import taskApi from "@/lib/api/task";
import { toast } from "sonner";
import { TaskStatus } from "@/types";
import { ImagePreview } from "@/components/ui/image-preview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getStyleOptions = (t: any) => [
  { value: "anime", label: t("character.animeStyle") },
  { value: "realistic", label: t("character.realisticStyle") },
  { value: "watercolor", label: t("character.watercolorStyle") },
  { value: "oil_painting", label: t("character.oilPaintingStyle") },
];

export function CharacterAnalysis() {
  const t = useTranslations();
  const { creation, nextStep, updateCharacter } = useCreationV2Store();
  const [editingCharacter, setEditingCharacter] = useState<ICharacter | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string>("anime");
  const [regeneratingMap, setRegeneratingMap] = useState<Map<string, string>>(new Map());
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const characters = creation?.characters || [];

  const handleEditCharacter = (character: ICharacter) => {
    setEditingCharacter(character);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCharacter(null);
  };

  const handleSuccessEdit = () => {
    // Refresh character data locally or refetch
    // For now, we assume the API update was successful and we might want to reload creation data
    // But store actions updateCharacter can be used if we had the new data. 
    // Since Modal calls API directly, we should probably refetch creation or update store if Modal returned data.
    // The current Modal implementation only calls API. We should probably trigger a reload of creation data in the store.
    // Ideally we would update the store with the new data.
    // Let's just reload the whole creation for consistency for now.
    // Actually, let's implement a simple refresh of the specific character if possible, 
    // but the Modal doesn't return the updated character. 
    // Let's assume the user will see the update on next load or we trigger a refresh.
    window.location.reload(); // Simple but effective for now, or use a query invalidation if we had access to query client
  };

  const handleRegenerateImage = async (character: ICharacter) => {
    if (!creation?.uuid) return;
    const charId = character.uuid || String(character.character_id);
    
    try {
        const response = await characterApi.regenerateCharacterImage(
            charId,
            getStyleOptions(t).find((option) => option.value === selectedStyle)?.label || t("character.animeStyle"),
            creation.uuid
        );
        if (response.data && response.data.task_id) {
            const taskId = response.data.task_id;
            setRegeneratingMap(prev => new Map(prev).set(charId, taskId));
            toast.success(t("character.regenerationStarted"));
        }
    } catch (error) {
        toast.error(t("common.error"));
    }
  };

  // Poll for tasks
  useEffect(() => {
    if (regeneratingMap.size === 0) return;

    const intervalId = setInterval(async () => {
        const newMap = new Map(regeneratingMap);
        let changed = false;

        for (const [charId, taskId] of regeneratingMap.entries()) {
            try {
                const res = await taskApi.queryTaskStatus(taskId);
                const task = res.data; // Task object is already in res.data
                
                if (task?.status === TaskStatus.SUCCESS) {
                    newMap.delete(charId);
                    changed = true;
                    toast.success(t("character.generationSuccess"));
                    
                    // Fetch updated character
                    const charRes = await characterApi.getCharacter(charId);
                    if (charRes.data) {
                        updateCharacter(charId, charRes.data);
                    }
                } else if (task?.status === TaskStatus.FAILURE) {
                    newMap.delete(charId);
                    changed = true;
                    toast.error(t("character.generationFailed"));
                }
            } catch (e) {
                console.error(e);
            }
        }

        if (changed) {
            setRegeneratingMap(newMap);
        }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [regeneratingMap, t, updateCharacter]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("createVideo.character")}</h2>
        <div className="flex items-center gap-4">
             <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("character.styleSelection")} />
                </SelectTrigger>
                <SelectContent>
                  {getStyleOptions(t).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((character: ICharacter) => (
          <Card key={character.uuid || character.character_id} className="overflow-hidden">
             <div className="aspect-[3/4] relative bg-muted group">
                 {character.image_url ? (
                     <img 
                        src={character.image_url} 
                        alt={character.name} 
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() => setPreviewImage(character.image_url!)}
                     />
                 ) : (
                     <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                         {t("character.noImage")}
                     </div>
                 )}
                 
                 {/* Overlay Actions */}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <Button size="icon" variant="secondary" onClick={() => handleEditCharacter(character)}>
                         <PenLine className="w-4 h-4" />
                     </Button>
                     <Button 
                        size="icon" 
                        variant="secondary" 
                        onClick={() => handleRegenerateImage(character)}
                        disabled={regeneratingMap.has(character.uuid || String(character.character_id!))}
                     >
                         <RotateCcw className={`w-4 h-4 ${regeneratingMap.has(character.uuid || String(character.character_id!)) ? 'animate-spin' : ''}`} />
                     </Button>
                 </div>
             </div>
             <CardContent className="p-4">
                 <h3 className="font-bold text-lg">{character.name}</h3>
                 <div className="text-sm text-muted-foreground leading-relaxed max-h-[60px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 mt-1">
                    {character.basic_info}
                 </div>
             </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end container mx-auto">
          <Button onClick={nextStep} size="lg" className="gap-2">
              {t("common.next")} <ArrowRight className="w-4 h-4" />
          </Button>
      </div>

      {editingCharacter && (
        <CharacterEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          character={editingCharacter}
          onSuccess={handleSuccessEdit}
        />
      )}
      
      <ImagePreview
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        src={previewImage || ""}
      />
    </div>
  );
}
