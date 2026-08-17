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
- Lessons Learned: `LESSONS_LEARNED_HANDOVER.md`
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
- Lessons Learned central knowledge repository
- Admin / Settings

## Latest Workflow Note

- Public HSE Observations now accumulate multiple photographic/supporting attachments across repeated file-picker or phone-camera selections, show the queued files with individual removal controls, and upload every queued file as a separate evidence record. See `HSE_HANDOVER.md` and `MOBILE_COMPATIBILITY_HANDOVER.md` before changing this flow.
- HSE AINM Part 1/Part 2 now supports inline department-controlled central Action creation, Part 1 containment terminology and attachment `Other` detail, and fuller labelled Word/compiled PDF outputs. See `HSE_HANDOVER.md` and `ACTION_MANAGEMENT_HANDOVER.md` before changing this flow.
- Lessons Learned Prevention Intelligence now supports free-text failure-prevention questions, evidence-linked caution briefings, semantic recurrence retrieval and procedure-to-lessons review. It uses the dedicated server-side `OPENAI_BUSINESS_API_KEY`; see `LESSONS_LEARNED_HANDOVER.md` and apply `scripts/sql/lessons_learned_prevention_ai.sql` before building the semantic index.
