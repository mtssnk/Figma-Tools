/**
 * build.js
 *
 * 1. Reads UTOPIA_SPACING from .env, computes fluid spacing tokens, and
 *    writes them to tokens/utopia.json.
 * 2. Reads every tokens/*.json file, validates it against the shared
 *    collection schema, and compiles them all into a single generated
 *    block in plugin/code.js.
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
import { readFileSync, writeFileSync, readdirSync } from "fs";

dotenv.config();

const TOKENS_DIR = new URL("./tokens/", import.meta.url);
const CODE_PATH = new URL("./plugin/code.js", import.meta.url).pathname;
const SUPPORTED_TYPES = ["FLOAT", "STRING", "BOOLEAN", "COLOR"];

// ─── UTOPIA: COMPUTE FROM .env ─────────────────────────────────────────────

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

function computeUtopiaTokens({ minSize, maxSize, negCustom, posCustom }) {
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

function buildUtopiaCollection() {
  const UTOPIA_URL = process.env.UTOPIA_SPACING;
  if (!UTOPIA_URL) {
    console.error("❌ Missing UTOPIA_SPACING in .env");
    process.exit(1);
  }

  const config = parseUtopiaUrl(UTOPIA_URL);
  const tokens = computeUtopiaTokens(config);

  console.log("\n📐 Computed Utopia spacing tokens:\n");
  console.log("  Token     │ xs (min)   │ xl (max)");
  console.log("  ──────────┼────────────┼────────────");
  for (const [name, min, max] of tokens) {
    console.log(`  ${`space-${name}`.padEnd(10)} │  ${String(min).padStart(3)}px      │  ${String(max).padStart(3)}px`);
  }

  const collection = {
    name: "Utopia Spacing",
    modes: ["xl — 1280px", "xs — 480px"],
    variables: tokens.map(([name, xsPx, xlPx]) => ({
      name: `space-${name}`,
      type: "FLOAT",
      values: { "xl — 1280px": xlPx, "xs — 480px": xsPx },
      description: `xs: ${xsPx}px → xl: ${xlPx}px`,
    })),
  };

  writeFileSync(
    new URL("./utopia.json", TOKENS_DIR),
    JSON.stringify(collection, null, 2) + "\n",
  );
  console.log("\n✅ tokens/utopia.json updated.");

  return collection;
}

// ─── VALIDATE & COMPILE tokens/*.json ──────────────────────────────────────

function validateCollection(collection, filename) {
  const errors = [];

  if (!collection.name || typeof collection.name !== "string") {
    errors.push("missing string `name`");
  }
  if (!Array.isArray(collection.modes) || collection.modes.length === 0) {
    errors.push("`modes` must be a non-empty array");
  }
  if (!Array.isArray(collection.variables) || collection.variables.length === 0) {
    errors.push("`variables` must be a non-empty array");
  }

  if (errors.length === 0) {
    const seenNames = new Set();
    for (const variable of collection.variables) {
      const label = variable.name ?? "(unnamed)";

      if (!variable.name || typeof variable.name !== "string") {
        errors.push(`variable missing string \`name\``);
        continue;
      }
      if (variable.name.includes(".")) {
        errors.push(`"${label}": Figma variable names can't contain dots`);
      }
      if (seenNames.has(variable.name)) {
        errors.push(`"${label}": duplicate variable name in this collection`);
      }
      seenNames.add(variable.name);

      if (!SUPPORTED_TYPES.includes(variable.type)) {
        errors.push(`"${label}": type must be one of ${SUPPORTED_TYPES.join(", ")}`);
      }

      for (const mode of collection.modes) {
        if (!variable.values || !(mode in variable.values)) {
          errors.push(`"${label}": missing value for mode "${mode}"`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`❌ Invalid collection in tokens/${filename}:`);
    for (const err of errors) console.error(`   - ${err}`);
    process.exit(1);
  }
}

function readTokenCollections() {
  const files = readdirSync(TOKENS_DIR).filter((f) => f.endsWith(".json"));
  const collections = [];

  for (const filename of files) {
    const raw = readFileSync(new URL(filename, TOKENS_DIR), "utf-8");
    const collection = JSON.parse(raw);
    validateCollection(collection, filename);
    collections.push(collection);
  }

  return collections;
}

function patchCodeJs(collections) {
  let code = readFileSync(CODE_PATH, "utf-8");

  const newBlock = `// GENERATED — do not edit by hand; run: npm run build\nconst tokenCollections = ${JSON.stringify(collections, null, 2)};`;

  const re = /\/\/ GENERATED[^\n]*\nconst tokenCollections = \[[\s\S]*?\];/;

  if (!re.test(code)) {
    console.error("❌ Could not find the GENERATED tokenCollections block in plugin/code.js");
    process.exit(1);
  }

  code = code.replace(re, newBlock);
  writeFileSync(CODE_PATH, code);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

buildUtopiaCollection();

const collections = readTokenCollections();
patchCodeJs(collections);

console.log(`\n✅ plugin/code.js updated with ${collections.length} collection(s): ${collections.map((c) => c.name).join(", ")}.`);
console.log("Re-run the plugin in Figma to apply changes.\n");
