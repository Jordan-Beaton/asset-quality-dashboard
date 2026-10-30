# Speak Up (whistleblowing) handover

Anonymous reporting channel inside the IMS. Reporters use a public mobile page (`/speak-up`, reached by QR code); handlers
work cases in the IMS (`/speak-up/cases`); the IMS administrator manages handlers and makes the poster (Admin > Speak Up).

## How it protects reporters
- Reports are encrypted in the reporter's browser (AES-256-GCM case key). The key is locked (RSA-OAEP) for each handler who
  may open the case, and under a key derived from the reporter's access code so they can return. The server stores ciphertext and
  a hash of an authenticator derived from the code. The IMS administrator and database owner cannot read a report.
- Handler private keys are encrypted with the handler's passphrase and only released after the second sign-in step.
- The public page and its APIs are served without the IMS shell and with cookies removed (`src/lib/supabase/middleware.ts`,
  `app/layout.tsx`), so nothing links a signed-in member of staff to a report. Photos pass through the server
  (`/api/speak-up/evidence`) so the reporter's device never contacts storage directly.
- No IP address is stored. Rate limiting is in memory (hashed), plus a channel-wide cap of 60 new reports an hour.

## Who receives reports
- Reports go to active handlers who have a key **and** have been approved for the route. Reports that involve HR, management or IT
  go only to `independent` handlers.
- The first person in a role to set up a key is approved automatically; everyone after (and anyone added, given a new role or
  reactivated by the administrator) must be approved by a handler already approved for that role. The administrator cannot approve.
- Every roster change emails the joined handlers and appears under the Handlers tab. Each handler's key fingerprint is shown to them and
  to the administrator, and the console checks on every unlock that the stored key belongs to the handler's own private key.
- A new report emails every handler who holds it (no content). One handler assigns it; from then on only the assignee is emailed about
  reporter replies. There is deliberately no shared mailbox.

## Reminders
`/api/speak-up/reminders` runs daily at 07:00 UTC (`vercel.json`). Each joined handler gets one content-free email listing their cases that
are near or past the 7-day acknowledgement or 3-month feedback target, unassigned for over a day, or holding a reporter message for over
2 days. `?dry=1` (with the bearer secret) reports counts without sending.

## Lost passphrase
Admin > Speak Up > **Reset key** abandons the handler's old key; they set a new one and must be approved again. Cases only they could open stay locked.

## Handler guide
Process Guides > Speak Up (handlers), shown to Admin users only until HR agree (`app/guides/page.tsx`).

## Setup order (Supabase SQL editor, once each)
1. `scripts/sql/speak_up.sql`
2. `scripts/sql/speak_up_hardening.sql`
3. `scripts/sql/speak_up_assignment.sql`
Pushing does not run these. Enable MFA (TOTP) under Supabase Authentication before handlers or administrators use the live screens.

## Environment switches
- `SPEAK_UP_PUBLIC_ENABLED=true` opens the public reporter page and APIs. Unset, they answer "not open yet", so only signed-in
  handlers and administrators can use the feature. Set it for the live phone test and for launch.
- `SPEAK_UP_REQUIRE_MFA=false` turns the second sign-in step off. For local testing only; never set it on Vercel.
- `NEXT_PUBLIC_SITE_URL` (or the Vercel production URL) is the address used in email links and as the poster QR default.
- `CRON_SECRET` (any long random string) protects the daily reminder job. Vercel sends it automatically to the schedule in `vercel.json`. Without it the reminder route refuses to run.
- Uses the existing `RESEND_API_KEY` and `DOCUMENT_NOTIFICATIONS_FROM_EMAIL`.

## Visibility
The home tile shows for Admin users only (`app/home/page.tsx`). Opening the screens needs a place on the handler list
(`speak_up_handlers`, matched by login email). Handlers on the list who have not joined (no key, not approved) are not emailed.

## Known limits (for the HR paperwork)
- Whoever owns the database or can deploy code could in principle alter keys or served code. The approval step, emails, visible change record
  and key self-check make that detectable rather than impossible.
- A recused or removed handler keeps what they have already read (case keys are not rotated).
- Category, report mode and dates are readable by the database owner. Retention (12 months no action / 6 years action taken) is
  to be confirmed by HR and legal.
- Not built (HR-owned): the whistleblowing procedure, privacy notice and DPIA.

## Files
`app/speak-up/*`, `app/api/speak-up/{public,evidence,handler,admin,reminders}/route.ts`, `src/components/speakup/*`,
`src/components/guides/speakUpGuideContent.tsx`, `vercel.json`,
`src/lib/speakUp{Config,Crypto,Server,Poster}.ts`, `scripts/sql/speak_up*.sql`.
