# IMS Visual and Structural Audit — 10 August 2026

## Scope

Full authenticated local-IMS route sweep in Microsoft Edge, backed by a structural review of every App Router page and the shared shell, theme, primitive, navigation, and mobile-table components.

Reference viewport: `1912 × 900`. Representative phone verification: `390 × 844`.

The approved visual reference for registers is Project Management > Wadden Sea > ITP Tracker. The IMS Home launchpad, public Observation Card, field-entry routes, mobile register cards, and genuinely matrix-like tables remain intentional specialist exceptions.

## Coverage

- IMS Home and Field Tools
- Project Management, Wadden Sea, ITP Tracker, NOI Tracker, NOI Creator, Project Reports, and project report workspace
- Quality Dashboard, NCR, MOC, Audits, Quality Actions, Calendar, and Reports
- HSE Dashboard, AINM, Inspections, Observations, Actions, Calendar, Reports, Environmental, Incidents, PTW, and Risk Assessments
- Asset Dashboard, Register, Calibration, Inspection, Maintenance, Actions, People, Reports, and field route structure
- Document Control, Certification, and workflow route structure
- Central Actions
- Risk Dashboard, Register, Reviews, Controls, Opportunities, Actions, and Reports
- Lessons Learned
- People Management
- Management Review
- Admin / Settings and all reference-data settings routes
- Public Observation Card

## Findings

### Standardised already

- All inspected workspaces use Arial as the computed body font.
- Shared workspace tabs consistently use the approved 44px height, 10px radius, Enshore `#005670` active state, and pale-slate inactive state.
- The shared page hero, top meta row, KPI card, panel, and mobile compatibility foundations are present throughout the principal modules.
- No horizontal page overflow was detected on the desktop route sweep.
- The representative 390px phone register test produced labelled mobile cards, retained bottom navigation, and had zero horizontal overflow.

### Corrected in this pass

- Older registers used pale headers, 13px type, and `12px 14px` cells; Project ITP/NOI used a cleaner compact dark-header programme style.
- A shared `ims-data-table` contract now applies the ITP-derived visual language to every secured table, including tables rendered dynamically after tab and filter changes.
- A follow-up structural pass identified table-like registers built from CSS grid rows rather than semantic `<table>` elements. Audit Programme, Audit Open Findings, Document Register, NCR Register, MOC Register, and the HSE inspection checklist/action matrices now explicitly use the same compact dark-header language.
- Shared table theme exports now match the same contract for pages already using `imsTheme` directly.
- Table rows now use consistent restrained hover and selected states.
- Buttons, inputs, selects, and textareas explicitly inherit the IMS font.
- The table section of `UI_STANDARDS.md` now records the ITP-derived standard as the permanent rule.
- The audit scope now extends beyond registers to Create, edit/detail, import, reports and dialog surfaces. These surfaces inherit one shared label, input, select, textarea, fieldset, file-control and focus contract.
- Shared operational panels now use compact `16px` padding. Table-row actions use a compact `32px` control height so dense registers do not inherit full-size form buttons.
- Shared form tokens now define the approved `220px` responsive field grid, `12px` grid gap, `6px` label gap, `42px` controls and `96px` minimum narrative field height.

## Approved register specification

- Header: Enshore Pantone 7708c `#005670`, white uppercase text, `10px`, `800`, `9px 10px` padding.
- Body: white, `12px`, `10px` padding, `1.35` line height.
- Row rule: `#e4eaf0`.
- Hover: `#f7fafb`.
- Selected: `#eef7f8` with an inset `#005670` marker.
- Mobile: shared labelled-card conversion at `720px` and below.

## Enshore Brand Guidelines 2026 alignment

