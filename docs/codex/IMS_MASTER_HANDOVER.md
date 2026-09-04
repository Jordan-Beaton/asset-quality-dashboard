# IMS Master Codex Handover

This is the permanent entry point for Codex work on the IMS web app. Keep this file short. Put module-specific detail in the matching handover file in this folder.

## Repo

- Path: `C:\Users\JBeaton\asset-quality-webapp`
- Branch normally used: `main`
- Stack: Next.js App Router, React, TypeScript, Supabase, Vercel
- Application shell: `src/components/AppShell.tsx`
- Local Windows development sets `NODE_OPTIONS=--use-system-ca` for the complete `npm run dev` process tree; preserve this form because every Next.js child authentication/proxy worker must start with Node's Windows system-CA support enabled. Without it, Enshore's corporate TLS inspection prevents server-side Supabase session validation and causes `Failed to fetch` or a localhost login redirect loop. Authentication interception uses the Next.js 16 Node-runtime `proxy.ts` convention rather than deprecated Edge `middleware.ts`.

## Permanent Rules

- Do not modify application code unless the user explicitly asks for implementation work.
- Do not commit, push, or run deployment commands unless the user explicitly approves.
- When the user explicitly says `push changes`, `push all changes`, `push changes live`, or equivalent, treat that as approval to inspect the complete worktree, run the handover-required validation, stage all safe current changes, create one appropriate commit on `main`, and push directly to `origin/main` using the repository's existing Git credentials. Do not require GitHub CLI, create a branch, or open a pull request unless the user specifically requests that workflow. Stop only for an evidenced secret, generated artifact, unexpectedly large file, database migration, or another materially risky change.
- A successful push to `origin/main` is the established deployment workflow and the existing GitHub-to-Vercel integration handles deployment automatically. Do not propose or install deployment plugins, create a Vercel CLI link, or switch deployment methods unless the user explicitly requests an alternative. Retry the same normal push workflow after a transient network or DNS failure before reporting it as blocked.
- A request to commit or push does not authorize database migrations or a separate manual deployment.
- Do not expose, print, log, or summarize secrets.
- If SQL is required, provide exact SQL for the Supabase editor.
- For meaningful code changes, run `npm run lint` and `npm run build` unless the user tells you not to.
- Run `npm run check:ui` for every UI, page, output, shared-component, or theme change. Treat failures as regressions, not optional style advice.
- Preserve production workflows while improving UI.

## IMS Layout Standard

- Reuse the shared IMS layout, theme, and primitives.
- New modules and pages should match the established Quality/HSE structure.
- Enshore dark-blue hero bars, back/status rows, internal tabs, KPI cards, filters, detail panels, and report layouts should stay consistent.
- The approved 2026 Enshore palette and restricted-colour rules are defined in `UI_STANDARDS.md`; do not reintroduce the legacy teal palette.
- IMS Home is a compact access launchpad, not a dashboard. Preserve its official synchronized Enshore animation, equal-size permission-aware workspace cards, six desktop view layouts, persisted desktop preference, and phone-only simple list behavior as defined in `UI_STANDARDS.md`.
- At phone widths IMS Home deliberately becomes a simple workspace list without the view selector. Across secured modules, preserve the shared bottom navigation, automatic labelled register cards, expandable secondary row fields, compact collapsible panels, one-column forms, and unchanged desktop behavior.
- Read `MOBILE_COMPATIBILITY_HANDOVER.md` before changing responsive behavior. It defines the shared breakpoint, register-card engine, public/field exceptions, device QA matrix, and desktop-preservation checks.
- Mobile compatibility is a mandatory definition of done for every new module, route, tab, form, register and dialog. AppShell applies the shared responsive contract automatically; do not remove or bypass `ims-responsive-contract`, `MobileCompatibilityGuard`, or `MobileTableEnhancer`.
- Do not create one-off local styles unless absolutely necessary.
- If a matching pattern exists in Quality Management, copy the structure first and change only wording/data.
- The whole-IMS standardisation completed on 10 August 2026 is a permanent baseline, not an open redesign task. Do not schedule another broad standardisation pass unless the user explicitly requests a new design direction or an evidenced regression is found.
- `UI_STANDARDS.md` is normative. `IMS_UI_AUDIT_2026-08-10.md` records the completed baseline and its remaining environment-dependent QA, while `PROJECT_ROADMAP.md` tracks only genuine product/workflow work.
- New pages must use the shared primitives and theme tokens. Any necessary exception must be documented in `UI_STANDARDS.md` in the same change.
- Operational dashboards follow the interactive command-view and high-contrast analytics contract in `UI_STANDARDS.md`. Keep reporting-period controls out of the top meta/status row and preserve all live drill-down behaviour.

## Module Handovers

- Quality Management: `QUALITY_HANDOVER.md`
- HSE Management: `HSE_HANDOVER.md`
- Asset Management: `ASSETS_HANDOVER.md`
- Document Control: `DOCUMENT_CONTROL_HANDOVER.md`
- Admin / Settings: `ADMIN_SETTINGS_HANDOVER.md`
- People Management: `PEOPLE_MANAGEMENT_HANDOVER.md`
- Action Management: `ACTION_MANAGEMENT_HANDOVER.md`
- Project Management: `PROJECT_MANAGEMENT_HANDOVER.md`
- Lessons Learnt: `LESSONS_LEARNED_HANDOVER.md`
- Whole-IMS mobile compatibility: `MOBILE_COMPATIBILITY_HANDOVER.md`

