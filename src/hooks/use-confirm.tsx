"use client"

import { useState, useCallback } from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export interface ConfirmOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({})
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options?: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(options || {})
      setIsOpen(true)
      setResolvePromise(() => resolve)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolvePromise?.(true)
    setResolvePromise(null)
  }, [resolvePromise])

  const handleCancel = useCallback(() => {
    resolvePromise?.(false)
    setResolvePromise(null)
  }, [resolvePromise])

  const ConfirmDialogComponent = useCallback(() => {
    return (
      <ConfirmDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={options.title}
        description={options.description}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    )
  }, [isOpen, options, handleConfirm, handleCancel])

  return {
    confirm,
    ConfirmDialog: ConfirmDialogComponent,
  }
}
