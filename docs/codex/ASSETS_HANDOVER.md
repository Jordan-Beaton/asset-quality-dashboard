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
- Asset Register Dashboard tab now has a cleaner shared-panel layout with an even KPI strip, Due Watch, Quality Links, and Register Health panels.
- Asset Dashboard, Register, Calibration, Inspection, Maintenance, Asset Actions, Asset People, and Reports use the shared IMS top meta/status row.
- Asset Inspection and Maintenance retain row-click detail-panel scroll and linked central Action generation.
- Asset Calibration now has linked central Action generation from the calibration register, and `/actions` accepts the calibration link prefill.
- Asset Inspection and Maintenance registers now use compact HSE Observation-style table layouts with shared IMS filter panels, quick search, filtered counts, smaller Show/Hide Filters controls, and row-click detail behavior.
- Asset Register, Calibration Register, Asset Actions, Asset People, and Asset Reports saved-report registers now use shared IMS register/filter/table primitives aligned to Quality/HSE patterns.
- Asset Maintenance debug console output was removed from the save flow.
- Asset Dashboard/Register, Calibration, Inspection, Maintenance, Asset Actions, Asset People, and Asset Reports now have page-level permission guards around key create/edit/delete/upload/action-generation mutation handlers, supplementing the AppShell click/submit guards.

## Layout Direction

- Assets, Calibration, Inspection, and Maintenance now have internal tabs where suitable, such as Dashboard, Register, Create, and Reports.
- Continue using standard KPI cards, shared register filter panels, shared table styles, and clickable drill-downs.
- Keep Asset dashboard content in compact shared panels rather than separate attention-card strips and explanatory text blocks.
- Clicking Asset, Inspection, and Maintenance register rows should continue to scroll to the detail panel. Asset, Inspection, Maintenance, Calibration, Actions, People, and saved Report registers now use compact shared table styling rather than bulky card/history layouts.
- Asset Reports should continue to mirror Quality Reports, not Documents layout. Saved report filtering and top meta/status row are now aligned; remaining report-page cleanup should focus on panel primitive migration only where it is low risk.

## Recommended Next Actions

1. Verify Asset Dashboard, Register, Calibration, Inspection, Maintenance, and Reports on Vercel with real data.
2. Verify linked Asset Inspection/Maintenance/Calibration action creation on Vercel with real records, including source fields and return/search behavior in central Action Management.
3. Review mobile Asset Inspection and Maintenance registers on device/browser after the table conversion, especially horizontal scroll, filter search, and detail-panel scroll.
4. Continue low-risk migration of remaining local Asset panel/button styles toward shared primitives.
5. Run a role-based Vercel spot check for Asset create/edit/read-only users after real-data workflow QA.

## Document Numbering Link

- Asset-specific documents use the asset document ID code.
- Asset document numbers follow `[asset_document_id_code]-AST-[TYPE]-###`.
- Company/system document numbers remain `ENS-[DEPT]-[TYPE]-###`.

## Warnings

- Do not break links between Asset Inspection/Maintenance/Calibration and central Action Management.
- Keep asset document ID behavior compatible with Document Control.
