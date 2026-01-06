"use client";

import { useState } from "react";
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
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { AIGeneratedImage, NarrationItem } from "@/types";
import React from "react";
import { useTranslations } from "next-intl";

const getEditNarrationSchema = (t: any) => z.object({
  narration: z.string().min(1, t("storyboard.editNarration") + " " + t("common.error")),
});

type EditNarrationFormData = {
  narration: string;
};

interface NarrationEditBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  image: AIGeneratedImage | null;
  onSave: (imageId: string, newNarration: NarrationItem[]) => Promise<void>;
}

/**
 * 旁白编辑底部弹窗
 * 
 * 用于编辑分镜图的旁白内容
 */
export function NarrationEditBottomSheet({
  isOpen,
  onClose,
  image,
  onSave,
}: NarrationEditBottomSheetProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);

  const getNarrationString = (narration: NarrationItem[]) => {
    if (Array.isArray(narration)) {
      return narration.map(item => item.内容).join("\n");
    }
    return "";
  };

  const form = useForm<EditNarrationFormData>({
    resolver: zodResolver(getEditNarrationSchema(t)),
    defaultValues: {
      narration: getNarrationString(image?.narration || []),
    },
  });

  // 当图片变化时更新表单默认值
  React.useEffect(() => {
    if (image) {
      form.reset({
        narration: getNarrationString(image.narration),
      });
    }
  }, [image, form]);

  const handleSave = async (data: EditNarrationFormData) => {
    if (!image) return;
    
    setIsLoading(true);
    try {
      const narrationArray: NarrationItem[] = data.narration
        .split("\n")
        .filter((s: string) => s.trim() !== "")
        .map(s => ({ 角色: "旁白", 内容: s.trim() }));
        
      await onSave(image.image_id, narrationArray);
      toast.success(t("common.success"));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("storyboard.updateNarrationFailed"));
    } finally {
      setIsLoading(false);
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
      title={t("storyboard.editNarrationTitle")}
      description={`${image.title} - ${t("storyboard.editNarration")}`}
      actions={[
        {
          label: t("storyboard.cancel"),
          onClick: handleCancel,
          variant: "secondary",
          icon: <X className="h-4 w-4" />,
          disabled: isLoading,
        },
        {
          label: t("storyboard.save"),
          onClick: form.handleSubmit(handleSave),
          variant: "default",
          icon: <Save className="h-4 w-4" />,
          loading: isLoading,
        },
      ]}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* 图片预览 */}
          <div className="flex justify-center">
            <div className="relative w-32 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-purple-200/50 dark:border-purple-700/50 shadow-lg">
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

          {/* 旁白编辑 */}
          <FormField
            control={form.control}
            name="narration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  {t("storyboard.editNarration")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("storyboard.editNarration") + "..."}
                    className="min-h-[120px] resize-none rounded-xl border-2 border-purple-200/50 dark:border-purple-700/50 focus:border-purple-400 dark:focus:border-purple-500 transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("storyboard.editNarration")}
                </p>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </BottomSheet>
  );
}