- Reviewed all 21 pages of the supplied brand guideline before applying UI changes.
- Primary interface font stack is `"Azo Sans", "Segoe UI", Arial, Helvetica, sans-serif`; Azo Sans requires a separately licensed webfont asset before it can render on devices where it is not installed.
- Primary fields, active tabs, section bars and register headers use Pantone 7708c / `#005670`.
- Supporting accents use Pantone 7709c / `#63B1BC`; warnings use Pantone 2010c / `#FFAD00`; danger and overdue states use Pantone bright red / `#F93822`.
- Page fields use Pantone P 134-9 C / `#ECECE7`; borders use cool gray 2 / `#D0D0CE`; secondary copy uses cool gray 11 / `#53565A`; primary operational copy uses black / `#000000`.
- `#78C57E` remains restricted to approved HSE/3Rs campaign use and `#503488` remains restricted to RapidScan.
- Shared body, control, section-title, KPI, register-header, register-row and badge sizes are now recorded in `UI_STANDARDS.md`.

## Search and filter control pass

- Shared and legacy register toolbars now use the same Enshore off-white panel, cool-gray border, `16px` radius and `14px` inset spacing.
- Search inputs and selects are fixed to the shared `42px` height, `10px` radius, white field background, `14px` text and consistent focus treatment.
- Page-specific search maximum widths are overridden so each search field fills the available toolbar column.
- Expanded filter rows use the same visual contract as the collapsed search row across Audit Programme, Findings, MOC, NCR, Documents, People, Risk, Actions, AINM, PTW, Inspections and reporting views.

## Filter accuracy and intersection pass

- Audited the final predicates for Actions, Audits/Findings, NCR, MOC, Documents, Certification, People/Admin, Quality/HSE calendars, AINM, PTW, Observations, Inspections, Assets, Calibration, Asset Inspection/Maintenance, reports, Risk and Project ITP/report registers.
- Active search, dropdown, toggle, date-window and quick-filter criteria now combine with strict AND semantics; adding another active criterion can only retain or reduce the result set.
- Corrected Audit Programme linked-finding filters so Status and Category must match the same linked finding rather than two different findings belonging to one audit.
- Corrected Quality, HSE and Asset Action KPI/mini-focus drill-downs so they no longer erase existing Search, Status, Priority or pressure filters.
- Corrected central Actions, NCR, MOC, Documents, AINM, Assets, Calibration, Inspection, Maintenance and Quality/HSE Calendar drill-down helpers so they apply only their own criterion and preserve unrelated active filters.
- AINM dashboard project drill-downs now append conjunctive search terms; the register search requires every term to be present.
- Only explicit Clear/Clear Filters controls reset the complete filter set. Direct navigation to a distinct fixed workspace such as Document Workflow/Archive may still establish that workspace's required baseline scope.

## Create, edit, import and auxiliary-tab pass

- The same Enshore font, text colours, field backgrounds, borders, radii and focus state now apply on every secured form surface, not only register filters.
- Labels are compact `13px` cool-gray text at `800`; inputs/selects remain `42px`; narrative fields default to a compact `96px` minimum and expand only where their content warrants it.
- Fieldsets, file controls, radio buttons and checkboxes now use the approved Enshore border and primary accent rather than browser/page-local defaults.
- Shared operational panels use `16px` padding while preserving larger specialist layouts where local structure requires it.
- The source audit covers all App Router forms and fieldsets, including Quality Audits/Findings, NCR, MOC, Actions, Assets, HSE, Documents, Risk, People, Certification, Reports, Project NOI and Admin support routes.
- An authenticated Chrome recheck remains required because the Chrome add-on was not connected during this follow-up pass.

## Meta-bar and refresh-control pass

- The white meta bar is limited to `Back to IMS Home` on the left and the dynamic `Status: ...` message on the right.
- Removed all rendered standalone `Refresh` buttons across dashboards, calendars, registers, Management Review, Admin, Lessons Learned, MOC, NCR, Risk and Observations.
- Initial route loading and automatic reloads after successful record/workflow mutations remain intact; this pass removes redundant manual controls rather than data synchronisation.
- A source scan for rendered `Refresh` button labels across `app` and `src` returns zero matches.

## Typography and register-edge pass

