module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Drizzle's expo-sqlite migrator imports raw .sql files. Inline their
      // contents as strings at build time so the bundler doesn't try to
      // parse them as JavaScript.
      ["babel-plugin-inline-import", { extensions: [".sql"] }],
    ],
  }
}
