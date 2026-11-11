// A short record of the IMS screens a person has moved through in this browser tab, so the Back button at the top of a page
// can return to the screen they came from (with its filters) instead of always going to IMS Home.
// It lives in sessionStorage, so it is private to the tab and disappears when the tab is closed.

const STORAGE_KEY = "ims-nav-stack";
const MAX_ENTRIES = 30;
const BACK_INTENT_KEY = "ims-nav-back";
const BACK_INTENT_WINDOW_MS = 5000;
export const NAV_CHANGE_EVENT = "ims-nav-change";

// Pages reached from an email link or without the IMS shell never become somewhere to "go back to".
const UNTRACKED_PREFIXES = [
  "/login",
  "/invite",
  "/observe",
  "/documents/workflow-action",
  "/documents/bulk-review",
  "/projects/itp-sign-off-action",
  "/moc/signoff-action",
  "/hse/ainm/signoff-action",
];

const ROUTE_LABELS: Record<string, string> = {
  "/home": "IMS Home",
  "/field-tools": "Field Tools",
  "/actions": "Central Actions",
  "/quality": "Quality Dashboard",
  "/quality/calendar": "Quality Calendar",
  "/quality/actions": "Quality Actions",
  "/moc": "MOC",
  "/ncr-capa": "NCR / CAPA",
  "/audits": "Audits",
  "/reports": "Reports",
  "/reports/project": "Project Reports",
  "/lessons-learned": "Lessons Learnt",
  "/management-review": "Management Review",
  "/inspections": "Overall Inspections",
  "/documents": "Document Control",
  "/certification": "Certification",
  "/guides": "Process Guides",
  "/assets": "Asset Register",
  "/assets/dashboard": "Asset Dashboard",
  "/assets/calibration": "Calibration",
  "/assets/inspection": "Asset Inspections",
  "/assets/maintenance": "Maintenance",
  "/assets/print-requests": "3D Print Requests",
  "/assets/actions": "Asset Actions",
  "/assets/reports": "Asset Reports",
  "/assets/people": "Asset People",
  "/assets/field": "Asset Field Access",
  "/risk": "Risk Dashboard",
  "/risk/register": "Risk Register",
  "/risk/reviews": "Risk Reviews",
  "/risk/controls": "Risk Controls",
  "/risk/opportunities": "Opportunities",
  "/risk/actions": "Risk Actions",
  "/risk/reports": "Risk Reports",
  "/hse": "HSE Dashboard",
  "/hse/calendar": "HSE Calendar",
  "/hse/ainm": "AINM",
  "/hse/observations": "HSE Observations",
  "/hse/ptw": "Permits to Work",
  "/hse/inspections": "HSE Inspections",
  "/hse/actions": "HSE Actions",
  "/hse/reports": "HSE Reports",
  "/hse/environmental": "Environmental",
  "/hse/incidents": "Incidents",
  "/hse/risk-assessments": "Risk Assessments",
  "/admin": "Admin Console",
  "/people": "People",
  "/speak-up/cases": "Speak Up Cases",
  "/projects": "Projects",
  "/projects/wadden-sea": "Wadden Sea",
  "/projects/wadden-sea/reports": "Wadden Sea Reports",
  "/projects/baltic-power": "Baltic Power",
};

const PROJECT_PAGE_LABELS: Array<[RegExp, string]> = [
  [/^\/projects\/[^/]+\/itp$/, "ITP Tracker"],
  [/^\/projects\/[^/]+\/itp-sign-off$/, "ITP Sign-off"],
  [/^\/projects\/[^/]+\/noi$/, "NOI Tracker"],
  [/^\/projects\/[^/]+\/noi\/create$/, "NOI Creator"],
  [/^\/projects\/[^/]+\/review-points$/, "Review Points"],
  [/^\/projects\/[^/]+\/inspection-records$/, "Inspection Records"],
];

export function pathOnly(path: string) {
  return path.split("?")[0].split("#")[0];
}

export function isTrackedPath(path: string) {
  const pathname = pathOnly(path);
  return !UNTRACKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function labelForPath(path: string) {
  const pathname = pathOnly(path).replace(/\/+$/, "") || "/";
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  for (const [pattern, label] of PROJECT_PAGE_LABELS) if (pattern.test(pathname)) return label;
  if (pathname.startsWith("/admin/")) return "Admin / Settings";
  return "Previous Screen";
}

function readStack(): string[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack.slice(-MAX_ENTRIES)));
  } catch {
    // Private windows can refuse storage. Back then simply falls back to IMS Home.
  }
}

// Called when the person presses the Back button (ours or the browser's), so the next screen counts as going back.
export function markBackIntent() {
  try {
    window.sessionStorage.setItem(BACK_INTENT_KEY, String(Date.now()));
  } catch {
    // Without storage Back simply behaves like a normal visit.
  }
}

function consumeBackIntent() {
  try {
    const raw = window.sessionStorage.getItem(BACK_INTENT_KEY);
    window.sessionStorage.removeItem(BACK_INTENT_KEY);
    return raw !== null && Date.now() - Number(raw) < BACK_INTENT_WINDOW_MS;
  } catch {
    return false;
  }
}

// Notes that the person is now on `path`. Safe to call repeatedly for the same screen.
export function recordVisit(path: string) {
  if (typeof window === "undefined" || !isTrackedPath(path)) return;

  const stack = readStack();
  const top = stack[stack.length - 1];
  if (top === path) return;

  if (top && pathOnly(top) === pathOnly(path)) {
    // Same screen with different filters: keep one entry and remember the latest state.
    stack[stack.length - 1] = path;
  } else if (stack.length >= 2 && (stack[stack.length - 2] === path || (pathOnly(stack[stack.length - 2]) === pathOnly(path) && consumeBackIntent()))) {
    // Returning to the screen before this one (the same address, or our Back button) drops this one, so Back never loops.
    // A plain link to an earlier screen with different filters is a new visit and is kept.
    stack.pop();
    stack[stack.length - 1] = path;
  } else {
    stack.push(path);
  }

  writeStack(stack);
  window.dispatchEvent(new Event(NAV_CHANGE_EVENT));
}

// Called when a page rewrites its own address (for example after a filter changes), so Back returns to the latest state.
export function syncCurrentVisit(path: string) {
  if (typeof window === "undefined" || !isTrackedPath(path)) return;
  const stack = readStack();
  const top = stack[stack.length - 1];
  if (top && pathOnly(top) === pathOnly(path) && top !== path) {
    stack[stack.length - 1] = path;
    writeStack(stack);
  }
}

// The screen before the current one, or null when there is none (for example a page opened from an email link).
export function previousVisit(currentPath: string): string | null {
  if (typeof window === "undefined") return null;
  const stack = readStack();
  const top = stack[stack.length - 1];
  const previous = top && pathOnly(top) === pathOnly(currentPath) ? stack[stack.length - 2] : top;
  if (!previous || pathOnly(previous) === pathOnly(currentPath)) return null;
  return previous;
}
