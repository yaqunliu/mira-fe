import { ICreation, CreationStatus } from "@/types/creation";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImageOff } from "lucide-react";

function VideoCard({ creation }: { creation: ICreation }) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string;
  const t = useTranslations();
  const getStatusBadge = (status: ICreation["status"]) => {
    // 处理 undefined 或 null 状态
    if (!status) {
      return (
        <Badge variant="default" className={cn("text-xs", "bg-gray-500")}>
          {t("common.unknown")}
        </Badge>
      );
    }

    // 根据状态返回对应的徽章
    if (status === CreationStatus.COMPLETED) {
      return (
        <Badge variant="default" className={cn("text-xs", "bg-green-700/80")}>
          {t("common.completed")}
        </Badge>
      );
    } else if (status === CreationStatus.FAILED) {
      return (
        <Badge variant="destructive" className={cn("text-xs", "bg-red-500")}>
          {t("common.error")}
        </Badge>
      );
    } else {
      // 所有其他状态都显示为"进行中"
      return (
        <Badge variant="default" className={cn("text-xs", "bg-blue-600/80")}>
          {t("common.inProgress")}
        </Badge>
      );
    }
  };

  const handleCreationClick = (creation: ICreation) => {
    const creationId = (creation as any).uuid || creation.creation_id;
    router.push(`/${locale}/dynamic-comic-editor?taskId=${creationId}`);
  };
  // 兼容两种字段名格式
  const creationId = (creation as any).creation_id || creation.creation_id || (creation as any).uuid || "";
  const videoUrl = (creation as any).video_url || (creation as any).videoUrl || "";

  return (
    <div
      key={creationId}
      className="overflow-hidden p-0 border-none rounded-t-lg"
      onClick={() => handleCreationClick(creation)}
    >
      {/* 视频缩略图/播放器 */}
      {videoUrl && (
        <div className="relative w-full bg-black overflow-hidden aspect-video">
          <video
            src={videoUrl}
            controls
            className="w-full h-auto aspect-video"
          ></video>
        </div>
      )}
      {!videoUrl && (
        <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-800/50 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-white/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 shadow-sm backdrop-blur-sm">
              <ImageOff className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 tracking-widest">
              暂无预览
            </span>
          </div>
        </div>
      )}

      <div className="bg-stone-700/60 rounded-b-lg p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="text-base line-clamp-2 font-bold">
              {creation.title}
            </div>
          </div>
          <div className="flex items-center">
            {getStatusBadge(creation?.status)}
          </div>
        </div>
        {/* <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(creation.createdAt)}</span>
                    </div>
                    
                  </div> */}
      </div>
    </div>
  );
}

export default VideoCard;
