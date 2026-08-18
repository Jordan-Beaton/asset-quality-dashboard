# Executive Summary

The IMS is now a broad internal management system covering Quality, HSE, Assets, Document Control, Actions, People, Admin/Settings, Management Review, and Risk. The core application shell, Supabase-backed data model, permission model, left workspace navigation, shared IMS visual primitives, and several module workflows are in place.

The whole-IMS visual and structural baseline is complete. Quality remains the workflow benchmark, the HSE Observation Register is the register-structure benchmark, Project ITP remains the editable programme benchmark, and HSE inspections remain the mobile/field benchmark. The highest-value near-term work is production workflow and permission QA without destabilising document numbering, revision history, invite/auth flows, or the completed UI contract.

# Completed

- Shared IMS shell with Enshore header, left workspace rail, role/module-aware navigation, and permission gating.
- Shared UI standards documented in `UI_STANDARDS.md`.
- Whole-IMS visual and structural standardisation completed across dashboards, tabs, registers, filters, forms, detail panels, outputs and meta/status rows; the permanent acceptance record is `IMS_UI_AUDIT_2026-08-10.md`.
- Interactive dashboard alignment completed on 11 August 2026 across Quality, HSE, Assets, Risk, Wadden Sea and embedded IMS dashboard tabs: command views reduce first-screen clutter, reporting controls sit with dashboard navigation, charts use the shared high-contrast analytics contract, and KPI tiers retain consistent separation and drill-down behaviour.
- Automated `npm run check:ui` guard rejects unapproved interface colours and reintroduced standalone Refresh controls. `npm run check` runs this contract, application lint, and the production build. Whole-repository `npm run lint` separately retains the known standalone deck/capture utility findings until those utilities are modernised.
- The full IMS colour system now uses the approved 2026 Enshore palette across the shared shell, operational modules, mobile/field routes, charts, QR codes, notifications, generated outputs, and Admin defaults; restricted HSE 3Rs green and RapidScan purple are excluded from general IMS use.
- Official 2026 Enshore primary colour/reverse logo artwork is now canonical across the IMS and generated PDF/Word outputs, with fixed 2:1 fitting, protected clear space, compliant minimum print sizing, and the HSE Observation 3Rs campaign logo preserved as the sole approved exception.
- IMS Home is now a dedicated permission-aware launchpad with a compact Enshore dark-blue animated header, synchronized official outline-logo video treatments, equal-size workspace cards, pronounced hover interactions, and six selectable access layouts: Card grid, Spotlight, Compact tiles, List, Two columns, and IMS hub. The selected layout persists locally between browser sessions.
- Shared visual primitives exist for hero banners, KPI cards, section headers, top meta rows, tabs, panels, filter panels, buttons, and links.
- Whole-IMS phone compatibility now has a shared foundation: compact header and bottom navigation, single-column forms/grids, constrained media and overflow, touch-sized controls, phone-only collapsible panels, and automatic labelled register cards with expandable secondary fields. Desktop layouts remain unchanged above the mobile breakpoint.
- IMS Home uses a fixed simple workspace list on phones with no view selector, while desktop retains the six selectable layouts. Main return links are standardised to `Back to IMS Home` and `/home`; contextual project/submodule return links remain specific.
- Quality dashboard has live KPI/story-style graphics and is the main layout benchmark.
- NCR is now NCR-only in visible UI, with register/create/report layout, clickable KPIs, Excel import, owner dropdown, filtered PDF, and linked Action creation.
- Audits have internal tabs, clickable KPIs, evidence upload/open/delete on findings, finding PDF/Word output, and People dropdown for internal lead auditor.
- MOC has improved detail panel, Section C/D/J/K layouts, PDF/Word output, People dropdowns, and linked Action generation.
- HSE dashboard has graphics/year filter.
- HSE AINM supports internal/external distinction, dashboard/register/create/import/report flows, generated report history, Part 1 containment capture, attachment `Other` detail, inline department-controlled central Action creation, and linked actions in Part 2 Word/compiled PDF outputs.
- HSE inspections have a mobile-friendly flow, QR flow, item evidence upload, and multiple inspection forms staged/completed.
- Public HSE observation route `/observe` exists without login and links observations to Action Management.
- The public HSE Observation Card now has an explicit phone layout: full-width public container, corrected page margins, compact header/cards, two-column reporter choices, full-width form controls, and no horizontal overflow at the tested `390px` viewport. Desktop behavior remains unchanged.
- The public HSE Observation Card now accumulates multiple photos/supporting files across repeated picker or phone-camera selections, displays the queued attachments with individual removal, and submits every queued file as a separate evidence record with collision-safe batch storage paths.
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
- Central Action Management now has explicit page-level create/edit permission guards for manual creation, bulk import, action edits/deletes, and evidence upload/delete, with matching disabled write controls.
- Document Control now has explicit page-level create/edit permission guards for draft creation, save, workflow transitions, approval/rejection, delete, controlled file upload/remove, up-rev, and supersede/replacement creation, with matching disabled write controls.
- Quality Actions, Quality Reports, NCR/CAPA, Audits, and MOC now have explicit page-level create/edit permission guards on core write paths, including create/import, edit/delete, evidence/file changes, workflow progression, and saved-report/PDF metadata writes where applicable.
- HSE Actions and HSE Reports now have explicit page-level create/edit permission guards for direct action/report creation, import, edits, and deletes.
- HSE AINM now has explicit page-level create/edit permission guards for internal/external AINM creation/import, saves/deletes, evidence upload/delete, reviewer creation, and saved compiled PDF history writes.
- HSE Observations public submit handling now exits the `Submitting` state on failed requests, supports repeated multi-photo selection without replacing earlier camera captures, and retains secured review/delete/action-generation permission guards.
- HSE Inspections now have explicit page-level create/edit permission guards for inspection creation, saves/deletes, existing and staged evidence changes, and linked HSE Action creation shortcuts.
- HSE Reports now aligns more closely with Quality Reports, including shared hero/context cards, saved-report search and year filtering, snapshot-based saved report period editing, and executive summary output in PDFs.
- HSE Inspection PDFs now reserve header/footer space for generated tables and apply consistent Enshore header, revision reference, and page numbering across completed and blank PDFs.
- Admin / Settings now has explicit page-level create/edit permission guards for user invites, existing user access changes, setup/reset links, role defaults, company settings, and reference data creation.
- Risk Register now has explicit page-level create/edit permission guards for risk creation, edits, and deletes, with register PDF generation left available as read-only output.
- Asset spot-check pass aligned remaining visible write controls with existing page-level guards across Asset Actions, People, Inspection, Maintenance, and Calibration.
- Project Management now includes a standardised Wadden Sea workspace with Dashboard, ITP Tracker, NOI Tracker, NOI Creator, and Project Reports tabs.
- The Wadden Sea ITP Tracker retains controlled current revisions and archived revision history, stores source documents, supports compact editable registers, and extracts document metadata.
- The Project NOI register supports structured/OCR extraction of Client, Enshore, Contractor and equivalent W/H points across varied supplier ITP layouts, manual point entry, supplier/ITP/title/type/status filtering, planned dates, assigned people, and filtered PDF output.
- NOI Creator generates multi-point controlled ENS-HSEQ-FRM-074 Word and matching one-page PDF outputs, assigns sequential NOI numbers, stores editable form data and generated files, synchronises inspection dates with tracker planned dates, and supports reopen/edit/download/delete workflows.
- Wadden Sea Project Reports consolidate Audit NCR, Audit Programme, and eight-week lookahead outputs, with the NOI register retained as the primary lookahead data source and Excel upload retained as a fallback.
- Project ITP extraction now uses shared authority/identifier/activity rules, recognises Baltic Power Employer Surveillance and Task # layouts, excludes MWS and supplier-side columns, returns transparent scan diagnostics, and supports saved template-fingerprint mappings for unfamiliar future layouts.
- Lessons Learnt is live as a central searchable knowledge repository with controlled Project/People/Asset references, repeat-theme linkage, interactive analytics, cumulative filters, evidence, large-register support and a rotating “What We’ve Learnt” insight.
- Field Tools now provides a permission-aware `Capture a Lesson` launcher into a compact Lessons Learnt field mode with essential-first entry, expandable optional detail, photo/file evidence and repeat-capture behavior; the desktop workspace remains unchanged.
- Wadden Sea Project Reports now include a dedicated Open Points dashboard/register aligned to `CA_Act_1699`, with simplified entry, People-linked raiser/owner fields, controlled phase creation/history, NCR linkage, evidence, client-copy tracking, deadline/closure controls and aligned Excel/Word/PDF outputs.
- Admin permission definitions and route enforcement now share `src/lib/imsPermissionRegistry.ts`. Lessons Learnt and Project Management are independent generic permission modules, and future registered modules/tabs automatically appear in Users & Access without new per-module database columns.
- Project Management now uses a shared component architecture driven by a central project registry (`src/lib/projectRegistry.ts`). All common feature tabs — ITP Tracker, NOI Tracker, NOI Creator, ITP Sign-Off — route through `app/projects/[projectKey]/` dynamic routes, eliminating duplicated code between Baltic Power and Wadden Sea. Adding a new project requires only a registry entry and a bespoke dashboard page.
- NOI Tracker now exports to both PDF and styled Excel. The Excel export includes Enshore brand colours (teal `#005670` header with white text, alternating `#ECECE7` row tints), AutoFilter on every column (Supplier, ITP Number, Status, etc.), a frozen header row, and respects the active filtered view.
- All user-visible “Lessons Learned” labels, headings, field labels, nav items, and messages renamed to “Lessons Learnt” across the IMS. Technical identifiers (database tables, columns, storage buckets, URL paths, code variables) are unchanged.
- Login now supports controlled self-service access requests without self-registration. Requests are limited to Enshore email addresses, use Admin reference departments and the permission registry, appear on Master Admin Home and in Users & Access, and remain Pending until Admin prepares/rejects them.
- IMS email notifications now route through `Document Control <documents@enshoresubsea.com>` via Resend across all three email flows: document notifications, document workflow actions, and ITP sign-off. The `DOCUMENT_NOTIFICATIONS_FROM_EMAIL` env var is updated in both `.env.local` and Vercel. Email will be fully live once IT (Adam Shaw) confirms Bondgate have added the two required DNS records (`resend._domainkey` TXT and `send` MX) to the `enshoresubsea.com` domain. Resend domain status was `not_started` as of 18 Aug 2026.
- Whole-IMS detail panel visual standardisation completed: all IMS module detail panels now use the tinted gradient background (`linear-gradient(180deg, #ffffff 0%, #ECECE7 100%)`), consistent border, border-radius, padding, and box-shadow matching the Audit Findings reference standard. Bold text in form field values resolved across all modules via a global CSS fix in `globals.css`.

