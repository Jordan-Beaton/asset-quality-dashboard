# IMS Mobile Compatibility Handover

This file is the permanent implementation and QA reference for phone compatibility across the Enshore IMS. Read it with `IMS_MASTER_HANDOVER.md` and `UI_STANDARDS.md` before changing responsive behavior.

## Current Foundation

- Shared phone breakpoint: `720px` and below.
- Public HSE Observation refinement breakpoint: `520px` and below.
- IMS Home becomes a fixed, simple workspace list on phones and hides the desktop view selector.
- `AppShell` compacts the header and converts the desktop side rail into bottom navigation.
- Shared grids and forms become one column unless a route has an intentional compact phone layout.
- `ImsPanel` and AINM section cards provide phone-only Collapse/Expand controls.
- `MobileTableEnhancer.tsx` converts standard secured tables into labelled register cards, keeps priority fields visible, and provides row-level Expand/Collapse for secondary fields.
- Desktop layouts remain unchanged above `720px`.

## Shared Implementation Files

- `src/components/AppShell.tsx`: header, navigation, page-container modes and mobile table enhancer mounting.
- `src/components/MobileTableEnhancer.tsx`: central register-card enhancement.
- `src/components/MobileCompatibilityGuard.tsx`: automatic development-time phone overflow audit for every AppShell route.
- `src/components/ImsPrimitives.tsx`: shared panels, filters, tabs, buttons and mobile panel controls.
- `app/globals.css`: shared breakpoints, bottom navigation, grid/form constraints, register cards and specialist Observation Register cards.
- `app/observe/page.tsx`: public QR Observation Card and its narrower phone-specific rules.
- `app/field-tools/page.tsx`: permission-aware direct launchers, including Lessons Learned field capture.
- `app/lessons-learned/page.tsx`: shared full workspace plus the query-driven compact field-entry mode.

## Mandatory Rules

- Mobile compatibility is part of the acceptance criteria for every new module, route, tab, form, register and dialog; it is not a later enhancement phase.
- AppShell automatically applies `ims-responsive-contract` and `data-mobile-contract="v1"`. Do not remove or replace them on module pages.
- Resolve every development warning from `MobileCompatibilityGuard` before treating responsive work as complete.
- Do not change desktop sizing or layout to solve a phone issue. Scope fixes to `720px`, `520px`, or an explicit field/public modifier.
- Do not create a second page-local register-card system. Use the shared enhancer unless the workflow already has a justified specialist mobile representation.
- Standard tables must have a proper `thead` so mobile cards receive meaningful labels.
- Use `data-mobile-table="scroll"` only when card conversion would damage the meaning of a genuinely matrix-like table.
- Avoid phone negative-margin compensation. Use an AppShell page-container modifier for public or field routes.
- All phone controls must remain within their card, use border-box sizing, and avoid horizontal page overflow.
- Keep touch targets approximately `42px` or taller and form font sizes at `16px` to avoid browser zoom on focus.
- Preserve permissions, route behavior, linked records, evidence controls and generated-output actions during responsive changes.

## Automatic Future-Module Contract

Any new route rendered inside AppShell automatically receives:

- Compact phone header/page spacing and bottom module navigation.
- One-column inline grids and contained grid children.
- Full-width, border-box inputs, selects, textareas, uploads, forms, fieldsets and labels.
- Contained media, embedded content, code blocks and dialogs.
- Touch-sized primary actions and horizontally scrollable tabs.
- Shared panel Collapse/Expand and standard table-to-card enhancement.
- A development-time horizontal-overflow audit identifying offending elements.

This foundation reduces retrofit work but does not replace the device QA matrix. Matrix-like tables may use the documented scroll opt-out; specialist field workflows should use a dedicated compact mode while retaining the authoritative data path.

## Public Observation Card Standard

- Route: `/observe`; public and QR-accessible without login.
- No normal IMS header, side rail or bottom navigation.
- Uses `ims-page-container--public` instead of desktop negative-margin compensation on phones.
- Reporter types use two columns; the odd final `Quick Fill` option spans both columns.
- Cards and controls use the full available width with compact padding.
- The Enshore and approved 3Rs campaign logos retain their supplied aspect ratios.
- Local QA at a `390px × 844px` viewport confirmed no horizontal overflow and correctly contained controls. Production submission/evidence linkage still requires physical-phone testing.

## Device QA Matrix

Test at minimum:

1. Small phone: approximately `320px` to `360px` wide.
2. Standard phone: approximately `390px` wide.
3. Large phone: approximately `430px` wide.
4. Phone landscape: approximately `740px` to `900px` wide, checking the `720px` transition.
5. Desktop control: at least `1280px` wide to prove the existing layout is unchanged.

For each tested route confirm:

- No horizontal page overflow or clipped controls.
- Header, tabs and bottom navigation remain usable.
- Forms are readable, realistically sized and keyboard/focus safe.
- Register labels are correct and priority fields remain visible.
- Expand/Collapse reveals all secondary record fields.
- Filters, row selection and detail-panel scrolling still work.
- Upload, download, PDF/Word and linked-action controls remain reachable.
- Create/edit/read-only permissions behave exactly as on desktop.

## Module QA Sequence

1. Public HSE Observation: submit, photograph upload, success number, register evidence and linked Action.
2. HSE Inspections and AINM: checklist entry, evidence, staged/saved forms and generated PDFs.
3. Assets: Register, Calibration, Inspection and Maintenance, including row detail and linked Actions.
4. Quality: NCR, Audits, MOC, Actions and Reports.
5. Central Actions: filters, linked-source chips, detail editing and evidence.
6. Documents and Certification: registers, workflow actions, uploads and revision history.
7. Projects: Wadden Sea Dashboard, ITP, NOI, Creator, Reports and Open Points.
8. Lessons Learned: register expansion, repeat drill-down and evidence.
9. Risk, People, Management Review and Admin: registers, forms, permissions and outputs.
10. IMS Home and Field Tools: phone list, module access, QR destinations and permission-aware navigation.

### Lessons Learned field entry

- Field Tools shows `Capture a Lesson` only when the user can access the Lessons Learned module.
- Destination: `/lessons-learned?view=create&mode=field`.
- The field mode uses the compact AppShell field header, hides workspace tabs/KPIs, returns to Field Tools, and reuses the normal secured save/evidence workflow.
- Essential fields remain visible; ownership, contributing factors, dates, repeat grouping and other secondary data sit inside `Optional detail`.
- Saving clears the form and leaves field mode ready for another capture. The normal desktop Lessons Learned route and layout remain unchanged.

## Current Remaining Work

- Complete the physical-device and Vercel matrix with representative real data and permission profiles.
- Record only evidenced route-specific failures; fix them without weakening the shared foundation.
- Prioritise task completion, uploads, date/select controls and record editing over decorative refinements.
- Keep PTW parked unless the user explicitly reopens that workstream.
