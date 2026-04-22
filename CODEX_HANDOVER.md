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

## Existing modules
- Dashboard
- Assets
- NCR / CAPA
- Audits
- Actions
- Reports
- Documents

## Key files
- app/page.tsx
- app/assets/page.tsx
- app/ncr-capa/page.tsx
- app/audits/page.tsx
- app/actions/page.tsx
- app/reports/page.tsx
- app/documents/page.tsx
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