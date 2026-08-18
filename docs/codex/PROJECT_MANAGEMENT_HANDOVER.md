# Project Management Handover

## Status

In Progress. The Wadden Sea workspace is implemented and live, with production workflow QA still required.

## Architecture

Projects share a common feature set driven by a central registry at `src/lib/projectRegistry.ts`. Adding a new project requires only adding an entry there — all shared pages route dynamically under `app/projects/[projectKey]/`.

- **Registry**: `src/lib/projectRegistry.ts` — defines label, NOI sequence floor, scope options, and which tabs to show per project.
- **Shared nav**: `src/components/ProjectWorkspaceNav.tsx`
- **Shared pages**: `ItpTrackerPage`, `NoiTrackerPage`, `NoiCreatorPage`, `ItpSignOffPage` in `src/components/`
- **Dynamic routes**: `app/projects/[projectKey]/itp/`, `noi/`, `noi/create/`, `itp-sign-off/`
- **Project-specific**: dashboards (`app/projects/{key}/page.tsx`) and reports (`app/projects/{key}/reports/`) remain bespoke static routes.

## Workspace Structure (Wadden Sea example)

- Entry route: `/projects/wadden-sea`
- Dashboard: `app/projects/wadden-sea/page.tsx` (project-specific)
- Supplier ITP programme: `/projects/wadden-sea/itp` → dynamic route
- Project NOI requirements: `/projects/wadden-sea/noi` → dynamic route
- NOI Creator: `/projects/wadden-sea/noi/create` → dynamic route
- ITP Sign-Off: `/projects/wadden-sea/itp-sign-off` → dynamic route
- Project Reports: `app/projects/wadden-sea/reports/page.tsx` (project-specific)

The workspace follows the Quality Management visual structure: hero, top meta/status row, tabs, KPI cards, panels, filters, and compact registers.

At phone widths the workspace inherits the whole-IMS bottom navigation, one-column grids/forms, collapsible panels, and automatic labelled register cards with expandable secondary fields. Keep project-specific desktop layouts unchanged and use `data-mobile-table="scroll"` only when a card representation would lose ITP/NOI meaning.

## Supplier ITP Programme

- Stores physical current-revision documents in the `project-documents` Supabase bucket.
- Retains revision history and identifies the current revision.
- Extracts document number, title, revision, supplier, and related metadata where possible.
- Supports scope classification and colour distinction for Trencher, Barge, and other configured scopes.
- Register rows remain editable and deletable through the UI.
- Revision replacement must archive the former current revision rather than destroy document history.

## Project NOI Requirements

- Data source: `project_noi_points`.
- Extracts relevant Client, Enshore, Contractor, Customer and equivalent W/H involvement points from PDF, scanned and Word ITPs.
- Supports composite codes containing W or H, including W/H, R/W, and M/W.
- Supports manual point creation when supplier layouts cannot be extracted reliably.
- Filters cover ITP number, ITP title, supplier, point type and status.
- Planned date, NOI number, status and notes are editable in the register.
- Issued rows expose an NOI link that opens the saved record in the Creator.
- People-assignment controls should continue to use People Management as their source.

## ITP Extraction Mapping Framework

- Core rules: `src/lib/noiExtractionRules.ts`.
- Regression check: `scripts/check-noi-extraction-rules.ts`.
- The scanner classifies authority, identifier, and activity-description columns rather than relying on one supplier's exact wording.
- Built-in client-side authority terminology includes Client, Enshore, Contractor, Employer, Employer Surveillance, Customer, Purchaser, Buyer, and Owner.
- Built-in identifier terminology includes Task, Task #, Step, Item, Point, Section, and Inspection Point variants.
- Supplier, Vendor, Subcontractor, TPI, Class, HSG, and MWS authority columns are explicitly excluded unless future controlled requirements say otherwise.
- Every scan returns diagnostics explaining the recognised NOI authority, row identifier, activity column, and excluded authority columns.
- The Baltic Power NOI page exposes a mapping review when a layout is unresolved. A user can confirm the client/NOI authority, task/item identifier, and activity columns, then save and rescan.
- Confirmed mappings are stored in `project-documents/{project-key}/extraction-mappings/{template-fingerprint}.json` and automatically reused when later revisions have the same header structure.
- Visual/OCR instructions and final validation use the same configured authority mapping as structured and coordinate extraction; a heading cannot be accepted by OCR and then silently rejected by a different rule layer.
- The Baltic Power pattern `Task # / Activity Description / ENS Surveillance / Employer Surveillance / MWS` is covered by regression checks: Employer Surveillance is the NOI authority, Task # is the identifier, and MWS is excluded.

## NOI Creator

- Controlled source template: `assets/templates/ENS-HSEQ-FRM-074-Notice-of-Inspection.docx`.
- Word route: `app/api/projects/noi-create/route.ts`.
- Supports selecting multiple inspection points from one supplier for a single NOI.
- Sequential numbering currently uses the highest issued number with a baseline of `003`; the first available new sequence is therefore `004` when no later NOI remains issued.
- Generates a controlled Word document and a visually matched one-page PDF.
- Persists editable form data, Word output and PDF output under `project-documents/wadden-sea/nois/{NOI number}/`.
- Saving writes the inspection date to each selected point's `planned_date` and sets status to `NOI Issued`.
- Reopening reads the linked tracker points and saved form data. A common tracker planned date is authoritative if it has subsequently changed.
- Editing can add or remove linked inspection points and regenerate both outputs.
- Delete NOI removes saved files/details, clears the NOI number, returns linked points to `Planned`, preserves their planned dates, and recalculates the next sequence.
- Legacy NOIs created before editable storage cannot recover form values that were never saved; complete and save them once to establish the stored record.

