module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Rewrite `import { IconX } from "@tabler/icons-react-native"` into
      // `import IconX from "@tabler/icons-react-native/dist/esm/icons/IconX.mjs"`
      // at compile time. The package ships ~5000 icon files; without this
      // metro walks the whole tree on every HMR cycle and hits Windows'
      // EMFILE limit. With this, only the icons we actually import enter
      // the dep graph.
      [
        "transform-imports",
        {
          "@tabler/icons-react-native": {
            transform:
              "@tabler/icons-react-native/dist/esm/icons/${member}.mjs",
            preventFullImport: true,
          },
        },
      ],
    ],
  }
}
