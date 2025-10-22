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
import { SceneDisplay } from "./scene-display";
import { CharacterSetting } from "./character-setting";

export function ScriptSetting({ scenes }: { scenes: any[] }) {
  const t = useTranslations("createVideo");
  const [curScriptItem, setCurScriptItem] = useState<'charactor' | 'scene'>('scene');

  return (
    <Card className="w-full max-w-4xl mx-auto border-none p-0 gap-3">
      <CardContent className="space-y-4">
        <CustomTabs
          variant="grid"
          size="md"
          defaultValue="charactor"
          className="gap-0"
          tabsListClassName="p-0 w-fit"
          tabsTriggerClassName="px-4 py-2 dark:data-[state=active]:text-orange-400"
          tabsContentClassName="mt-0 py-4 mt-[-1px] w-full"
          onValueChange={(value) => setCurScriptItem(value as 'charactor' | 'scene')}
          items={[
            {
              value: "charactor",
              label: "角色设定",
              content: <CharacterSetting />
            },
            {
              value: "list",
              label: "场景脚本",
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