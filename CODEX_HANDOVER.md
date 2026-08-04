# Asset Quality & Business Management System – Codex Handover

## Stack
- Next.js (App Router)
- Supabase (DB + Storage + Auth)
- Vercel

## Current direction
This is no longer just a dashboard.
It is becoming an internal:
- QMS
- Quality ERP
- Document Control Register
- Audit / NCR / CAPA / Action Management System

The app must stay production-minded, stable, and visually consistent.

## Working rules
- Always return full files, not snippets
- Avoid unnecessary architecture changes
- Keep current structure unless essential
- Keep UI consistent with existing shell/theme
- Do not break schema compatibility
- Do not assume Supabase columns without checking
- Keep document numbering logic intact

## Master UI / Layout rule
Quality Management is the master reference for styling, structure, and layout.

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
- branded primary actions must use the Enshore teal from `imsColours.brand`
- secondary actions must use the shared neutral style
- danger/destructive actions must use the shared danger style
- filters should default to the shared `Show Filters` / `Hide Filters` pattern
- table count text such as "Showing X of Y" must use the shared compact spacing pattern

When a page needs something not covered by the shared primitives, extend the shared primitive/theme first unless the change is genuinely page-specific.

When creating or modifying equivalent tabs in other modules:
- copy the matching Quality Management tab layout
- preserve the same structure, spacing, header style, KPI card style, report layout, table layout, and button placement
- only change the data source and wording to match the relevant module

When creating a new module:
- first copy the equivalent Quality Management page/header structure exactly
- copy the existing Quality Management AppShell/header structure exactly
- then replace only wording and data for the new module
- do not recreate approximate header spacing
- do not create approximate versions of the Quality header, hero, KPI, table, or report structures

Examples:
- Asset Reports must mirror Quality Reports
- Asset Dashboard must mirror Quality Dashboard style
- Asset register pages should mirror the equivalent Quality register/KPI style
- Equivalent tabs must feel like the same system, not separate designs

Do not invent a new layout unless explicitly approved.

Do not mix references between different Quality pages unless asked.

If unsure, stop and ask which Quality Management tab should be used as the master reference before implementing.

## Existing modules
- Dashboard
- Assets
- NCR / CAPA
- Audits
- Actions
- Reports
- Documents
- Project Management

## Key files
- app/page.tsx
- app/assets/page.tsx
- app/ncr-capa/page.tsx
- app/audits/page.tsx
- app/actions/page.tsx
- app/reports/page.tsx
- app/documents/page.tsx
- app/projects/wadden-sea/page.tsx
- app/projects/wadden-sea/itp/page.tsx
- app/projects/wadden-sea/noi/page.tsx
- app/projects/wadden-sea/noi/create/page.tsx
- app/projects/wadden-sea/reports/page.tsx
- app/api/projects/noi-create/route.ts
- src/components/AppShell.tsx
- app/api/document-notifications/route.ts

## Document control rules
- Document number format:
  ENS-[DEPT]-[TYPE]-[###]
- Example:
  ENS-HSEQ-PRO-035
- Number must remain locked after creation
- If a document is reclassified to another department:
  - old doc is superseded/archived
  - new doc gets a new number in the new department sequence
- No backfilling or reusing numbers
- Revision history stays with the old document
- New replacement doc starts at Rev A

## Document workflow now in progress
- Originator added
- Review / approval flow added
- Rejected status added
- Notification route added
- Controlled files are view/download only in-system
- Emails currently test through Resend
- Company-domain delivery is blocked pending IT approval

## Important known logic issue
- Rejection fields currently need tightening:
  - reject fields should only persist when Reject is actually clicked
  - approving/reviewing should clear rejection fields

## Email route
- File:
  app/api/document-notifications/route.ts
- Current sender:
  onboarding@resend.dev
- Vercel env vars required:
  - RESEND_API_KEY
  - DOCUMENT_NOTIFICATIONS_FROM_EMAIL
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY

## Supabase tables already involved
- assets
- asset_quality
- asset_ncr_links
- asset_action_links
- asset_calibration_records
- asset_inspection_records
- asset_files
- ncrs
- capas
- actions
- audits
- audit_findings
- audit_files
- documents
- document_revisions
- monthly_reports
- document_notification_contacts
- document_email_logs

## Storage buckets
- asset-files
- audit-evidence
- quality-evidence
- document-files
- project-documents

## Vercel / Next.js gotchas already discovered
- Some pages needed dynamic rendering / suspense handling for Vercel prerendering
- /actions and /audits have already caused build issues
- Middleware deprecation warning exists but is not the current blocker

## Priority next steps
1. Tighten document workflow logic
2. Fix reject-field persistence
3. Improve notification usefulness
4. Dashboard overhaul
5. Reports overhaul
6. Cross-module linking improvements

## Response style / build approach
- Practical
- Stable
- No risky rewrites
- Keep changes controlled
- Preserve the existing app feel and structure
