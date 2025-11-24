"use client";

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
  name: z.string().min(1, "姓名不能为空"),
  basicInfo: z.string().min(1, "基础信息不能为空"),
  appearance: z.string().min(1, "容貌特征不能为空"),
  body: z.string().min(1, "身材特征不能为空"),
  hair: z.string().min(1, "头发不能为空"),
  clothing: z.string().min(1, "服装不能为空"),
  tags: z.array(z.string()).min(1, "特征标签不能为空"),
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
      toast.success("角色信息修改成功");
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
    <BottomSheet
      open={isOpen}
      onOpenChange={onClose}
      title="编辑角色信息"
      description="修改角色的详细信息"
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
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
          {/* 姓名 */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-800 dark:text-gray-300">
                  姓名
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="输入角色姓名..."
                    style={{ borderColor: "#514f4f" }}
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
                <FormLabel className="text-gray-800 dark:text-gray-300">
                  基础信息
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="输入角色的基础信息..."
                    className="min-h-[60px] resize-none"
                    style={{ borderColor: "#514f4f" }}
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
                <FormLabel className="text-gray-800 dark:text-gray-300">
                  容貌特征
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="描述角色的容貌特征..."
                    className="min-h-[60px] resize-none"
                    style={{ borderColor: "#514f4f" }}
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
                <FormLabel className="text-gray-800 dark:text-gray-300">
                  身材特征
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="描述角色的身材特征..."
                    className="min-h-[60px] resize-none"
                    style={{ borderColor: "#514f4f" }}
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
                <FormLabel className="text-gray-800 dark:text-gray-300">
                  头发
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="描述角色的头发..."
                    style={{ borderColor: "#514f4f" }}
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
                <FormLabel className="text-gray-800 dark:text-gray-300">
                  服装
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="描述角色的服装..."
                    className="min-h-[60px] resize-none"
                    style={{ borderColor: "#514f4f" }}
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
                <FormLabel className="text-gray-800 dark:text-gray-300">
                  特征标签
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="输入角色的特征标签..."
                    style={{ borderColor: "#514f4f" }}
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

