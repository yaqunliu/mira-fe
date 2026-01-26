import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-300 overflow-hidden shadow-[2px_2px_4px_rgba(173,221,230,0.3),-1px_-1px_3px_rgba(255,255,255,0.7)] hover:shadow-[3px_3px_6px_rgba(173,221,230,0.4),-2px_-2px_4px_rgba(255,255,255,0.8)] hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default:
          "bg-[#FDBCB4] text-gray-800 [a&]:hover:bg-[#F9A899]",
        secondary:
          "bg-[#ADD8E6] text-gray-800 [a&]:hover:bg-[#93C5FD]",
        destructive:
          "bg-red-500 text-white [a&]:hover:bg-red-600 focus-visible:ring-red-500/20 dark:focus-visible:ring-red-500/40",
        outline:
          "bg-white text-gray-800 [a&]:hover:bg-gray-100",
        green:
          "bg-[#22C55E] text-white [a&]:hover:bg-[#16A34A]",
        orange:
          "bg-orange-500 text-white [a&]:hover:bg-orange-600",
        pink:
          "bg-[#FDBCB4] text-gray-800 [a&]:hover:bg-[#F9A899]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