# In Progress

- Asset Management Vercel workflow QA, mobile register review, and role-based spot checks after the latest register, action-link, and permission hardening passes.
- HSE AINM Vercel QA for register/detail behavior, inline central actions, Part 1 attachment `Other` text, containment terminology, and Word/compiled PDF parity.
- HSE Reports and inspection PDF Vercel QA after the latest local parity/formatting pass.
- Document Control workflow verification and revision handling, especially reject/resubmit/approve cleanup and up-rev history behavior.
- Button-level create/edit/delete permission enforcement across remaining edge routes after the Central Actions, Document Control, Quality, HSE Actions/Reports, HSE AINM, HSE Observations, HSE Inspections, Admin / Settings, Risk Register, and Asset spot-check hardening passes.
- Admin/Settings detail panel polish and Vercel invite-flow verification.
- Admin permission-registry production QA: verify legacy fallback, explicit Full/Part/None saves, new-user defaults, and route denial for Lessons Learnt and each Project Management area.
- Access-request production QA after applying the latest `admin_settings.sql`: public validation, duplicate prevention, Home notification, view-only permission preparation, approval/rejection status, audit history and invite/setup-link fallback.
- Opportunistic internal primitive migration only when a page is already being changed; the global UI contract is complete and this is not a standalone roadmap project.
- Production/device QA of the shared whole-IMS mobile card, panel, bottom-navigation, upload, and form behavior across the device and module matrix in `MOBILE_COMPATIBILITY_HANDOVER.md`.
- Risk Management shell and workflows.
- Project Management production QA for saved NOI reopen/edit/delete, controlled document storage, sequential numbering, planned-date synchronisation, and mobile responsiveness.
- Cross-project ITP extraction QA using real supplier revisions to expand the regression fixture library only where evidence shows a genuinely new table role or continuation pattern.
- Lessons Learnt production QA for the 2,990-row import, uncapped KPI totals, cumulative filters, controlled dropdowns, repeat-record drill-downs and the new Field Tools capture workflow.
- Open Points production QA and confirmation that `scripts/sql/project_open_points.sql` has been applied to the live Supabase project.
- IMS Home production/browser QA for synchronized video playback, persisted desktop preference, all six desktop layouts, permission-restricted cards, and the fixed phone workspace list.

