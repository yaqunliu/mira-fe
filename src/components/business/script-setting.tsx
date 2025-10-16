"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  novelUploadSchema,
  type NovelUploadFormData,
} from "@/lib/validations/novel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent
} from "@/components/ui/card";

import { useTranslations } from "next-intl";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { NovelUpload } from "./novel-upload";
import { NovelSelect } from "./novel-select";
import { Novel, Chapter } from "@/types";
import scene from "@/mock/scene.json";
import { SceneDisplay } from "./scene-display";

export function ScriptSetting({ scenes }: { scenes: any[] }) {
  const t = useTranslations("createVideo");
  const [curScriptItem, setCurScriptItem] = useState<'charactor' | 'scene'>('scene');

  return (
    <Card className="w-full max-w-4xl mx-auto border-none p-0 gap-3">
      <CardContent className="space-y-4">
        {/** 添加Tabs切换，有两个选项"从小说列表中选择"和"上传小说" */}
        <div className="text-base font-bold text-gray-300">选择剧本</div>
        <CustomTabs
          variant="grid"
          size="md"
          defaultValue="upload"
          className="gap-0"
          tabsListClassName="p-0 rounded-b-none"
          tabsTriggerClassName="rounded-b-none"
          tabsContentClassName="dark:data-[state=active]:bg-zinc-800 dark:bg-gray-700/30 mt-0 px-3 py-4 mt-[-1px] rounde-b-lg"
          onValueChange={(value) => setCurScriptItem(value as 'charactor' | 'scene')}
          items={[
            {
              value: "charactor",
              label: "角色设定",
              content:(
                <div>
                     角色设定
                </div>
              )
            },
            {
              value: "list",
              label: "场景设定",
              content: (
                <div>
                    <SceneDisplay data={scenes} />
                </div>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}