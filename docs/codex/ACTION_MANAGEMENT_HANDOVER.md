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
