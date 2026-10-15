// The projects an observation card can be raised against. Choosing from a list (instead of
// typing) keeps the Project column in the register consistent. The first group is fixed in
// code; signed-in users can add more, which are stored in public.hse_observation_projects.

export const defaultObservationProjects = [
  "Inch Cape: ENS24-011",
  "Wadden Sea: ENS25-012",
  "MOG2: ENS25-014",
  "Baltic Power: ENS26-017",
  "Blyth Base",
  "External Office(s)",
];

export function cleanProjectText(value: unknown, maxLength = 80) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

// "Baltic Power: ENS26-017" -> "baltic power"; used to spot a project that is already listed
// under the same name, whatever its number or capitalisation.
export function projectNameKey(label: string) {
  return cleanProjectText(label.split(":")[0]).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildProjectLabel(name: string, number: string) {
  const cleanName = cleanProjectText(name, 60);
  const cleanNumber = cleanProjectText(number, 24);
  return cleanNumber ? `${cleanName}: ${cleanNumber}` : cleanName;
}

export function mergeProjectLists(...lists: string[][]) {
  const seen = new Set<string>();
  const merged: string[] = [];
  lists.flat().forEach((label) => {
    const cleaned = cleanProjectText(label);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) return;
    seen.add(key);
    merged.push(cleaned);
  });
  return merged;
}
