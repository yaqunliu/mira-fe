// i18n-ignore-file：本文件残留的中文全部是数据契约——narration item 的
// `角色` / `内容` 字段名（读写后端 JSON，非界面文案）。界面文案已全部抽成 key。
// 契约需等后端改为 role / content 后再同步。见 en-plan.md Phase 0 白名单。
"use client";

import { useTranslations } from 'next-intl'
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { PencilLine, Save, X, Maximize2, Plus } from "lucide-react";
import { StoryboardItem as StoryboardItemType } from "@/types";
import { toast } from "sonner";
import { IShot, INarrationItem } from "@/types/scene";
import { ICharacter } from "@/types/character";
import shotApi from "@/lib/api/shot";
import { ImagePreview } from "@/components/ui/image-preview";

function makeEditStoryboardSchema(t: (k: string) => string) {
  return z.object({
    title: z.string().min(1, t("titleRequired")),
    narration: z.string().min(1, t("narrationRequired")),
    video_duration: z.any().transform((val) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }).pipe(z.number().min(1, t("durationMin")).max(60, t("durationMax"))),
  });
}

type EditStoryboardFormData = z.infer<ReturnType<typeof makeEditStoryboardSchema>>;

interface StoryboardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  shot: IShot;
  onSave: (updatedShot: IShot) => void;
  availableCharacters?: ICharacter[];
}

