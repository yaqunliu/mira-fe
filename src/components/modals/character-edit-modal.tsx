"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImagePreview } from "@/components/ui/image-preview";
import { Input } from "@/components/ui/input";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Save, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ICharacter } from "@/types/character";
import characterApi from "@/lib/api/character";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface CharacterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: ICharacter;
  onSuccess: () => void;
}

type EditCharacterFormData = {
  name: string;
  basicInfo: string;
  appearance?: string;
  body?: string;
  hair?: string;
  clothing?: string;
  tags?: string;
  imagePrompt?: string;
  voiceDescription?: string;
};

function CharacterFormFields({ form, character, t }: { form: any, character: ICharacter, t: any }) {
  const [previewImage, setPreviewImage] = useState<{src: string | null, alt: string} | null>(null);

  return (
    <div className="space-y-5">
      {/* 图片预览区域 */}
      {character.body !== null && character.body !== "" && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100">
          <div 
            className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-[2px_2px_8px_rgba(0,0,0,0.05),-2px_-2px_8px_rgba(255,255,255,0.8)] border border-blue-100 flex items-center justify-center relative group cursor-pointer"
            onClick={() => character.image_url && setPreviewImage({src: character.image_url, alt: character.name})}
          >
            {character.image_url ? (
              <>
                <img
                  src={character.image_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <span className="text-xs text-white font-medium">点击预览</span>
                </div>
              </>
            ) : (
              <span className="text-xs text-gray-500">暂未生成</span>
            )}
          </div>
          <div className="flex-1">
             <h4 className="text-sm font-semibold text-gray-900 mb-1">当前形象</h4>
             <p className="text-xs text-gray-600">
                {character.image_url ? "这是当前生成的角色参考图" : "角色形象暂未生成，请完善设定后点击生成"}
             </p>
          </div>
        </div>
      )}

      {previewImage && (
        <ImagePreview 
          open={!!previewImage}
          onOpenChange={(open) => !open && setPreviewImage(null)}
          src={previewImage.src}
          alt={previewImage.alt}
        />
      )}

      {/* 基础信息区域 - 更紧凑 */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {t("name")}
                </FormLabel>
                <FormControl>
                  <input
                    placeholder={t("namePlaceholder")}
                    className="w-full h-10 px-3 rounded-lg bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {character.body !== null && character.body !== "" && (
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-gray-700">
                    {t("featureTags")}
                  </FormLabel>
                  <FormControl>
                    <input
                      placeholder={t("tagsPlaceholder")}
                      className="w-full h-10 px-3 rounded-lg bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          )}
        </div>

        {character.body !== null && character.body !== "" && (
          <FormField
            control={form.control}
            name="basicInfo"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {t("basicInfo")}
                </FormLabel>
                <FormControl>
                  <textarea
                    placeholder={t("basicInfoPlaceholder")}
                    className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* 动态字段区域 */}
      <div className="space-y-4">
        {/* 音色描述 */}
        {(character.body === null || character.body === "") && (
          <FormField
            control={form.control}
            name="voiceDescription"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  音色描述
                </FormLabel>
                <FormControl>
                  <textarea
                    placeholder="描述角色的音色..."
                    className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm resize-none"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )}

        {/* 视觉特征字段组 - 紧凑网格 */}
        {character.body !== null && character.body !== "" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2 p-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100">
              <FormField
                control={form.control}
                name="appearance"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-gray-700">
                      {t("appearanceFeatures")}
                    </FormLabel>
                    <FormControl>
                      <textarea
                        placeholder={t("appearancePlaceholder")}
                        className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-gray-700">
                    {t("bodyFeatures")}
                  </FormLabel>
                  <FormControl>
                    <textarea
                      placeholder={t("bodyPlaceholder")}
                      className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clothing"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-gray-700">
                    {t("clothing")}
                  </FormLabel>
                  <FormControl>
                    <textarea
                      placeholder={t("clothingPlaceholder")}
                      className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hair"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-gray-700">
                    {t("hair")}
                  </FormLabel>
                  <FormControl>
                    <input
                      placeholder={t("hairPlaceholder")}
                      className="w-full h-10 px-3 rounded-lg bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-2 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-pink-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-orange-100">
              <FormField
                control={form.control}
                name="imagePrompt"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      {t("imagePrompt") || "生图提示词"}
                    </FormLabel>
                    <FormControl>
                      <textarea
                        placeholder={t("imagePromptPlaceholder") || "输入自定义生图提示词..."}
                        className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-orange-50 border border-orange-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all duration-200 text-sm resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 响应式角色编辑弹窗
 * - 桌面端 (>= 768px): 使用 Dialog 组件
 * - 移动端 (< 768px): 使用 BottomSheet 组件
 */
export function CharacterEditModal({
  isOpen,
  onClose,
  character,
  onSuccess,
}: CharacterEditModalProps) {
  const t = useTranslations("character");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // 动态创建 schema，因为验证消息需要国际化
  const editCharacterSchema = useMemo(() => z.object({
    name: z.string().min(1, t("nameRequired")),
    basicInfo: z.string().min(1, t("basicInfoRequired")),
    appearance: z.string().optional(),
    body: z.string().optional(),
    hair: z.string().optional(),
    clothing: z.string().optional(),
    tags: z.string().optional(),
    imagePrompt: z.string().optional(),
    voiceDescription: z.string().optional(),
  }), [t]);

  const form = useForm<EditCharacterFormData>({
    resolver: zodResolver(editCharacterSchema),
    defaultValues: {
      name: character.name,
      basicInfo: character.basic_info,
      appearance: character.appearance || "",
      body: character.body || "",
      hair: character.hair || "",
      clothing: character.clothing || "",
      tags: character.tags ? character.tags.join(",") : "",
      imagePrompt: character.image_prompt || "",
      voiceDescription: character.voice_description || "",
    },
  });

  // Reset form when character changes
  useEffect(() => {
    form.reset({
      name: character.name,
      basicInfo: character.basic_info,
      appearance: character.appearance || "",
      body: character.body || "",
      hair: character.hair || "",
      clothing: character.clothing || "",
      tags: character.tags ? character.tags.join(",") : "",
      imagePrompt: character.image_prompt || "",
      voiceDescription: character.voice_description || "",
    });
  }, [character, form]);

  const handleSave = async (data: EditCharacterFormData) => {
    setIsLoading(true);
    try {
      const updatedCharacter: Partial<ICharacter> = {
        ...character,
        name: data.name,
        basic_info: data.basicInfo,
        appearance: data.appearance,
        body: data.body,
        hair: data.hair,
        clothing: data.clothing,
        tags: data.tags ? data.tags.split(",") : [],
        image_prompt: data.imagePrompt || character.image_prompt,
        voice_description: data.voiceDescription,
      };
      
      // 必须使用UUID，如果character对象没有uuid字段，说明数据有问题
      const characterUuid = (character as any).uuid || (character as any).UUID;
      if (!characterUuid) {
        console.error("角色对象缺少uuid字段:", character);
        toast.error(`角色数据错误：缺少UUID字段，无法保存。`);
        return;
      }
      
      const uuidString = String(characterUuid);
      await characterApi.updateCharacter(uuidString, updatedCharacter);
      toast.success(t("updateSuccess"));
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(t("updateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  const headerContent = (
    <div className="flex items-center gap-2">
      <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full" />
      <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
        {t("editCharacterInfo")}
      </span>
    </div>
  );

  const descriptionContent = (
    <span className="text-slate-500 text-sm ml-3">
      {t("editCharacterDescription")}
    </span>
  );

  // Desktop Dialog View
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-white to-blue-50 shadow-[8px_8px_24px_rgba(0,0,0,0.12),-8px_-8px_24px_rgba(255,255,255,0.9)] border border-blue-100 rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{headerContent}</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-1">{descriptionContent}</div>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 px-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)}>
                <CharacterFormFields form={form} character={character} t={t} />
              </form>
            </Form>
          </div>

          <DialogFooter className="gap-3 sm:justify-end p-4 border-t border-blue-100 bg-gradient-to-br from-white to-blue-50 rounded-b-2xl">
            <button 
              onClick={handleCancel} 
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 text-gray-700 font-medium"
            >
              <X className="h-4 w-4" />
              {tCommon("cancel")}
            </button>
            <button 
              onClick={form.handleSubmit(handleSave)} 
              disabled={isLoading}
              className={`px-6 py-2.5 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!isLoading && <Save className="h-4 w-4" />}
              {tCommon("save")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile BottomSheet View
  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={onClose}
      title={headerContent}
      description={descriptionContent}
      actions={[
        {
          label: tCommon("cancel"),
          onClick: handleCancel,
          className: "px-6 py-3 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 text-gray-700 font-medium",
          icon: <X className="h-4 w-4" />,
          disabled: isLoading,
        },
        {
          label: tCommon("save"),
          onClick: form.handleSubmit(handleSave),
          className: "px-6 py-3 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200",
          icon: <Save className="h-4 w-4" />,
          loading: isLoading,
        },
      ]}
    >
      <div className="px-4 pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <CharacterFormFields form={form} character={character} t={t} />
          </form>
        </Form>
      </div>
    </BottomSheet>
  );
}
