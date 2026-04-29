import { forwardRef } from "react"
import { TextInput, type TextInputProps } from "react-native"

import { cn } from "@/lib/cn"

export interface InputProps extends TextInputProps {
  className?: string
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ className, placeholderTextColor = "#888", ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor}
        className={cn(
          "min-h-11 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground",
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"