export function StoryboardEditModal({
  isOpen,
  onClose,
  shot,
  onSave,
  availableCharacters = [],
}: StoryboardEditModalProps) {
  const t = useTranslations('Editor')
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>(
    (shot.characters || []).map((c: any) => Number(c.character_id)).filter(Boolean)
  );
  const [appearanceElements, setAppearanceElements] = useState<string[]>(
    shot.extra_data?.appearance_elements || shot.extra_data?.ai_output?.[t("cameraElement")] || []
  );
  const [previewImage, setPreviewImage] = useState<{src: string | null, alt: string} | null>(null);

  const getNarrationString = (narration: INarrationItem[]) => {
    if (Array.isArray(narration)) {
      return narration.map(item => item.内容).join("\n");
    }
    return "";
  };

  const form = useForm<EditStoryboardFormData>({
    resolver: zodResolver(makeEditStoryboardSchema(t)),
    defaultValues: {
      title: shot.title || "",
      narration: getNarrationString(shot.narration),
      video_duration: shot.video_duration || 5,
    },
  });

  // 当外部传入的shot变更时同步选中角色
  useEffect(() => {
    if (shot && isOpen) {
      // 尝试从 characters 数组获取角色ID
      let characterIds = (shot.characters || [])
        .map((c: any) => Number(c.character_id))
        .filter((id) => !isNaN(id) && id > 0);

      // 如果 characters 数组为空，尝试从 character_ids 字段获取（生成中的分镜可能只有这个字段）
      if (characterIds.length === 0 && (shot as any).character_ids) {
        characterIds = ((shot as any).character_ids || [])
          .map((id: any) => Number(id))
          .filter((id: number) => !isNaN(id) && id > 0);
      }

      setSelectedCharacters(characterIds);
      setAppearanceElements(shot.extra_data?.appearance_elements || shot.extra_data?.ai_output?.[t("cameraElement")] || []);
      form.reset({
        title: shot.title || "",
        narration: getNarrationString(shot.narration),
        video_duration: shot.video_duration || 5,
      });
    }
  }, [(shot as any)?.shot_id || (shot as any)?.uuid, isOpen, form]);

  const handleSave = async (data: EditStoryboardFormData) => {
    setIsLoading(true);
    try {
      // 必须使用UUID，如果shot对象没有uuid字段，说明数据有问题
      const shotUuid = (shot as any).uuid;
      if (!shotUuid) {
        console.error("分镜对象缺少uuid字段:", shot);
        toast.error(t('missingShotUuid', { id: (shot as any).shot_id || t('unknownId') }));
        return;
      }
      // 确保是字符串类型，且不是数字ID
      const uuidString = String(shotUuid);
      // 检查是否是UUID格式（简单检查：长度和格式）
      if (uuidString.length < 30 || /^\d+$/.test(uuidString)) {
        console.error("分镜ID不是有效的UUID格式:", uuidString);
        toast.error(t("shotIdFormatError", { id: uuidString }));
        return;
      }

      const narrationArray: INarrationItem[] = data.narration
        .split("\n")
        .filter((s) => s.trim() !== "")
        .map((content) => ({
          角色: t("narration"),
          内容: content,
        }));

      // 调用 API 更新分镜
      // 更新标题/旁白/时长
      await shotApi.updateShot(uuidString, {
        title: data.title,
        narration: narrationArray,
        associated_characters: selectedCharacters,
        video_duration: data.video_duration,
        extra_data: {
          ...(shot.extra_data || {}),
          appearance_elements: appearanceElements
        }
      });

      // 单独更新角色关联（确保关联表同步）
      await shotApi.updateShotCharacters(uuidString, selectedCharacters);

      const updatedShot: IShot = {
        ...shot,
        title: data.title,
        narration: narrationArray,
        video_duration: data.video_duration,
        characters: availableCharacters.filter((c) =>
          selectedCharacters.includes(Number(c.character_id))
        ),
      };
      
      onSave(updatedShot);
      toast.success(t('shotUpdateSuccess'));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('saveFailedRetry'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setSelectedCharacters((shot.characters || []).map((c: any) => Number(c.character_id)).filter(Boolean));
    onClose();
  };

  const toggleCharacter = (id: number) => {
    setSelectedCharacters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAddAppearanceElement = () => {
    setAppearanceElements([...appearanceElements, ""]);
  };

  const handleUpdateAppearanceElement = (index: number, value: string) => {
    const updated = [...appearanceElements];
    updated[index] = value;
    setAppearanceElements(updated);
  };

  const handleRemoveAppearanceElement = (index: number) => {
    setAppearanceElements(appearanceElements.filter((_, i) => i !== index));
  };

  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] border border-blue-100">
          <DialogHeader className="border-b-[1px] border-blue-100 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base text-gray-800">
              {t('editShot')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('editShotDesc')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              {/* 分镜编号 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-gradient-to-br from-#FDBCB4 to-#ADD8E6 text-white px-2 py-0.5">
                    {t('shotLabel', { number: shot.shot_number })}
                  </Badge>
                </div>
              </div>

              {/* 标题 */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-800 mb-1">{t('title')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('shotTitlePlaceholder')}
                            className="rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
                            {...field}
                            onFocus={(e) => {
                              setTimeout(() => {
                                e.target.setSelectionRange(
                                  e.target.value.length,
                                  e.target.value.length
                                );
                              }, 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name="video_duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-800 mb-1">{t('duration')} ({t('seconds')})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            step={0.1}
                            className="rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 出镜元素 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-gray-800">{t('onScreenElements')} ({t('onScreenElementsHint')})</FormLabel>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddAppearanceElement}
                    className="h-8 text-xs rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
                  >
                    <Plus size={12} className="mr-1" />
                    {t('add')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]">
                  {appearanceElements.map((element, index) => (
                    <div key={index} className="flex items-center gap-1 bg-white border border-blue-100 rounded-xl px-3 py-1.5 shadow-sm">
                      <Input 
                        value={element}
                        onChange={(e) => handleUpdateAppearanceElement(index, e.target.value)}
                        className="h-8 w-32 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs p-0"
                        placeholder={t('elementName')}
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleRemoveAppearanceElement(index)}
                        className="h-6 w-6 text-gray-400 hover:text-red-500 rounded-full"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  ))}
                  {appearanceElements.length === 0 && (
                    <span className="text-xs text-gray-600 italic">{t('noElements')}</span>
                  )}
                </div>
              </div>

              {/* 关联角色 */}
              <div className="space-y-3">
                <FormLabel className="text-gray-800">{t('relatedCharacters')}</FormLabel>
                {availableCharacters.length === 0 ? (
                  <p className="text-sm text-gray-600">{t('noSelectableCharacters')}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableCharacters.map((character) => {
                      const idNum = Number(character.character_id);
                      const checked = selectedCharacters.includes(idNum);
                      return (
                        <label
                          key={character.character_id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl border-2 cursor-pointer text-sm transition-all duration-200 hover:scale-105 ${
                            checked
                              ? "border-#22C55E bg-gradient-to-br from-white to-blue-50 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)]"
                              : "border-blue-100 bg-gradient-to-br from-white to-blue-50 hover:border-#22C55E/50"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleCharacter(idNum);
                          }}
                        >
                          {character.image_url ? (
                            <div className="relative group/char">
                              <img
                                src={character.image_url}
                                alt={character.name}
                                className="w-12 h-12 rounded-xl object-cover border-2 border-blue-100 shadow-[4px_4px_8px_rgba(0,0,0,0.08),-2px_-2px_4px_rgba(255,255,255,0.8)] hover:opacity-80 transition-opacity"
                              />
                              <div 
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover/char:opacity-100 transition-opacity flex items-center justify-center rounded-xl cursor-pointer"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewImage({src: character.image_url || null, alt: character.name});
                                  }}
                              >
                                  <div className="flex flex-col items-center gap-1">
                                      <Maximize2 className="w-4 h-4 text-white" />
                                      <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-white/20 text-white border-none backdrop-blur-sm">
                                          {t('preview')}
                                      </Badge>
                                  </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-#FDBCB4 to-#ADD8E6 flex items-center justify-center text-xs text-white border-2 border-blue-100 shadow-[4px_4px_8px_rgba(0,0,0,0.08),-2px_-2px_4px_rgba(255,255,255,0.8)]">
                              {t('noImage')}
                            </div>
                          )}
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={checked}
                            onChange={() => toggleCharacter(idNum)}
                          />
                          <span className="truncate text-gray-800">{character.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 旁白 */}
              <FormField
                control={form.control}
                name="narration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-800 mb-1">{t("narration")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('shotNarrationPlaceholder')}
                        className="min-h-[80px] resize-none rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-row gap-4 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="w-[35%] rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1 rounded-xl bg-gradient-to-br from-#22C55E to-#16A34A shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200">
                  <Save className="h-4 w-4" />
                  {isLoading ? t('saving') : t('save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
        {previewImage && (
          <ImagePreview
            open={!!previewImage}
            onOpenChange={(open) => !open && setPreviewImage(null)}
            src={previewImage.src}
            alt={previewImage.alt}
          />
        )}
      </Dialog>
    );
}
