# Asset Management Codex Handover

Asset Management exists but its UI layout has lagged behind Quality and HSE. Future work should standardise it against the shared IMS layout and Quality/HSE page patterns.

## Routes

- Dashboard: `app/assets/dashboard/page.tsx`
- Asset register: `app/assets/page.tsx`
- Field route: `app/assets/field/page.tsx`
- Calibration: `app/assets/calibration/page.tsx`
- Inspection: `app/assets/inspection/page.tsx`
- Maintenance: `app/assets/maintenance/page.tsx`
- Asset Actions: `app/assets/actions/page.tsx`
- Asset People: `app/assets/people/page.tsx`
- Asset Reports: `app/assets/reports/page.tsx`

## Current Status

- User requested Asset Management tabs to match the Quality/HSE feel.
- Asset Document ID Code field exists.
- Asset-specific document numbering support exists in Document Control.
- Asset Reports now has the Quality-style saved reports search, Show/Hide Filters pattern, year filter, Clear Filters action, and filtered report count.
- Asset Dashboard KPI cards now drill into the relevant Asset workspaces.
- Asset Dashboard, Calibration, Inspection, Maintenance, and Reports use the shared IMS top meta/status row.
- Asset Inspection and Maintenance retain row-click detail-panel scroll and linked central Action generation.
- Asset Inspection and Maintenance registers now use compact HSE Observation-style table layouts with shared IMS filter panels, quick search, filtered counts, smaller Show/Hide Filters controls, and row-click detail behavior.
- Asset Maintenance debug console output was removed from the save flow.

## Layout Direction

- Assets, Calibration, Inspection, and Maintenance now have internal tabs where suitable, such as Dashboard, Register, Create, and Reports.
- Continue using standard KPI cards and clickable drill-downs.
- Clicking Asset, Inspection, and Maintenance register rows should continue to scroll to the detail panel. Inspection and Maintenance now use compact table registers rather than bulky history cards.
- Asset Reports should continue to mirror Quality Reports, not Documents layout. Saved report filtering and top meta/status row are now aligned; remaining report-page cleanup should focus on panel primitive migration only where it is low risk.

## Recommended Next Actions

1. Verify Asset Dashboard, Register, Calibration, Inspection, Maintenance, and Reports on Vercel with real data.
2. Audit Asset button-level permissions for create, edit, delete, upload, and action-generation controls.
3. Confirm linked Asset Inspection/Maintenance/Calibration action creation opens central Action Management with the correct source fields.
4. Review mobile Asset Inspection and Maintenance registers after the table conversion, especially horizontal scroll, filter search, and detail-panel scroll.
5. Continue low-risk migration of remaining local Asset panel/button/table styles toward shared primitives.

## Document Numbering Link

- Asset-specific documents use the asset document ID code.
- Asset document numbers follow `[asset_document_id_code]-AST-[TYPE]-###`.
- Company/system document numbers remain `ENS-[DEPT]-[TYPE]-###`.

## Warnings

- Do not break links between Asset Inspection/Maintenance/Calibration and central Action Management.
- Keep asset document ID behavior compatible with Document Control.
