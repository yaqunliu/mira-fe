"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ICharacter } from "@/types/character";
import characterApi from "@/lib/api/character";

type EditCharacterFormData = z.infer<typeof editCharacterSchema>;

interface CharacterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: ICharacter;
  onSuccess: () => void;
}

type EditCharacterFormData = {
  name: string;
  basicInfo: string;
  appearance: string;
  body: string;
  hair: string;
  clothing: string;
  tags: string;
  imagePrompt?: string;
};

/**
 * 使用新的 BottomSheet 组件的角色编辑弹窗
 * 
 * 使用非常简单，只需传入标题、操作按钮和内容
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

  // 动态创建 schema，因为验证消息需要国际化
  const editCharacterSchema = useMemo(() => z.object({
    name: z.string().min(1, t("nameRequired")),
    basicInfo: z.string().min(1, t("basicInfoRequired")),
    appearance: z.string().min(1, t("appearanceRequired")),
    body: z.string().min(1, t("bodyRequired")),
    hair: z.string().min(1, t("hairRequired")),
    clothing: z.string().min(1, t("clothingRequired")),
    tags: z.string().min(1, t("tagsRequired")),
    imagePrompt: z.string().optional(),
  }), [t]);

  const form = useForm<EditCharacterFormData>({
    resolver: zodResolver(editCharacterSchema),
    defaultValues: {
      name: character.name,
      basicInfo: character.basic_info,
      appearance: character.appearance,
      body: character.body,
      hair: character.hair,
      clothing: character.clothing,
      tags: character.tags.join(","),
      imagePrompt: character.image_prompt || "",
    },
  });

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
        tags: data.tags.split(","),
        image_prompt: data.imagePrompt || character.image_prompt,
      };
      
      // 必须使用UUID，如果character对象没有uuid字段，说明数据有问题
      // 检查所有可能的uuid字段位置
      const characterUuid = (character as any).uuid || (character as any).UUID;
      if (!characterUuid) {
        console.error("角色对象缺少uuid字段:", {
          character,
          hasUuid: !!(character as any).uuid,
          hasUUID: !!(character as any).UUID,
          characterId: (character as any).character_id,
          allKeys: Object.keys(character || {})
        });
        toast.error(`角色数据错误：缺少UUID字段，无法保存。角色ID: ${(character as any).character_id || '未知'}`);
        return;
      }
      // 确保是字符串类型，且不是数字ID
      const uuidString = String(characterUuid);
      // 检查是否是UUID格式（简单检查：长度和格式）
      if (uuidString.length < 30 || /^\d+$/.test(uuidString)) {
        console.error("角色ID不是有效的UUID格式:", uuidString);
        toast.error(`角色ID格式错误：${uuidString}，应该是UUID格式`);
        return;
      }
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

  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={onClose}
      title={t("editCharacterInfo")}
      description={t("editCharacterDescription")}
      actions={[
        {
          label: tCommon("cancel"),
          onClick: handleCancel,
          variant: "secondary",
          icon: <X className="h-4 w-4" />,
          disabled: isLoading,
        },
        {
          label: tCommon("save"),
          onClick: form.handleSubmit(handleSave),
          variant: "default",
          icon: <Save className="h-4 w-4" />,
          loading: isLoading,
        },
      ]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
          {/* 姓名 */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold bg-gradient-to-r from-orange-600 to-pink-600 dark:from-orange-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {t("name")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("namePlaceholder")}
                    className="rounded-xl border-2 border-orange-200/50 dark:border-orange-700/50 focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 基础信息 */}
          <FormField
            control={form.control}
            name="basicInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("basicInfo")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("basicInfoPlaceholder")}
                    className="min-h-[60px] resize-none rounded-xl border-2 border-orange-200/50 dark:border-orange-700/50 focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 容貌特征 */}
          <FormField
            control={form.control}
            name="appearance"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("appearanceFeatures")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("appearancePlaceholder")}
                    className="min-h-[60px] resize-none rounded-xl border-2 border-orange-200/50 dark:border-orange-700/50 focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 身材特征 */}
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("bodyFeatures")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("bodyPlaceholder")}
                    className="min-h-[60px] resize-none rounded-xl border-2 border-orange-200/50 dark:border-orange-700/50 focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 头发 */}
          <FormField
            control={form.control}
            name="hair"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("hair")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("hairPlaceholder")}
                    className="rounded-xl border-2 border-orange-200/50 dark:border-orange-700/50 focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 服装 */}
          <FormField
            control={form.control}
            name="clothing"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("clothing")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("clothingPlaceholder")}
                    className="min-h-[60px] resize-none rounded-xl border-2 border-orange-200/50 dark:border-orange-700/50 focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 特征标签 */}
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("featureTags")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("tagsPlaceholder")}
                    className="rounded-xl border-2 border-orange-200/50 dark:border-orange-700/50 focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 图片提示词 */}
          <FormField
            control={form.control}
            name="imagePrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("imagePrompt")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("imagePromptPlaceholder")}
                    className="min-h-[60px] resize-none rounded-xl border-2 border-orange-200/50 dark:border-orange-700/50 focus:border-orange-400 dark:focus:border-orange-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </BottomSheet>
  );
}

