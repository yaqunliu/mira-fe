"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageVersionPreview } from "@/components/ui/image-version-preview";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ImageIcon, Save, X, Loader2, Sparkles, Volume2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ICharacter } from "@/types/character";
import { VoiceSelector } from "@/components/business/create-settings/voice-selector";
import type { VoiceItem } from "@/types/voice";
import characterApi from "@/lib/api/character";
import { useMediaQuery } from "@/hooks/use-media-query";

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

function CharacterFormFields({ 
  form, 
  character, 
  t, 
  selectedVoiceId,
  selectedVoice,
  onVoiceSelect,
  onSpeedChange,
  voiceSpeed,
  onSave
}: {
  form: any,
  character: ICharacter,
  t: any,
  selectedVoiceId: string | null,
  selectedVoice: VoiceItem | null,
  onVoiceSelect: (voiceId: string, voice: VoiceItem) => void,
  onSpeedChange: (speed: string) => void,
  voiceSpeed: string,
  onSave?: () => Promise<void> // 保存回调
}) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  const imageHistory = ((character as any).status_detail?.image_historys || []) as Array<{
    image_url: string;
    image_prompt?: string;
    created_at: string;
    task_id?: string
  }>;

  // 切换版本时加载对应的提示词
  const handleVersionChange = (version: {image_url: string; image_prompt?: string; created_at: string}) => {
    if (version.image_prompt) {
      setSelectedPrompt(version.image_prompt);
      form.setValue("imagePrompt", version.image_prompt);
    }
  };

  const handleRegenerate = async () => {
    // 生成前先自动保存
    if (onSave) {
      try {
        await onSave();
      } catch (error) {
        toast.error(t("autoSaveFailed"));
        return;
      }
    }

    setIsRegenerating(true);
    try {
      await characterApi.regenerateCharacterImage(
        character.uuid || String(character.character_id),
        character.visual_style || "",
        character.novel_id as string
      );
      toast.success(t("characterImageGenerating"));
    } catch (error) {
      console.error("Failed to regenerate character image:", error);
      toast.error(t("characterImageFailed"));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleApplyVersion = async (version: {image_url: string; image_prompt?: string; created_at: string}) => {
    try {
      await characterApi.updateCharacter(character.uuid || String(character.character_id), {
        image_url: version.image_url,
      });
      toast.success(t("versionApplied"));
    } catch (error) {
      console.error("Failed to apply version:", error);
      toast.error(t("applyFailed"));
    }
  };

  return (
    <Tabs defaultValue="image" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="image" className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          {t("portrait")}
        </TabsTrigger>
        <TabsTrigger value="info" className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {t("basicInfo")}
        </TabsTrigger>
        <TabsTrigger value="voice" className="flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          {t("voiceColor")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="image" className="mt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-white to-orange-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-orange-100">
            {character.body !== null && character.body !== "" ? (
              <ImageVersionPreview
                currentImageUrl={character.image_url}
                imageHistory={imageHistory}
                onRegenerate={handleRegenerate}
                onApplyVersion={handleApplyVersion}
                onVersionChange={handleVersionChange}
                isRegenerating={isRegenerating}
                entityType="character"
                entityName={character.name}
              />
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                请先在"基本信息"Tab中完善角色设定信息
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-white to-orange-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-orange-100">
            <FormField
              control={form.control}
              name="imagePrompt"
              render={({ field }) => (
                <FormItem className="space-y-1 h-full flex flex-col">
                  <FormLabel className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    {t("imagePrompt") || "生图提示词"}
                  </FormLabel>
                  <FormControl className="flex-1">
                    <textarea
                      placeholder={t("imagePromptPlaceholder") || t("imagePromptPlaceholder")}
                      className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-orange-50 border border-orange-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all duration-200 text-sm resize-none h-[calc(100%-28px)]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="info" className="space-y-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            {t("basicInfo")}
          </h3>
          
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-semibold text-gray-700">{t("name")}</FormLabel>
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
              <>
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-gray-700">{t("featureTags")}</FormLabel>
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

                <FormField
                  control={form.control}
                  name="basicInfo"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-gray-700">{t("basicInfo")}</FormLabel>
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
              </>
            )}

            {(character.body === null || character.body === "") && (
              <FormField
                control={form.control}
                name="voiceDescription"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-gray-700">{t("voiceDesc")}</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder={t("voicePlaceholder")}
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
          </div>
        </div>

        {character.body !== null && character.body !== "" && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-white to-pink-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-pink-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-500" />
              {t("detailSettings")}
            </h3>
            
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="appearance"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-gray-700">{t("appearanceFeatures")}</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder={t("appearancePlaceholder")}
                        className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-pink-50 border border-pink-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-200 text-sm resize-none"
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
                name="body"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-gray-700">{t("bodyFeatures")}</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder={t("bodyPlaceholder")}
                        className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-pink-50 border border-pink-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-200 text-sm resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="clothing"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-gray-700">{t("clothing")}</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder={t("clothingPlaceholder")}
                          className="w-full px-3 py-2 rounded-lg bg-gradient-to-br from-white to-pink-50 border border-pink-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-200 text-sm resize-none"
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
                      <FormLabel className="text-xs font-semibold text-gray-700">{t("hair")}</FormLabel>
                      <FormControl>
                        <input
                          placeholder={t("hairPlaceholder")}
                          className="w-full h-10 px-3 rounded-lg bg-gradient-to-br from-white to-pink-50 border border-pink-100 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-200 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="voice" className="space-y-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-white to-purple-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-purple-100 h-full">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            {t("voiceColor")}
          </h3>
          
          <VoiceSelector
            selectedVoiceId={selectedVoiceId}
            onSelect={onVoiceSelect}
          />

          {selectedVoiceId && (
            <div className="mt-4 p-3 rounded-lg bg-white/60 border border-purple-100">
              <p className="text-xs text-gray-600 mb-2">
                已选择: <span className="font-medium text-purple-700">{selectedVoice?.title || "未知音色"}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">语速:</span>
                <select
                  value={voiceSpeed}
                  onChange={(e) => onSpeedChange(e.target.value)}
                  className="px-2 py-1 text-sm rounded-lg bg-white border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1.0">1.0x (正常)</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2.0">2.0x</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
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

  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(character.voice_id || null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceItem | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState<string>(character.voice_speed || "1.0");

  const handleVoiceSelect = (voiceId: string, voice: VoiceItem) => {
    setSelectedVoiceId(voiceId);
    setSelectedVoice(voice);
  };

  const handleSpeedChange = (speed: string) => {
    setVoiceSpeed(speed);
  };

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
    setSelectedVoiceId(character.voice_id || null);
    setVoiceSpeed(character.voice_speed || "1.0");
    setSelectedVoice(null);
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
        image_prompt: data.imagePrompt === undefined ? character.image_prompt : data.imagePrompt,
        voice_description: data.voiceDescription,
        voice_id: selectedVoiceId || undefined,
        voice_speed: voiceSpeed,
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
    <div className="flex items-center justify-between w-full pr-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-pink-500 rounded-full" />
        <span className="text-xl font-bold text-gray-900">
          {t("editCharacterInfo")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 text-gray-700 font-medium"
        >
          <X className="h-4 w-4" />
          {tCommon("close")}
        </button>
        <button
          type="button"
          onClick={form.handleSubmit(handleSave)}
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-white font-medium shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200 flex items-center gap-2 ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {!isLoading && <Save className="h-4 w-4" />}
          {tCommon("save")}
        </button>
      </div>
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
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent showCloseButton={false} className="sm:max-w-5xl max-w-[95vw] bg-gradient-to-br from-white to-blue-50 shadow-[8px_8px_24px_rgba(0,0,0,0.12),-8px_-8px_24px_rgba(255,255,255,0.9)] border border-blue-100 rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0 pb-4 border-b border-blue-100">
              <DialogTitle className="w-full">{headerContent}</DialogTitle>
              <DialogDescription asChild>
                <div className="mt-1 ml-3">{descriptionContent}</div>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 px-2">
              <Form {...form}>
                <div>
                  <CharacterFormFields
                    form={form}
                    character={character}
                    t={t}
                    selectedVoiceId={selectedVoiceId}
                    selectedVoice={selectedVoice}
                    onVoiceSelect={handleVoiceSelect}
                    onSpeedChange={handleSpeedChange}
                    voiceSpeed={voiceSpeed}
                    onSave={async () => {
                      // 自动保存函数
                      const data = form.getValues();
                      const updatedCharacter: Partial<ICharacter> = {
                        ...character,
                        name: data.name,
                        basic_info: data.basicInfo,
                        appearance: data.appearance,
                        body: data.body,
                        hair: data.hair,
                        clothing: data.clothing,
                        tags: data.tags ? data.tags.split(",") : [],
                        image_prompt: data.imagePrompt === undefined ? character.image_prompt : data.imagePrompt,
                        voice_description: data.voiceDescription,
                        voice_id: selectedVoiceId || undefined,
                        voice_speed: voiceSpeed,
                      };
                      const characterUuid = (character as any).uuid || (character as any).UUID;
                      if (!characterUuid) {
                        throw new Error(t("missingId"));
                      }
                      await characterApi.updateCharacter(String(characterUuid), updatedCharacter);
                      toast.success(t("autoSaveSuccess"));
                    }}
                  />
                </div>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Mobile BottomSheet View
  return (
    <>
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
            <div>
              <CharacterFormFields
                form={form}
                character={character}
                t={t}
                selectedVoiceId={selectedVoiceId}
                selectedVoice={selectedVoice}
                onVoiceSelect={handleVoiceSelect}
                onSpeedChange={handleSpeedChange}
                voiceSpeed={voiceSpeed}
                onSave={async () => {
                  // 自动保存函数
                  const data = form.getValues();
                  const updatedCharacter: Partial<ICharacter> = {
                    ...character,
                    name: data.name,
                    basic_info: data.basicInfo,
                    appearance: data.appearance,
                    body: data.body,
                    hair: data.hair,
                    clothing: data.clothing,
                    tags: data.tags ? data.tags.split(",") : [],
                    image_prompt: data.imagePrompt === undefined ? character.image_prompt : data.imagePrompt,
                    voice_description: data.voiceDescription,
                    voice_id: selectedVoiceId || undefined,
                    voice_speed: voiceSpeed,
                  };
                  const characterUuid = (character as any).uuid || (character as any).UUID;
                  if (!characterUuid) {
                    throw new Error(t("missingId"));
                  }
                  await characterApi.updateCharacter(String(characterUuid), updatedCharacter);
                  toast.success(t("autoSaveSuccess"));
                }}
              />
            </div>
          </Form>
        </div>
      </BottomSheet>
    </>
  );
}
