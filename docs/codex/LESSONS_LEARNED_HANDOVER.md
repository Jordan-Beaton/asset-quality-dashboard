# Lessons Learned Codex Handover

## Status

Implemented and live. Production QA and continued data-quality improvement remain necessary because the historic source data is inconsistent.

## Route and data

- Main route: `app/lessons-learned/page.tsx`
- Database migration: `scripts/sql/lessons_learned.sql`
- Import source used during implementation: `Enshore Master Lessons Learnt.xlsx`
- The module is a central, blame-free repository for project insight, operational discoveries, repeat failures, successful practices and recommended action.

## Current workflow

- Dashboard, Register, Create, Import, Reports and controlled reference views follow the shared Quality-style IMS layout.
- KPI cards and analytical panels drill into the corresponding filtered register dataset.
- Register filters are cumulative: later project/department selections must remain constrained by earlier filters such as Open status.
- The register uses fixed column widths so filtering does not move the layout.
- Desktop fixed-column behavior remains unchanged. At phone widths the register inherits the shared labelled-card and Expand/Collapse behavior; use the horizontal-scroll opt-out only if physical-device QA proves the linked-learning context cannot be represented safely as cards.
- Project Code and Project Name use controlled choices with Add New support; user-facing values must not include `Historic`.
- Originator and Line Manager use People Management.
- Asset uses Asset Management reference data.
- J and B project records are treated as historic/closed; ENS project records can remain open.
- Evidence supports photographs and supporting files.
- Field Tools now includes permission-aware `Capture a Lesson`, linking to `/lessons-learned?view=create&mode=field`.
- Field mode uses the existing Lessons Learned record, numbering, permission, reference-data and evidence workflows. It shows essential capture fields first, keeps additional classification/ownership fields in expandable `Optional detail`, returns to Field Tools, and stays ready for another capture after save.
- Repeat groups link recurring lessons and should open the complete linked dataset, not only the source record.
- “What We’ve Learned” uses a single interactive rotating insight card on a five-second cycle.
- Historic imports and KPI counts must support substantially more than 1,000 rows.

## Analytics direction

- Prioritise repeat themes, recurring departments/projects/assets, open-action ageing, criticality, trend direction and failure recurrence.
- Historic narrative quality varies; avoid overstating automated conclusions where source descriptions are vague or inconsistent.
- Preserve blame-free language and focus findings on processes, controls and prevention.
- Use the rotating learning panel for concise, positive prevention messages derived from actual records.

## Guardrails

- Do not reintroduce hard 1,000-row query or KPI caps.
- Do not make filter option lists ignore the active filter context.
- Do not allow user-entered variants where controlled People, Project or Asset references exist.
- Do not delete historic evidence or repeat relationships when correcting classifications.
- Keep register columns fixed and use shared `ImsFilterPanel`, `ImsPanel`, KPI and report patterns.

## Next QA

1. Verify the full 2,990-row historic import count and rejection summary.
2. Verify KPI totals against direct database counts above 1,000.
3. Test cumulative Status -> Project -> Department filtering.
4. Test every KPI/chart drill-down and repeated-record insight link.
5. Verify Project/People/Asset controlled dropdowns and Add New behavior.
6. Verify the mobile register cards, secondary-field expansion, repeat-record drill-down and evidence controls on a physical phone while confirming desktop fixed-column behavior is unchanged.
7. Verify Field Tools -> Capture a Lesson on a physical phone for create/read-only permissions, project selection, optional-detail expansion, photo upload, successful numbering and repeat capture.
