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
    <div className="space-y-3">
      {/* 图片预览区域 */}
      {character.body !== null && character.body !== "" && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div 
            className="w-20 h-20 shrink-0 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center relative group cursor-pointer"
            onClick={() => character.image_url && setPreviewImage({src: character.image_url, alt: character.name})}
          >
            {character.image_url ? (
              <>
                <img
                  src={character.image_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] text-white font-medium">点击预览</span>
                </div>
              </>
            ) : (
              <span className="text-[10px] text-slate-400">暂未生成</span>
            )}
          </div>
          <div className="flex-1">
             <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">当前形象</h4>
             <p className="text-xs text-slate-500">
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
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {t("name")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("namePlaceholder")}
                    className="h-8 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-orange-500"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {character.body !== null && character.body !== "" && (
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("featureTags")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("tagsPlaceholder")}
                      className="h-8 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-orange-500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
              <FormItem className="space-y-0.5">
                <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {t("basicInfo")}
                </FormLabel>
                <FormControl>
                  <AutosizeTextarea
                    placeholder={t("basicInfoPlaceholder")}
                    className="text-sm resize-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:border-blue-500"
                    minRows={3}
                    maxRows={8}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* 动态字段区域 */}
      <div className="space-y-3">
        {/* 音色描述 */}
        {(character.body === null || character.body === "") && (
          <FormField
            control={form.control}
            name="voiceDescription"
            render={({ field }) => (
              <FormItem className="space-y-0.5">
                <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  音色描述
                </FormLabel>
                <FormControl>
                  <AutosizeTextarea
                    placeholder="描述角色的音色..."
                    className="text-sm resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-purple-500"
                    minRows={4}
                    maxRows={10}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 视觉特征字段组 - 紧凑网格 */}
        {character.body !== null && character.body !== "" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2 space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <FormField
                control={form.control}
                name="appearance"
                render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("appearanceFeatures")}
                    </FormLabel>
                    <FormControl>
                      <AutosizeTextarea
                        placeholder={t("appearancePlaceholder")}
                        className="text-sm resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-orange-500"
                        minRows={3}
                        maxRows={8}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("bodyFeatures")}
                  </FormLabel>
                  <FormControl>
                    <AutosizeTextarea
                      placeholder={t("bodyPlaceholder")}
                      className="text-sm resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-orange-500"
                      minRows={2}
                      maxRows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clothing"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("clothing")}
                  </FormLabel>
                  <FormControl>
                    <AutosizeTextarea
                      placeholder={t("clothingPlaceholder")}
                      className="text-sm resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-orange-500"
                      minRows={2}
                      maxRows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hair"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <FormLabel className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("hair")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("hairPlaceholder")}
                      className="h-8 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-orange-500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-2 p-3 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30">
              <FormField
                control={form.control}
                name="imagePrompt"
                render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-xs font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      {t("imagePrompt") || "生图提示词"}
                    </FormLabel>
                    <FormControl>
                      <AutosizeTextarea
                        placeholder={t("imagePromptPlaceholder") || "输入自定义生图提示词..."}
                        className="text-sm resize-none bg-white dark:bg-slate-950 border-orange-200 dark:border-orange-800/50 focus:border-orange-500"
                        minRows={3}
                        maxRows={10}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{headerContent}</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-1">{descriptionContent}</div>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)}>
                <CharacterFormFields form={form} character={character} t={t} />
              </form>
            </Form>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              disabled={isLoading} 
              className="border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              <X className="h-4 w-4 mr-2" />
              {tCommon("cancel")}
            </Button>
            <Button 
              onClick={form.handleSubmit(handleSave)} 
              disabled={isLoading} 
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isLoading && <Save className="h-4 w-4 mr-2" />}
              {tCommon("save")}
            </Button>
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
          variant: "outline",
          className: "border-slate-700 hover:bg-slate-800 text-slate-300",
          icon: <X className="h-4 w-4" />,
          disabled: isLoading,
        },
        {
          label: tCommon("save"),
          onClick: form.handleSubmit(handleSave),
          className: "bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0",
          icon: <Save className="h-4 w-4" />,
          loading: isLoading,
        },
      ]}
    >
      <div className="px-1 pb-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)}>
            <CharacterFormFields form={form} character={character} t={t} />
          </form>
        </Form>
      </div>
    </BottomSheet>
  );
}
