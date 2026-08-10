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
- `src/components/ImsPrimitives.tsx`: shared panels, filters, tabs, buttons and mobile panel controls.
- `app/globals.css`: shared breakpoints, bottom navigation, grid/form constraints, register cards and specialist Observation Register cards.
- `app/observe/page.tsx`: public QR Observation Card and its narrower phone-specific rules.

## Mandatory Rules

- Do not change desktop sizing or layout to solve a phone issue. Scope fixes to `720px`, `520px`, or an explicit field/public modifier.
- Do not create a second page-local register-card system. Use the shared enhancer unless the workflow already has a justified specialist mobile representation.
- Standard tables must have a proper `thead` so mobile cards receive meaningful labels.
- Use `data-mobile-table="scroll"` only when card conversion would damage the meaning of a genuinely matrix-like table.
- Avoid phone negative-margin compensation. Use an AppShell page-container modifier for public or field routes.
- All phone controls must remain within their card, use border-box sizing, and avoid horizontal page overflow.
- Keep touch targets approximately `42px` or taller and form font sizes at `16px` to avoid browser zoom on focus.
- Preserve permissions, route behavior, linked records, evidence controls and generated-output actions during responsive changes.

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

## Current Remaining Work

- Complete the physical-device and Vercel matrix with representative real data and permission profiles.
- Record only evidenced route-specific failures; fix them without weakening the shared foundation.
- Prioritise task completion, uploads, date/select controls and record editing over decorative refinements.
- Keep PTW parked unless the user explicitly reopens that workstream.
