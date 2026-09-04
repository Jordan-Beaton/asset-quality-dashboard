# Action Management Codex Handover

Action Management is a top-level module with module-specific action tabs feeding the central `/actions` route.

## Routes

- Central Actions: `app/actions/page.tsx`
- Quality Actions: `app/quality/actions/page.tsx`
- HSE Actions: `app/hse/actions/page.tsx`
- Asset Actions: `app/assets/actions/page.tsx`
- Risk Actions: `app/risk/actions/page.tsx`

## Current Status

- Central `/actions` route is preserved.
- Quality, HSE, and Assets have module-specific action tabs that feed central Actions.
- HSE Actions and Quality Actions should show department/module-specific actions.
- My Actions now merges three record types for the signed-in person (matched by email to their People record, then by owner name): central Actions, NCR (`ncrs` table), and Audit Findings (`audit_findings` table, with the parent audit number resolved from `audits`). Each row carries a `source: "Action" | "NCR" | "Audit Finding"` Type badge; NCR/Audit Finding rows link out via the existing deep-link params (`/ncr-capa?ncrId=`, `/audits?findingId=`) rather than opening in the central register. This is a deliberate exception to the normal module-permission boundary — a person's own NCR/Finding ownership is visible in My Actions even without NCR/Audits module read access, because the point is personal accountability visibility. MOC and other linked-record sources are not yet included in this merge; extend using the same pattern (query the source table filtered by owner, normalize into the same item shape) if requested.
- Linked record chips/buttons should open the linked record.
- `departmentOptions` in `app/actions/page.tsx` now includes "Base" alongside the other 15 departments — plain string value, no schema change.
- Every action-creation path now records `raised_by_email` (previously only the central Create Action form did): `app/actions/page.tsx` create + bulk import, `app/quality/actions/page.tsx`, `app/hse/actions/page.tsx`, `app/assets/actions/page.tsx`, and AINM's inline corrective-action creator (`app/hse/ainm/page.tsx`). Each of those files now tracks `currentUserEmail` via `supabase.auth.getUser()` on mount, matching the pattern already used centrally. Bulk import records the importing user as raiser for every row, not the original spreadsheet author.
- "Raised by X" (resolved from `raised_by_email` via the `people` list, falling back to the raw email) is now displayed in the central Action Register (subtitle under Title, alongside the source label) and as a read-only field in the edit panel — see `raisedByLabel()` in `app/actions/page.tsx`. It is not yet surfaced in Quality/HSE/Assets' own simplified action views or in My Actions.
- Notification behaviour (`saveEdit` in `app/actions/page.tsx`, via `/api/notify-assignment`): create sends an "assigned" email to the new owner; edit sends "assigned" only if the owner actually changes; status-change and close-out notifications now go to **both** the raiser and the current owner (previously raiser only), skipping a duplicate send when they're the same person. Editing any other field (title, due date, department, etc.) without a status or close-out change still sends nothing.
- AINM Part 1 and Part 2 can now create central actions inline with explicit title, description, department, owner, priority, and target date fields.
- AINM-linked departments are selected explicitly and are not inferred from the accountable person.
- The AINM `Open Full Action Form` route supplies source/link/project context only; title, description, department, and owner remain blank for manual completion.
- Linked central AINM actions are included alongside legacy tracker actions in Part 2 Word and compiled PDF outputs.
- Central `/actions` now has explicit page-level permission guards using `useImsPermissions`:
  - Create permission is required for manual action creation, evidence attached during creation, and bulk action import.
  - Edit permission is required for action edits, deletes, evidence upload, and evidence delete.
  - Main write buttons/file inputs are disabled when the current tab permission does not allow the action.

## Register Table Layout

- My Actions (`app/actions/page.tsx`), Quality Actions (`app/quality/actions/page.tsx`), and HSE Actions (`app/hse/actions/page.tsx`) registers all use `table-layout: fixed` with explicit percentage-width columns (not auto-layout). This was a deliberate fix: auto-layout tables only "fit" the page by accident when a register happened to have little data — HSE's 213-row register made the underlying overflow bug obvious where Quality's near-empty one did not.
- Quality Actions and HSE Actions share identical column widths (Action No. 9%, Title 30%, Owner 13%, Source 9%, Due Date 12%, Priority 7%, Status 9%, Action 11%) so the two stay pixel-consistent. My Actions has its own wider column set (Type, Reference, Title, Source, Linked Record, Priority, Due Date, Status, Action) to fit its extra Type/Linked Record columns.
- Title/Owner/Source cells truncate to an ellipsis with a `title` attribute for the full text on hover, and badge/chip columns (Type, Source, Linked Record, Status) carry `overflow: hidden` so an oversized badge clips at its own column boundary instead of visually bleeding into the next cell.
- When adding a column or changing the column set on any of these three registers, recompute the percentages so they still sum to 100% and keep enough width for the widest realistic badge text (e.g. "Audit Finding") — this was the exact bug fixed here.

## Linked Record Sources

Action create dropdowns must allow source-specific linked record selection, including:

- NCR
- MOC
- AINM
- HSE Inspection
- Observations
- Asset Inspection
- Asset Maintenance
- Asset Calibration
- Risk

## Warnings

- Do not break central Action Management while improving module-specific tabs.
- Preserve linked-record behavior and source-specific filtering.
- Route/page access and button-level permissions remain important here because actions can modify records across modules.
- Continue testing module-specific action tabs and linked source chips after permission changes.
- Verify that direct AINM action creation and the full central form both retain the correct `linked_ainm_id` and `linked_ainm_number` without silently assigning a department.
