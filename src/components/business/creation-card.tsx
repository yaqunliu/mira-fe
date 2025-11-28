import { ICreation } from "@/types/creation";
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
    const statusMap = {
      generating: {
        label: t("common.inProgress"),
        variant: "default" as const,
        className: "bg-blue-600/80",
      },
      completed: {
        label: t("common.completed"),
        variant: "default" as const,
        className: "bg-green-700/80",
      },
      failed: {
        label: t("common.error"),
        variant: "destructive" as const,
        className: "bg-red-500",
      },
    };

    const { label, variant, className } = statusMap[status as keyof typeof statusMap];
    return (
      <Badge variant={variant} className={cn("text-xs", className ?? "")}>
        {label}
      </Badge>
    );
  };

  const handleCreationClick = (creation: ICreation) => {
    if (creation.status === "generating") {
      router.push(`/${locale}/create?creation=${creation.creationId}`);
    }
  };
  return (
    <div
      key={creation.creationId}
      className="overflow-hidden p-0 border-none rounded-t-lg"
      onClick={() => handleCreationClick(creation)}
    >
      {/* 视频缩略图/播放器 */}
      {creation?.videoUrl && (
        <div className="relative w-full bg-black overflow-hidden aspect-video">
          <video
            src={creation?.videoUrl}
            controls
            className="w-full h-auto aspect-video"
          ></video>
        </div>
      )}
      {!creation?.videoUrl && (
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
