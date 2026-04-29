import { forwardRef } from "react"
import { Switch as RNSwitch, type SwitchProps as RNSwitchProps } from "react-native"

import { cn } from "@/lib/cn"

export interface SwitchProps extends RNSwitchProps {
  className?: string
}

export const Switch = forwardRef<RNSwitch, SwitchProps>(
  ({ className, trackColor, thumbColor, ...props }, ref) => {
    return (
      <RNSwitch
        ref={ref}
        trackColor={trackColor ?? { false: "#71717a", true: "#3b82f6" }}
        thumbColor={thumbColor ?? "#ffffff"}
        ios_backgroundColor="#71717a"
        className={cn(className)}
        {...props}
      />
    )
  },
)
Switch.displayName = "Switch"
