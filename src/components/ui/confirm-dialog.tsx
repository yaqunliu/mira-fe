"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  const t = useTranslations("common")
  const dialogTitle = title ?? t("confirmAction")
  const confirmLabel = confirmText ?? t("confirm")
  const cancelLabel = cancelText ?? t("cancel")

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {variant === "destructive" && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#FDBCB4]/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[#FDBCB4]" />
              </div>
            )}
            <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] bg-clip-text text-transparent">
            {dialogTitle}
          </DialogTitle>
        </div>
        {description ? (
          <DialogDescription className="pt-2 text-base text-gray-600 dark:text-gray-400">
            {description}
          </DialogDescription>
        ) : (
          <DialogDescription className="sr-only">
            Confirmation dialog for {dialogTitle}
          </DialogDescription>
        )}
      </DialogHeader>
        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          {variant === "destructive" ? (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              className="flex-1"
            >
              {confirmLabel}
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
