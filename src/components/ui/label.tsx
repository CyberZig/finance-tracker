import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
