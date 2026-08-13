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
]);

const failures = [];

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
  }
}

if (failures.length > 0) {
  console.error("IMS UI contract check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nUse shared IMS primitives/tokens and docs/codex/UI_STANDARDS.md.");
  process.exit(1);
}

console.log("IMS UI contract check passed.");
