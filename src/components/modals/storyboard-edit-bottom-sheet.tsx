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

const getEditStoryboardSchema = (t: any) => z.object({
  prompt: z.string().min(1, t("storyboard.promptRequired")),
});

type EditStoryboardFormData = z.infer<typeof editStoryboardSchema>;

interface StoryboardEditBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  image: AIGeneratedImage | null;
  onRegenerate: (imageId: string, newPrompt: string, selectedCharacters?: number[]) => Promise<void>;
  availableCharacters?: ICharacter[];
}

/**
 * 分镜图编辑底部弹窗
 * 
 * 用于编辑分镜图的提示词，支持重新生成功能
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

  const form = useForm<EditStoryboardFormData>({
    resolver: zodResolver(getEditStoryboardSchema(t)),
    defaultValues: {
      prompt: image?.prompt || "",
    },
  });

  // 当图片变化时更新表单默认值
  React.useEffect(() => {
    if (image && isOpen) {
      form.reset({
        prompt: image.prompt,
      });

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
  }, [image?.image_id, isOpen, form]);

  const handleRegenerate = async () => {
    if (!image) return;
    
    const formData = form.getValues();
    if (!formData.prompt.trim()) {
      toast.error(t("storyboard.promptRequired"));
      return;
    }

    setIsRegenerating(true);
    try {
      // 先更新角色关联
      if (selectedCharacters && selectedCharacters.length > 0) {
        const shotUuid = image.uuid || image.image_id;
        await shotApi.updateShotCharacters(String(shotUuid), selectedCharacters);
      }

      await onRegenerate(image.image_id, formData.prompt, selectedCharacters);
      toast.success(t("storyboard.regenerateStart"));
      onClose();
    } catch (error) {
      toast.error(t("storyboard.regenerateImageError"));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCancel = () => {
    form.reset();
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
        },
        {
          label: t("storyboard.regenerateImage"),
          onClick: handleRegenerate,
          variant: "default",
          icon: <RefreshCw className="h-4 w-4" />,
          disabled: isRegenerating,
          loading: isRegenerating,
        },
      ]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleRegenerate)} className="space-y-6">
          {/* 图片预览 */}
          <div className="flex justify-center">
            <div className="relative w-32 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-blue-200/50 dark:border-blue-700/50 shadow-lg">
              {image.image_url ? (
                <img
                  src={image.image_url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  {t("storyboard.noImage")}
                </div>
              )}
            </div>
          </div>

          {/* 提示词编辑 */}
          {/* 关联角色 */}
          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800/50 dark:to-blue-900/20 border-2 border-blue-200/50 dark:border-blue-700/50">
            <FormLabel className="text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              关联角色
            </FormLabel>
            {availableCharacters.length === 0 ? (
              <p className="text-sm text-gray-500">暂无可选角色</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableCharacters.map((character) => {
                  const idNum = Number(character.character_id);
                  const checked = selectedCharacters.includes(idNum);
                  return (
                    <label
                      key={character.character_id}
                      className={`flex items-center gap-2 px-2 py-2 rounded-xl border-2 cursor-pointer text-sm transition-all duration-200 hover:scale-105 ${
                        checked
                          ? "border-blue-400 bg-gradient-to-r from-blue-50 to-purple-50 dark:border-blue-500/60 dark:from-blue-900/30 dark:to-purple-900/30 shadow-md shadow-blue-500/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
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
                          className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xs text-gray-500 border-2 border-gray-300 dark:border-gray-600">
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
                      <span className="truncate">{character.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {t("storyboard.prompt")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("storyboard.promptPlaceholder")}
                    className="min-h-[120px] resize-none rounded-xl border-2 border-blue-200/50 dark:border-blue-700/50 focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("storyboard.promptHint")}
                </p>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </BottomSheet>
  );
}
