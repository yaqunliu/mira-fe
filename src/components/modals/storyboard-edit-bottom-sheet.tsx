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
import { Save, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AIGeneratedImage } from "@/types";
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
  onRegenerate: (imageId: string, newPrompt: string) => Promise<void>;
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
}: StoryboardEditBottomSheetProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const form = useForm<EditStoryboardFormData>({
    resolver: zodResolver(getEditStoryboardSchema(t)),
    defaultValues: {
      prompt: image?.prompt || "",
    },
  });

  // 当图片变化时更新表单默认值
  React.useEffect(() => {
    if (image) {
      form.reset({
        prompt: image.prompt,
      });
    }
  }, [image, form]);

  const handleRegenerate = async () => {
    if (!image) return;
    
    const formData = form.getValues();
    if (!formData.prompt.trim()) {
      toast.error(t("storyboard.promptRequired"));
      return;
    }

    setIsRegenerating(true);
    try {
      await onRegenerate(image.image_id, formData.prompt);
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
            <div className="relative w-32 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
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
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-800 dark:text-gray-300">
                  {t("storyboard.prompt")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("storyboard.promptPlaceholder")}
                    className="min-h-[120px] resize-none"
                    style={{ borderColor: "#514f4f" }}
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