# Known Issues

- Document Control rejection-field cleanup has been tightened locally; verify reject -> resubmit -> review -> approve behavior on Vercel with real document data.
- Document Control revision history remains sensitive: historic revision names/dates/files must be preserved, and up-rev comments should be captured at the up-rev moment.
- Document numbering must remain locked and non-reused; reclassification must supersede/archive old documents and create new numbers.
- Some old migration-extracted document names, such as `Checker`, may need blanking unless they match People Management.
- Button-level permissions may not be fully hardened across every edge route; Central Actions, Document Control, Quality, HSE Actions/Reports, HSE AINM, HSE Observations, HSE Inspections, Admin / Settings, Risk Register, and Asset spot checks now have explicit page-level or visible-control guards.
- Admin invite flow still needs full Vercel verification, including Copy Setup Link, password setup, and permission application.
- Resend may rate-limit invite/notification email; Copy Setup Link is the workaround.
- IMS email is fully live. Resend domain `enshoresubsea.com` was verified on 18 Aug 2026 — DKIM, SPF MX, and SPF TXT all confirmed. All outbound IMS emails (document notifications, workflow actions, ITP sign-off) now deliver from `documents@enshoresubsea.com`.
- `NEXT_PUBLIC_SITE_URL` should ideally be set to deployed site URL.
- AINM register/type/filter/detail behavior and the latest inline action/report changes require Vercel verification with real records.
- HSE Observation phone layout is locally verified at `390px` with no overflow; the public submit, evidence upload, saved register record, and Action linkage still need Vercel verification with real data.
- HSE Reports and inspection PDFs need Vercel verification with real saved reports, longer checklist forms, and evidence photos after the latest local parity/formatting pass.
- PTW exists but is parked/work in progress.
- Asset Management is closer to Quality/HSE after dashboard drill-down, calibration item availability/status controls, dashboard exclusion logic, top meta/status, reports filtering cleanup, Inspection/Maintenance register compaction, and page-level permission guards, but still needs Vercel workflow QA, mobile register review, and role-based spot checks.
- Some legacy pages retain local implementation constants, but the shared global contract governs their rendered appearance. Replace them only during related functional work; do not reopen a whole-IMS styling project for this alone.
- Risk Management exists as shell/functionality but needs review for maturity and consistency.
- NOIs created before editable NOI storage was introduced retain their linked tracker points but cannot recover manual form values that were never persisted; saving them once establishes the editable stored record.
- Historic Lessons Learnt narrative quality is inconsistent; automated trend statements must remain proportionate to the evidence.
- Open Points phase history and People-linked Raised By require the latest `project_open_points.sql` migration in the live database.

