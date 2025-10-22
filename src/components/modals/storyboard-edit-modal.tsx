"use client";

import { useState } from "react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { PencilLine, Save, X } from "lucide-react";
import { StoryboardItem as StoryboardItemType } from "@/types";
import { toast } from "sonner";

const editStoryboardSchema = z.object({
  storyboard_description: z.string().min(1, "画面描述不能为空"),
  storyboard_narration: z.string().min(1, "旁白不能为空"),
});

type EditStoryboardFormData = z.infer<typeof editStoryboardSchema>;

interface StoryboardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyboard: StoryboardItemType;
  onSave: (updatedStoryboard: StoryboardItemType) => void;
}

export function StoryboardEditModal({
  isOpen,
  onClose,
  storyboard,
  onSave,
}: StoryboardEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditStoryboardFormData>({
    resolver: zodResolver(editStoryboardSchema),
    defaultValues: {
      storyboard_description: storyboard.storyboard_description,
      storyboard_narration: storyboard.storyboard_narration || storyboard.storyboard_description,
    },
  });

  const handleSave = async (data: EditStoryboardFormData) => {
    setIsLoading(true);
    try {
      const updatedStoryboard: StoryboardItemType = {
        ...storyboard,
        storyboard_description: data.storyboard_description,
        storyboard_narration: data.storyboard_narration,
      };
      
      onSave(updatedStoryboard);
      toast.success("分镜修改成功");
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="border-b-[1px] border-zinc-200 dark:border-zinc-700 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            编辑分镜描述与旁白
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {/* 分镜基本信息 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {`分镜 ${storyboard.storyboard_id}`}
                </Badge>
                <span className="text-md font-medium text-orange-900 dark:text-orange-500/70">
                  {storyboard.storyboard_name}
                </span>
              </div>
            </div>

            {/* 画面描述 */}
            <FormField
              control={form.control}
              name="storyboard_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800 dark:text-gray-300">画面描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="描述这个分镜的画面内容..."
                      className="min-h-[80px] resize-none"
                      style={{ borderColor: '#514f4f' }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 旁白 */}
            <FormField
              control={form.control}
              name="storyboard_narration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800 dark:text-gray-300">旁白</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="输入这个分镜的旁白内容..."
                      className="min-h-[80px] resize-none"
                      style={{ borderColor: '#514f4f' }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-row gap-6 justify-center">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={isLoading}
                className="w-[35%]"
              >
                <X className="h-4 w-4" />
                取消
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                <Save className="h-4 w-4" />
                {isLoading ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
