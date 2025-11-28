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
import { AIGeneratedImage } from "@/types";
import React from "react";
import { useTranslations } from "next-intl";

const getEditNarrationSchema = (t: any) => z.object({
  narration: z.string().min(1, t("storyboard.editNarration") + " " + t("common.error")),
});

type EditNarrationFormData = z.infer<typeof editNarrationSchema>;

interface NarrationEditBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  image: AIGeneratedImage | null;
  onSave: (imageId: string, newNarration: string) => Promise<void>;
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

  const form = useForm<EditNarrationFormData>({
    resolver: zodResolver(getEditNarrationSchema(t)),
    defaultValues: {
      narration: image?.narration || "",
    },
  });

  // 当图片变化时更新表单默认值
  React.useEffect(() => {
    if (image) {
      form.reset({
        narration: image.narration,
      });
    }
  }, [image, form]);

  const handleSave = async (data: EditNarrationFormData) => {
    if (!image) return;
    
    setIsLoading(true);
    try {
      await onSave(image.image_id, data.narration);
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

          {/* 旁白编辑 */}
          <FormField
            control={form.control}
            name="narration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-800 dark:text-gray-300">
                  {t("storyboard.editNarration")}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("storyboard.editNarration") + "..."}
                    className="min-h-[120px] resize-none"
                    style={{ borderColor: "#514f4f" }}
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
