"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Save, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AIGeneratedImage } from "@/types";
import { ICharacter } from "@/types/character";
import { Badge } from "@/components/ui/badge";
import shotApi from "@/lib/api/shot";
import React from "react";
import { useTranslations } from "next-intl";

interface StoryboardEditBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  image: AIGeneratedImage | null;
  onRegenerate: (imageId: string, selectedCharacters?: number[]) => Promise<void>;
  availableCharacters?: ICharacter[];
}

/**
 * 分镜图编辑底部弹窗
 * 
 * 用于编辑分镜图的关联角色，支持重新生成功能
 */
export function StoryboardEditBottomSheet({
  isOpen,
  onClose,
  image,
  onRegenerate,
  availableCharacters = [],
}: StoryboardEditBottomSheetProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([]);

  // 当图片变化时更新
  React.useEffect(() => {
    if (image && isOpen) {
      // 尝试从 characters 数组获取角色ID
      let characterIds = (image.characters || [])
        .map((c) => Number(c.character_id))
        .filter((id) => !isNaN(id) && id > 0);

      // 如果 characters 数组为空，尝试从 character_ids 字段获取（生成中的分镜可能只有这个字段）
      if (characterIds.length === 0 && (image as any).character_ids) {
        characterIds = ((image as any).character_ids || [])
          .map((id: any) => Number(id))
          .filter((id: number) => !isNaN(id) && id > 0);
      }

      setSelectedCharacters(characterIds);
    }
  }, [image?.image_id, isOpen]);

  const handleRegenerate = async () => {
    if (!image) return;
    
    setIsRegenerating(true);
    try {
      // 先更新角色关联
      if (selectedCharacters && selectedCharacters.length > 0) {
        const shotUuid = image.uuid || image.image_id;
        await shotApi.updateShotCharacters(String(shotUuid), selectedCharacters);
      }

      await onRegenerate(image.image_id, selectedCharacters);
      toast.success(t("storyboard.regenerateStart"));
      onClose();
    } catch (error) {
      toast.error(t("storyboard.regenerateImageError"));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!image) return null;

  return (
      <BottomSheet
        open={isOpen}
        onOpenChange={onClose}
        title={t("storyboard.regenerateStoryboard")}
        description={`${image.title} - ${t("storyboard.regenerateStoryboardDesc")}`}
        actions={[
          {
            label: t("storyboard.cancel"),
            onClick: handleCancel,
            variant: "secondary",
            icon: <X className="h-4 w-4" />,
            disabled: isRegenerating,
            className: "rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
          },
          {
            label: t("storyboard.regenerateImage"),
            onClick: handleRegenerate,
            variant: "default",
            icon: <RefreshCw className="h-4 w-4" />,
            disabled: isRegenerating,
            loading: isRegenerating,
            className: "rounded-xl bg-gradient-to-br from-#22C55E to-#16A34A shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
          },
        ]}
        className="bg-gradient-to-br from-white to-blue-50"
      >
        <div className="space-y-6">
          {/* 图片预览 */}
          <div className="flex justify-center">
            <div className="relative w-36 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
              {image.image_url ? (
                <img
                  src={image.image_url}
                  alt={image.title}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-#FDBCB4 to-#ADD8E6 text-white">
                  {t("storyboard.noImage")}
                </div>
              )}
            </div>
          </div>

          {/* 关联角色 */}
          <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
            <div className="text-base font-semibold text-gray-800">
              关联角色
            </div>
            {availableCharacters.length === 0 ? (
              <p className="text-sm text-gray-600">暂无可选角色</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableCharacters.map((character) => {
                  const idNum = Number(character.character_id);
                  const checked = selectedCharacters.includes(idNum);
                  return (
                    <label
                      key={character.character_id}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl border-2 cursor-pointer text-sm transition-all duration-200 hover:scale-105 ${
                        checked
                          ? "border-#22C55E bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]"
                          : "border-blue-100 bg-gradient-to-br from-white to-blue-50 hover:border-#22C55E/50"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedCharacters((prev) =>
                          prev.includes(idNum)
                            ? prev.filter((c) => c !== idNum)
                            : [...prev, idNum]
                        );
                      }}
                    >
                      {character.image_url ? (
                        <img
                          src={character.image_url}
                          alt={character.name}
                          className="w-12 h-12 rounded-xl object-cover border-2 border-blue-100 shadow-[4px_4px_8px_rgba(0,0,0,0.08),-2px_-2px_4px_rgba(255,255,255,0.8)]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-#FDBCB4 to-#ADD8E6 flex items-center justify-center text-xs text-white border-2 border-blue-100 shadow-[4px_4px_8px_rgba(0,0,0,0.08),-2px_-2px_4px_rgba(255,255,255,0.8)]">
                          无图
                        </div>
                      )}
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => {
                          setSelectedCharacters((prev) =>
                            prev.includes(idNum)
                              ? prev.filter((c) => c !== idNum)
                              : [...prev, idNum]
                          );
                        }}
                      />
                      <span className="truncate text-gray-800">{character.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    );
}
