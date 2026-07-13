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

- People Management and Management Review have been added to permission controls.
- Module cards on Home remain visible but show No Access if the user has no access.
- `None` module permission now denies module access properly.
- Fine-grained tab permissions are stored and used for route/page access.
- Admin / Settings now has direct page-level create/edit permission guards:
  - Create permission is required to invite new users and add reference departments/projects.
  - Edit permission is required to change existing user access, send setup/reset links, update role defaults, save company settings, and save tab permissions.
  - Matching primary write controls are disabled for restricted users.

## Invite/Login Flow

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

- Verify Admin invite flow on Vercel:
  - create user
  - set permissions
  - use Copy Setup Link
  - user creates password
  - permissions apply correctly
- Continue Admin / Settings polish.
- Verify Admin / Settings create/edit/read-only behavior on Vercel after the page-level guard pass.
