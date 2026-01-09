"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, PencilLine, Mic } from "lucide-react";
import { StoryboardItem as StoryboardItemType } from "@/types";
import { cn } from "@/lib/utils";
import { StoryboardEditModal } from "@/components/modals/storyboard-edit-modal";
import { IShot } from "@/types/scene";
import { ICharacter } from "@/types/character";

interface ShotItemProps {
  shot: IShot;
  index: number;
  className?: string;
  onUpdate?: (updatedShot: IShot) => void;
  availableCharacters?: ICharacter[];
}

export function ShotItem({
  shot,
  index,
  className,
  onUpdate,
  availableCharacters = [],
}: ShotItemProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentShot, setCurrentShot] = useState(shot);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleSave = (updatedShot: IShot) => {
    setCurrentShot(updatedShot);
    onUpdate?.(updatedShot);
  };

  const handleClose = () => {
    setIsEditModalOpen(false);
  };
  return (
    <>
      <Card className={cn("p-3 gap-2 border-none bg-gray-600/30", className)}>
        <CardHeader className="px-0 border-b-[1px] border-orange-500/20 dark:border-gray-600/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-md font-semibold text-gray-900 dark:text-gray-100">
              <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-orange-400/40">
                    {`分镜 ${index + 1}`} 
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
                    <Clock className="h-3 w-3" />
                    <span>{currentShot.video_duration || 5}s</span>
                  </div>
                <div className="text-md font-semibold text-gray-900 dark:text-gray-100 ml-2">
                  {currentShot.title}
                </div>
              </div>
            </CardTitle>
            <PencilLine 
              className="h-4 w-4 text-gray-500 dark:text-stone-400 cursor-pointer hover:text-orange-500 transition-colors" 
              onClick={handleEdit}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-0">
          {/* 角色信息 */}
          {currentShot.characters?.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Users className="h-3 w-3" />
                角色
              </div>
              <div className="flex flex-wrap gap-2">
                {currentShot.characters.map((character: ICharacter, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1">
                    {character.image_url ? (
                      <img
                        src={character.image_url}
                        alt={character.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : null}
                    <span>{character.name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 旁白 */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mic className="h-3 w-3" />
              旁白
            </div>
            <div className="space-y-1">
              {Array.isArray(currentShot.narration) && currentShot.narration.length > 0 ? (
                currentShot.narration.map((item, idx) => (
                  <p key={idx} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                    "{typeof item === 'string' ? item : item.内容}"
                  </p>
                ))
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic opacity-50">
                  暂无旁白
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <StoryboardEditModal
        isOpen={isEditModalOpen}
        onClose={handleClose}
        shot={currentShot as IShot}
        onSave={(updatedShot: IShot) => handleSave(updatedShot)}
        availableCharacters={availableCharacters}
      />
    </>
  );
}
