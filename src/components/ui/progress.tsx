"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-white relative h-3 w-full overflow-hidden rounded-full shadow-[inset_2px_2px_4px_rgba(173,221,230,0.3),inset_-1px_-1px_3px_rgba(255,255,255,0.7)]",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] h-full w-full flex-1 transition-all duration-500 shadow-[2px_2px_4px_rgba(173,221,230,0.3),-1px_-1px_3px_rgba(255,255,255,0.7)]"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
