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

