"use client";

import { useState, useEffect } from "react";
import { FileVideoCamera, BookOpenText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { ActionBar } from "@/components/business/action-bar";

export default function RootPage() {
  const router = useRouter();
  const t = useTranslations();
  const params = useParams();
  const locale = params?.locale as string;
  
  return (
    <div className="container h-screen mx-auto bg-gradient-to-br from-orange-200/60 via-purple-200/30 to-slate-200/30 dark:bg-black dark:from-transparent dark:via-transparent dark:to-transparent">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-xl font-bold text-gradient-primary">
          {t('视频创作')}
        </h1>
        {/* 操作栏 */}
        <ActionBar />
      </div>
      <div className="h-[1px] w-full divider-primary mb-4" />
      <div className="px-4">
        <div className="flex" onClick={() => router.push(`/${locale}/create`)}>
          <div className="w-1/2 h-[60px] rounded-md flex items-center justify-center gap-3 border border-orange-300 dark:border-orange-600 bg-gradient-to-br from-violet-100/30 to-orange-300/40 to-95% dark:bg-slate-900 hover:from-violet-200/40 hover:to-orange-400/50 dark:hover:bg-slate-800 cursor-pointer transition-all">
            <div className="text-md font-semibold text-orange-800 dark:text-orange-200">{t('home.制作动画')}</div>
            <FileVideoCamera className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1">
            <BookOpenText className="w-4 h-4 text-amber-800 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('home.我的小说')}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-amber-800 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('home.我的创作')}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
