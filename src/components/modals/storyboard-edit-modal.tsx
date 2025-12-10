"use client";

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
import { PencilLine, Save, X } from "lucide-react";
import { StoryboardItem as StoryboardItemType } from "@/types";
import { toast } from "sonner";
import { IShot } from "@/types/scene";
import { ICharacter } from "@/types/character";
import shotApi from "@/lib/api/shot";

const editStoryboardSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  narration: z.string().min(1, "旁白不能为空"),
});

type EditStoryboardFormData = z.infer<typeof editStoryboardSchema>;

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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>(
    (shot.characters || []).map((c: any) => Number(c.character_id)).filter(Boolean)
  );

  const form = useForm<EditStoryboardFormData>({
    resolver: zodResolver(editStoryboardSchema),
    defaultValues: {
      title: shot.title || "",
      narration: shot.narration || "",
    },
  });

  // 当外部传入的shot变更时同步选中角色
  useEffect(() => {
    setSelectedCharacters((shot.characters || []).map((c: any) => Number(c.character_id)).filter(Boolean));
    form.reset({
      title: shot.title || "",
      narration: shot.narration || "",
    });
  }, [shot, form]);

  const handleSave = async (data: EditStoryboardFormData) => {
    setIsLoading(true);
    try {
      // 必须使用UUID，如果shot对象没有uuid字段，说明数据有问题
      const shotUuid = (shot as any).uuid;
      if (!shotUuid) {
        console.error("分镜对象缺少uuid字段:", shot);
        toast.error(`分镜数据错误：缺少UUID字段，无法保存。分镜ID: ${(shot as any).shot_id || '未知'}`);
        return;
      }
      // 确保是字符串类型，且不是数字ID
      const uuidString = String(shotUuid);
      // 检查是否是UUID格式（简单检查：长度和格式）
      if (uuidString.length < 30 || /^\d+$/.test(uuidString)) {
        console.error("分镜ID不是有效的UUID格式:", uuidString);
        toast.error(`分镜ID格式错误：${uuidString}，应该是UUID格式`);
        return;
      }
      // 调用 API 更新分镜
      // 更新标题/旁白
      await shotApi.updateShot(uuidString, {
        title: data.title,
        narration: data.narration,
        character_ids: selectedCharacters,
      });

      // 单独更新角色关联（确保关联表同步）
      await shotApi.updateShotCharacters(uuidString, selectedCharacters);

      const updatedShot: IShot = {
        ...shot,
        title: data.title,
        narration: data.narration,
        characters: availableCharacters.filter((c) =>
          selectedCharacters.includes(Number(c.character_id))
        ),
      };
      
      onSave(updatedShot);
      toast.success("分镜修改成功");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败，请重试");
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="border-b-[1px] border-zinc-200 dark:border-zinc-700 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            编辑分镜
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {/* 分镜编号 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {`分镜 ${shot.shot_number}`}
                </Badge>
              </div>
            </div>

            {/* 标题 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-800 dark:text-gray-300">标题</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="输入分镜标题..."
                      style={{ borderColor: '#514f4f' }}
                      {...field}
                      onFocus={(e) => {
                        // 延迟取消文本选择，避免浏览器自动选中
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

            {/* 关联角色 */}
            <div className="space-y-2">
              <FormLabel className="text-gray-800 dark:text-gray-300">关联角色</FormLabel>
              {availableCharacters.length === 0 ? (
                <p className="text-sm text-gray-500">暂无可选角色</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableCharacters.map((character) => {
                    const idNum = Number(character.character_id);
                    const checked = selectedCharacters.includes(idNum);
                    return (
                      <label
                        key={character.character_id}
                        className={`flex items-center gap-2 px-2 py-1 rounded border cursor-pointer text-sm ${
                          checked
                            ? "border-orange-400 bg-orange-50 dark:border-orange-500/60 dark:bg-orange-500/10"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleCharacter(idNum);
                        }}
                      >
                        {character.image_url ? (
                          <img
                            src={character.image_url}
                            alt={character.name}
                            className="w-12 h-12 rounded object-cover border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                            无图
                          </div>
                        )}
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={checked}
                          onChange={() => toggleCharacter(idNum)}
                        />
                        <span className="truncate">{character.name}</span>
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
