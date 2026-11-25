# People Management Codex Handover

People Management is the source of person records and dropdown values across the IMS. It is distinct from Admin / Settings login access.

## Routes

- People Management: `app/people/page.tsx`
- Admin people roles/access: `app/admin/people-roles/page.tsx`

## Current Status

- People import from Excel exists.
- Missing emails can be generated as first initial plus surname at `enshoresubsea.com`.
- People table is the source for dropdowns across IMS.
- People Management has been added to permission controls.
- The page uses a persistent split-view layout: a filterable list (search, Active/Inactive/All status chips, department dropdown, "+ Add Person") on the left, and a detail pane on the right that updates instantly when a person is selected — no modal, no scrolling to a panel at the bottom of the page. A slim stats strip (Total/Active/Inactive/Departments Represented) sits above the split view. Three alternate layouts (KPI-dashboard-with-modal, card-grid directory, and this split view) were mocked up as Artifacts and reviewed before implementation; the split view was the one chosen.
- "Add Person" opens a blank form in the same right-hand detail pane rather than a separate always-visible form section.
- Fixed a bug where selecting a person whose `department` was blank/null defaulted the edit form to `"Assets"` (the first entry in the `DEPARTMENTS` array), which risked silently overwriting a person's real department on save. The department field is now genuinely optional end to end: `PersonForm.department` is typed `Department | ""`, both the create and edit dropdowns have a blank "Select department" option, and blank values are saved as `null` rather than an arbitrary default.

## Separation From Admin

- People Management means person records and dropdown source data.
- Admin / Settings means login users, permissions, and invite/setup flow.
- Do not merge these concepts in UI wording or data changes.

## Usage Across IMS

- NCR owner dropdown uses People.
- Internal audit Lead Auditor dropdown uses People.
- MOC name fields use People where required.
- Document Control originator/reviewer/approver values should match People where possible.

## Warnings

- Avoid random demo/test labels visible in production.
- If imported names are bad extraction placeholders, such as `Checker`, blank them unless they match People Management.
- Preserve People as a stable source for dropdowns before changing module-specific person fields.

## Parked Work: Deactivated People Can Still Sign In

Status: **paused by Jordan Beaton on 24 Nov 2026. Nothing has been built.** Pick this up before relying on Deactivate as a security control.

What was found (read from the code, not tested against a live deactivated account):

- A deactivated person can still sign in and hold a valid session. `app/api/auth/login/route.ts` only checks the password (`signInWithPassword`), and `src/lib/supabase/middleware.ts` lets any signed-in user through.
- The only block is client-side. `src/components/AppShell.tsx` (the `isPersonDeactivated` check, around line 988) removes the person's role and module access in the browser. The server never refuses them and their session is never ended.
- Server routes that do refuse deactivated people: `app/api/admin-settings/route.ts`, `src/lib/requireAdmin.ts`, `app/api/invite-link/route.ts`, and the Speak Up admin check in `src/lib/speakUpServer.ts`. **Not checked:** every other API route, and what the database's row-level security lets a still-signed-in deactivated person read or write.
- The two ways of deactivating do different things. People Management's Deactivate button (`toggleSelectedPerson` in `app/people/page.tsx`) only sets `people.active = false` and leaves `access_status` alone. Admin Access's `Deactivated` setting (`updatePersonAccess` in `app/api/admin-settings/route.ts`) sets both (`active = accessStatus !== "Deactivated"`). The master admin account cannot be deactivated.

Proposed fix (agreed in principle):

1. Refuse sign-in for a deactivated person in the login route, with a clear message.
2. End their live sessions when someone is deactivated (use the Supabase admin API from a server route).
3. Make the People Management Deactivate and Reactivate buttons do exactly what Admin Access does, through the same server route, so there is one way to deactivate.
4. Add a server-side deactivated check to the data routes, and review row-level security for the same gap.

Cautions: this changes how everyone signs in, so test it with a throwaway deactivated account and show Jordan the behaviour before pushing. Do not deactivate or edit real people while testing.

