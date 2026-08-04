export type ImsPermissionArea = {
  key: string;
  label: string;
  routes: Array<{ path: string; match?: "exact" | "prefix" }>;
};

export type ImsPermissionModule = {
  moduleKey: string;
  label: string;
  legacyAccessField?: string;
  areas: ImsPermissionArea[];
};

export const IMS_PERMISSION_REGISTRY: ImsPermissionModule[] = [
  { moduleKey: "quality", label: "Quality Management", legacyAccessField: "quality_access", areas: [
    { key: "dashboard", label: "Dashboard", routes: [{ path: "/quality" }] },
    { key: "calendar", label: "Calendar", routes: [{ path: "/quality/calendar" }] },
    { key: "moc", label: "MOC", routes: [{ path: "/moc", match: "prefix" }] },
    { key: "ncr", label: "NCR", routes: [{ path: "/ncr-capa", match: "prefix" }] },
    { key: "audits", label: "Audits", routes: [{ path: "/audits", match: "prefix" }] },
    { key: "actions", label: "Actions", routes: [{ path: "/quality/actions", match: "prefix" }] },
    { key: "reports", label: "Reports", routes: [{ path: "/reports", match: "prefix" }] },
  ] },
  { moduleKey: "lessons", label: "Lessons Learned", areas: [
    { key: "workspace", label: "Lessons Learned Workspace", routes: [{ path: "/lessons-learned", match: "prefix" }] },
  ] },
  { moduleKey: "projects", label: "Project Management", areas: [
    { key: "projects", label: "Projects", routes: [{ path: "/projects" }] },
    { key: "wadden-sea", label: "Wadden Sea Dashboard", routes: [{ path: "/projects/wadden-sea" }] },
    { key: "itp", label: "Supplier ITP Programme", routes: [{ path: "/projects/wadden-sea/itp", match: "prefix" }] },
    { key: "noi", label: "NOI Register and Creator", routes: [{ path: "/projects/wadden-sea/noi", match: "prefix" }] },
    { key: "reports", label: "Project Reports and Open Points", routes: [{ path: "/projects/wadden-sea/reports", match: "prefix" }, { path: "/reports/project", match: "prefix" }] },
  ] },
  { moduleKey: "documents", label: "Document Control", legacyAccessField: "document_access", areas: [
    { key: "document-control", label: "Document Control", routes: [{ path: "/documents", match: "prefix" }] },
    { key: "certification", label: "Certification", routes: [{ path: "/certification", match: "prefix" }] },
  ] },
  { moduleKey: "hse", label: "HSE Management", legacyAccessField: "hse_access", areas: [
    { key: "dashboard", label: "Dashboard", routes: [{ path: "/hse" }] }, { key: "calendar", label: "Calendar", routes: [{ path: "/hse/calendar", match: "prefix" }] },
    { key: "ainm", label: "AINM", routes: [{ path: "/hse/ainm", match: "prefix" }] }, { key: "observations", label: "Observations", routes: [{ path: "/hse/observations", match: "prefix" }] },
    { key: "ptw", label: "PTW", routes: [{ path: "/hse/ptw", match: "prefix" }] }, { key: "inspections", label: "Inspections", routes: [{ path: "/hse/inspections", match: "prefix" }] },
    { key: "actions", label: "Actions", routes: [{ path: "/hse/actions", match: "prefix" }] }, { key: "reports", label: "Reports", routes: [{ path: "/hse/reports", match: "prefix" }] },
  ] },
  { moduleKey: "assets", label: "Asset Management", legacyAccessField: "asset_access", areas: [
    { key: "dashboard", label: "Dashboard", routes: [{ path: "/assets/dashboard", match: "prefix" }] }, { key: "register", label: "Asset Register", routes: [{ path: "/assets" }] },
    { key: "calibration", label: "Calibration", routes: [{ path: "/assets/calibration", match: "prefix" }] }, { key: "inspection", label: "Inspection", routes: [{ path: "/assets/inspection", match: "prefix" }] },
    { key: "maintenance", label: "Maintenance", routes: [{ path: "/assets/maintenance", match: "prefix" }] }, { key: "actions", label: "Actions", routes: [{ path: "/assets/actions", match: "prefix" }] },
    { key: "reports", label: "Reports", routes: [{ path: "/assets/reports", match: "prefix" }] },
  ] },
  { moduleKey: "risk", label: "Risk Management", legacyAccessField: "risk_access", areas: [
    { key: "dashboard", label: "Dashboard", routes: [{ path: "/risk" }] }, { key: "register", label: "Risk Register", routes: [{ path: "/risk/register", match: "prefix" }] },
    { key: "reviews", label: "Reviews", routes: [{ path: "/risk/reviews", match: "prefix" }] }, { key: "controls", label: "Controls", routes: [{ path: "/risk/controls", match: "prefix" }] },
    { key: "opportunities", label: "Opportunities", routes: [{ path: "/risk/opportunities", match: "prefix" }] }, { key: "actions", label: "Actions", routes: [{ path: "/risk/actions", match: "prefix" }] },
    { key: "reports", label: "Reports", routes: [{ path: "/risk/reports", match: "prefix" }] },
  ] },
  { moduleKey: "actions", label: "Action Management", legacyAccessField: "action_access", areas: [
    { key: "register", label: "Action Register", routes: [{ path: "/actions", match: "prefix" }] },
  ] },
  { moduleKey: "management-review", label: "Management Review", legacyAccessField: "management_review_access", areas: [
    { key: "dashboard", label: "Management Review", routes: [{ path: "/management-review", match: "prefix" }] },
  ] },
  { moduleKey: "people", label: "People Management", legacyAccessField: "people_access", areas: [
    { key: "register", label: "People Register", routes: [{ path: "/people", match: "prefix" }] },
  ] },
  { moduleKey: "admin", label: "Admin / Settings", legacyAccessField: "admin_access", areas: [
    { key: "users", label: "Users & Access", routes: [{ path: "/admin" }] }, { key: "reference", label: "Reference Data", routes: [{ path: "/admin/reference", match: "prefix" }] },
    { key: "audit", label: "Audit Log", routes: [{ path: "/admin/audit", match: "prefix" }] },
  ] },
];

export function getPermissionTargetFromPath(pathname: string) {
  const candidates = IMS_PERMISSION_REGISTRY.flatMap((module) => module.areas.flatMap((area) => area.routes.map((route) => ({ moduleKey: module.moduleKey, areaKey: area.key, route }))));
  return candidates
    .filter(({ route }) => route.match === "prefix" ? pathname === route.path || pathname.startsWith(`${route.path}/`) : pathname === route.path)
    .sort((a, b) => b.route.path.length - a.route.path.length)[0] || null;
}
