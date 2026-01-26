import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default: "border-0 bg-[#22C55E] text-white hover:bg-[#16A34A] shadow-[3px_3px_6px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.7)] hover:shadow-[1px_1px_2px_rgba(0,0,0,0.1),-0.5px_-0.5px_1px_rgba(255,255,255,0.5)] hover:translate-y-1",
        destructive:
          "border-0 bg-red-600 text-white hover:bg-red-700 shadow-[3px_3px_6px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.7)] hover:shadow-[1px_1px_2px_rgba(0,0,0,0.1),-0.5px_-0.5px_1px_rgba(255,255,255,0.5)] hover:translate-y-1 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-gray-300 bg-white shadow-[3px_3px_6px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.7)] hover:bg-[#FDBCB4]/10 hover:text-gray-900 hover:shadow-[1px_1px_2px_rgba(0,0,0,0.1),-0.5px_-0.5px_1px_rgba(255,255,255,0.5)] hover:translate-y-1",
        secondary:
          "border-0 bg-[#ADD8E6] text-gray-800 hover:bg-[#93C5FD] shadow-[3px_3px_6px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.7)] hover:shadow-[1px_1px_2px_rgba(0,0,0,0.1),-0.5px_-0.5px_1px_rgba(255,255,255,0.5)] hover:translate-y-1",
        ghost:
          "border border-gray-300 hover:bg-[#FDBCB4]/10 hover:text-gray-900 shadow-[2px_2px_4px_rgba(0,0,0,0.05),-1px_-1px_2px_rgba(255,255,255,0.6)] hover:shadow-[1px_1px_2px_rgba(0,0,0,0.05),-0.5px_-0.5px_1px_rgba(255,255,255,0.5)] hover:translate-y-1",
        link: "border-0 text-[#22C55E] underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        default: "h-12 px-6 py-2 has-[>svg]:px-5",
        sm: "h-10 rounded-md gap-1.5 px-5 py-2 has-[>svg]:px-4",
        lg: "h-14 rounded-lg px-8 has-[>svg]:px-7",
        icon: "size-12",
        "icon-sm": "size-10",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  icon,
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    icon?: React.ReactNode
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {/* asChild 模式下只能有单一子节点，避免 Slot 报错 */}
      {asChild ? (
        children
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