# Next Priorities

1. Apply the latest `scripts/sql/admin_settings.sql`, then verify public access request -> Admin Home notification -> Users & Access review -> permission adjustment -> invite/setup link -> password creation -> effective module/tab permissions.
2. Verify Admin create/edit/read-only behavior across representative permission profiles, polish Users & Access detail presentation, and expand sensitive-change Audit Log coverage.
3. Continue button-level permission audit only on remaining edge routes or newly touched pages not covered by the Central Actions / Document Control / Quality / HSE / Admin / Risk Register / Asset hardening passes.
4. Verify Document Control rejection-field cleanup on Vercel: reject, resubmit, review, approve, and confirm stale rejection fields are cleared.
5. Review Document Control up-rev behavior to protect revision files, dates, comments, and current-revision archiving.
6. Verify Asset Management on Vercel with real data: Dashboard drill-downs, Register detail scroll, Calibration item status/exclusion behavior, lifecycle history, supplier dropdown persistence, register export, compact Inspection/Maintenance registers, Reports, uploads, PDFs, central Action links, and role-based permission behavior.
7. Verify HSE Reports on Vercel after the Quality-parity pass: saved reports behavior, year filters, snapshot-period editing, permissions, and executive summary in PDFs.
8. Verify the complete AINM workflow on Vercel: register/type/filter/detail behavior, attachment `Other` text, containment wording, inline department-controlled actions, linked Action navigation, and Part 1/Part 2/compiled report content.
9. Verify the corrected HSE Observation Card on a physical phone: add at least two photographs one at a time, remove/re-add one, submit, confirm every evidence file and the saved register record, and verify linkage to Action Management.
10. Preserve the completed UI baseline when touching pages; migrate local styles only where it is low-risk and directly relevant to the active change.
11. Review Risk Management pages for route completeness, visual consistency, and demo readiness.
12. Verify Lessons Learnt and the complete Wadden Sea workflow on Vercel, including Open Points database migration, phase history, NCR linking, evidence and register outputs.
13. Verify IMS Home with representative permission profiles: all six layouts and persisted preference on desktop, plus the fixed simple workspace list with no selector on mobile.

