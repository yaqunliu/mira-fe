"use client";

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Timeline');
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
      <div className={cn("p-4 gap-2 rounded-2xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100", className)}>
        <div className="px-0 pb-3 border-b-[1px] border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-gradient-to-br from-#FDBCB4 to-#ADD8E6 text-white px-2 py-0.5">
                {t("shotItem", { index: index + 1 })} 
              </Badge>
              <div className="flex items-center gap-1 text-xs text-gray-600 ml-1">
                <Clock className="h-3 w-3" />
                <span>{currentShot.video_duration || 5}s</span>
              </div>
              <div className="text-md font-semibold text-gray-800 ml-2">
                {currentShot.title}
              </div>
            </div>
            <PencilLine 
              className="h-4 w-4 text-gray-500 cursor-pointer hover:text-#22C55E transition-colors" 
              onClick={handleEdit}
            />
          </div>
        </div>

        <div className="space-y-4 pt-3">
          {/* 角色信息 */}
          {currentShot.characters?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
                <Users className="h-3 w-3" />
                角色
              </div>
              <div className="flex flex-wrap gap-2">
                {currentShot.characters.map((character: ICharacter, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1 rounded-full bg-white border border-blue-100 shadow-sm">
                    {character.image_url ? (
                      <img
                        src={character.image_url}
                        alt={character.name}
                        className="w-6 h-6 rounded-full object-cover shadow-sm"
                      />
                    ) : null}
                    <span className="text-gray-700">{character.name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 旁白 */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-gray-800">
              <Mic className="h-3 w-3" />
              {t("narration")}
            </div>
            <div className="space-y-1">
              {Array.isArray(currentShot.narration) && currentShot.narration.length > 0 ? (
                currentShot.narration.map((item, idx) => (
                  <p key={idx} className="text-sm text-gray-600 leading-relaxed italic">
                    "{typeof item === 'string' ? item : (item.内容 || item.content || '')}"
                  </p>
                ))
              ) : (
                <p className="text-sm text-gray-400 leading-relaxed italic">
                  {t("noNarration")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

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
