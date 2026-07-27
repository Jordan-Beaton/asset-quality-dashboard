# HSE Management Codex Handover

HSE should follow the same IMS rhythm as Quality: dashboard, internal tabs, green hero, KPI cards, shared filters, detail panels, report outputs, and central Action links.

## Routes

- Dashboard: `app/hse/page.tsx`
- Calendar: `app/hse/calendar/page.tsx`
- AINM: `app/hse/ainm/page.tsx`
- AINM field: `app/hse/ainm/field/page.tsx`
- Observations: `app/hse/observations/page.tsx`
- Public observation route: `app/observe/page.tsx`
- PTW: `app/hse/ptw/page.tsx`
- Inspections: `app/hse/inspections/page.tsx`
- Inspection field: `app/hse/inspections/field/page.tsx`
- HSE Actions: `app/hse/actions/page.tsx`
- HSE Reports: `app/hse/reports/page.tsx`

## Current Status

- HSE module includes Dashboard, AINM, Inspections, Observations, PTW, Actions, Calendar, and Reports.
- Incidents, Risk Assessments, and Environmental tabs were removed from nav earlier.
- HSE Dashboard has graphics and a year filter.
- HSE Actions are HSE-specific and link to central Action Management.
- HSE Actions and HSE Reports now include explicit create/edit permission guards on direct write paths, with primary write controls disabled for restricted users.

## AINM

- Uses internal tabs such as Dashboard, Register, Create, Import, and Reports.
- Supports Internal AINM and External AINM distinction.
- Notification is mobile-friendly; Part 1 and Part 2 remain desktop-focused.
- Reports include Notification, Part 1, Part 2, and compiled PDF.
- Report outputs are stored and history is visible.
- AINM actions link to central actions.
- Dashboard graphs were recently tidied.
- Internal and external AINM create/import/save/delete, evidence upload/delete, reviewer creation, and saved compiled PDF generation now have explicit page-level create/edit permission guards with matching disabled controls.

## AINM Known Work

- AINM type dropdown should default to a grey `Select Type`, not `Incident Report`.
- Register should use the Show Filters pattern.
- Register should show Classification.
- Register should filter by Accident/Incident.
- Clicking a register item should scroll directly to the detail panel.
- Above register/filter/detail polish appears implemented in `app/hse/ainm/page.tsx`; verify on Vercel with real data before clearing this section completely.

## HSE Reports

- HSE Reports now use the shared Quality-style hero/context cards, live monthly HSE data, executive summary and next-month focus fields, saved reports table, search, Show/Hide Filters, year filter, Clear Filters, and row-level PDF/Edit/Delete actions.
- Saved report editing reads the stored report month/year snapshot when available, matching Quality Reports behavior for older saved periods.
- Executive summary and next-month focus appear in PDF output.
- Creating saved reports requires Create permission; editing/deleting saved reports requires Edit permission.
- Verify on Vercel with real saved HSE reports after deployment.

## Inspections

- Mobile-friendly inspection flow exists.
- ENS-HSEQ-FRM-044 Base and Site are completed well.
- ENS-HSEQ-FRM-041 Office is mostly done.
- FRM-046 Vessel Pre-Sail, FRM-042 Offshore, FRM-043 Mobilisation, and FRM-045 Dropped Objects were started/completed in one pass.
- PDF outputs now reserve header/footer space for generated tables and stamp the Enshore header, revision reference, and page numbers across completed and blank inspection PDFs.
- Verify generated PDFs on Vercel with longer checklist forms and evidence photos after deployment.
- Item evidence upload exists per checklist item.
- QR mobile flow exists.
- Create inspection, save/delete inspection, existing and staged evidence upload/delete/remove, and linked HSE Action creation shortcuts now use page-level create/edit permission guards with matching disabled controls.

## Observations

- Public QR route `/observe` requires no login.
- Landing asks Employee, Contractor, Client, Visitor, or Quick Fill.
- Wording changed to `Observation Card` and `Contact Details`.
- Register has Show Filters, detail panel, delete, and OBS-001 numbering.
- Observations link to Action Management.
- Public `/observe` submit handling is hardened so failed network/API paths leave the `Submitting` state; successful submissions show the submitted observation number.
- Secured HSE Observations review save/delete and central action generation controls now use page-level create/edit permission guards.

## PTW

- PTW module exists but is parked/work in progress.
- Word/PDF output styling was being iterated.
- Section 1/3 checkbox layouts were under refinement.
- Do not spend more time on PTW unless asked.
