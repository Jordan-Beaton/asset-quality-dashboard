# Quality Management Codex Handover

Quality Management is the master visual reference for the IMS. Equivalent pages in other modules should mirror its structure, spacing, hero treatment, KPI cards, filters, tables, detail panels, and reporting rhythm.

## Routes

- Dashboard: `app/quality/page.tsx`
- MOC: `app/moc/page.tsx`
- NCR: `app/ncr-capa/page.tsx`
- Audits: `app/audits/page.tsx`
- Quality Actions: `app/quality/actions/page.tsx`
- Quality Reports: `app/reports/page.tsx`

## Current Status

- Dashboard has live KPI/story-style graphics.
- Actions wording has been changed to Quality where relevant.
- NCR is now NCR-only; CAPA was removed from the visible UI.
- Quality Reports is the visual/reporting master for monthly reports.

## NCR

- Includes dashboard/register/create/reports style layout.
- KPIs are clickable.
- Supports filtered PDF report output.
- Supports Excel import.
- Uses People dropdown for owner selection.
- Supports linked Action creation.
- Evidence upload metadata is hardened by `scripts/sql/quality_evidence_files.sql`; run it if NCR/Action evidence uploads fail to appear after storage upload.

## Audits

- Uses internal tab layout.
- KPIs are clickable.
- Supports evidence upload/open/delete on findings.
- Supports finding PDF and Word output.
- Lead Auditor People dropdown applies to Internal audits only.

## MOC

- Detail panel has been revamped.
- Supports PDF and Word report outputs.
- Section C/D/J/K layouts were improved.
- Uses People dropdowns where names are required.
- Supports linked Action generation.

## Warnings

- Keep Quality layouts stable because other modules depend on them as the visual reference.
- Do not reintroduce visible CAPA language into the NCR UI unless explicitly requested.
- Preserve linked Action behavior when changing NCR, MOC, or audit flows.
