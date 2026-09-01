"use client";

import { useTranslations } from 'next-intl'
import { useState } from "react";
import { NovelUpload } from "../business/novel-upload";
import { BottomSheet } from "../ui/bottom-sheet";

interface NovelUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (novelId: string) => void;
}

export function NovelUploadModal({
  open,
  onOpenChange,
  onComplete,
}: NovelUploadModalProps) {
  const t = useTranslations('Editor')
  const [isUploading, setIsUploading] = useState(false);

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false);
    }
  };

  const handleComplete = (novelId: string) => {
    onComplete(novelId);
    handleClose();
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleClose}
      title={t("uploadNovel")}
      style={{ height: "fit-content", paddingBottom: "40px" }}
      contentClassName="p-6"
    >
      <NovelUpload onComplete={handleComplete} />
    </BottomSheet>
  );
}
