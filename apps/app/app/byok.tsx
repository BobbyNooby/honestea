import {
  IconArrowLeft,
  IconKey,
  IconShield,
  IconSparkles,
} from "@tabler/icons-react-native"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { cn } from "@/lib/cn"
import {
  BYOK_PROVIDERS,
  deleteKey,
  getKey,
  setKey,
  validateKey,
  type ByokKeyInfo,
  type ByokProvider,
} from "@/lib/byok"

/**
 * API Keys screen. Reached from Settings → API Keys, from Onboarding's
 * Free path, and from the pricing fallback.
 *
 * Visually rebuilt to match the design standard:
 *  • cream background, custom serif header (no Stack default)
 *  • OpenRouter card highlighted with the matcha-recommended border +
 *    "Recommended" eyebrow — it's the one key that unlocks every model
 *  • the other three are advanced direct keys
 *  • configured/not-set status renders as a matcha pill (was emerald
 *    before, off-brand)
 *  • "Get a key" link is matcha-tinted (was blue)
 *
 * Behavior is unchanged from the previous version: paste → validate
 * against each provider's auth-info endpoint → store in Secure Store.
 * Replace / Remove flows survive across the redesign.
 */
export default function ByokScreen() {
  const dark = useColorScheme() === "dark"
  const recommended = BYOK_PROVIDERS.filter((p) => p.recommended)
  const advanced = BYOK_PROVIDERS.filter((p) => !p.recommended)
  const tint = dark ? "#a8c98a" : "#466b2c"

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-50 dark:bg-zinc-950"
      edges={["top", "bottom"]}
    >
      <View className="h-12 flex-row items-center justify-between px-2">
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace("/" as never)
          }}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-zinc-100 dark:active:bg-zinc-900"
        >
          <IconArrowLeft
            size={22}
            color={dark ? "#e4e4e7" : "#18181b"}
            strokeWidth={1.75}
          />
        </Pressable>
        <Text
          className="text-zinc-900 dark:text-zinc-100"
          style={{
            fontFamily: "Georgia",
            fontWeight: "600",
            fontSize: 20,
            letterSpacing: 0.2,
          }}
        >
          API Keys
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerClassName="gap-4 px-4 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <Text className="px-2 text-[13.5px] leading-5 text-zinc-600 dark:text-zinc-400">
          Use your own provider keys. We never see them — they live encrypted
          on your device and are sent only to the provider you point them at.
        </Text>

        <Section eyebrow="Recommended">
          {recommended.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              recommended
            />
          ))}
        </Section>

        <Section
          eyebrow="Direct provider keys"
          subtitle="Skip OpenRouter's 5% markup. Coming soon — only OpenRouter is active today."
        >
          {advanced.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} disabled />
          ))}
        </Section>

        <View
          className="mt-1 flex-row gap-2.5 rounded-2xl border p-3.5"
          style={{
            backgroundColor: "#5b8a3a14",
            borderColor: "#5b8a3a33",
          }}
        >
          <IconShield size={16} color={tint} strokeWidth={1.75} />
          <Text className="flex-1 text-[12.5px] leading-5 text-zinc-700 dark:text-zinc-300">
            <Text style={{ color: tint, fontWeight: "600" }}>
              Keys never leave your device.
            </Text>{" "}
            Stored in iOS Keychain / Android Keystore. Sent directly to the
            provider — we don't proxy or log them.
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/api-key-info" as never)}
          className="mt-1 flex-row items-center justify-center gap-1.5 self-center rounded-full border border-chamomile-100 bg-white px-3.5 py-1.5 active:opacity-70 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <IconSparkles size={13} color={tint} strokeWidth={1.75} />
          <Text className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
            What's an API key?
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * A grouped block of cards with an eyebrow header. Eyebrow uses the
 * design's mono uppercase treatment so the section reads as a deliberate
 * grouping (not just stacked cards).
 */
