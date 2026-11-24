# Mobile, Documents, Guides And Standardisation Review - 23 November 2026

Status: all changes below are in the working tree, type-checked and built (`npm run build` passes). Nothing is committed or pushed. `npm run check:ui` still fails only on the existing Document Control off-palette colours (see "Decisions").

## 1. Phone compatibility sweep

Method: signed in locally, 63 routes loaded at 375px in a frame; for each route the tabs, filters and first record were opened and every element was measured for horizontal overflow and crushed buttons. Zero page-level overflow found after the fixes. Not covered: forms and dialogs were not clicked through, and the per-project routes (`/projects/[projectKey]/...`) were not swept. Read-only: no data was saved.

Fixed:

- Panel header buttons ran off the right edge (Export Excel / Export PDF / New Inspection): `src/components/ModuleSectionHeader.tsx` now wraps.
- Document Control summary strip ran off screen: `app/documents/page.tsx`.
- Text boxes under 16px made iPhones zoom in: the existing 16px rule lost to a more specific rule; fixed in `app/globals.css` (phone usability block).
- Row Expand/Collapse buttons and Back links under 30px: now 40px.
- Header rows of `display:flex; justify-content:space-between` crushed (AINM dashboard Export button stacked letter by letter): global wrap rule.
- Long registers (up to 36 screens as cards): `src/components/MobileTableEnhancer.tsx` shows 25 then a `Show N more` button.
- Process Guides page: drop-downs replace two long button rows on a phone.

## 2. Phone-first layout

- IMS Home on a phone: compact hero, `Log something` strip (Observation, Incident, Site inspection, Asset check, All field tools - permission-aware), 56px workspace list.
- Figure tiles two across (52px), slim banner, back and status bars, tabs, panels (`app/globals.css`, "Phone density").
- Recorded in `docs/codex/UI_STANDARDS.md` (KPI cards, Mobile Responsiveness, Files, Closed Items).
- Mockup: https://claude.ai/artifact/AL5ZETCiPEybAwYeLq3Lom

## 3. Documents opening on phones

New shared helpers: `src/lib/fileOpen.ts` (`openFileUrl`, `saveBlobAsFile`, `openOrSaveBlob`) and `src/lib/fileTypes.ts` (accepted types, `uploadContentType`).

- About 30 "open file" buttons used `window.open` after an `await` with `noopener`: blocked on iPhones and many Android browsers. All now use `openFileUrl`.
- 12 modules built downloads with an unattached link and immediate `revokeObjectURL`, which fails on Safari. All now use `saveBlobAsFile`.
- HSE inspection upload inputs used `capture="environment"`, which on Android allows the camera only. Removed from both HSE inspection upload inputs.
- Every document/evidence upload now accepts PDF, Word, Excel (incl. xlsm), PowerPoint, CSV, text and photos (incl. HEIC); MOC list extended. Every storage upload now sends a content type derived from the file name when the phone reports none.
- Not changed: jsPDF `doc.save()` PDFs (risk register, management review, review points, document register, calibration `XLSX.writeFile`, etc.) still use the library's own save. Believed fine on current iOS/Android but not tested on a device.
- Could not be tested end to end here (no uploads to live data). Test on an iPhone and an Android phone: open a PDF, a Word and an Excel evidence file; download an NCR Word report.

## 4. Bug found and fixed

Document Control periodic-review email: the `Raise a Concern` link opened a page with no text box, and the server refuses a concern without text, so it always failed. `app/documents/workflow-action/page.tsx` now shows a `Your Concern` box.

## 5. Process guides

Registered in `app/guides/page.tsx` (19 guides; Admin guide admins only, Speak Up admins and handlers only).

New (13): Actions, Observations, Inspections, Permit to Work, Audits, Assets, Risk, Lessons Learnt, Certification, Management Review, Projects & ITPs, Reports & Calendars, Using the IMS on a Phone, Admin & People.
Updated (6): Document Control, ITP Review Points, NCR/CAPA, MOC, AINM, Speak Up. The AINM guide was materially wrong (invented Owner field and Complete buttons, Part 1/2 swapped) and was rewritten.

The guides were written by reading the code; none has been proofread by a person or tested in the browser. Read at least the ones for modules you own.

## 6. Open questions raised while writing the guides (possible app issues)

- People Management `Deactivate` sets `active=false`; only Admin Access `Deactivated` appears to block sign-in. Confirm a deactivated person cannot log in.
- Setting Admin module `Full` on a person does not set `system_role=Admin` (the invite form does).
- Parts can only be set when a project is created; no edit UI.
- People page department list is hard-coded (15 values), not the Reference Data departments.
- Risk Controls, Opportunities, Reviews, Actions, Reports and seven Admin settings pages are placeholder shells.
- Handover docs say invites go via Supabase email; the code uses Resend.
- Actions register `All Sources` filter omits AINM, HSE Inspection and Observation sources.
- Observations: `closed_by` / `closed_at` appear in the Excel export, but nothing in the page sets them.
- Document Control sign-off link page may not be on the public route list (`src/lib/supabase/middleware.ts`), so recipients may need to sign in.
- HSE inspection PDFs embed only PNG/JPG/WEBP photos; iPhone HEIC photos show as links.
- Overall Inspections 8-week lookahead ignores the Project and Attendee filters.
- Monthly report PDFs now open in a tab and also save a copy (as before on desktop); on a phone with pop-ups blocked they save once.
- Permit to Work has no Cancelled status and no approval workflow; the dashboard `Reports Ready: Pending` and `Template Layout` tab look like placeholders.
- ITP team comments database script (`scripts/sql/project_itp_team_comments.sql`, table `project_itp_comment_requests`) must be applied in Supabase; confirm it has been.
- Pre-existing lint errors: `src/components/InspectionRecordsPage.tsx:479` (unescaped quotes).

## 7. Decisions for you

See https://claude.ai/artifact/96L9DA1C1me5RRaDbFdFGN (standardisation review). Built already: page heading weight 700 (one line in `app/globals.css`). Awaiting your call: button/input sizes, one register toolbar and wording, placeholder pages (hide or card), approving status tints so Document Control passes `check:ui`, moving local panels to `ImsPanel`, short labels on the phone bottom bar.

## 8. Not started / not done

- Forms, dialogs and modal flows were not clicked through at phone width.
- Per-project routes not swept; 320px width not swept (375px only).
- No real-device test.
- Nothing pushed.
