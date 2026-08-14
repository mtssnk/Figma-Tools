/**
 * Utopia Spacing → Figma Variables Import Script
 * ------------------------------------------------
 * Imports your Utopia fluid spacing tokens into Figma as a variable
 * collection with two modes: "xs — 480px" and "xl — 1280px".
 *
 * Usage:
 *   npm run preview   → dry run, logs payload without calling Figma
 *   npm run import    → pushes variables to Figma
 *
 * Source: https://utopia.fyi/space/calculator/?c=480,56,1.2,1280,98,1.25,5,2,
 *         &s=0.51|0.36|0.26|0.18,1.4|1.96|2.74|3.84,s-l
 * Min viewport: 480px (Tailwind "xs" breakpoint)
 * Max viewport: 1280px (Tailwind "xl" breakpoint)
 */

import dotenv from "dotenv";
dotenv.config();

// ─── CONFIG (from .env) ────────────────────────────────────────────────────

function extractFileKey(input) {
  try {
    const url = new URL(input.trim());
    const parts = url.pathname.split("/");
    const idx = parts.findIndex((p) => p === "design" || p === "file");
    if (idx !== -1) return parts[idx + 1];
  } catch {
    /* not a URL, use as-is */
  }
  return input.trim();
}

const FILE_KEY = extractFileKey(process.env.FILE_KEY ?? "");
const FIGMA_TOKEN = process.env.FIGMA_TOKEN ?? "";

if (!FILE_KEY || !FIGMA_TOKEN) {
  console.error("❌ Missing FILE_KEY or FIGMA_TOKEN in .env");
  process.exit(1);
}

// ─── TOKENS ────────────────────────────────────────────────────────────────
// Spacing tokens: [name, xsPx, xlPx]
// xs = 480px viewport, xl = 1280px viewport

const tokens = [
  ["5xs", 10, 18],
  ["4xs", 15, 25],
  ["3xs", 20, 35],
  ["2xs", 29, 50],
  ["xs", 40, 71],
  ["s", 56, 98],
  ["m", 78, 137],
  ["l", 110, 192],
  ["xl", 153, 269],
  ["2xl", 215, 376],
];

// ─── BUILD PAYLOAD ──────────────────────────────────────────────────────────

function buildPayload() {
  const payload = {
    variableCollections: [
      {
        action: "CREATE",
        id: "spacing-collection",
        name: "Spacing",
        initialModeId: "mode-xs",
      },
    ],
    variableModes: [
      {
        action: "CREATE",
        id: "mode-xs",
        name: "xs — 480px",
        variableCollectionId: "spacing-collection",
      },
      {
        action: "CREATE",
        id: "mode-xl",
        name: "xl — 1280px",
        variableCollectionId: "spacing-collection",
      },
    ],
    variables: [],
    variableModeValues: [],
  };

  for (const [name, xsPx, xlPx] of tokens) {
    const variableId = `spacing-${name}`;

    payload.variables.push({
      action: "CREATE",
      id: variableId,
      name: `space-${name}`,
      variableCollectionId: "spacing-collection",
      resolvedType: "FLOAT",
      description: `Utopia fluid space token. xs: ${xsPx}px → xl: ${xlPx}px`,
    });

    payload.variableModeValues.push(
      { variableId, modeId: "mode-xs", value: xsPx },
      { variableId, modeId: "mode-xl", value: xlPx },
    );
  }

  return payload;
}

// ─── PREVIEW ────────────────────────────────────────────────────────────────

function preview(payload) {
  console.log("\n📐 Spacing tokens to import:\n");
  console.log("  Token     │ xs (480px) │ xl (1280px)");
  console.log("  ──────────┼────────────┼────────────");
  for (const [name, xsPx, xlPx] of tokens) {
    console.log(
      `  space-${name.padEnd(4)} │  ${String(xsPx).padStart(3)}px      │  ${String(xlPx).padStart(3)}px`,
    );
  }
  console.log(`\n  ${tokens.length} tokens × 2 modes`);
  console.log("\n📦 Payload JSON:\n");
  console.log(JSON.stringify(payload, null, 2));
  console.log("\n✅ Dry run complete. Run npm run import to push to Figma.\n");
}

// ─── IMPORT ─────────────────────────────────────────────────────────────────

async function importToFigma(payload) {
  console.log("\n📐 Importing spacing tokens to Figma...");
  console.log(`   File:   ${FILE_KEY}`);
  console.log(`   Tokens: ${tokens.length} variables × 2 modes\n`);

  const response = await fetch(
    `https://api.figma.com/v1/files/${FILE_KEY}/variables`,
    {
      method: "POST",
      headers: {
        "X-Figma-Token": FIGMA_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("❌ Figma API error:", JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log("✅ Successfully imported spacing variables!\n");
  console.log("  Token     │ xs (480px) │ xl (1280px)");
  console.log("  ──────────┼────────────┼────────────");
  for (const [name, xsPx, xlPx] of tokens) {
    console.log(
      `  space-${name.padEnd(4)} │  ${String(xsPx).padStart(3)}px      │  ${String(xlPx).padStart(3)}px`,
    );
  }
  console.log(
    '\nOpen Figma → Local variables to see your new "Spacing" collection.',
  );
  console.log(
    'Switch between "xs — 480px" and "xl — 1280px" modes to see values change.\n',
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

const payload = buildPayload();

if (process.argv.includes("--preview")) {
  preview(payload);
} else {
  await importToFigma(payload);
}
