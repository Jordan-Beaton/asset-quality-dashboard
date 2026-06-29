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

