import { forwardRef } from "react"
import { TextInput, type TextInputProps } from "react-native"
import { useColorScheme } from "nativewind"

import { cn } from "@/lib/cn"

export interface InputProps extends TextInputProps {
  className?: string
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ className, placeholderTextColor, ...props }, ref) => {
    const { colorScheme } = useColorScheme()
    const placeholder =
      placeholderTextColor ?? (colorScheme === "dark" ? "#71717a" : "#a1a1aa")
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={placeholder}
        className={cn(
          "min-h-11 rounded-md border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900",
          "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"
