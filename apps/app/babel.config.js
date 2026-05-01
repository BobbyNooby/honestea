module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Rewrite `import { IconX } from "@tabler/icons-react-native"` into
      // `import IconX from "@tabler/icons-react-native/IconX"` at compile
      // time. The package ships ~5000 icon files; without this metro walks
      // the whole tree on every HMR cycle and hits Windows' EMFILE limit.
      // With this, only the icons we actually import enter the dep graph.
      //
      // We deliberately use the bare member name (no `dist/esm/...` prefix
      // and no `.mjs` extension). Tabler's `package.json` `exports` field
      // has a wildcard `"./*"` whose `require`/`import` mappings re-prefix
      // with `dist/cjs|esm/icons/`. If we hand it the full subpath, the
      // wildcard substitution doubles it (e.g. `dist/cjs/icons/dist/esm/icons/IconX.mjs.cjs`
      // — file doesn't exist; Metro falls back to file-based resolution
      // and spams ~50 warnings on startup). With the bare name the
      // wildcard resolves cleanly to `dist/cjs/icons/IconX.cjs` (RN's
      // require condition) — one file lookup, no warnings.
      [
        "transform-imports",
        {
          "@tabler/icons-react-native": {
            transform: "@tabler/icons-react-native/${member}",
            preventFullImport: true,
          },
        },
      ],
    ],
  }
}
