import { forwardRef } from "react"
import { Text, View, type TextProps, type ViewProps } from "react-native"

import { cn } from "@/lib/cn"

export const Card = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = "Card"

export const CardTitle = forwardRef<Text, TextProps & { className?: string }>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn(
        "text-base font-semibold text-zinc-900 dark:text-zinc-100",
        className,
      )}
      {...props}
    />
  ),
)
CardTitle.displayName = "CardTitle"

export const CardContent = forwardRef<Text, TextProps & { className?: string }>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn("text-zinc-900 dark:text-zinc-100", className)}
      {...props}
    />
  ),
)
CardContent.displayName = "CardContent"
