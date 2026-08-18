# Document Control Codex Handover

Document Control is a central IMS hub, not just a Quality tab. Treat it carefully: numbering, storage, workflow, email, and revision history are critical.

## Routes And APIs

- Document Control: `app/documents/page.tsx`
- Workflow action page: `app/documents/workflow-action/page.tsx`
- Certification: `app/certification/page.tsx`
- Notification API: `app/api/document-notifications/route.ts`
- Workflow action API: `app/api/document-workflow-action/route.ts`

## Numbering Rules

- Company/system documents use `ENS-[DEPT]-[TYPE]-###`.
- Example: `ENS-HSEQ-PRO-035`.
- Asset-specific documents use `[asset_document_id_code]-AST-[TYPE]-###`.
- Document number must remain locked after creation.
- If a document is reclassified to another department, supersede/archive the old document and create a replacement in the new department sequence.
- Do not backfill or reuse numbers.
- Revision history stays with the old document.
- New replacement document starts at Rev A.

## Current Status

- Document Control has asset-specific document numbering support.
- `document_id_code` exists on assets.
- Document Control now has explicit page-level permission guards using `useImsPermissions`:
  - Create permission is required to create draft documents.
  - Edit permission is required for save, submit for review, review acceptance, send to approver, approval, rejection, delete, controlled file upload/remove, and up-rev actions.
  - Supersede & Create New requires both edit permission on the existing document and create permission for the replacement document.
  - Main workflow/file/save/delete buttons are disabled when the current tab permission does not allow the action.
- Big migration from Z drive was performed:
  - Current files uploaded.
  - Revisions/history attempted.
  - Originator/reviewer/approver extracted where possible.
  - Bad extracted names like `Checker` should be blanked unless matching People Management.

## Workflow

- Originator creates draft.
- Send to reviewer.
- Reviewer accepts or rejects.
- Send to approver.
- Approver accepts or rejects.
- Email buttons are planned/partly implemented.

## Revision History Warnings

- Preserve historic revision names, dates, and files.
- Up-rev should archive the previous current revision properly.
- Comments/revision notes should be captured at the up-rev moment.
- Avoid stale free-floating revision notes.
- Detail panel should auto-scroll into view when a document is clicked.

## Email And Secrets

- Emails use Resend. Three flows share the same `DOCUMENT_NOTIFICATIONS_FROM_EMAIL` env var:
  1. `app/api/document-notifications/route.ts` — document upload/review/approval notifications; recipients come from `body.recipientEmails` (dynamic, not hardcoded)
  2. `app/api/document-workflow-action/route.ts` — workflow action emails; recipient is `document.workflow_approver_email`
  3. `app/api/projects/itp-sign-off/route.ts` — ITP sign-off requests and verification codes; recipient entered by the user at sign-off time
- `DOCUMENT_NOTIFICATIONS_FROM_EMAIL` is set to `Document Control <documents@enshoresubsea.com>` in both `.env.local` and Vercel.
- **DNS records for `enshoresubsea.com` must be verified in Resend before emails will send from this address.** Two records need adding at Bondgate (IT contact: Adam Shaw, `AShaw@enshoresubsea.com`):
  - DKIM TXT: name `resend._domainkey`, value `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1Z/UnPmR+1LcH07/KzHLBf0ezjg6osYffTkD3k56D8GlQVLNtOjHKESyb0Mf2a1BGTUjlDkXH3cDnUk5xFjBP0znQ/7YERg3TjZvdj61uqGxqrQh/1TimGsWaMuXEo0u6HSAiBVtRB2LX4nd2C+EfxxoieOl4Eva4xPcPljsq5QIDAQAB`
  - SPF MX: name `send`, value `feedback-smtp.eu-west-1.amazonses.com`, priority `10`
- Check domain verification status: Resend dashboard → Domains, or query `GET https://api.resend.com/domains` with `Authorization: Bearer <RESEND_API_KEY>`. Status must be `verified` (currently `not_started` as of 18 Aug 2026).
- Never expose or print Supabase, Resend, OpenAI, or service-role secrets.
- Relevant Vercel env vars include:
  - `RESEND_API_KEY`
  - `DOCUMENT_NOTIFICATIONS_FROM_EMAIL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`

## Known Logic Issue

- Rejection field cleanup has been tightened in the local Document Control page and workflow email API:
  - Reject fields persist only when the document workflow status is `Rejected`.
  - Submit/review/send-to-approver/approve paths explicitly clear rejected by/date/reason.
  - Controlled file upload now follows the same workflow-status rules and clears stale rejection fields on non-rejected paths.
- Verify the full reject -> resubmit -> review -> approve flow on Vercel with a real document before clearing this item completely.

## Warnings

- Do not assume Supabase columns without checking.
- Do not change numbering, revision, storage, or workflow behavior casually.
- Controlled files are intended to be view/download only in-system.
