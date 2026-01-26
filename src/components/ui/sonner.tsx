"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#22C55E]" />,
        info: <InfoIcon className="size-4 text-[#ADD8E6]" />,
        warning: <TriangleAlertIcon className="size-4 text-[#FDBCB4]" />,
        error: <OctagonXIcon className="size-4 text-[#FDBCB4]" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[#22C55E]" />,
      }}
      style={
        {
          "--normal-bg": "#FFFFFF",
          "--normal-text": "#000000",
          "--normal-border": "none",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        className: "claymorphism-sm",
      }}
      {...props}
    />
  )
}

export { Toaster }
