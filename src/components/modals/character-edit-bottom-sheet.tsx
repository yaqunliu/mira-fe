"use client";

import { useTranslations } from 'next-intl'
import { useState } from "react";
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
import { ICharacter } from "@/types/character";

const editCharacterSchema = z.object({
  name: z.string().min(1, t("姓名不能为空", { default: "Name cannot be empty" })),
  basicInfo: z.string().min(1, t("基础信息不能为空", { default: "Basic info cannot be empty" })),
  appearance: z.string().min(1, t("容貌特征不能为空", { default: "Appearance cannot be empty" })),
  body: z.string().min(1, t("身材特征不能为空", { default: "Body cannot be empty" })),
  hair: z.string().min(1, t("头发不能为空", { default: "Hair cannot be empty" })),
  clothing: z.string().min(1, t("服装不能为空", { default: "Clothing cannot be empty" })),
  tags: z.array(z.string()).min(1, t("特征标签不能为空", { default: "Feature tags cannot be empty" })),
});

type EditCharacterFormData = z.infer<typeof editCharacterSchema>;

interface CharacterEditBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  character: ICharacter;
  onSave: (updatedCharacter: ICharacter) => void;
}

/**
 * 使用新的 BottomSheet 组件的角色编辑弹窗
 * 
 * 使用非常简单，只需传入标题、操作按钮和内容
 */
export function CharacterEditBottomSheet({
  const t = useTranslations('character')
  isOpen,
  onClose,
  character,
  onSave,
}: CharacterEditBottomSheetProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditCharacterFormData>({
    resolver: zodResolver(editCharacterSchema),
    defaultValues: {
      name: character.name,
      basicInfo: character.basic_info,
      appearance: character.appearance,
      body: character.body,
      hair: character.hair,
      clothing: character.clothing,
      tags: character.tags,
    },
  });

  const handleSave = async (data: EditCharacterFormData) => {
    setIsLoading(true);
    try {
      const updatedCharacter: ICharacter = {
        ...character,
        ...data,
      };
      
      onSave(updatedCharacter);
      toast.success(t("characterUpdated"));
      onClose();
    } catch (error) {
      toast.error(t("saveFailed"));
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
      title=t("editCharacterInfo")
      description=t("editCharacterDescription")
      actions={[
        {
          label: t("cancel"),
          onClick: handleCancel,
          variant: "secondary",
          icon: <X className="h-4 w-4" />,
          disabled: isLoading,
          className: "rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[4px_4px_12px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
        },
        {
          label: t("save"),
          onClick: form.handleSubmit(handleSave),
          variant: "default",
          icon: <Save className="h-4 w-4" />,
          loading: isLoading,
          className: "rounded-xl bg-gradient-to-br from-#22C55E to-#16A34A shadow-[4px_4px_12px_rgba(0,0,0,0.1),-4px_-4px_12px_rgba(255,255,255,0.8)] hover:scale-105 transition-all duration-200"
        },
      ]}
      className="bg-gradient-to-br from-white to-blue-50"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
          {/* 姓名 */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-800 mb-1">
                  {t("name")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder=t("namePlaceholder")
                    className="rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
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
                <FormLabel className="text-gray-800 mb-1">
                  {t("basicInfo")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder=t("basicInfoPlaceholder")
                    className="min-h-[60px] resize-none rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
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
                <FormLabel className="text-gray-800 mb-1">
                  {t("appearance")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder=t("appearancePlaceholder")
                    className="min-h-[60px] resize-none rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
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
                <FormLabel className="text-gray-800 mb-1">
                  {t("body")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder=t("bodyPlaceholder")
                    className="min-h-[60px] resize-none rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
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
                <FormLabel className="text-gray-800 mb-1">
                  {t("hair", { default: "Hair" })}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder=t("hairPlaceholder")
                    className="rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
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
                <FormLabel className="text-gray-800 mb-1">
                  {t("clothing", { default: "Clothing" })}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder=t("clothingPlaceholder")
                    className="min-h-[60px] resize-none rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
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
                <FormLabel className="text-gray-800 mb-1">
                  {t("tags")}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder=t("tagsPlaceholder")
                    className="rounded-xl bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.03),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]"
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

