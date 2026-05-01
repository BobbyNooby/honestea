import { Text, View } from "react-native"

import { pricePerMillionFromPerToken } from "@honestea/shared"

import { formatPricePerMillion, formatRawUsd } from "@/lib/format-model"
import { type RegistryModel } from "@/lib/model-registry"

interface PriceRow {
  label: string
  value: number
  unit: string
  /** When true the value is formatted as a raw $ amount (not /M tokens). */
  raw?: boolean
}

/**
 * Pricing block on the model detail screen. Renders only the rows OR
 * actually exposes for this model — cache read/write, internal reasoning,
 * image input/output, audio, per-request — so the table doesn't show "—"
 * dashes for everything a model doesn't support.
 *
 * Free models (prompt + completion both 0) get a "free model" badge above
 * the rows.
 */
export function PricingTable({ model }: { model: RegistryModel }) {
  const rows = collectPricingRows(model)
  const promptUsd = rows.find((r) => r.label === "Input tokens")?.value ?? 0
  const completionUsd =
    rows.find((r) => r.label === "Output tokens")?.value ?? 0
  const isFree = promptUsd === 0 && completionUsd === 0

  return (
    <View className="gap-1 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      {isFree && (
        <View className="mb-2 self-start rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-900">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            free model
          </Text>
        </View>
      )}
      {rows.map((row) => (
        <PriceLine key={row.label} {...row} />
      ))}
    </View>
  )
}

/**
 * Build the displayable price-row list from a registry model. Order:
 * input → output → cache read (if distinct from prompt) → cache write →
 * internal reasoning (if distinct from completion) → image in → image
 * out → audio in → per-request.
 */
function collectPricingRows(model: RegistryModel): PriceRow[] {
  const promptUsd = pricePerMillionFromPerToken(model.pricing.prompt)
  const completionUsd = pricePerMillionFromPerToken(model.pricing.completion)
  const rows: PriceRow[] = [
    { label: "Input tokens", value: promptUsd, unit: "/M" },
    { label: "Output tokens", value: completionUsd, unit: "/M" },
  ]
  const optionalPerMillion: Array<[string, string | undefined, number?]> = [
    ["Cache read", model.pricing.input_cache_read, promptUsd],
    ["Cache write", model.pricing.input_cache_write],
    ["Internal reasoning", model.pricing.internal_reasoning, completionUsd],
    ["Image input", model.pricing.image],
    ["Image output", model.pricing.image_output],
    ["Audio input", model.pricing.audio],
  ]
  for (const [label, str, suppressIfEqual] of optionalPerMillion) {
    if (!str) continue
    const v = pricePerMillionFromPerToken(str)
    if (suppressIfEqual !== undefined && v === suppressIfEqual) continue
    rows.push({ label, value: v, unit: "/M" })
  }
  if (model.pricing.request) {
    const requestUsd = Number.parseFloat(model.pricing.request)
    if (Number.isFinite(requestUsd) && requestUsd > 0) {
      rows.push({
        label: "Per request",
        value: requestUsd,
        unit: "",
        raw: true,
      })
    }
  }
  return rows
}

function PriceLine({ label, value, unit, raw }: PriceRow) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-[13px] text-zinc-600 dark:text-zinc-400">
        {label}
      </Text>
      <Text className="text-[13px] font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {raw ? formatRawUsd(value) : formatPricePerMillion(value)}
        {unit && (
          <Text className="text-zinc-500 dark:text-zinc-400">{unit}</Text>
        )}
      </Text>
    </View>
  )
}
