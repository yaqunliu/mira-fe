import { ICreation, CreationStatus } from "@/types/creation";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
    if (status === CreationStatus.COMPLETED || status === "completed") {
      return (
        <Badge variant="default" className={cn("text-xs", "bg-green-700/80")}>
          {t("common.completed")}
        </Badge>
      );
    } else if (status === CreationStatus.FAILED || status === "failed") {
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
    // 如果创作未完成，可以点击跳转到创作页面
    const status = creation.status;
    if (status && status !== CreationStatus.COMPLETED && status !== "completed" && status !== CreationStatus.FAILED && status !== "failed") {
      const creationId = (creation as any).creation_id || creation.creationId;
      router.push(`/${locale}/create?creation=${creationId}`);
    }
  };
  // 兼容两种字段名格式
  const creationId = (creation as any).creation_id || creation.creationId || "";
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
        <div className="relative w-full bg-black overflow-hidden aspect-video">
          <img
            src={"https://zhuluoji.cn-sh2.ufileos.com/images-frontend/test/placeholder.png"}
            alt={creation.title}
            className="absolute inset-0 w-full aspect-video object-cover"
          />
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