# Future Enhancements

- PowerPoint export pack for leadership from Quality, HSE, Document Control, and Management Review.
- More CEO-facing Management Review story views and drill-down packs.
- Progressive specialist mobile workflows where the shared register-card foundation is insufficient, using HSE inspections as the field-work benchmark.
- Further dashboard story panels for Assets, Risk, Actions, and Documents.
- Extend the shared branded PDF/Word output theme only when adding a new generator or an evidenced output defect; existing generator families already follow the approved text and colour scheme.
- Stronger linked-record chips across Actions, AINM, Observations, NCR, MOC, Audits, Assets, and Risk.
- Opportunistic migration of local style constants into shared primitives during related functional work, without reopening system-wide visual standardisation.
- Additional audit log coverage for sensitive Admin, Document Control, and permission changes.
- More robust notification usefulness for Document Control and action workflows.

# Module Status

## IMS Home / Launchpad

- Status: Complete; production QA required
- Summary: IMS Home is intentionally an access surface rather than a dashboard. It uses a compact Enshore dark-blue animated header and equal-size permission-aware workspace cards. Users can choose Card grid, Spotlight, Compact tiles, List, Two columns, or IMS hub. The IMS hub enlarges the official outline animation and positions compact workspace segments around it. The header and hub videos remain synchronized while both are visible, and the last selected view is restored from browser local storage.
- Permanent Rules:
  - Keep Home focused on entering modules; module performance, summaries, registers, and KPIs belong inside module dashboards.
  - Standard Card grid workspace cards remain exactly equal in height, including future module cards.
  - Preserve the official `/enshore-e-outline-loop.mp4` animation without recolouring, stretching, audio, controls, or replacement artwork.
  - Keep all alternate layouts permission-aware and retain a responsive non-orbit fallback for the IMS hub.
- Outstanding Actions:
  - Verify all six views on Vercel at desktop, tablet, and mobile widths.
  - Verify last-view persistence across browser close/reopen and confirm synchronized header/hub playback does not visibly drift.
  - Test Full, Part, and None module permissions in each view.

## Quality Management

- Status: Complete
- Summary: Quality is the visual and workflow benchmark. Dashboard, NCR, Audits, MOC, Quality Actions, and Reports are implemented with live data, drill-downs, reports, evidence, People dropdowns, central Action links, and page-level create/edit guards across the main write paths.
- Outstanding Actions:
  - Preserve Quality as the reference layout.
  - Avoid reintroducing visible CAPA language into NCR unless explicitly requested.
  - Regression-test linked Action generation from NCR, MOC, and Audits before demos.
  - Verify create/edit/read-only behavior on Vercel after the Quality permission hardening pass.
  - Preserve the completed UI contract; migrate local implementation styles only during related functional work.

## HSE Management

