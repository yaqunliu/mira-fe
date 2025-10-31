"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  novelUploadSchema,
  type NovelUploadFormData,
} from "@/lib/validations/novel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { novelApi } from "@/lib/api/novel";
import { toast } from "sonner";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { NovelUpload } from "../business/novel-upload";
import { BottomSheet } from "../ui/bottom-sheet";

interface NovelUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: File[]) => void;
}

export function NovelUploadModal({
  open,
  onOpenChange,
  onUpload,
}: NovelUploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleClose}
      title="上传小说"
      style={{ height: "fit-content", paddingBottom: "40px" }}
      contentClassName="p-6"
    >
      <NovelUpload onUpload={onUpload} />
    </BottomSheet>
  );
}
