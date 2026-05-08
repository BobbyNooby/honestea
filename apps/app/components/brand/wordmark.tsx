import { Text, View } from "react-native";

interface Props {
  size?: number;
}

/**
 * "HonesTea AI" wordmark with the design-system color treatment: zinc-900
 * "Hones", matcha-600 "Tea", muted zinc " AI". Matches the SVG wordmark
 * from the design kit but rendered as <Text> so it tracks system font
 * sizing and dark-mode color flips automatically.
 */
export function Wordmark({ size = 18 }: Props) {
  return (
    <View>
      <Text
        style={{
          fontSize: size,
          fontWeight: "700",
          letterSpacing: -0.18,
          lineHeight: size * 1.2,
        }}
      >
        <Text className="text-zinc-900 dark:text-zinc-100">Hones</Text>
        <Text className="text-matcha-600 dark:text-matcha-400">Tea</Text>
        <Text
          className="text-zinc-500 dark:text-zinc-500"
          style={{ fontWeight: "500" }}
        >
          {" AI"}
        </Text>
      </Text>
    </View>
  );
}
