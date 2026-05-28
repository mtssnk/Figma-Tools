// ─── TAILWIND v4 SPACING SCALE ────────────────────────────────────────────
// name → px value (1 unit = 0.25rem = 4px at 16px base)
const tailwindTokens = [
  ["0",    0],
  ["px",   1],
  ["0_5",  2],
  ["1",    4],
  ["1_5",  6],
  ["2",    8],
  ["2_5",  10],
  ["3",    12],
  ["3_5",  14],
  ["4",    16],
  ["5",    20],
  ["6",    24],
  ["7",    28],
  ["8",    32],
  ["9",    36],
  ["10",   40],
  ["11",   44],
  ["12",   48],
  ["14",   56],
  ["16",   64],
  ["20",   80],
  ["24",   96],
  ["28",   112],
  ["32",   128],
  ["36",   144],
  ["40",   160],
  ["44",   176],
  ["48",   192],
  ["52",   208],
  ["56",   224],
  ["60",   240],
  ["64",   256],
  ["72",   288],
  ["80",   320],
  ["96",   384],
];

// ─── UTOPIA FLUID SPACING ─────────────────────────────────────────────────
// name → [xsPx at 480px viewport, xlPx at 1280px viewport]
// GENERATED — do not edit by hand; run: npm run build
const utopiaTokens = [
  ["5xs",  10,  18],
  ["4xs",  15,  25],
  ["3xs",  20,  35],
  ["2xs",  29,  50],
  ["xs",  40,  70],
  ["s",  56,  98],
  ["m",  78, 137],
  ["l", 110, 192],
  ["xl", 153, 269],
  ["2xl", 215, 376],
];

// ─── HELPERS ──────────────────────────────────────────────────────────────

function importTailwindSpacing() {
  console.log("[tailwind] creating collection...");
  const collection = figma.variables.createVariableCollection("Tailwind Spacing");
  const modeId = collection.defaultModeId;
  collection.renameMode(modeId, "Default");
  console.log("[tailwind] collection created, modeId:", modeId);

  for (const [name, px] of tailwindTokens) {
    try {
      console.log(`[tailwind] creating variable: "${name}" = ${px}`);
      const variable = figma.variables.createVariable(name, collection, "FLOAT");
      variable.setValueForMode(modeId, px);
      console.log(`[tailwind] ✓ "${name}"`);
    } catch (err) {
      console.error(`[tailwind] ✗ "${name}" failed:`, err.message);
      throw err;
    }
  }

  console.log("[tailwind] done");
}

function importUtopiaSpacing() {
  console.log("[utopia] creating collection...");
  const collection = figma.variables.createVariableCollection("Utopia Spacing");
  const xlModeId = collection.defaultModeId;
  collection.renameMode(xlModeId, "xl — 1280px");
  const xsModeId = collection.addMode("xs — 480px");
  console.log("[utopia] collection created, modes:", xlModeId, xsModeId);

  for (const [name, xsPx, xlPx] of utopiaTokens) {
    try {
      console.log(`[utopia] creating variable: "space-${name}"`);
      const variable = figma.variables.createVariable(`space-${name}`, collection, "FLOAT");
      variable.setValueForMode(xlModeId, xlPx);
      variable.setValueForMode(xsModeId, xsPx);
      variable.description = `xs: ${xsPx}px → xl: ${xlPx}px`;
      console.log(`[utopia] ✓ "space-${name}"`);
    } catch (err) {
      console.error(`[utopia] ✗ "space-${name}" failed:`, err.message);
      throw err;
    }
  }

  console.log("[utopia] done");
}

// ─── MAIN ─────────────────────────────────────────────────────────────────

try {
  console.log("=== Import Spacing Variables ===");
  importTailwindSpacing();
  importUtopiaSpacing();
  console.log("=== Complete ===");
  figma.notify("✅ Spacing variables imported successfully!");
} catch (err) {
  console.error("=== Failed ===", err.message);
  figma.notify("❌ " + err.message, { error: true });
} finally {
  figma.closePlugin();
}
