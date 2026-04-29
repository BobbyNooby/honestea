import { forwardRef } from "react"
import { Text, View, type TextProps, type ViewProps } from "react-native"

import { cn } from "@/lib/cn"

export const Card = forwardRef<View, ViewProps & { className?: string }>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn("rounded-lg border border-border bg-card p-4", className)}
      {...props}
    />
  ),
)
Card.displayName = "Card"

export const CardTitle = forwardRef<Text, TextProps & { className?: string }>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn("text-base font-semibold text-card-foreground", className)}
      {...props}
    />
  ),
)
CardTitle.displayName = "CardTitle"

export const CardContent = forwardRef<Text, TextProps & { className?: string }>(
  ({ className, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn("text-card-foreground", className)}
      {...props}
    />
  ),
)
CardContent.displayName = "CardContent"