- Status: In Progress
- Summary: HSE has broad coverage: Dashboard, AINM, Inspections, Observations, PTW, Actions, Calendar, and Reports. HSE inspections are the strongest mobile/field benchmark. The public Observation Card has a dedicated overflow-free phone layout and an accumulating multi-photo queue for repeated camera/file-picker selections. AINM supports Part 1 containment terminology, attachment `Other` detail, inline department-controlled central actions in Part 1/Part 2, compact evidence/action rows, full action links without forced title/description/department values, and linked action title/description output in Part 2 Word and compiled PDF reports. AINM and the other main HSE routes retain direct write permission guards; PTW is parked.
- Outstanding Actions:
  - Verify AINM register filters, Classification column, Accident/Incident filter, Select Type placeholder, detail-panel scroll, inline action creation, attachment `Other` text, report headings/content, and create/edit/read-only behavior on Vercel.
  - Verify the corrected Observation Card layout, repeated one-at-a-time multi-photo selection, submit state, complete evidence upload, register creation and action linkage on Vercel and a physical phone.
  - Verify HSE Reports on Vercel with real saved reports, year filtering, snapshot-period editing, PDF output, and create/edit/read-only behavior.
  - Verify HSE Actions/Reports, AINM, Observations, and Inspections create/edit/read-only behavior on Vercel after the permission hardening pass.
  - Verify HSE inspection PDFs on Vercel with longer forms and evidence photos after the local header/footer/table-margin pass.
  - Avoid spending more time on PTW unless specifically requested.

## Asset Management

- Status: In Progress
- Summary: Asset module routes and records exist, including dashboard, register, calibration, inspection, maintenance, actions, people, reports, field route, and asset document ID support. Asset Dashboard drill-downs, Calibration item status/exclusion behavior, lifecycle history, supplier references, register export, shared top meta/status rows, compact Inspection/Maintenance registers, Inspection/Maintenance detail-scroll behavior, and Asset Reports saved-report filtering now align more closely with Quality/HSE.
- Outstanding Actions:
  - Verify Asset workflows on Vercel with real data, especially uploads, PDFs, Calibration item status/exclusion behavior, lifecycle history, supplier dropdown persistence, register export, compact Inspection/Maintenance registers, row-to-detail scroll, and dashboard/register drill-downs.
  - Verify create/edit/read-only permission behavior across Asset pages after the local button-state alignment and deployment.
  - Preserve the completed Asset UI baseline while performing related functional changes.
  - Review mobile behavior of the compact Inspection/Maintenance registers after real-data testing.
  - Keep asset-specific document numbering compatible with Document Control.
  - Preserve links from Asset Inspection/Maintenance/Calibration to central Actions.

## Document Control

- Status: In Progress
- Summary: Document Control is a central IMS hub with company/system and asset-specific numbering, uploaded files, migration history, workflow foundations, email/notification APIs, and certification route. It is high value and high risk. Email notifications deliver from `documents@enshoresubsea.com` — Resend domain verified 18 Aug 2026.
- Outstanding Actions:
  - Verify rejection-field cleanup on Vercel after the local controlled-upload and workflow-path hardening.
  - Verify review/approval workflow and notification behavior end-to-end on Vercel with real documents.
  - Verify create/edit/read-only permission behavior on Vercel after the new page-level guards.
  - Protect numbering, reclassification, storage, and revision history logic.
  - Confirm up-rev archives previous current revision and captures comments at the correct moment.
  - Clean bad migrated person placeholders only when they do not match People Management.

## Action Management

- Status: In Progress
- Summary: Central `/actions` is preserved, with Quality/HSE/Assets/Risk module-specific action tabs feeding it. AINM Part 1/Part 2 now create linked central actions inline using an explicitly selected department, while the full Action form retains AINM/project context without forcing title, description, department, or owner. Linked record behavior and My Actions still need production testing. Central Actions retains explicit page-level create/edit guards.
- Outstanding Actions:
  - Verify linked source dropdowns for NCR, MOC, AINM, HSE Inspection, Observations, Asset Inspection/Maintenance/Calibration, and Risk.
  - Test linked chips/buttons open the correct record.
  - Confirm module-specific action tabs show the correct department/source filters.
  - Verify create/edit/read-only behavior on Vercel after the new Central Actions page-level guards.

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
  - Verify create/edit/read-only behavior on Vercel after the page-level Admin guard pass.
  - Verify registry-driven Lessons Learnt and Project Management permissions for existing and newly invited users.
  - Never expose or print Supabase, Resend, OpenAI, or service-role secrets.
  - Keep `NEXT_PUBLIC_SITE_URL` aligned to deployed site where possible.