function Section({
  eyebrow,
  subtitle,
  children,
}: {
  eyebrow: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <View className="gap-2.5">
      <View className="gap-0.5 px-2">
        <Text
          className="text-matcha-700 dark:text-matcha-400"
          style={{
            fontFamily: "Menlo",
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </Text>
        {subtitle && (
          <Text className="text-[12px] leading-4 text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </Text>
        )}
      </View>
      <View className="gap-2.5">{children}</View>
    </View>
  )
}

/**
 * One provider's card. Wraps the same edit/save/remove state machine as
 * before, just rebuilt visually. Recommended (OpenRouter) gets the
 * matcha-500 border-2 treatment; the rest use the standard chamomile.
 */
function ProviderCard({
  provider,
  recommended,
  disabled,
}: {
  provider: ByokProvider
  recommended?: boolean
  disabled?: boolean
}) {
  const dark = useColorScheme() === "dark"
  const [stored, setStored] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<ByokKeyInfo | null>(null)

  useEffect(() => {
    getKey(provider).then(setStored)
  }, [provider])

  const updateDraft = (next: string) => {
    setDraft(next)
    if (error) setError(null)
  }

  const handleSave = async () => {
    const value = draft.trim()
    if (!value) return
    setBusy(true)
    setError(null)
    const result = await validateKey(provider, value)
    if (!result.valid) {
      setError(result.error ?? "Invalid key")
      setBusy(false)
      return
    }
    try {
      await setKey(provider, value)
      setStored(value)
      setInfo(result.info ?? null)
      setDraft("")
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = () => {
    Alert.alert(
      `Remove ${provider.name} key?`,
      "You'll need to paste it again to use this provider.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setBusy(true)
            try {
              await deleteKey(provider)
              setStored(null)
              setInfo(null)
              setDraft("")
            } finally {
              setBusy(false)
            }
          },
        },
      ],
    )
  }

  const tint = dark ? "#a8c98a" : "#5b8a3a"
  const isConfigured = !!stored

  return (
    <View
      className={cn(
        "gap-3 rounded-3xl bg-white p-4 dark:bg-zinc-900",
        recommended
          ? "border-2 border-matcha-500"
          : "border border-chamomile-100 dark:border-zinc-800",
        disabled && "opacity-50",
      )}
    >
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-matcha-500/15 dark:bg-matcha-400/20">
          <IconKey size={20} color={tint} strokeWidth={1.75} />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "600",
              fontSize: 18,
              letterSpacing: -0.3,
            }}
          >
            {provider.name}
          </Text>
          <Text className="text-[12px] leading-4 text-zinc-500 dark:text-zinc-400">
            {provider.description}
          </Text>
        </View>
        {disabled ? (
          <ComingSoonPill />
        ) : (
          <StatusPill configured={isConfigured} />
        )}
      </View>

      {!disabled && (!isConfigured || editing) && (
        <View className="gap-2">
          <TextInput
            value={draft}
            onChangeText={updateDraft}
            placeholder={provider.keyFormat}
            placeholderTextColor={dark ? "#52525b" : "#a1a1aa"}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            editable={!busy}
            className="rounded-xl border border-chamomile-100 bg-chamomile-50 px-3 py-2.5 font-mono text-[13px] text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
          {error && (
            <Text className="text-[12px] text-red-600 dark:text-red-400">
              {error}
            </Text>
          )}
          <View className="flex-row gap-2">
            <PrimaryButton
              loading={busy}
              disabled={!draft.trim()}
              onPress={handleSave}
              className="flex-1"
            >
              {busy ? "Verifying…" : "Save & verify"}
            </PrimaryButton>
            {isConfigured && (
              <OutlineButton
                onPress={() => {
                  setEditing(false)
                  setDraft("")
                  setError(null)
                }}
              >
                Cancel
              </OutlineButton>
            )}
          </View>
        </View>
      )}

      {!disabled && isConfigured && !editing && (
        <>
          {info && <KeyInfoBlock info={info} />}
          <View className="flex-row gap-2">
            <OutlineButton
              onPress={() => setEditing(true)}
              className="flex-1"
            >
              Replace
            </OutlineButton>
            <DestructiveButton onPress={handleRemove}>
              Remove
            </DestructiveButton>
          </View>
        </>
      )}

      {disabled && (
        <Text className="text-[12px] text-zinc-500 dark:text-zinc-400">
          Direct provider keys are coming in a future update. Use OpenRouter
          today to chat with every model.
        </Text>
      )}

      <Pressable
        onPress={() => Linking.openURL(provider.signupUrl)}
        hitSlop={4}
        disabled={disabled}
        className="flex-row items-center"
      >
        <Text
          className={cn(
            "text-[12px] font-medium",
            disabled
              ? "text-zinc-400 dark:text-zinc-500"
              : "text-matcha-700 dark:text-matcha-400",
          )}
        >
          Get a key at {provider.signupUrl.replace(/^https?:\/\//, "")} →
        </Text>
      </Pressable>
    </View>
  )
}

function ComingSoonPill() {
  return (
    <View className="rounded-full bg-zinc-200/60 px-2 py-0.5 dark:bg-zinc-800">
      <Text
        style={{
          fontFamily: "Menlo",
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
        className="text-zinc-500 dark:text-zinc-400"
      >
        Coming soon
      </Text>
    </View>
  )
}

function StatusPill({ configured }: { configured: boolean }) {
  return (
    <View
      className={
        configured
          ? "rounded-full bg-matcha-500/15 px-2 py-0.5 dark:bg-matcha-400/20"
          : "rounded-full bg-zinc-200/60 px-2 py-0.5 dark:bg-zinc-800"
      }
    >
      <Text
        style={{
          fontFamily: "Menlo",
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
        className={
          configured
            ? "text-matcha-700 dark:text-matcha-300"
            : "text-zinc-500 dark:text-zinc-400"
        }
      >
        {configured ? "Configured" : "Not set"}
      </Text>
    </View>
  )
}

function KeyInfoBlock({ info }: { info: ByokKeyInfo }) {
  const showUsage = info.usage != null
  const showLimit = info.limit != null
  if (!info.label && !showUsage && !showLimit) return null
  return (
    <View className="gap-1 rounded-xl bg-chamomile-50 px-3 py-2 dark:bg-zinc-950">
      {info.label && (
        <Row label="Label">
          <Text className="font-mono text-[12px] text-zinc-700 dark:text-zinc-300">
            {info.label}
          </Text>
        </Row>
      )}
      {showUsage && (
        <Row label="Used">
          <Text className="font-mono text-[12px] text-zinc-700 dark:text-zinc-300">
            ${info.usage!.toFixed(4)}
            {showLimit
              ? ` / $${info.limit!.toFixed(2)}`
              : info.limit === null
                ? " (unlimited)"
                : ""}
          </Text>
        </Row>
      )}
    </View>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <View className="flex-row items-baseline gap-2">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </Text>
      {children}
    </View>
  )
}

/**
 * Matcha-filled primary button. Inline rather than swapping the shared
 * `Button` component's default variant — that would touch every place
 * a default button renders. Local to BYOK for now; can be promoted into
 * the design system once we lift other screens off blue.
 */
function PrimaryButton({
  onPress,
  loading,
  disabled,
  className,
  children,
}: {
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  const isDisabled = !!disabled || !!loading
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        "h-10 items-center justify-center rounded-xl px-3.5 active:opacity-90",
        isDisabled
          ? "bg-matcha-600/40 dark:bg-matcha-500/40"
          : "bg-matcha-600 dark:bg-matcha-500",
        className,
      )}
    >
      <Text className="text-[13.5px] font-semibold text-white">{children}</Text>
    </Pressable>
  )
}

function OutlineButton({
  onPress,
  className,
  children,
}: {
  onPress: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "h-10 items-center justify-center rounded-xl border-[1.5px] border-matcha-600 bg-white px-3.5 active:opacity-70 dark:border-matcha-500 dark:bg-zinc-900",
        className,
      )}
    >
      <Text className="text-[13.5px] font-semibold text-matcha-700 dark:text-matcha-400">
        {children}
      </Text>
    </Pressable>
  )
}

function DestructiveButton({
  onPress,
  children,
}: {
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-10 items-center justify-center rounded-xl border border-red-500/40 bg-white px-3.5 active:opacity-70 dark:bg-zinc-900"
    >
      <Text className="text-[13.5px] font-semibold text-red-600 dark:text-red-400">
        {children}
      </Text>
    </Pressable>
  )
}