## Current IMS Modules

- Quality Management
- HSE Management
- Asset Management
- Document Control
- Action Management
- People Management
- Management Review
- Risk Management shell/functionality
- Project Management with Wadden Sea workspace
- Lessons Learnt central knowledge repository
- Admin / Settings

## Latest Workflow Note

- Public HSE Observations now accumulate multiple photographic/supporting attachments across repeated file-picker or phone-camera selections, show the queued files with individual removal controls, and upload every queued file as a separate evidence record. See `HSE_HANDOVER.md` and `MOBILE_COMPATIBILITY_HANDOVER.md` before changing this flow.
- HSE AINM Part 1/Part 2 now supports inline department-controlled central Action creation, Part 1 containment terminology and attachment `Other` detail, and fuller labelled Word/compiled PDF outputs. See `HSE_HANDOVER.md` and `ACTION_MANAGEMENT_HANDOVER.md` before changing this flow.
- Lessons Learnt Prevention Intelligence now supports free-text failure-prevention questions, evidence-linked caution briefings, semantic recurrence retrieval and procedure-to-lessons review. It uses the dedicated server-side `OPENAI_BUSINESS_API_KEY`; see `LESSONS_LEARNED_HANDOVER.md` and apply `scripts/sql/lessons_learned_prevention_ai.sql` before building the semantic index.
- IMS email notifications (document workflows, ITP sign-off) are configured to send from `Document Control <documents@enshoresubsea.com>` via Resend. `DOCUMENT_NOTIFICATIONS_FROM_EMAIL` is set correctly in both `.env.local` and Vercel. Domain `enshoresubsea.com` was verified in Resend on 18 Aug 2026 — DKIM, SPF MX, and SPF TXT all confirmed. Email delivery from `documents@enshoresubsea.com` is live. See `DOCUMENT_CONTROL_HANDOVER.md` for full DNS record details.
- Whole-IMS detail panel visual standardisation is complete. All module detail panels use a consistent tinted gradient background. Bold field values resolved globally via `app/globals.css`.
- Document Control's Update Responsible Persons modal now includes Originator alongside Reviewer and Approver, and the Up-rev description entered when issuing a new revision is saved to General Comments and carried through automatically into the reviewer and approver workflow emails as a "What's changed" note. See `DOCUMENT_CONTROL_HANDOVER.md`.
- The Quality dashboard operational control score is now genuinely Quality-only: document review health was removed (Document Control has no data-level split between Quality and HSE documents — both share one "HSEQ" department), and NCR closure/Finding closure/MOC closure/Quality action pressure are re-weighted to 30/30/20/20. `isQualityAction` no longer has a permissive fallback that misattributed non-Quality-department actions (e.g. Logistics, Manual source) into the Quality score. Critical Pressure and Open Workload KPI cards now drill into real Critical Pressure Items / Open Workload Items panels on the Planning tab listing the actual underlying NCRs, findings, MOCs, actions, and overdue HSEQ documents, instead of linking to a mismatched or unrelated page. See `QUALITY_HANDOVER.md`.
- Central Action Management's My Actions tab now merges NCR and Audit Finding records owned by the signed-in person alongside central Actions, each with its own Type badge and a link to its own record (NCR/Audit Finding read visibility here is intentionally not gated by NCR/Audits module permission — see `ACTION_MANAGEMENT_HANDOVER.md`). My Actions, Quality Actions, and HSE Actions registers all use a fixed-width table layout with consistent column widths so none of them require horizontal scrolling regardless of row count.
- Process Guides (`/guides`) is now a four-guide hub — Document Control, NCR, MOC, and AINM — sharing a visual toolkit in `src/components/guides/guideKit.tsx` with each guide's content in its own file. A "Process Guides" nav entry was added to the Quality and HSE sidebars alongside Document Control's existing one.
- Fixed a class of permission bug where routes not in `getAccessAreaFromHref` (`src/components/AppShell.tsx`) silently defaulted to Quality-module access regardless of which sidebar they appeared in. `/guides` was the confirmed instance (added a dedicated `guides` access area, granted to anyone with Quality, Documents, or HSE access) — the same href-to-area resolver is hand-maintained for every other route, so re-check it whenever a new top-level route is added elsewhere. The IMS Home access-request banner also moved from Master-Admin-only to any `system_role = "Admin"` user via a new `isAdmin` field on `ImsPermissionValue`.
- Management Review (`app/management-review/page.tsx`) was rebuilt as a whole-business, permission-aware live snapshot — Quality, HSE, Document Control, Project Delivery, Asset Management, Action Management (all 15 departments), and Lessons Learnt, each with its own On Track/Needs Attention/Critical status instead of a single blended score. See `PROJECT_ROADMAP.md` Management Review section for the full list of bugs fixed and gaps closed before touching this page again.
- Added "Base" to the Action department list (now 16 departments). Every action-creation path — central, Quality/HSE/Assets Create Action forms, AINM's inline corrective-action creator, and bulk import — now records who raised the action (`raised_by_email`), shown as "Raised by X" in the central Action Register and edit panel. Status-change and close-out notifications now email the current owner as well as the raiser (previously raiser only). See `ACTION_MANAGEMENT_HANDOVER.md`.
