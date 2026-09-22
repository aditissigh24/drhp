import * as React from "react"
import { cn } from "@/lib/utils"

const CustomCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm",
      className
    )}
    {...props}
  />
))
CustomCard.displayName = "CustomCard"

export { CustomCard } 