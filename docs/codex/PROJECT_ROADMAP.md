# Executive Summary

The IMS is now a broad internal management system covering Quality, HSE, Assets, Document Control, Actions, People, Admin/Settings, Management Review, and Risk. The core application shell, Supabase-backed data model, permission model, left workspace navigation, shared IMS visual primitives, and several module workflows are in place.

Quality Management is the strongest visual and workflow benchmark. HSE is the strongest benchmark for mobile/field workflows. The highest-value near-term work is demo hardening: verify critical workflows on Vercel, standardise remaining module layouts, reduce old local styling, and tighten permission/workflow edge cases without destabilising document numbering, revision history, or invite/auth flows.

# Completed

- Shared IMS shell with Enshore header, left workspace rail, role/module-aware navigation, and permission gating.
- Shared UI standards documented in `UI_STANDARDS.md`.
- Shared visual primitives exist for hero banners, KPI cards, section headers, top meta rows, tabs, panels, filter panels, buttons, and links.
- Quality dashboard has live KPI/story-style graphics and is the main layout benchmark.
- NCR is now NCR-only in visible UI, with register/create/report layout, clickable KPIs, Excel import, owner dropdown, filtered PDF, and linked Action creation.
- Audits have internal tabs, clickable KPIs, evidence upload/open/delete on findings, finding PDF/Word output, and People dropdown for internal lead auditor.
- MOC has improved detail panel, Section C/D/J/K layouts, PDF/Word output, People dropdowns, and linked Action generation.
- HSE dashboard has graphics/year filter.
- HSE AINM supports internal/external distinction, dashboard/register/create/import/report flows, generated report history, and central Action links.
- HSE inspections have a mobile-friendly flow, QR flow, item evidence upload, and multiple inspection forms staged/completed.
- Public HSE observation route `/observe` exists without login and links observations to Action Management.
- Quality/HSE module-specific actions feed central Action Management.
- Document Control is established as a central hub with asset-specific numbering support and document workflow foundations.
- Admin/Settings is simplified to Users & Access, Reference Data, and Audit Log.
- People Management exists as the source of person/dropdown records and is distinct from Admin login access.
- Admin invite/setup flow has been improved with session exchange, confirm password, saved permissions before invite, and Copy Setup Link fallback.
- People Management and Management Review are included in permission controls.
- Asset Reports now follows the Quality-style saved reports filter pattern with search, Show/Hide Filters, year filter, Clear Filters, and filtered report counts.
- Asset Dashboard KPI cards now drill into related Asset workspaces, and Asset Dashboard, Calibration, Inspection, Maintenance, and Reports use the shared IMS top meta/status row.
- Asset Inspection and Maintenance registers now use compact HSE Observation-style tables with shared filter panels, quick search, smaller Show/Hide Filters controls, filtered counts, row-click detail scroll, and linked Action controls preserved.
- Asset create/edit/delete/upload/action-generation handlers now include page-level permission guards across the main Asset register, Calibration, Inspection, Maintenance, Asset Actions, Asset People, and Asset Reports.
- Asset Calibration now generates linked central Action Management records through the same `/actions` prefill route used by Asset Inspection and Maintenance.
- Asset Calibration register now supports item availability/status (`In Use`, `Not In Use`, `Damaged`, `Missing / Lost`, `Historic`), defaults the register to active/non-historic items, keeps historic records drill-down traceability, exports the current register view to Excel, and excludes unavailable/non-in-use items from dashboard calibration compliance figures while showing an audit-friendly Availability / Exclusions story panel with drill-downs.
- Asset Calibration now has lifecycle reason capture and a retained item-status history log in the detail panel, plus persistent external supplier reference data for PASS Ltd, Northern Balance, and user-added suppliers.
- Asset Register, Calibration Register, Asset Actions, Asset People, and Asset Reports saved-report registers now use shared IMS filter/table primitives aligned to Quality/HSE register patterns.
- Asset Register Dashboard tab now uses a cleaner shared-panel layout with an even KPI strip, Due Watch, Quality Links, and Register Health panels.

# In Progress

- Asset Management Vercel workflow QA, mobile register review, role-based spot checks, and remaining low-risk primitive migration after the latest register standardisation, action-link, and permission hardening passes.
- HSE report parity with Quality Reports.
- HSE AINM register polish and detail-scroll behavior.
- HSE inspection PDF output consistency.
- Document Control workflow hardening, especially rejection fields and revision handling.
- Button-level create/edit/delete permission enforcement across modules.
- Admin/Settings detail panel polish and Vercel invite-flow verification.
- Report page migration from local style constants toward shared IMS primitives.
- Mobile responsiveness beyond the best-developed HSE inspection flow.
- Risk Management shell and workflows.

