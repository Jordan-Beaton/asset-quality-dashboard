# Asset Quality & Business Management System – Codex Handover

## Stack
- Next.js 16.2.3 (App Router, Turbopack)
- Supabase (DB + Storage + Auth)
- Vercel (auto-deploy from GitHub main)
- Resend (transactional email)

## Current direction
This is no longer just a dashboard.
It is becoming an internal:
- QMS
- Quality ERP
- Document Control Register
- Audit / NCR / CAPA / Action Management System
- Project Management workspace (ITP, NOI, Inspection Records)

The app must stay production-minded, stable, and visually consistent.

## Working rules
- Always run `npm run build` before pushing — build failures block Vercel deployment
- Avoid unnecessary architecture changes
- Keep current structure unless essential
- Keep UI consistent with existing shell/theme
- Do not break schema compatibility
- Do not assume Supabase columns without checking
- Keep document numbering logic intact
- Never commit `.env.local`, `tmp/`, or database migrations unless explicitly requested

## Master UI / Layout rule
Quality Management is the master reference for styling, structure, and layout.

## Project workspace layout rule
All project workspace pages (ITP Tracker, NOI Tracker, NOI Creator, Inspection Records, Reports, ITP Sign-Off)
must use this exact layout pattern — no exceptions:

```tsx
return (
  <main style={{ display: "grid", gap: 16 }}>
    <QualityPageHero label="..." title="..." description="..." />
    <ImsTopMetaRow status={<><strong>Status:</strong> {message || "..."}</>} />
    <ProjectWorkspaceNav projectKey={projectKey} active="tab-key" />
    {/* KPI grid, content panels */}
  </main>
);
```

`QualityPageHero` from `./QualityPageHero` — requires `label`, `title`, `description` props even if not all rendered.
`ImsTopMetaRow` from `./ImsPrimitives`.
`ProjectWorkspaceNav` from `./ProjectWorkspaceNav`.

## IMS shared UI primitives rule
The IMS layout is now partially centralised in shared components and theme tokens.

For any new tab, module page, register, report page, or major layout change:
- use `QualityPageHero` for the green hero bar
- use `QualityKpiCard` for KPI/info cards
- use `ModuleSectionHeader` for green section headers
- use `src/components/imsTheme.ts` for colours, radii, shadows, buttons, filter panels, tabs, table rows, and top-meta layout
- use `src/components/ImsPrimitives.tsx` primitives where practical:
  - `ImsTopMetaRow`
  - `ImsTabs`
  - `ImsPanel`
  - `ImsFilterPanel`
  - `ImsButton`
  - `ImsLinkButton`
- do not create new one-off button colours, tab styles, filter panel styles, table count rows, or top-meta rows unless explicitly approved
- branded primary actions must use the Enshore teal from `imsColours.brand` (`#005670`)
- secondary actions must use the shared neutral style
- danger/destructive actions must use the shared danger style
- filters should default to the shared `Show Filters` / `Hide Filters` pattern

When a page needs something not covered by the shared primitives, extend the shared primitive/theme first.

Do not invent a new layout unless explicitly approved. If unsure, check `NoiTrackerPage.tsx` as the reference.

## Existing modules
- Dashboard
- Assets
- NCR / CAPA
- Audits
- Actions
- Reports
- Documents (Document Control)
- Project Management
  - Dashboard
  - ITP Tracker
  - NOI Tracker
  - NOI Creator
  - Inspection Records ← NEW (Aug 2026)
  - ITP Sign-Off
  - Project Reports

## Key files
- app/page.tsx
- app/documents/page.tsx
- app/projects/[projectKey]/inspection-records/page.tsx  ← NEW
- app/api/document-notifications/route.ts
- app/api/document-workflow-action/route.ts
- app/api/projects/inspection-records/route.ts  ← NEW
- src/components/InspectionRecordsPage.tsx  ← NEW
- src/components/ProjectWorkspaceNav.tsx
- src/lib/projectRegistry.ts
- src/components/imsTheme.ts
- src/components/ImsPrimitives.tsx
- src/components/QualityPageHero.tsx
- src/components/NoiTrackerPage.tsx  ← master layout reference for project pages

