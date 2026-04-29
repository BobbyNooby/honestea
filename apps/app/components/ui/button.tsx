import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef } from "react"
import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native"

import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-md active:opacity-80",
  {
    variants: {
      variant: {
        default: "bg-primary",
        secondary: "bg-secondary",
        destructive: "bg-destructive",
        outline: "border border-border bg-transparent",
        ghost: "bg-transparent",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

const buttonTextVariants = cva("font-semibold", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      ghost: "text-foreground",
    },
    size: {
      default: "text-base",
      sm: "text-sm",
      lg: "text-base",
      icon: "text-base",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
})

export interface ButtonProps
  extends Omit<PressableProps, "children">,
    VariantProps<typeof buttonVariants> {
  className?: string
  textClassName?: string
  loading?: boolean
  children: React.ReactNode
}

export const Button = forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    { className, textClassName, variant, size, loading, disabled, children, ...props },
    ref,
  ) => {
    const isDisabled = disabled || loading
    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        className={cn(
          buttonVariants({ variant, size }),
          isDisabled && "opacity-50",
          className,
        )}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : typeof children === "string" ? (
          <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    )
  },
)
Button.displayName = "Button"
