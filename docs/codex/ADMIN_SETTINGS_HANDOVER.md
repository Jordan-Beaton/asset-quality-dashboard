# Admin / Settings Codex Handover

Admin / Settings controls login users, invites, permissions, reference data, and audit log. It is separate from People Management records.

## Routes

- Admin console: `app/admin/page.tsx`
- Admin settings/system: `app/admin/system/page.tsx`
- People roles/admin access: `app/admin/people-roles/page.tsx`
- Admin actions: `app/admin/actions/page.tsx`
- Admin assets: `app/admin/assets/page.tsx`
- Admin departments: `app/admin/departments/page.tsx`
- Admin document control: `app/admin/document-control/page.tsx`
- Admin risk: `app/admin/risk/page.tsx`

## Current Admin UI

- Admin / Settings is simplified to:
  - Users & Access
  - Reference Data
  - Audit Log
- Cluttered Roles, Company, and Notifications tabs were removed from the active Admin UI.
- Users & Access detail panel should stay professional and uncluttered.

## Permissions

- Central permission registry: `src/lib/imsPermissionRegistry.ts`.
- Users & Access and application route enforcement both read the same registry. New modules/tabs must be added there once; do not create another hard-coded Admin permission list.
- Generic `ims_tab_permissions` rows now determine Full, Part Access or None when rows exist, so new modules do not require a new `people` access column.
- Legacy module access columns remain fallback values for existing users who do not yet have rows for a newly registered module.
- Lessons Learnt and Project Management are registered as independent permission modules. Project areas cover Projects, Wadden Sea, Supplier ITP, NOI and Project Reports/Open Points.
- People Management and Management Review have been added to permission controls.
- Module cards on Home remain visible but show No Access if the user has no access.
- `None` module permission now denies module access properly.
- Fine-grained tab permissions are stored and used for route/page access.
- Admin / Settings now has direct page-level create/edit permission guards:
  - Create permission is required to invite new users and add reference departments/projects.
  - Edit permission is required to change existing user access, send setup/reset links, update role defaults, save company settings, and save tab permissions.
  - Matching primary write controls are disabled for restricted users.

## Invite/Login Flow

- Login now includes a public `Request access` workflow for first name, last name, Enshore email, controlled department, reason and requested modules.
- Public API: `app/api/access-requests/route.ts`. It accepts only `@enshoresubsea.com`, validates active departments/modules and blocks duplicate Pending requests.
- Database queue: `ims_access_requests`, created by `scripts/sql/admin_settings.sql`. No anonymous table policy is exposed; the server route writes through the service role after validation.
- A request does not create an account. Master Admin sees a Pending Access Requests notice on IMS Home and the review queue in Users & Access.
- `Review & Prepare` pre-fills the Invite User workflow and gives requested modules view-only access initially. Admin must review/adjust permissions before sending.
- Successful account preparation marks the request Approved. Rejections are recorded and written to the Admin audit log.
- Login page handles Supabase invite/reset links.
- It exchanges invite/recovery code/token into a Supabase session before updating password.
- Confirm password was added.
- Invite links should avoid `Auth Session Missing`.
- Admin invite flow creates/saves user and permissions first, then attempts email invite.
- If email fails or is rate-limited, the user still exists.
- `Copy Setup Link` exists in Admin / Settings -> Users & Access.
- Copy Setup Link generates a secure Supabase setup link without sending email.
- Use Copy Setup Link when Resend rate-limits email.
- If invite email fails, status should clearly say user was created but invite failed.

## Supabase And Env Notes

- Vercel env vars include Supabase URL, anon key, service role, Resend key, notification from email, and OpenAI key.
- Never print secrets.
- User may rotate keys later, but current focus is functionality.
- Resend may rate-limit; Copy Setup Link is the workaround.
- `NEXT_PUBLIC_SITE_URL` should ideally be set to the deployed site URL.
- If `NEXT_PUBLIC_SITE_URL` is missing, the app falls back to Vercel URL/origin.

## SQL/Admin Security

- `scripts/sql/admin_settings.sql` was updated and run.
- Unique people email index exists: `people_email_unique_clean_idx`.
- Duplicate Peter/Paul Ridley issue was resolved manually in Supabase.
- Peter Ridley access works.
- Admin settings SQL includes `people_access` and `management_review_access` columns.

## Recommended Next Work

- Treat Admin / Settings as the next active IMS hardening phase.
- Verify Admin invite flow on Vercel:
  - submit a public access request
  - confirm the Admin-only Home notification and Users & Access queue
  - prepare the request and verify requested modules default to view-only
  - adjust permissions, send the invite, and confirm the request becomes Approved
  - reject a test request and confirm the audit entry
  - create user
  - set permissions
  - use Copy Setup Link
  - user creates password
  - permissions apply correctly
- Test invite-email success, rate-limit/failure messaging, and the Copy Setup Link fallback separately.
- Verify create/edit/read-only behavior for Master Admin, full-access, create-only, edit-only and read-only users.
- Polish the Users & Access detail panel using shared IMS panels, compact filters and predictable action grouping.
- Confirm Reference Data changes feed controlled dropdowns without duplicating People Management.
- Expand Audit Log coverage for user access, permission, setup-link and sensitive reference-data changes.
- Add future permission areas through `IMS_PERMISSION_REGISTRY`; saving Users & Access will automatically persist the corresponding generic rows.
- Keep the three-tab scope; do not restore Roles, Company or Notifications as cluttered top-level tabs without a proven operational need.