## Document control rules
- Document number format: ENS-[DEPT]-[TYPE]-[###]
- Example: ENS-HSEQ-PRO-035
- Number locked after creation — never editable
- Reclassification: supersede old doc, create new in new department sequence
- No backfilling or reusing numbers
- Revision history stays with old document; replacement starts at Rev A

## Document workflow (current state — fully live)
- Full Draft → Pending Review → Reviewed → Pending Approval → Approved chain
- Single-use token emails for all reviewer/approver actions
- Periodic review (no changes): `markReviewedNoChanges()` sends token email to approver
  - `next_review_date` only advances when approver confirms via token (`confirm_periodic_review`)
  - `approved_at` is not changed until approver confirms
  - Approver can also "Raise a Concern" — document stays Approved, concern logged
- Token actions in `app/api/document-workflow-action/route.ts`:
  - `accept_review`, `reject_review`
  - `approve_document`, `reject_approval`
  - `confirm_periodic_review`, `reject_periodic_review`
- All workflow emails branded with gradient header (#005670 → #63B1BC)
- Controlled file (signed URL, 7-day expiry) included in all workflow emails

## Inspection Records module (NEW — Aug 2026)
Purpose: close the loop on completed inspection documentation — link evidence back to NOIs and ITP W/H points, notify external contacts.

Key tables (migration in `tmp/inspection_records_migration.sql` — already applied):
- `inspection_records` — one record per inspection event; stores `noi_number`, `point_snapshots` (JSONB snapshot of selected `project_noi_points` rows), `recipients` (JSONB [{name, email}])
- `inspection_record_files` — files attached to a record; stored in `project-documents` bucket at `{projectKey}/inspection-records/{recordId}/{timestamp}-{filename}`
- `inspection_record_notifications` — log of every notification send

ITP/Supplier lookup: resolved at notification-send time by joining `point_snapshots[0].id` → `project_noi_points.itp_id` → `project_itps`

Email: branded (gradient header), includes NOI ref, ITP number, ITP title, supplier, W/H points table, file download buttons with 7-day signed URLs.

## Email routes
- `app/api/document-notifications/route.ts` — document workflow notifications (requires auth)
- `app/api/document-workflow-action/route.ts` — token-based workflow actions
- `app/api/projects/inspection-records/route.ts` — inspection record notifications (requires auth)

Env vars required on Vercel:
- `RESEND_API_KEY`
- `DOCUMENT_NOTIFICATIONS_FROM_EMAIL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_BUSINESS_API_KEY` (server-side only, never expose)

## Supabase tables
- assets, asset_quality, asset_ncr_links, asset_action_links, asset_calibration_records
- asset_inspection_records, asset_files
- ncrs, capas, actions, audits, audit_findings, audit_files
- documents, document_revisions, document_workflow_tokens, document_email_logs
- monthly_reports, document_notification_contacts
- project_itps, project_itp_revisions, project_noi_points
- inspection_records, inspection_record_files, inspection_record_notifications  ← NEW
- people (open anon RLS — fix before go-live)

## Storage buckets
- asset-files
- audit-evidence
- quality-evidence
- document-files
- project-documents (ITP files + NOI PDFs + inspection record attachments)

## Security notes (fix before go-live)
- `people` table has open anon RLS
- `ncr_capa_pdfs` table has open anon RLS
- `/api/document-notifications` has no auth check
- `/api/report-summary` has no auth check
- Hardcoded `Jordan Beaton` / `jbeaton@enshoresubsea.com` as workflow defaults
- `OPENAI_BUSINESS_API_KEY` must stay server-side only

## Known issues / in-progress
- Rejection fields: should clear when a document progresses past rejection (not currently enforced)
- Company-domain email delivery: pending IT approval (currently via Resend verified domain)

## Priority next steps
1. Fix rejection field persistence
2. Dashboard overhaul
3. Reports overhaul
4. Cross-module linking improvements
5. Security fixes (anon RLS, unauthed API routes)
6. Inspection Records: test full end-to-end flow once migration confirmed applied

## Response style / build approach
- Practical, stable, no risky rewrites
- Run `npm run build` before every push
- Keep changes controlled and scoped
- Preserve the existing app feel and structure
