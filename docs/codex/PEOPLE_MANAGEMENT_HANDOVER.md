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
- The page now opens a dashboard-style KPI strip (Total People, Active, Inactive, Departments Represented) plus a clickable "People by Department" breakdown above the register, matching the visual treatment used on Document Control. Clicking a KPI or a department bar filters the register below.
- Clicking a register row opens the full detail/edit panel as a centred modal overlay (same pattern as the Overall Inspections detail panel) instead of an inline panel anchored at the bottom of the page — no more scrolling to reach it.
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