## Lessons Learnt

- Status: In Progress
- Summary: The central repository, import, analytics, repeat-theme linking, controlled dropdowns, evidence and interactive register behavior are implemented. Prevention Intelligence now adds free-text evidence-grounded caution briefings, semantic recurrence retrieval, procedure review, supporting-lesson drill-down and analysis audit storage. Historic data quality and production-scale reconciliation remain the main risks.
- Outstanding Actions:
  - Reconcile the 2,990-row source workbook against imported, rejected and duplicate totals.
  - Verify uncapped KPI counts and cumulative filter option behavior on Vercel.
  - Test repeated-record drill-downs and all KPI/chart interactions.
  - Preserve fixed register columns and the five-second rotating learning insight.
  - Improve classifications progressively without overstating conclusions from poor historic narratives.
  - Complete the one-off production failure-index backfill to the live failure total, then verify automatic incremental indexing after create, edit, outcome change and bulk import. The paginated resumable builder now uses missing-first batches, timeouts and retry; normal future lessons do not require a full rebuild.
  - Confirm every AI caution cites and opens its actual supporting lessons, weak evidence produces proportionate confidence/limitations, the keyword fallback is visibly labelled, and the Master Admin-only index rebuild remains server-enforced.

## Management Review

- Status: Needs Review
- Summary: A read-only executive snapshot and PDF export exist, with safe drill-down links. The desired direction is CEO-facing and business-story focused.
- Outstanding Actions:
  - Review the executive narrative, metric usefulness, and demo readiness without reopening the completed visual baseline.
  - Confirm drill-down targets remain safe and permission-aware.
  - Plan PowerPoint/export pack from Quality, HSE, Document Control, and Management Review as a future enhancement.

## Risk Management

- Status: Needs Review
- Summary: Risk routes and SQL exist for dashboard/register/reviews/controls/opportunities/actions/reports. The module is present as shell/functionality but is less documented than Quality/HSE/Assets/Documents.
- Outstanding Actions:
  - Review current Risk pages for data completeness, workflow maturity, and demo readiness.
  - Ensure Risk Actions feed central Action Management correctly.
  - Preserve the shared UI contract while completing Risk workflows and data validation.
  - Verify Risk Register create/edit/read-only behavior on Vercel after the page-level guard pass.
  - Confirm route/page/tab permissions are complete across the remaining Risk shell pages.

## Project Management

- Status: In Progress
- Summary: Project Management has a Wadden Sea workspace aligned to the Quality Management layout standard. It includes a dashboard, controlled Supplier ITP programme, Project NOI requirements register, controlled NOI Creator, project report annexes, and eight-week inspection lookahead. NOI generation supports multiple inspection points, controlled Word/PDF output, shared project storage, editable saved records, tracker date synchronisation, sequential numbering, and self-service deletion of trial or cancelled NOIs.
- Outstanding Actions:
  - Verify the complete workflow on Vercel with authenticated users and real supplier records.
  - Confirm saved NOI Word, PDF, and JSON records can be reopened across different user sessions.
  - Confirm deleting the latest NOI returns linked points to Planned and makes the deleted latest sequence number available again without reusing numbers that remain issued.
  - Verify mobile layouts for the Wadden Sea dashboard, NOI register, and NOI Creator.
  - Continue improving varied supplier ITP extraction only against evidenced layout failures; preserve party-column targeting so supplier columns are not mistaken for Enshore/Client/Contractor columns.
  - Verify Baltic Power Employer Surveillance extraction and saved mapping reuse on Vercel, including later revisions of the same header template.
  - Keep the NOI register as the primary eight-week-lookahead source while retaining Excel upload as a fallback.
  - Apply and verify the latest Open Points SQL migration, including People-linked raiser and phase-settings history.
  - Verify Open Points filters, fixed register, phase creation, NCR dropdown, evidence, deadline/closure workflow and aligned Excel/Word/PDF outputs.
