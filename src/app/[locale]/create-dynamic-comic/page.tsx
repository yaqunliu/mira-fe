"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book, FileText, ChevronRight, Check, ArrowLeft, Loader2, PlayCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth";

// API BASE URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Novel {
    novel_id: number;
    uuid: string;
    title: string;
    author: string;
    chapter_count: number;
    type: string; // 'novel' or 'script'
}

interface Chapter {
    chapter_id: number;
    uuid: string;
    title: string;
    chapter_number: number;
    has_creation: boolean;
    preview?: string;
}

export default function CreateDynamicComicPage() {
    const t = useTranslations();
    const router = useRouter();
    const params = useParams();
    const locale = params?.locale as string;

    // State
    const token = useAuthStore(state => state.token);
    const [novels, setNovels] = useState<Novel[]>([]);
    const [selectedNovel, setSelectedNovel] = useState<string>(""); // novel uuid
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [selectedChapterUuid, setSelectedChapterUuid] = useState<string>("");

    // Pagination for chapters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoadingChapters, setIsLoadingChapters] = useState(false);

    // Script Projects State
    const [scriptProjects, setScriptProjects] = useState<Novel[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>(""); // project uuid
    const [projectChapters, setProjectChapters] = useState<Chapter[]>([]); // scripts/chapters in project
    const [selectedProjectChapterUuid, setSelectedProjectChapterUuid] = useState<string>("");

    // Script Creation Dialog State
    const [isScriptDialogOpen, setIsScriptDialogOpen] = useState(false);
    const [newScriptTitle, setNewScriptTitle] = useState("");
    const [newScriptContent, setNewScriptContent] = useState("");
    const [isCreatingScript, setIsCreatingScript] = useState(false);

    // New Project Dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [isCreatingProject, setIsCreatingProject] = useState(false);

    // Global Loading
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState("novel");
    const searchParams = useSearchParams();

    useEffect(() => {
        const novelUuid = searchParams.get("novel");
        const typeParam = searchParams.get("type"); 
        const chapterParam = searchParams.get("chapter");

        if (novelUuid) {
            // Determine type if not provided
            // We might need to wait for novels list to be populated to know the type if not provided?
            // For now, trust the param or default to novel. 
            // If type is explicitly 'script', switch tab.
            if (typeParam === 'script') {
                setActiveTab('script');
                setSelectedProject(novelUuid);
            } else {
                // If type is novel or undefined, check if we should switch?
                // Default is novel tab.
                setActiveTab('novel');
                setSelectedNovel(novelUuid);
            }
        }
    }, [searchParams]);

    // Auto-select chapter when chapters are loaded and chapter param is present
    useEffect(() => {
        const chapterParam = searchParams.get("chapter");
        if (!chapterParam) return;

        if (activeTab === 'novel' && chapters.length > 0) {
             // Try to find by UUID first (since param is UUID), or fallback to ID check just in case
             const chapter = chapters.find(c => c.uuid === chapterParam || String(c.chapter_id) === chapterParam);
             if (chapter) {
                 setSelectedChapterUuid(chapter.uuid);
             }
        } else if (activeTab === 'script' && projectChapters.length > 0) {
             const chapter = projectChapters.find(c => c.uuid === chapterParam || String(c.chapter_id) === chapterParam);
             if (chapter) {
                 setSelectedProjectChapterUuid(chapter.uuid);
             }
        }
    }, [chapters, projectChapters, searchParams, activeTab]);

    // Fetch Novels and Projects
    const fetchNovels = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/novels?page=1&page_size=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                const allItems: Novel[] = data.data.items;
                setNovels(allItems.filter(n => n.type === 'novel' || !n.type)); // Default to novel if type missing
                setScriptProjects(allItems.filter(n => n.type === 'script'));
            }
        } catch (error) {
            console.error("Failed to fetch novels", error);
            toast.error("获取项目列表失败");
        }
    };

    useEffect(() => {
        fetchNovels();
    }, [token]);

    // Fetch Chapters for Novel
    useEffect(() => {
        if (!selectedNovel || !token) {
            setChapters([]);
            return;
        }
        const fetchChapters = async () => {
            setIsLoadingChapters(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/novels/${selectedNovel}/chapters?page=${page}&page_size=10`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setChapters(data.data.items);
                    setTotalPages(data.data.total_pages);
                }
            } catch (error) {
                console.error("Failed to fetch chapters", error);
            } finally {
                setIsLoadingChapters(false);
            }
        };
        fetchChapters();
    }, [selectedNovel, page, token]);

    // Fetch Chapters (Scripts) for Project
    useEffect(() => {
        if (!selectedProject || !token) {
            setProjectChapters([]);
            return;
        }
        // Using same chapters endpoint but treating them as scripts
        const fetchProjectChapters = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/novels/${selectedProject}/chapters?page=1&page_size=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }); // Fetch more for scripts
                if (res.ok) {
                    const data = await res.json();
                    setProjectChapters(data.data.items);
                }
            } catch (error) {
                console.error("Failed to fetch scripts", error);
            }
        };
        fetchProjectChapters();
    }, [selectedProject, token]);

    const createNewScript = async () => {
        if (!selectedProject) {
            toast.error("请先选择一个项目");
            return;
        }
        if (!newScriptTitle.trim()) {
            toast.error("文案标题不能为空");
            return;
        }
        if (!newScriptContent.trim()) {
            toast.error("文案内容不能为空");
            return;
        }

        setIsCreatingScript(true);
        try {
            const project = scriptProjects.find(p => p.uuid === selectedProject);
            if (!project) throw new Error("Project not found");

            const res = await fetch(`${API_BASE_URL}/api/v1/novels/${selectedProject}/chapters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newScriptTitle,
                    chapter_number: projectChapters.length + 1,
                    content: newScriptContent,
                    novel_id: project.novel_id
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("文案创建成功");
                setIsScriptDialogOpen(false);
                setNewScriptTitle("");
                setNewScriptContent("");
                // Refresh chapters
                const chaptersRes = await fetch(`${API_BASE_URL}/api/v1/novels/${selectedProject}/chapters?page=1&page_size=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (chaptersRes.ok) {
                    const chaptersData = await chaptersRes.json();
                    setProjectChapters(chaptersData.data.items);
                    // Select the new chapter
                    if (data.data.uuid) {
                        setSelectedProjectChapterUuid(data.data.uuid);
                    }
                }
            } else {
                const data = await res.json();
                throw new Error(data.detail || "创建失败");
            }
        } catch (e: any) {
            toast.error(`创建文案失败: ${e.message}`);
        } finally {
            setIsCreatingScript(false);
        }
    };


    const createNewProject = async () => {
        if (!newProjectTitle.trim()) {
            toast.error("项目名称不能为空");
            return;
        }
        setIsCreatingProject(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/novels/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newProjectTitle,
                    type: 'script',
                    author: 'User' // Default
                })
            });
            if (res.ok) {
                toast.success("项目创建成功");
                setIsDialogOpen(false);
                setNewProjectTitle("");
                fetchNovels(); // Refresh lists
            } else {
                const data = await res.json();
                throw new Error(data.detail);
            }
        } catch (e: any) {
            toast.error(`创建失败: ${e.message}`);
        } finally {
            setIsCreatingProject(false);
        }
    };

    const onSubmit = async () => {
        let payload: any = {};

        if (activeTab === "novel") {
            // Logic for Novel + Chapter
            if (!selectedNovel || !selectedChapterUuid) {
                toast.error("请选择小说和章节");
                return;
            }
            const novel = novels.find(n => n.uuid === selectedNovel);
            const chapter = chapters.find(c => c.uuid === selectedChapterUuid);
            if (!novel || !chapter) return;

            payload = {
                novel_id: novel.novel_id,
                chapter_id: chapter.chapter_id
            };

        } else if (activeTab === "script") {
            // Logic for Project + Script Selection
            if (!selectedProject || !selectedProjectChapterUuid) {
                toast.error("请选择项目和文案");
                return;
            }
            const project = scriptProjects.find(p => p.uuid === selectedProject);
            const script = projectChapters.find(c => c.uuid === selectedProjectChapterUuid);
            if (!project || !script) return;

            payload = {
                novel_id: project.novel_id,
                chapter_id: script.chapter_id
            };
        }

        setIsGenerating(true);
        toast.info("正在创建生成任务...");

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/video-generation/v2/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || `API call failed: ${response.statusText}`);
            }

            const data = await response.json();
            const taskId = data.task_id;

            toast.success("任务创建成功！即将跳转编辑器...");
            // 跳转到 dynamic-comic-editor，传递 taskId
            // The API returns task_id (which is creation UUID in new flow usually, or we use taskId as UUID)
            // Use task_id (UUID) as the taskId parameter for consistency with backend expectations
            router.push(`/${locale}/dynamic-comic-editor?taskId=${taskId}`);

        } catch (error: any) {
            console.error("Creation failed:", error);
            toast.error(`创建任务失败: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-pink-950 flex flex-col">
            <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    {/* Back button removed as requested */}
                    <div className="text-center w-full">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400">
                            创建高品质动态漫
                        </h1>
                        <p className="text-gray-400 mt-1">选择小说或项目开始创作</p>
                    </div>
                </div>

                {/* Main Content */}
                <Card className="bg-zinc-900/50 border-zinc-800 p-6">
                    <CustomTabs
                        variant="segmented"
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                        items={[
                            {
                                value: "novel",
                                label: (
                                    <div className="flex items-center gap-2">
                                        <Book className="h-4 w-4" />
                                        <span>选择小说章节</span>
                                    </div>
                                ),
                                content: (
                                    <div>
                                        <div className="space-y-6">
                                            <div>
                                                <Label className="text-lg font-medium mb-2 block text-white">选择小说</Label>
                                                <Select value={selectedNovel} onValueChange={setSelectedNovel}>
                                                    <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                                                        <SelectValue placeholder="选择一本小说" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                                        {novels.map((novel) => (
                                                            <SelectItem key={novel.uuid} value={novel.uuid}>{novel.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {selectedNovel && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Label className="text-white">选择章节</Label>
                                                        {totalPages > 1 && (
                                                            <div className="flex gap-2 text-sm">
                                                                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-6 px-2">上一页</Button>
                                                                <span className="text-gray-400 leading-6">{page} / {totalPages}</span>
                                                                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-6 px-2">下一页</Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ScrollArea className="h-[300px] border border-zinc-700 rounded-lg p-2 bg-zinc-800">
                                                        {isLoadingChapters ? (
                                                            <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {chapters.map((chapter) => (
                                                                    <div key={chapter.uuid || chapter.chapter_id}
                                                                        className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedChapterUuid === chapter.uuid ? "border-purple-500 bg-purple-900/50" : "border-zinc-700 hover:border-purple-500 hover:bg-zinc-700"}`}
                                                                        onClick={() => setSelectedChapterUuid(chapter.uuid)}
                                                                    >
                                                                        <div className="flex flex-col gap-1 flex-1 min-w-0 mr-4">
                                                                            <div className="font-medium text-white truncate">{chapter.title}</div>
                                                                            {chapter.preview && (
                                                                                <div className="text-xs text-gray-400 line-clamp-2 break-all">
                                                                                    {chapter.preview}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {chapter.has_creation && <span className="shrink-0 text-xs bg-green-900 text-green-400 px-2 py-1 rounded">已创作</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </ScrollArea>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            },
                            {
                                value: "script",
                                label: (
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span>选择项目文案</span>
                                    </div>
                                ),
                                content: (
                                    <div className="p-6">
                                        <div className="space-y-6">
                                            <div className="flex items-end gap-4">
                                                <div className="flex-1">
                                                    <Label className="text-lg font-medium mb-2 block text-white">选择项目</Label>
                                                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                                                        <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                                                            <SelectValue placeholder="选择一个项目" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                                            {scriptProjects.map((p) => (
                                                                <SelectItem key={p.uuid} value={p.uuid}>{p.title}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-900/50">
                                                            <Plus className="w-4 h-4 mr-2" />新建项目
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
                                                        <DialogHeader>
                                                            <DialogTitle>创建新项目</DialogTitle>
                                                            <DialogDescription className="sr-only">
                                                                输入项目名称以开始新的动态漫创作
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            <Label className="mb-2 block">项目名称</Label>
                                                            <Input
                                                                value={newProjectTitle}
                                                                onChange={(e) => setNewProjectTitle(e.target.value)}
                                                                className="bg-zinc-800 border-zinc-700"
                                                                placeholder="输入项目名称"
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button onClick={createNewProject} disabled={isCreatingProject}>
                                                                {isCreatingProject ? "创建中..." : "创建"}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>

                                            {selectedProject && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Label className="text-white block">选择已有文案</Label>
                                                        <Dialog open={isScriptDialogOpen} onOpenChange={setIsScriptDialogOpen}>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="sm" className="h-8 border-purple-500 text-purple-400 hover:bg-purple-900/50">
                                                                    <Plus className="w-3 h-3 mr-1" />添加新文案
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle>添加新文案</DialogTitle>
                                                                    <DialogDescription className="sr-only">
                                                                        在当前选中的位置插入一段新的字幕文案
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="space-y-4 py-4">
                                                                    <div>
                                                                        <Label className="mb-2 block">文案标题</Label>
                                                                        <Input
                                                                            value={newScriptTitle}
                                                                            onChange={(e) => setNewScriptTitle(e.target.value)}
                                                                            placeholder="输入标题..."
                                                                            className="bg-zinc-800 border-zinc-700"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="mb-2 block">文案内容</Label>
                                                                        <textarea
                                                                            value={newScriptContent}
                                                                            onChange={(e) => setNewScriptContent(e.target.value)}
                                                                            className="w-full h-[300px] p-3 border border-zinc-700 rounded-md bg-zinc-800 text-gray-300 resize-none focus:outline-none focus:border-purple-500"
                                                                            placeholder="输入文案内容..."
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button onClick={createNewScript} disabled={isCreatingScript}>
                                                                        {isCreatingScript ? "保存中..." : "保存并使用"}
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
                                                    <ScrollArea className="h-[300px] border border-zinc-700 rounded-lg p-2 bg-zinc-800">
                                                        <div className="space-y-2">
                                                            {projectChapters.map((chapter) => (
                                                                <div key={chapter.uuid || chapter.chapter_id}
                                                                    className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedProjectChapterUuid === chapter.uuid ? "border-purple-500 bg-purple-900/50" : "border-zinc-700 hover:border-purple-500 hover:bg-zinc-700"}`}
                                                                    onClick={() => setSelectedProjectChapterUuid(chapter.uuid)}
                                                                >
                                                                    <div className="flex flex-col gap-1 flex-1 min-w-0 mr-4">
                                                                        <div className="font-medium text-white truncate">{chapter.title}</div>
                                                                        {chapter.preview && (
                                                                            <div className="text-xs text-gray-400 line-clamp-2 break-all">
                                                                                {chapter.preview}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {chapter.has_creation && <span className="shrink-0 text-xs bg-green-900 text-green-400 px-2 py-1 rounded">已创作</span>}
                                                                </div>
                                                            ))}
                                                            {projectChapters.length === 0 && <div className="text-center text-gray-500 py-10">暂无文案，请点击右上方添加</div>}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            }
                        ]}
                    />

                    <div className="px-6 py-4 bg-zinc-800 border-t border-zinc-700 flex justify-end">
                        <Button
                            onClick={onSubmit}
                            disabled={isGenerating}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-6 rounded-lg hover:scale-105 transition-transform"
                        >
                            {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />处理中...</> : <><span className="mr-2">开始创作</span><ChevronRight className="h-4 w-4" /></>}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
