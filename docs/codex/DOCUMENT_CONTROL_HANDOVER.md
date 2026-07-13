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

- Emails currently use Resend.
- Company-domain delivery may be blocked pending IT approval.
- Never expose or print Supabase, Resend, OpenAI, or service-role secrets.
- Relevant Vercel env vars include:
  - `RESEND_API_KEY`
  - `DOCUMENT_NOTIFICATIONS_FROM_EMAIL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`

## Known Logic Issue

- Rejection fields need tightening.
- Reject fields should only persist when Reject is actually clicked.
- Approving/reviewing should clear rejection fields.

## Warnings

- Do not assume Supabase columns without checking.
- Do not change numbering, revision, storage, or workflow behavior casually.
- Controlled files are intended to be view/download only in-system.
