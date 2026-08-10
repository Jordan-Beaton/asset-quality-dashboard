# Project Management Handover

## Status

In Progress. The Wadden Sea workspace is implemented and live, with production workflow QA still required.

## Workspace Structure

- Entry route: `/projects/wadden-sea`
- Shared navigation: `src/components/WaddenSeaWorkspaceNav.tsx`
- Dashboard: `app/projects/wadden-sea/page.tsx`
- Supplier ITP programme: `app/projects/wadden-sea/itp/page.tsx`
- Project NOI requirements: `app/projects/wadden-sea/noi/page.tsx`
- NOI Creator: `app/projects/wadden-sea/noi/create/page.tsx`
- Project Reports: `app/projects/wadden-sea/reports/page.tsx`

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
