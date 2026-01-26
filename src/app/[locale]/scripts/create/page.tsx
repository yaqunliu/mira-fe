"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    FileText,
    ChevronLeft,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { scriptApi } from "@/lib/api/script";
import { toast } from "sonner";
import LoadingIcon from "@/components/ui/loading-icon";

export default function CreateScriptPage() {
    const router = useRouter();
    const params = useParams();
    const t = useTranslations();
    const locale = params?.locale as string;
    const queryClient = useQueryClient();

    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");

    const createMutation = useMutation({
        mutationFn: () => scriptApi.createScript({ title, author }),
        onSuccess: (response: any) => {
            const scriptUuid = response?.data?.uuid || response?.data?.novel_id;
            toast.success(t("common.success") || "创建成功");
            queryClient.invalidateQueries({ queryKey: ["scripts"] });
            if (scriptUuid) {
                router.push(`/${locale}/scripts/${scriptUuid}`);
            } else {
                router.push(`/${locale}/scripts`);
            }
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : "创建失败");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("请输入标题");
            return;
        }
        createMutation.mutate();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50/50 via-white to-gray-100/30 p-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-[#ADD8E6]/10 text-[#ADD8E6] hover:text-[#ADD8E6] shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-white rounded-xl">
                    <ChevronLeft className="h-4 w-4 mr-1" />返回
                </Button>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        {t("createVideo.createProject")}
                    </h1>
                    <p className="text-gray-600">{t("home.manageYourNovels")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 p-6 rounded-2xl shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] bg-gradient-to-br from-white to-gray-50/80">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-gray-700">标题 <span className="text-[#FDBCB4]">*</span></Label>
                            <Input
                                id="title"
                                placeholder="例如：都市职场系列文案"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-12 text-lg bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="author" className="text-gray-700">作者</Label>
                            <Input
                                id="author"
                                placeholder="输入作者名称（可选）"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                className="h-12 bg-white shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)]"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            disabled={createMutation.isPending || !title.trim()}
                            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-[#FDBCB4] to-[#F9A899] hover:from-[#F9A899] hover:to-[#F69689] text-white shadow-[4px_4px_8px_rgba(253,188,180,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] transition-all duration-200"
                        >
                            {createMutation.isPending ? <><LoadingIcon className="mr-2" /> 创建中...</> : <><Check className="mr-2" /> 确认创建</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
