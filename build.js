/**
 * build.js
 * Reads UTOPIA_SPACING from .env, computes spacing tokens from the URL
 * parameters, and writes them into plugin/code.js.
 *
 * Usage: npm run build
 *
 * Utopia URL format:
 *   ?c=minWidth,minSize,minScale,maxWidth,maxSize,maxScale,positiveSteps,negativeSteps
 *   &s=negCustomMultipliers,posCustomMultipliers,pairSteps
 *
 * e.g. c=480,56,1.2,1280,98,1.25,5,2&s=0.51|0.36|0.26|0.18,1.4|1.96|2.74|3.84,s-l
 */

import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";

dotenv.config();

const UTOPIA_URL = process.env.UTOPIA_SPACING;
if (!UTOPIA_URL) {
  console.error("❌ Missing UTOPIA_SPACING in .env");
  process.exit(1);
}

// ─── PARSE URL ─────────────────────────────────────────────────────────────

function parseUtopiaUrl(urlString) {
  const url = new URL(urlString.trim());

  const c = url.searchParams.get("c").split(",").map(Number);
  const minSize = c[1];
  const maxSize = c[4];

  const s = url.searchParams.get("s").split(",");
  // negCustom in URL order: largest multiplier first (closest to base)
  const negCustom = s[0] ? s[0].split("|").map(Number) : [];
  // posCustom in URL order: smallest multiplier first (closest to base)
  const posCustom = s[1] ? s[1].split("|").map(Number) : [];

  return { minSize, maxSize, negCustom, posCustom };
}

// ─── COMPUTE TOKENS ────────────────────────────────────────────────────────

function computeTokens({ minSize, maxSize, negCustom, posCustom }) {
  const tokens = [];

  // Custom negative steps — sort ascending so we name them from furthest to closest:
  // multipliers [0.51, 0.36, 0.26, 0.18] → sorted [0.18, 0.26, 0.36, 0.51]
  // named 5xs, 4xs, 3xs, 2xs (2xs is the one closest to base)
  const negSorted = [...negCustom].sort((a, b) => a - b);
  for (let i = 0; i < negSorted.length; i++) {
    const m = negSorted[i];
    const name = `${negSorted.length - i + 1}xs`;
    tokens.push([name, Math.round(minSize * m), Math.round(maxSize * m)]);
  }

  // xs — one regular step below base, approximated as base / firstPosMultiplier
  const firstPos = posCustom[0];
  tokens.push(["xs", Math.round(minSize / firstPos), Math.round(maxSize / firstPos)]);

  // Base
  tokens.push(["s", Math.round(minSize), Math.round(maxSize)]);

  // Custom positive steps: m, l, xl, 2xl, …
  const posNames = ["m", "l", "xl", "2xl", "3xl", "4xl", "5xl"];
  for (let i = 0; i < posCustom.length; i++) {
    tokens.push([posNames[i], Math.round(minSize * posCustom[i]), Math.round(maxSize * posCustom[i])]);
  }

  return tokens;
}

// ─── PATCH code.js ─────────────────────────────────────────────────────────

function patchCodeJs(tokens) {
  const codePath = new URL("./plugin/code.js", import.meta.url).pathname;
  let code = readFileSync(codePath, "utf-8");

  const rows = tokens
    .map(([name, min, max]) => `  ["${name}", ${String(min).padStart(3)}, ${String(max).padStart(3)}],`)
    .join("\n");

  const newBlock = `// GENERATED — do not edit by hand; run: npm run build\nconst utopiaTokens = [\n${rows}\n];`;

  // Replace the block between the two sentinel comments (or the array declaration itself)
  const updated = code.replace(
    /\/\/ GENERATED[^\n]*\nconst utopiaTokens = \[[\s\S]*?\];|const utopiaTokens = \[[\s\S]*?\];/,
    newBlock,
  );

  if (updated === code) {
    console.error("❌ Could not find utopiaTokens array in plugin/code.js");
    process.exit(1);
  }

  writeFileSync(codePath, updated);
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

const config = parseUtopiaUrl(UTOPIA_URL);
const tokens = computeTokens(config);

console.log("\n📐 Computed Utopia spacing tokens:\n");
console.log("  Token     │ xs (min)   │ xl (max)");
console.log("  ──────────┼────────────┼────────────");
for (const [name, min, max] of tokens) {
  console.log(`  ${`space-${name}`.padEnd(10)} │  ${String(min).padStart(3)}px      │  ${String(max).padStart(3)}px`);
}

patchCodeJs(tokens);
console.log("\n✅ plugin/code.js updated. Re-run the plugin in Figma to apply changes.\n");
