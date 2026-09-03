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
- Dashboard is the interactive command-view benchmark: Overview prioritises the live pulse and management focus, Analytics combines a high-contrast pressure cockpit with control health and deeper trends, and Actions & Audits contains operational planning. The reporting year sits in the command bar rather than the top meta row.
- Actions wording has been changed to Quality where relevant.
- NCR is now NCR-only; CAPA was removed from the visible UI.
- Quality Reports is the visual/reporting master for monthly reports.
- Quality Actions, Quality Reports, NCR/CAPA, Audits, and MOC now have explicit page-level create/edit permission guards on core write paths, with primary write controls disabled for restricted users.
- The Live Quality Pulse operational control score is genuinely Quality-only: NCR closure (30%), audit finding closure (30%), MOC closure (20%), and Quality action pressure (20%). Document review health was removed from the score entirely — Document Control has no data-level split between Quality and HSE documents (both share one "HSEQ" department with no finer classification), so it could never be cleanly scoped to Quality-only. The "HSEQ Docs In Date" chart bar on the dashboard is unaffected and remains informational context, just no longer part of the score.
- `isQualityAction()` (in `app/quality/page.tsx`) previously had a permissive fallback that counted any action from any department (Logistics, Commercial, Assets, etc.) as a Quality action if its `source` was `"Manual"` or a few other generic values, since it never actually checked department in that branch. It now only counts department `"Quality"`, or department `"HSEQ"` with `source` in `{"ncr/capa", "audit finding", "moc"}` (the genuine Quality-workflow sources) — everything else is excluded. This also feeds `priorityActions` (the Quality Priority Actions panel), so both the score and that panel were fixed together.
- Critical Pressure and Open Workload on the Overview command bar previously linked to a mismatched or unrelated destination (Critical Pressure linked to `/management-review`; Open Workload linked to an Actions-only filter despite summing NCR+Finding+MOC+Action counts). Both now jump to and scroll into a Critical Pressure Items / Open Workload Items panel on the Planning tab, built from the real underlying NCR/Finding/MOC/Action/overdue-HSEQ-document records with per-item links to their own record.

## NCR

- Includes dashboard/register/create/reports style layout.
- KPIs are clickable.
- Supports filtered PDF report output.
- Supports Excel import.
- Uses People dropdown for owner selection.
- Supports linked Action creation.
- Evidence upload metadata is hardened by `scripts/sql/quality_evidence_files.sql`; run it if NCR/Action evidence uploads fail to appear after storage upload.
- Create/import paths require Create permission; edits, deletes, evidence upload/delete, and saved NCR PDF generation require Edit permission.

## Audits

- Uses internal tab layout.
- KPIs are clickable.
- Supports evidence upload/open/delete on findings.
- Supports finding PDF and Word output.
- Lead Auditor People dropdown applies to Internal audits only.
- Audit creation/finding creation require Create permission; audit edits/deletes, linked items, finding edits/deletes, report uploads, and finding evidence changes require Edit permission.

## MOC

- Detail panel has been revamped.
- Supports PDF and Word report outputs.
- Section C/D/J/K layouts were improved.
- Uses People dropdowns where names are required.
- Supports linked Action generation.
- MOC creation requires Create permission; save, workflow progression, delete, attachment management, and signature image changes require Edit permission.

## Warnings

- Keep Quality layouts stable because other modules depend on them as the visual reference.
- Do not reintroduce visible CAPA language into the NCR UI unless explicitly requested.
- Preserve linked Action behavior when changing NCR, MOC, or audit flows.
