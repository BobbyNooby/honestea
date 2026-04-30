import { createContext, useCallback, useContext, useState } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native"

import { Button } from "@/components/ui/button"

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Renders the confirm button red and labels semantics for the user. */
  destructive?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface PendingConfirm {
  opts: ConfirmOptions
  resolve: (result: boolean) => void
}

/**
 * Provider exposing a `useConfirm()` function. Call site:
 *
 *   const confirm = useConfirm()
 *   const ok = await confirm({ title: "Delete chat?", destructive: true })
 *   if (ok) doDestructiveThing()
 *
 * The dialog is custom-styled (matches the rest of the app's look) instead
 * of bouncing through `Alert.alert` which renders as ugly native dialogs
 * on Android.
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve })
    })
  }, [])

  const close = (result: boolean) => {
    if (!pending) return
    pending.resolve(result)
    setPending(null)
  }

  const opts = pending?.opts

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={pending !== null}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <Pressable
            onPress={() => close(false)}
            className="flex-1 items-center justify-center bg-black/40 px-8"
          >
            <Pressable className="w-full max-w-sm gap-3 rounded-2xl bg-white p-5 dark:bg-zinc-900">
              <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {opts?.title ?? ""}
              </Text>
              {opts?.message ? (
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  {opts.message}
                </Text>
              ) : null}
              <View className="mt-2 flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => close(false)}
                >
                  {opts?.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  variant={opts?.destructive ? "destructive" : "default"}
                  size="sm"
                  onPress={() => close(true)}
                >
                  {opts?.confirmLabel ?? "Confirm"}
                </Button>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm called outside ConfirmDialogProvider")
  }
  return ctx
}
