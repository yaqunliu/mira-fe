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

const editNarrationSchema = z.object({
  narration: z.string().min(1, "旁白不能为空"),
});

type EditNarrationFormData = z.infer<typeof editNarrationSchema>;

interface NarrationEditBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  image: AIGeneratedImage | null;
  onSave: (imageId: string, newNarration: string) => void;
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
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditNarrationFormData>({
    resolver: zodResolver(editNarrationSchema),
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
      onSave(image.image_id, data.narration);
      toast.success("旁白修改成功");
      onClose();
    } catch (error) {
      toast.error("保存失败，请重试");
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
      title="编辑旁白"
      description={`${image.title} - 修改旁白内容`}
      actions={[
        {
          label: "取消",
          onClick: handleCancel,
          variant: "secondary",
          icon: <X className="h-4 w-4" />,
          disabled: isLoading,
        },
        {
          label: "保存",
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
                  暂无图片
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
                  旁白
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="输入图片对应的旁白内容..."
                    className="min-h-[120px] resize-none"
                    style={{ borderColor: "#514f4f" }}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  旁白将显示在图片上，用于视频配音
                </p>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </BottomSheet>
  );
}
