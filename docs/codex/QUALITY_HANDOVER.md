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
- MOC creation requires Create permission; save, workflow progression, delete, attachment management, and sign-off requests require Edit permission.
- Section C (Action Plan) rows with a description auto-create/update a linked row in central Action Management on every MOC save (one-way sync: MOC → Action — description/owner/date/status flow from the MOC row; editing the linked Action directly gets overwritten on the next MOC save). Removing a row and saving removes its linked Action too. Rows are matched by a stable `link_key` (`moc_action_plan_items.link_key` / `actions.linked_moc_action_key`), not `id`, because `persistChildTables()` deletes and re-inserts every action-plan row on every save. "Create Central Action" was replaced by "View in Action Management ↗" since linking is now automatic. Each row also has a "More options ⋯" menu (matching Findings' pattern) to upload attachments, stored in `moc_action_attachments` keyed by the same `link_key`; attachments appear as clickable links (signed URLs, 6-month validity) in the generated PDF's "C. Action Plan - Attachments" table — jsPDF can only link to files, not truly embed them, matching the existing Audit/NCR evidence-export pattern.
- Sections K (Review & Endorsement), L (Change Acceptance), and M (Close-Out Verification) no longer accept typed or uploaded signatures. Each row is sent for email sign-off instead: pick the person from the People dropdown (their email must be on file) and click "Send for Sign-Off". This mirrors Document Control's email workflow — no OTP, since MOC reviewers are internal people.
  - Sending a row emails a purpose-built MOC summary PDF (`src/lib/mocSignoffPdf.ts`) plus a link to `/moc/signoff-action?token=...`, a public no-login page where the recipient chooses Approve, Reject, or Comments (`app/api/moc-signoff/route.ts`, `app/api/moc-signoff-action/route.ts`).
  - The decision writes an audit-trail string into the row's existing `signature` column (e.g. "Approved via email by Jane Doe (jane@...) on 12/01/2026") plus `approved_value`/`review_date` (Review & Endorsement) or `signoff_date` (Acceptance/Close-Out) and `comments`. Comments do not approve or reject the row — they set status "Needs Attention" and notify the MOC Coordinator to follow up.
  - Requests are tracked in `moc_signoff_requests`/`moc_signoff_tokens` (see `scripts/sql/moc_signoff.sql`, run once in Supabase), addressed by `(moc_report_id, target_table, sort_order)` rather than row `id` — `persistChildTables()` deletes and re-inserts every review/acceptance/closeout row on every MOC save, so `sort_order` is the only stable identity for a row across saves. `withLatestSignoffDecisions()` in `app/moc/page.tsx` re-reads the current DB decision fields before every save so a stale in-memory save can't silently overwrite a decision recorded via email in the meantime.

## Warnings

- Keep Quality layouts stable because other modules depend on them as the visual reference.
- Do not reintroduce visible CAPA language into the NCR UI unless explicitly requested.
- Preserve linked Action behavior when changing NCR, MOC, or audit flows.
