// The shape of one project in the shared project list, and the list used only when the database list cannot be read
// (for example before scripts/sql/project_registry.sql has been run). The real list lives in the database.

export type RegistryProject = {
  key: string;
  name: string;
  type: string;
  active: boolean;
  mocPrefix: string | null;
  parts: string[];
  mocCount: number;
};

export const FALLBACK_PROJECTS: RegistryProject[] = [
  { key: "wadden-sea", name: "Wadden Sea", type: "Project", active: true, mocPrefix: "NEX", parts: ["BA3", "LW2", "LW4"], mocCount: 0 },
  { key: "baltic-power", name: "Baltic Power", type: "Project", active: true, mocPrefix: "BAL", parts: [], mocCount: 0 },
];

// Keys that would collide with fixed addresses under /projects.
export const RESERVED_PROJECT_KEYS = new Set(["itp-sign-off-action", "inspections", "new", "create", "api"]);

export function slugifyProjectName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function cleanParts(input: unknown): string[] {
  const list = Array.isArray(input) ? input : String(input ?? "").split(",");
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const raw of list) {
    const part = String(raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9 _/&-]/g, "").slice(0, 12).trim();
    if (part && part !== "ALL" && !seen.has(part)) {
      seen.add(part);
      parts.push(part);
    }
  }
  return parts.slice(0, 20);
}