# Known Issues

- Document Control rejection fields need tightening: reject fields should only persist when Reject is clicked, and approve/review paths should clear rejection fields.
- Document Control revision history remains sensitive: historic revision names/dates/files must be preserved, and up-rev comments should be captured at the up-rev moment.
- Document numbering must remain locked and non-reused; reclassification must supersede/archive old documents and create new numbers.
- Some old migration-extracted document names, such as `Checker`, may need blanking unless they match People Management.
- Button-level permissions may not be fully hardened across every module.
- Admin invite flow still needs full Vercel verification, including Copy Setup Link, password setup, and permission application.
- Resend may rate-limit invite/notification email; Copy Setup Link is the workaround.
- `NEXT_PUBLIC_SITE_URL` should ideally be set to deployed site URL.
- AINM type dropdown should default to grey `Select Type`, not `Incident Report`.
- AINM register needs Show Filters pattern, Classification display, Accident/Incident filter, and direct scroll to detail panel.
- HSE Observation submit state needs verification so it changes to Submitted rather than remaining Submitting.
- HSE inspection PDFs need consistent header/footer and aligned tables.
- PTW exists but is parked/work in progress.
- Asset Management is closer to Quality/HSE after dashboard drill-down, calibration item availability/status controls, dashboard exclusion logic, top meta/status, reports filtering cleanup, Inspection/Maintenance register compaction, and page-level permission guards, but still needs Vercel workflow QA, mobile register review, and role-based spot checks.
- Some pages still use local style constants instead of `ImsPrimitives`.
- Risk Management exists as shell/functionality but needs review for maturity and consistency.

# Next Priorities

1. Verify Admin invite/setup flow on Vercel end to end: create user, set permissions, use Copy Setup Link, set password, confirm module/tab access.
2. Audit and harden button-level permissions across critical modules: Admin, Documents, Actions, Quality, HSE, and Assets.
3. Fix Document Control rejection-field persistence and approve/review cleanup behavior.
4. Review Document Control up-rev behavior to protect revision files, dates, comments, and current-revision archiving.
5. Verify Asset Management on Vercel with real data: Dashboard drill-downs, Register detail scroll, Calibration item status/exclusion behavior, lifecycle history, supplier dropdown persistence, register export, compact Inspection/Maintenance registers, Reports, uploads, PDFs, central Action links, and role-based permission behavior.
6. Bring HSE Reports fully in line with Quality Reports, including saved reports behavior and executive summary in PDFs.
7. Polish AINM register behavior: Show Filters, Classification column, Accident/Incident filter, Select Type default, and detail-panel scroll.
8. Verify HSE Observation public/mobile submit flow and register linkage to Action Management.
9. Align old local style blocks with shared IMS primitives when touching each page.
10. Review Risk Management pages for route completeness, visual consistency, and demo readiness.

# Future Enhancements

- PowerPoint export pack for leadership from Quality, HSE, Document Control, and Management Review.
- More CEO-facing Management Review story views and drill-down packs.
- Broader mobile/card register patterns across modules, based on HSE inspections.
- Further dashboard story panels for Assets, Risk, Actions, and Documents.
- More consistent PDF/Word header/footer templates across all generated outputs.
- Stronger linked-record chips across Actions, AINM, Observations, NCR, MOC, Audits, Assets, and Risk.
- Progressive migration of local style constants into shared primitives/theme extensions.
- Additional audit log coverage for sensitive Admin, Document Control, and permission changes.
- More robust notification usefulness for Document Control and action workflows.

# Module Status

## Quality Management

- Status: Complete
- Summary: Quality is the visual and workflow benchmark. Dashboard, NCR, Audits, MOC, Quality Actions, and Reports are implemented with live data, drill-downs, reports, evidence, People dropdowns, and central Action links.
- Outstanding Actions:
  - Preserve Quality as the reference layout.
  - Avoid reintroducing visible CAPA language into NCR unless explicitly requested.
  - Regression-test linked Action generation from NCR, MOC, and Audits before demos.
  - Gradually replace any remaining local styles with shared primitives when safe.

## HSE Management

