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
        <Badge variant="outline" className={cn("text-xs")}>
          {t("common.unknown")}
        </Badge>
      );
    }

    // 根据状态返回对应的徽章
    if (status === CreationStatus.COMPLETED) {
      return (
        <Badge variant="green" className={cn("text-xs")}>
          {t("common.completed")}
        </Badge>
      );
    } else if (status === CreationStatus.FAILED) {
      return (
        <Badge variant="destructive" className={cn("text-xs")}>
          {t("common.error")}
        </Badge>
      );
    } else {
      // 所有其他状态都显示为"进行中"
      return (
        <Badge variant="secondary" className={cn("text-xs")}>
          {t("common.inProgress")}
        </Badge>
      );
    }
  };

  const handleCreationClick = (creation: ICreation) => {
    const creationId = (creation as any).uuid || creation.creation_id;
    const creationType = (creation as any).creation_type || creation.creation_type;
    
    // 根据 creation_type 决定跳转页面
    if (creationType === 'chat') {
      // Chat 类型跳转到 create-agent 页面
      router.push(`/create-agent?creationId=${creationId}`);
    } else {
      // 其他类型跳转到 dynamic-comic-editor 页面
      router.push(`/dynamic-comic-editor?taskId=${creationId}`);
    }
  };
  // 兼容两种字段名格式
  const creationId = (creation as any).creation_id || creation.creation_id || (creation as any).uuid || "";
  const videoUrl = (creation as any).video_url || (creation as any).videoUrl || "";

  return (
    <div
      key={creationId}
      className="overflow-hidden p-0 border-none rounded-xl shadow-[6px_6px_12px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.7)] hover:shadow-[8px_8px_16px_rgba(173,221,230,0.4),-6px_-6px_12px_rgba(255,255,255,0.8)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      onClick={() => handleCreationClick(creation)}
    >
      {/* 视频缩略图/播放器 */}
      {videoUrl && (
        <div className="relative w-full bg-black overflow-hidden aspect-video rounded-t-xl">
          <video
            src={videoUrl}
            controls
            className="w-full h-auto aspect-video"
          ></video>
        </div>
      )}
      {!videoUrl && (
        <div className="relative w-full aspect-video bg-white flex flex-col items-center justify-center overflow-hidden rounded-t-xl shadow-[inset_2px_2px_4px_rgba(173,221,230,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.7)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FDBCB4]/30 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#ADD8E6]/30 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-white shadow-[2px_2px_4px_rgba(173,221,230,0.3),-1px_-1px_3px_rgba(255,255,255,0.7)]">
              <ImageOff className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-xs font-medium text-gray-600 tracking-widest">{t("noPreview")}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-b-xl p-4 shadow-[inset_0_1px_3px_rgba(173,221,230,0.2)]">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="text-base line-clamp-2 font-bold text-gray-800">
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
