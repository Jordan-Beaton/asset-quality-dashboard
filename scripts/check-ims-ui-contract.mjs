import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const roots = ["app", "src"];
const sourceExtensions = new Set([".css", ".ts", ".tsx"]);
const approvedColours = new Set([
  "#000000",
  "#005670",
  "#53565A",
  "#63B1BC",
  "#D0D0CE",
  "#ECECE7",
  "#EEF7F8",
  "#F4F8F8",
  "#F93822",
  "#FFAD00",
  "#FFFFFF",
  // Dark mode only (see UI_STANDARDS.md "Dark Mode") — page/surface/border/muted-text tokens.
  "#0A1E24",
  "#10262D",
  "#234049",
  "#AEC4C9",
]);

const failures = [];

// Dark mode support (see docs/codex/UI_STANDARDS.md "Dark Mode") works by making
// `imsColours.ink/muted/panel/page/panelAlt/brandSoft` and the matching
// `var(--enshore-*)` custom properties resolve differently under
// `.ims-app-root[data-theme="dark"]`. `ink`/`muted` (text) go LIGHT in dark
// mode; `panel`/`page`/`panelAlt`/`brandSoft`/`surface`/`tint` (surfaces) go
// DARK. Pairing a themed text colour with a hardcoded surface colour (or the
// reverse) is the single bug class that kept recurring across the app during
// the dark-mode rollout — a style declares one half as theme-aware and
// leaves the other half a literal hex, so in dark mode one side inverts and
// the other doesn't, producing invisible/washed-out text. This check catches
// that pairing mistake anywhere in the codebase, in a single style
// declaration on one line (the dominant convention in this codebase for
// style constants) — it will not catch a background/color pair split across
// multiple lines of the same object literal.
const THEMED_TEXT = /\b(?:imsColours\.(?:ink|muted|slate)\b|var\(--enshore-(?:ink|muted)\))/;
const THEMED_SURFACE = /\b(?:imsColours\.(?:panel|page|panelAlt|brandSoft)\b|var\(--enshore-(?:surface|page|tint)\))/;
const SAFE_BACKGROUND = /^\s*(?:"transparent"|'transparent'|transparent|"none"|'none'|none)\s*$/i;
const HARDCODED_COLOUR = /#[0-9a-fA-F]{3,8}\b|\bwhite\b|\bblack\b/;
// Brand/accent/danger/warning/success never change between themes, so pairing
// them with a hardcoded literal on the other side is intentional, not a bug.
const THEME_STABLE_COLOUR = /\bimsColours\.(?:brand|brandDark|brandAccent|danger|dangerBright|warning|success|blue|purple)\b/;

function extractValue(line, prop) {
  const match = line.match(new RegExp(`\\b${prop}\\s*:\\s*([^,;}]+)`));
  return match ? match[1].trim() : null;
}

function checkThemeColourPairing(source, displayPath) {
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    if (!/\bcolor\s*:/.test(line) || !/\bbackground(?:Color)?\s*:/.test(line)) return;

    const colourValue = extractValue(line, "color");
    const backgroundValue = extractValue(line, "background(?:Color)?");
    if (!colourValue || !backgroundValue) return;
    if (SAFE_BACKGROUND.test(backgroundValue)) return;

    const colourIsThemedText = THEMED_TEXT.test(colourValue);
    const backgroundIsThemedSurface = THEMED_SURFACE.test(backgroundValue);

    if (colourIsThemedText && !backgroundIsThemedSurface && HARDCODED_COLOUR.test(backgroundValue)) {
      failures.push(
        `${displayPath}:${index + 1}: theme-aware text colour (${colourValue}) paired with a hardcoded background (${backgroundValue}) — goes invisible in dark mode. Use imsColours.panel/page or var(--enshore-surface/page) for the background instead.`
      );
      return;
    }

    if (backgroundIsThemedSurface && !colourIsThemedText && !THEME_STABLE_COLOUR.test(colourValue) && HARDCODED_COLOUR.test(colourValue)) {
      failures.push(
        `${displayPath}:${index + 1}: theme-aware surface background (${backgroundValue}) paired with a hardcoded text colour (${colourValue}) — goes invisible in dark mode. Use imsColours.ink/muted or var(--enshore-ink/muted) for the text colour instead.`
      );
    }
  });
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

for (const root of roots) {
  for (const file of await collectFiles(root)) {
    const source = await readFile(file, "utf8");
    const displayPath = relative(process.cwd(), file);
    const colours = source.match(/#[0-9a-f]{6}\b/gi) ?? [];
    for (const colour of new Set(colours.map((value) => value.toUpperCase()))) {
      if (!approvedColours.has(colour)) {
        failures.push(`${displayPath}: unapproved colour ${colour}`);
      }
    }

    if (/([>"'`{]\s*Refresh\s*[<"'`}])/.test(source)) {
      failures.push(`${displayPath}: standalone Refresh text is prohibited`);
    }

    if (/const\s+(?:register|programme)\w*BodyStyle[\s\S]{0,180}maxHeight:\s*["'`]\d+px["'`][\s\S]{0,100}overflowY:\s*["'`]auto["'`]/i.test(source)) {
      failures.push(`${displayPath}: register-specific vertical height/scroll cap is prohibited`);
    }

    if (/const\s+\w*(?:register|table)\w*WrapStyle[\s\S]{0,220}borderRadius:\s*["'`]16px["'`]/i.test(source)) {
      failures.push(`${displayPath}: register table wrappers must use the Observation benchmark 14px radius`);
    }

    if (/(?:selected\w*RowStyle|<tr[\s\S]{0,280}selected)[\s\S]{0,240}boxShadow:\s*["'`]inset\s+\d+px\s+0\s+0/i.test(source)) {
      failures.push(`${displayPath}: selected semantic rows must not paint an inset shadow on the full row; use the shared first-cell marker`);
    }

    checkThemeColourPairing(source, displayPath);
  }
}

if (failures.length > 0) {
  console.error("IMS UI contract check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nUse shared IMS primitives/tokens and docs/codex/UI_STANDARDS.md.");
  process.exit(1);
}

console.log("IMS UI contract check passed.");