## Project Reports, Open Points and Lookahead

- Project Reports consolidates the Wadden Sea monthly annex workflows for Audit NCRs, Audit Programme, Open Points, and eight-week inspection lookahead.
- Audit selections can be filtered and selected without leaving the current report screen.
- The NOI register is the preferred master source for the eight-week lookahead.
- Existing Excel upload remains available as a fallback during transition.
- Outputs include Word and/or PDF where required for insertion into the client monthly report.
- Open Points database migration: `scripts/sql/project_open_points.sql`.
- Open Points UI: `src/components/WaddenSeaOpenPoints.tsx`, mounted as the `Open Points` Project Reports tab.
- It provides a dashboard, shared IMS filter/register pattern, simplified create/edit workflow, controlled project settings, People-linked Raised By/Owner fields, NCR linkage, evidence, client-document tracking, deadline automation, closure controls and aligned Excel/Word/PDF outputs.
- NOI, ITP and Risk links were deliberately removed from Open Points because they complicated normal use without a reliable operational relationship. Historic database columns remain available for traceability.
- Project phases are controlled dropdown values with Add New support; phase/settings changes are retained in `project_open_point_settings_history`.
- Excel, Word and PDF register outputs share the same controlled eight-column structure and Wadden Sea/IMS report identity.
- The compliance and acceptance map is in `docs/codex/WADDEN_SEA_OPEN_POINTS_COMPLIANCE.md`.
- The Employer source identifies the activity as `CA_Act_1699`; do not relabel it `CA_ACT_1669` without a revised controlled source.
- CDE upload and Employer decisions remain human-controlled steps. The IMS tracks due dates, references and evidence but does not integrate directly with the Employer CDE.

## Validation Priorities

1. Upload a new Supplier ITP revision and confirm current/archive revision behavior.
2. Scan representative PDF, image-based and Word ITP layouts and verify party-column targeting.
   - Include the Baltic Power Employer Surveillance layout and confirm Task # is retained.
3. Create a multi-point NOI, verify its planned dates in the tracker, and compare Word/PDF output.
4. Reopen the NOI from the tracker in a separate authenticated session, edit it, and confirm stored files are replaced.
5. Delete the latest trial NOI and confirm linked points return to Planned and the next number recalculates correctly.
6. Verify the Dashboard, ITP/NOI registers, NOI Creator and Project Reports against `MOBILE_COMPATIBILITY_HANDOVER.md`, including card expansion, document controls, date inputs and generated-output actions.
7. Verify Open Points create/edit, People dropdowns, Add New Phase history, NCR linking, evidence, cumulative filters and all three register outputs.

## Guardrails

- Do not treat every W/H anywhere on a page as a Client/Enshore/Contractor requirement; identify the correct party column first.
- Do not delete archived ITP revisions when uploading a replacement.
- Do not overwrite controlled template labels, footer identity, revision information or response/signature sections.
- Do not reuse an NOI number that is still assigned to an issued record.
- Preserve planned dates when deleting an NOI; deletion removes the notice, not the underlying inspection requirement.

## Baltic Power

- Entry route: `/projects/baltic-power`.
- Tabs mirror the Wadden Sea operational workspace except Project Reports: Dashboard, ITP Tracker, NOI Tracker, NOI Creator, and ITP Sign-Off.
- Baltic Power records use the separate `baltic-power` project key and storage paths; do not mix them with Wadden Sea records.
- ITP Sign-Off detects every numbered phase heading in the standard ITP structure, presents unselected phase checkboxes, and then requires explicit selection of the individual task IDs/activity descriptions within each chosen phase. Select all/Clear are convenience controls only; the stored request, recipient email and evidence certificate contain only the explicitly checked tasks. Multiple selected phases are issued as separate auditable decisions to a free-entry recipient email.
- In the sign-off evidence register, the Items count expands its record to show the stored task IDs and activity descriptions inline, so users can review the signed-off scope without opening the ITP or certificate.
- Baltic Power NOI numbering is project-specific and starts at `001`; subsequent numbers use the highest NOI number already assigned to Baltic Power inspection points plus one.
- The external confirmation records recipient email, confirmed full name, decision, reason where rejected, and exact decision timestamp. It deliberately does not collect a drawn signature.
- The recipient must verify access to the intended mailbox with a six-digit, ten-minute one-time code before the decision is accepted. After the decision, the IMS generates an immutable PDF certificate, stores its SHA-256 hash and storage path, attaches it to a confirmation email sent to recipient and originator, and retains the request, verification and confirmation provider message IDs.
- Database setup: `scripts/sql/project_itp_sign_off.sql`. Apply through the Supabase SQL editor before live testing; it has not been applied from the repository.
- Validate extraction against the complete controlled Baltic Power ITP, especially continuation rows and surveillance columns, before relying on the issued phase record.