- Status: In Progress
- Summary: HSE has broad coverage: Dashboard, AINM, Inspections, Observations, PTW, Actions, Calendar, and Reports. HSE inspections are the strongest mobile/field benchmark. AINM and reports need polish; PTW is parked.
- Outstanding Actions:
  - Finish AINM register polish and detail scroll.
  - Verify Observation submit state and action linkage.
  - Standardise HSE Reports against Quality Reports.
  - Align inspection PDFs with consistent header/footer/table formatting.
  - Avoid spending more time on PTW unless specifically requested.

## Asset Management

- Status: In Progress
- Summary: Asset module routes and records exist, including dashboard, register, calibration, inspection, maintenance, actions, people, reports, field route, and asset document ID support. Asset Dashboard drill-downs, Calibration item status/exclusion behavior, lifecycle history, supplier references, register export, shared top meta/status rows, compact Inspection/Maintenance registers, Inspection/Maintenance detail-scroll behavior, and Asset Reports saved-report filtering now align more closely with Quality/HSE.
- Outstanding Actions:
  - Verify Asset workflows on Vercel with real data, especially uploads, PDFs, Calibration item status/exclusion behavior, lifecycle history, supplier dropdown persistence, register export, compact Inspection/Maintenance registers, row-to-detail scroll, and dashboard/register drill-downs.
  - Spot-check create/edit/read-only permission behavior across Asset pages after deployment.
  - Continue low-risk migration of remaining local Asset panel/button/table styles toward shared IMS primitives.
  - Review mobile behavior of the compact Inspection/Maintenance registers after real-data testing.
  - Keep asset-specific document numbering compatible with Document Control.
  - Preserve links from Asset Inspection/Maintenance/Calibration to central Actions.

## Document Control

- Status: In Progress
- Summary: Document Control is a central IMS hub with company/system and asset-specific numbering, uploaded files, migration history, workflow foundations, email/notification APIs, and certification route. It is high value and high risk.
- Outstanding Actions:
  - Fix rejection-field persistence and cleanup.
  - Verify review/approval workflow and notification behavior.
  - Protect numbering, reclassification, storage, and revision history logic.
  - Confirm up-rev archives previous current revision and captures comments at the correct moment.
  - Clean bad migrated person placeholders only when they do not match People Management.

## Action Management

- Status: In Progress
- Summary: Central `/actions` route is preserved, with Quality/HSE/Assets/Risk module-specific action tabs feeding the central module. Linked record behavior and My Actions exist but need further testing.
- Outstanding Actions:
  - Verify linked source dropdowns for NCR, MOC, AINM, HSE Inspection, Observations, Asset Inspection/Maintenance/Calibration, and Risk.
  - Test linked chips/buttons open the correct record.
  - Confirm module-specific action tabs show the correct department/source filters.
  - Harden create/edit permissions because Actions can affect records across modules.

## People Management

- Status: Complete
- Summary: People Management is the source for person records and IMS dropdown values. Excel import exists, generated email logic exists, and the module is separate from Admin login users.
- Outstanding Actions:
  - Preserve distinction between People records and Admin user access.
  - Verify dropdown usage across NCR, Audits, MOC, Documents, and inspection/sign-off fields.
  - Review imported names for placeholder values such as `Checker`.

## Admin / Settings

- Status: In Progress
- Summary: Admin/Settings is simplified and focused on Users & Access, Reference Data, and Audit Log. Module/tab permissions, invite flow, and Copy Setup Link are implemented, but verification and permission hardening remain important.
- Outstanding Actions:
  - Verify invite/setup flow on Vercel.
  - Continue Users & Access detail panel polish.
  - Audit button-level create/edit/delete enforcement.
  - Never expose or print Supabase, Resend, OpenAI, or service-role secrets.
  - Keep `NEXT_PUBLIC_SITE_URL` aligned to deployed site where possible.

## Management Review

- Status: Needs Review
- Summary: A read-only executive snapshot and PDF export exist, with safe drill-down links. The desired direction is CEO-facing and business-story focused.
- Outstanding Actions:
  - Review current page against UI standards and executive/demo expectations.
  - Confirm drill-down targets remain safe and permission-aware.
  - Plan PowerPoint/export pack from Quality, HSE, Document Control, and Management Review as a future enhancement.

## Risk Management

- Status: Needs Review
- Summary: Risk routes and SQL exist for dashboard/register/reviews/controls/opportunities/actions/reports. The module is present as shell/functionality but is less documented than Quality/HSE/Assets/Documents.
- Outstanding Actions:
  - Review current Risk pages for data completeness, layout consistency, and demo readiness.
  - Ensure Risk Actions feed central Action Management correctly.
  - Align Risk register, reviews, controls, opportunities, and reports with UI standards.
  - Confirm route/page/tab permissions are complete.
