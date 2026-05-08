import { Text, View } from "react-native"

import { type RegistryModel } from "@/lib/model"

/**
 * Pill that tags one supported modality (text / image / audio / file /
 * video / embeddings / etc.). Color-coded so multimodal models stand out
 * at a glance — text gets neutral zinc, the rest get accent tints.
 */
export function ModalityPill({ name }: { name: string }) {
  const tone = MODALITY_TONES[name] ?? MODALITY_TONES.default
  return (
    <View className={`rounded-full px-2 py-0.5 ${tone.bg}`}>
      <Text className={`text-[10px] font-medium ${tone.text}`}>{name}</Text>
    </View>
  )
}

const MODALITY_TONES: Record<string, { bg: string; text: string }> = {
  text: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-300",
  },
  image: {
    bg: "bg-matcha-500/15 dark:bg-matcha-400/20",
    text: "text-matcha-700 dark:text-matcha-300",
  },
  audio: {
    bg: "bg-oolong-500/15 dark:bg-oolong-400/20",
    text: "text-oolong-700 dark:text-oolong-300",
  },
  video: {
    bg: "bg-purple-500/15 dark:bg-purple-400/20",
    text: "text-purple-700 dark:text-purple-300",
  },
  file: {
    bg: "bg-blue-500/15 dark:bg-blue-400/20",
    text: "text-blue-700 dark:text-blue-300",
  },
  embeddings: {
    bg: "bg-amber-500/15 dark:bg-amber-400/20",
    text: "text-amber-700 dark:text-amber-300",
  },
  default: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-300",
  },
}

/**
 * Union of input + output modalities for a model, deduped, with text first
 * (it's the baseline) and other modalities sorted alphabetically. Returns
 * empty when the registry didn't expose modality info — caller hides the
 * row.
 */
export function collectModalities(model: RegistryModel): string[] {
  const set = new Set<string>()
  for (const m of model.architecture?.input_modalities ?? []) set.add(m)
  for (const m of model.architecture?.output_modalities ?? []) set.add(m)
  if (set.size === 0) return []
  const arr = [...set]
  arr.sort((a, b) => {
    if (a === "text") return -1
    if (b === "text") return 1
    return a.localeCompare(b)
  })
  return arr
}
