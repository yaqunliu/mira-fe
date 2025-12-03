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
  title = "确认操作",
  description,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
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
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center border border-red-200 dark:border-red-800/50">
                <AlertTriangle className="h-5 w-5 text-red-700 dark:text-red-400" />
              </div>
            )}
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </DialogTitle>
          </div>
          {description && (
            <DialogDescription className="pt-2 text-base text-gray-600 dark:text-gray-400">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-3 sm:gap-3">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="flex-1 border-[1.5px] border-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-medium"
          >
            {cancelText}
          </Button>
          {variant === "destructive" ? (
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium shadow-md hover:shadow-lg transition-all dark:bg-red-600 dark:hover:bg-red-700"
            >
              {confirmText}
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium shadow-md hover:shadow-lg transition-all dark:from-orange-600 dark:to-amber-600 dark:hover:from-orange-700 dark:hover:to-amber-700"
            >
              {confirmText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
