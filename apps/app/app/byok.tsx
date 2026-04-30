import { Stack, router } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export default function ByokScreen() {
  const recommended = BYOK_PROVIDERS.filter((p) => p.recommended)
  const advanced = BYOK_PROVIDERS.filter((p) => !p.recommended)

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-zinc-950"
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Bring your own keys",
          headerBackTitle: "Settings",
          headerStyle: { backgroundColor: "transparent" },
        }}
      />
      <ScrollView contentContainerClassName="p-5 gap-6">
        <View className="gap-2">
          <Text className="text-base text-zinc-700 dark:text-zinc-300">
            Use your own provider keys. We never see them — they live encrypted
            on your device and are sent only to the provider you point them at.
          </Text>
        </View>

        <Section title="Recommended">
          {recommended.map((provider) => (
            <ProviderRow key={provider.id} provider={provider} />
          ))}
        </Section>

        <Section
          title="Advanced — direct provider keys"
          subtitle="Skip OpenRouter's 5% markup. Claude requests will route to your Anthropic key, GPT to your OpenAI key, etc."
        >
          {advanced.map((provider) => (
            <ProviderRow key={provider.id} provider={provider} />
          ))}
        </Section>

        <Pressable
          onPress={() => router.back()}
          className="mt-2 self-center px-4 py-2"
        >
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            Done
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </Text>
        )}
      </View>
      <View className="gap-3">{children}</View>
    </View>
  )
}

function ProviderRow({ provider }: { provider: ByokProvider }) {
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

  const isConfigured = !!stored

  return (
    <View className="gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {provider.name}
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {provider.description}
          </Text>
        </View>
        <View
          className={cn(
            "self-start rounded-full px-2 py-0.5",
            isConfigured
              ? "bg-emerald-100 dark:bg-emerald-900"
              : "bg-zinc-100 dark:bg-zinc-800",
          )}
        >
          <Text
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              isConfigured
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {isConfigured ? "configured" : "not set"}
          </Text>
        </View>
      </View>

      {(!isConfigured || editing) && (
        <View className="gap-2">
          <Input
            value={draft}
            onChangeText={updateDraft}
            placeholder={provider.keyFormat}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            editable={!busy}
          />
          {error && (
            <Text className="text-xs text-red-600 dark:text-red-400">
              {error}
            </Text>
          )}
          <View className="flex-row gap-2">
            <Button
              onPress={handleSave}
              loading={busy}
              disabled={!draft.trim()}
              className="flex-1"
              size="sm"
            >
              {busy ? "Verifying…" : "Save & verify"}
            </Button>
            {isConfigured && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  setEditing(false)
                  setDraft("")
                  setError(null)
                }}
              >
                Cancel
              </Button>
            )}
          </View>
        </View>
      )}

      {isConfigured && !editing && (
        <>
          {info && <KeyInfoDisplay info={info} />}
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onPress={() => setEditing(true)}
            >
              Replace
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onPress={handleRemove}
            >
              Remove
            </Button>
          </View>
        </>
      )}

      <Pressable
        onPress={() => Linking.openURL(provider.signupUrl)}
        hitSlop={8}
      >
        <Text className="text-xs text-blue-500 dark:text-blue-400">
          Get a key at {provider.signupUrl.replace(/^https?:\/\//, "")} →
        </Text>
      </Pressable>
    </View>
  )
}

function KeyInfoDisplay({ info }: { info: ByokKeyInfo }) {
  const showUsage = info.usage != null
  const showLimit = info.limit != null
  if (!info.label && !showUsage && !showLimit) return null

  return (
    <View className="gap-0.5 rounded-md bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
      {info.label && (
        <Text className="text-xs text-zinc-700 dark:text-zinc-300">
          Label: <Text className="font-mono">{info.label}</Text>
        </Text>
      )}
      {showUsage && (
        <Text className="text-xs text-zinc-700 dark:text-zinc-300">
          Used: ${info.usage!.toFixed(4)}
          {showLimit
            ? ` / $${info.limit!.toFixed(2)}`
            : info.limit === null
              ? " (unlimited)"
              : ""}
        </Text>
      )}
    </View>
  )
}
