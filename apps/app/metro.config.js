const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")

const config = getDefaultConfig(__dirname, { isCSSEnabled: true })

// Drizzle's Expo SQLite migrator imports raw .sql files — let Metro treat
// them as source assets so they get bundled.
config.resolver.sourceExts.push("sql")

module.exports = withNativeWind(config, { input: "./global.css" })
