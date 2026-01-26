import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "focus:bg-[#FDBCB4]/10 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-16 w-full rounded-lg bg-white px-4 py-3 text-base transition-all duration-300 outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-[4px_4px_8px_rgba(173,221,230,0.2),-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[6px_6px_12px_rgba(173,221,230,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] hover:-translate-y-0.5",
        "placeholder",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
