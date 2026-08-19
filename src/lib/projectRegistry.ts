export interface ProjectConfig {
  label: string;
  abbreviation: string;
  sequenceFloor: number;
  scopeOptions: string[];
  tabs: Array<"dashboard" | "itp" | "noi" | "noi-creator" | "inspection-records" | "reports" | "itp-sign-off">;
}

export const projects: Record<string, ProjectConfig> = {
  "baltic-power": {
    label: "Baltic Power",
    abbreviation: "BLP",
    sequenceFloor: 0,
    scopeOptions: ["Trencher", "Barge"],
    tabs: ["dashboard", "itp", "noi", "noi-creator", "inspection-records", "itp-sign-off"],
  },
  "wadden-sea": {
    label: "Wadden Sea",
    abbreviation: "WSP",
    sequenceFloor: 3,
    scopeOptions: ["Trencher", "Barge"],
    tabs: ["dashboard", "itp", "noi", "noi-creator", "inspection-records", "reports", "itp-sign-off"],
  },
};

export function getProject(key: string): ProjectConfig {
  return (
    projects[key] ?? {
      label: key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      abbreviation: key.toUpperCase().slice(0, 3),
      sequenceFloor: 0,
      scopeOptions: ["Trencher", "Barge"],
      tabs: ["dashboard", "itp", "noi", "noi-creator", "inspection-records", "itp-sign-off"],
    }
  );
}
