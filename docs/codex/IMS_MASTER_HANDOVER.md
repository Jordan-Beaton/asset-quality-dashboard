# IMS Master Codex Handover

This is the permanent entry point for Codex work on the IMS web app. Keep this file short. Put module-specific detail in the matching handover file in this folder.

## Repo

- Path: `C:\Users\JBeaton\asset-quality-webapp`
- Branch normally used: `main`
- Stack: Next.js App Router, React, TypeScript, Supabase, Vercel
- Application shell: `src/components/AppShell.tsx`

## Permanent Rules

- Do not modify application code unless the user explicitly asks for implementation work.
- Do not commit, push, or run deployment commands unless the user explicitly approves.
- Do not expose, print, log, or summarize secrets.
- If SQL is required, provide exact SQL for the Supabase editor.
- For meaningful code changes, run `npm run lint` and `npm run build` unless the user tells you not to.
- Preserve production workflows while improving UI.

## IMS Layout Standard

- Reuse the shared IMS layout, theme, and primitives.
- New modules and pages should match the established Quality/HSE structure.
- Green hero bars, back/status rows, internal tabs, KPI cards, filters, detail panels, and report layouts should stay consistent.
- Do not create one-off local styles unless absolutely necessary.
- If a matching pattern exists in Quality Management, copy the structure first and change only wording/data.

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
