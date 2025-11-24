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
import { IShot } from "@/types/scene";

const editStoryboardSchema = z.object({
  description: z.string().min(1, "画面描述不能为空"),
  narration: z.string().min(1, "旁白不能为空"),
});

type EditStoryboardFormData = z.infer<typeof editStoryboardSchema>;

interface StoryboardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  shot: IShot;
  onSave: (updatedShot: IShot) => void;
}

export function StoryboardEditModal({
  isOpen,
  onClose,
  shot,
  onSave,
}: StoryboardEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditStoryboardFormData>({
    resolver: zodResolver(editStoryboardSchema),
    defaultValues: {
      description: shot.description,
      narration: shot.narration || shot.description,
    },
  });

  const handleSave = async (data: EditStoryboardFormData) => {
    setIsLoading(true);
    try {
      const updatedShot: IShot = {
        ...shot,
        description: data.description,
        narration: data.narration,
      };
      
      onSave(updatedShot);
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
                  {`分镜 ${shot.shot_id}`}
                </Badge>
                <span className="text-md font-medium text-orange-900 dark:text-orange-500/70">
                  {shot.title}
                </span>
              </div>
            </div>

            {/* 画面描述 */}
            <FormField
              control={form.control}
              name="description"
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
              name="narration"
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