- Enforced the shared semantic type scale for heroes, section headers, headings, labels, controls, KPI cards, register headers, register rows and table actions.
- Semantic tables are inset `4px` from their shell and use consistent `10px` rounded top corners.
- Custom grid registers use `ims-register-shell`, `ims-register-head` and `ims-register-row` hooks so their inset, rounding and type scale match semantic tables without breaking column alignment.
- First-column values are bold across semantic tables and custom grid registers.

## Tab and selected-row state pass

- Inactive tabs use one pale Enshore brand tint `#eef7f8`; only the active tab uses `#005670` with white text.
- Shared and legacy workspace/detail tab groups now expose `role="tablist"`, `role="tab"`, `aria-selected` and `data-active`, allowing the same background, dimensions and state treatment to apply without page-local exceptions.
- Selected semantic and custom-grid rows use `#eef7f8` with an Enshore `#005670` inset marker; unselected rows remain white.
- Added explicit `aria-selected` and `data-selected` state to the remaining clickable semantic register rows, including Quality/HSE/Asset Actions, AINM, Observations, Inspections, PTW and Certification.
- Shared tabs and the principal custom registers now expose explicit active/selected state attributes so appearance and accessibility state cannot drift apart.

## Validation

- Complete ESLint pass across `app` and `src`: passed.
- Production `next build`: passed, including TypeScript and all 78 generated pages.
- Automated palette audit across every `.ts`, `.tsx`, and `.css` file in `app` and `src`: zero unapproved six-digit colour literals remain. Approved pale selected/hover treatments and the two formally restricted brand colours remain explicitly allowlisted.
- Font audit covers page UI, generated HTML/print content and workflow notification emails; all now request Azo Sans with the approved Segoe UI/Arial/Helvetica fallback stack where applicable.
- Existing whole-repository lint remains blocked by 19 unrelated `no-require-imports` errors in root-level deck/capture utility scripts. No lint errors remain in the files changed by this audit.
- Build emitted existing Recharts zero-dimension prerender warnings and the Next.js middleware deprecation notice; neither was introduced by this UI work.

## Final whole-system acceptance status

Structurally verified:

- All 66 App Router page files and all 78 generated build routes.
- Shared and legacy tabs, meta rows, dashboards, registers, Create/edit/detail/import forms, reports, dialogs, field routes and public/support routes.
- Shared typography, palette, controls, panels, filter bars, registers, selected states, first-column emphasis and compact spacing contracts.
- PDF, Word, HTML/print and workflow-email generator source paths.

Still required before declaring visual QA complete:

- Authenticated Chrome route-and-tab sweep with the Chrome add-on connected.
- Representative Full/Part/None permission profiles.
- Desktop plus 390px phone visual checks for every operational tab family.
- Generation, rendering and page-by-page inspection of representative PDF and Word outputs from each generator family using real records and long-content cases.

Do not describe the complete IMS as visually signed off until these browser and rendered-output checks have been completed and any exceptions corrected.

## Register acceptance matrix

The following views were individually checked against the brand-corrected ITP-derived desktop contract (`#005670` header, white `10px` uppercase labels, compact `12px` rows, zero page overflow):

- MOC Register
- NCR Register
- Audit Programme
- Audits > Findings
- Central Actions > Action Register
- Quality Calendar > Register
- HSE Calendar > Register
- AINM Register
- AINM > Reports
- Observation Register
- PTW Register
- HSE Inspections > Inspection Register
- Asset Register
- Calibration Register
- Asset Inspection Register
- Asset Maintenance Register
- Documents > Document Register
- Documents > Workflow
- Documents > Archive
- Risk Management > Register
- People Register
- Admin > Users & Access
- Admin > Audit Log

Representative mobile checks passed for a standard register (Central Actions) and the specialist Observation Register at `390 × 844`: hidden desktop headers, grid/card rows, and zero page overflow.

## Follow-up QA

- Repeat the same route matrix against Vercel with representative real records and Full/Part/None permission profiles.
- Complete physical-device checks at 320–360px, 390px, 430px, and phone landscape as defined in `MOBILE_COMPATIBILITY_HANDOVER.md`.
- When individual legacy pages are next touched, replace their redundant local table constants with the shared theme exports; the global contract already prevents visual drift in the meantime.
