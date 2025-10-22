"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, FileText, Palette, PencilLine, Mic } from "lucide-react";
import { StoryboardItem as StoryboardItemType } from "@/types";
import { cn } from "@/lib/utils";
import { StoryboardEditModal } from "@/components/modals/storyboard-edit-modal";

interface StoryboardItemProps {
  storyboard: StoryboardItemType;
  index: number;
  className?: string;
  onUpdate?: (updatedStoryboard: StoryboardItemType) => void;
}

export function StoryboardItem({
  storyboard,
  index,
  className,
  onUpdate,
}: StoryboardItemProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentStoryboard, setCurrentStoryboard] = useState(storyboard);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleSave = (updatedStoryboard: StoryboardItemType) => {
    setCurrentStoryboard(updatedStoryboard);
    onUpdate?.(updatedStoryboard);
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
                <div className="text-md font-semibold text-gray-900 dark:text-gray-100">
                  {currentStoryboard.storyboard_name}
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
          {currentStoryboard.storyboard_characters.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Users className="h-3 w-3" />
                角色
              </div>
              <div className="flex flex-wrap gap-2">
                {currentStoryboard.storyboard_characters.map((character, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {character}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 画面描述 */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText className="h-3 w-3" />
              画面描述
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {currentStoryboard.storyboard_description}
            </p>
          </div>
          
          {/* 旁白 */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mic className="h-3 w-3" />
              旁白
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {currentStoryboard.storyboard_narration || currentStoryboard.storyboard_description}
            </p>
          </div>
        </CardContent>
      </Card>

      <StoryboardEditModal
        isOpen={isEditModalOpen}
        onClose={handleClose}
        storyboard={currentStoryboard}
        onSave={handleSave}
      />
    </>
  );
}
