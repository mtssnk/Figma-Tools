# figma-tools

Figma plugin + build tooling that imports spacing design tokens into Figma as variable collections.

## What it does

Creates two variable collections in a Figma file:

- **Tailwind Spacing** — full Tailwind v4 scale (0–96), single "Default" mode, fixed px values
- **Utopia Spacing** — fluid spacing tokens from [Utopia](https://utopia.fyi), two modes: "xs — 480px" and "xl — 1280px"

## Project structure

```
.env                  # UTOPIA_SPACING URL (only config needed)
build.js              # Parses .env URL → rewrites utopiaTokens in plugin/code.js
plugin/
  manifest.json       # Figma plugin manifest
  code.js             # Plugin code (runs inside Figma sandbox)
```

## Workflow

### Updating Utopia spacing tokens

1. Adjust settings at [utopia.fyi/space/calculator](https://utopia.fyi/space/calculator)
2. Copy the full URL into `.env` as `UTOPIA_SPACING`
3. Run `npm run build` — this rewrites the `utopiaTokens` array in `plugin/code.js`
4. Re-run the plugin in Figma to apply

### Running the plugin in Figma

1. In Figma: **Plugins → Development → Import plugin from manifest...**
2. Select `plugin/manifest.json`
3. Run via **Plugins → Development → Import Spacing Variables**

The plugin creates both collections in a single run. If collections already exist from a previous run, delete them in Figma first before re-running.

## Key constraints

- **Figma Plugin API does not allow dots in variable names.** Tailwind fractional values use underscores instead: `0_5`, `1_5`, `2_5`, `3_5`.
- **The Figma REST API requires a Professional plan** for `file_variables:write`. The plugin approach works on all plans.
- `plugin/code.js` runs in Figma's sandbox — it has no access to the filesystem or `.env`. Only `build.js` reads `.env`.
- The `utopiaTokens` array in `plugin/code.js` is generated — do not edit it by hand. The sentinel comment `// GENERATED` marks the block that `build.js` replaces.

## .env

```
UTOPIA_SPACING = <utopia calculator URL>
```

No API tokens required.
