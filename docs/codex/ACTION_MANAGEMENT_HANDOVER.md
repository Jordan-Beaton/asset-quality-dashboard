# Action Management Codex Handover

Action Management is a top-level module with module-specific action tabs feeding the central `/actions` route.

## Routes

- Central Actions: `app/actions/page.tsx`
- Quality Actions: `app/quality/actions/page.tsx`
- HSE Actions: `app/hse/actions/page.tsx`
- Asset Actions: `app/assets/actions/page.tsx`
- Risk Actions: `app/risk/actions/page.tsx`

## Current Status

- Central `/actions` route is preserved.
- Quality, HSE, and Assets have module-specific action tabs that feed central Actions.
- HSE Actions and Quality Actions should show department/module-specific actions.
- My Actions was improved but may need further testing.
- Linked record chips/buttons should open the linked record.
- AINM Part 1 and Part 2 can now create central actions inline with explicit title, description, department, owner, priority, and target date fields.
- AINM-linked departments are selected explicitly and are not inferred from the accountable person.
- The AINM `Open Full Action Form` route supplies source/link/project context only; title, description, department, and owner remain blank for manual completion.
- Linked central AINM actions are included alongside legacy tracker actions in Part 2 Word and compiled PDF outputs.
- Central `/actions` now has explicit page-level permission guards using `useImsPermissions`:
  - Create permission is required for manual action creation, evidence attached during creation, and bulk action import.
  - Edit permission is required for action edits, deletes, evidence upload, and evidence delete.
  - Main write buttons/file inputs are disabled when the current tab permission does not allow the action.

## Linked Record Sources

Action create dropdowns must allow source-specific linked record selection, including:

- NCR
- MOC
- AINM
- HSE Inspection
- Observations
- Asset Inspection
- Asset Maintenance
- Asset Calibration
- Risk

## Warnings

- Do not break central Action Management while improving module-specific tabs.
- Preserve linked-record behavior and source-specific filtering.
- Route/page access and button-level permissions remain important here because actions can modify records across modules.
- Continue testing module-specific action tabs and linked source chips after permission changes.
- Verify that direct AINM action creation and the full central form both retain the correct `linked_ainm_id` and `linked_ainm_number` without silently assigning a department.
