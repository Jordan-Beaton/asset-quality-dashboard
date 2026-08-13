# IMS UI Standards

This file is the single source of truth for reproducing the IMS visual language. A new Codex thread should read this file with `IMS_MASTER_HANDOVER.md` before creating or changing any IMS page.

The whole-IMS baseline was completed on 10 August 2026 and is recorded in `IMS_UI_AUDIT_2026-08-10.md`. These rules are mandatory regression constraints. Run `npm run check:ui` after any UI-related change and the full `npm run check` before handing over meaningful implementation work.

Base new UI on the current implemented IMS, especially the shared components in `src/components` and the more standardised Quality/HSE pages.

## Core Principle

The IMS is an internal operational system, not a marketing site. Pages should feel professional, calm, dense enough for repeated work, and visually consistent across Quality, HSE, Assets, Documents, Actions, People, Risk, Management Review, and Admin.

Do:

- Reuse shared IMS components and theme tokens first.
- Copy the closest existing Quality/HSE page structure before inventing layout.
- Keep page rhythm consistent: hero, top meta/status row, internal tabs when needed, KPI cards, workspace panels, filters/registers, detail panel, reports.
- Keep actions predictable and near the content they affect.
- Use live, operational language. Avoid demo labels in production screens.

Do Not:

- Create one-off button colours, tab styles, filter panels, table styles, or hero variants unless the shared components cannot support the need.
- Make module pages feel like separate apps.
- Add bulky decorative layouts, marketing hero sections, random gradients, or oversized cards.
- Hide important workflow controls in unusual locations.
- Reopen broad visual standardisation as roadmap work merely because a legacy page still has local style constants; rendered conformance is enforced globally and internal migration is opportunistic.

## Change Control

- Prefer extending `ImsPrimitives.tsx`, `imsTheme.ts`, `exportTheme.ts`, and the shared global contract over adding page-local visual variants.
- Approved six-digit interface colours are checked automatically. If a genuinely new semantic colour is required, update the brand guidance, shared tokens, and UI checker together and explain the exception.
- Standalone user-facing `Refresh` controls are prohibited and checked automatically. Data must load on entry and reload after successful mutations while the status message reports progress or failure.
- A new register must inherit `ims-data-table` behaviour or use the `ims-register-shell`, `ims-register-head`, and `ims-register-row` hooks for a non-semantic grid.
- A new tab set must expose active state semantically through the shared `ImsTabs` primitive or equivalent `role`, `aria-selected`, and `data-active` attributes.
- Any deliberate specialist exception must be added to this file in the same commit so later work does not mistake it for drift.

## Shared Components And Theme

Use these shared files before creating local styles:

- `src/components/QualityPageHero.tsx`
- `src/components/QualityKpiCard.tsx`
- `src/components/ModuleSectionHeader.tsx`
- `src/components/ImsPrimitives.tsx`
- `src/components/imsTheme.ts`
- `src/components/AppShell.tsx`

Shared primitives to prefer:

- `ImsTopMetaRow`
- `ImsTabs`
- `ImsPanel`
- `ImsFilterPanel`
- `ImsButton`
- `ImsLinkButton`

Shared theme values:

- Brand primary / Pantone 7708c: `#005670`
- Brand accent / Pantone 7709c: `#63B1BC`
- Brand soft / Pantone P 134-9 C: `#ECECE7`
- Brand border / Pantone cool gray 2: `#D0D0CE`
- Ink / Black: `#000000`
- Slate and muted / Pantone cool gray 11: `#53565A`
- Page: `#ECECE7`
- Panel: `#ffffff`
- Panel alternate: `#ECECE7`
- Border and soft border: `#D0D0CE`
- Danger / Pantone bright red: `#F93822`
- Warning / Pantone 2010c: `#FFAD00`
- Success: `#005670`

Restricted colours:

- `#78C57E` is reserved for HSE campaigns displayed alongside the approved 3Rs logo. It is not a general IMS success colour.
- `#503488` is reserved for RapidScan and must not be used as a general IMS chart or module accent.
- Do not introduce substitute blues, teals, greens, purples, oranges, or reds when an approved semantic token exists.
- Specialist exception: in the Baltic Power ITP Sign-Off evidence register, only the literal `Approved` status word is green and only the literal `Rejected` status word is danger red. Do not extend these text colours to rows, cards, backgrounds, or other IMS approval workflows without an explicit requirement.

Shared radii:

- Hero: `24px`
- Panel: `18px`
- Card: `16px`
- Control: `10px`
- Pill: `999px`

Shared shadows:

- Hero: `0 24px 44px rgba(0, 86, 112, 0.18)`
- Panel/card: `0 1px 3px rgba(15, 23, 42, 0.08)`
- Lift: `0 14px 28px rgba(15, 23, 42, 0.075)`

## Page Structure

Standard module page order:

1. `QualityPageHero`
2. top meta/status row using `ImsTopMetaRow` or matching structure
3. internal tabs using `ImsTabs` where the workspace has multiple views
4. KPI card grid using `QualityKpiCard`
5. main workspace panels using `ImsPanel` or shared panel styles
6. filter/register area
7. selected-record detail/edit panel
8. report/output/history panels where relevant

Standard page container:

- App content is constrained by `AppShell` to max width `1320px`.
- Default page padding is `28px 24px 36px`; pages with side rail use left padding equivalent to the rail offset.
- Page background is light slate/blue grey, normally `#f1f5f9` or `#eef2f5`.
- Use `20px` vertical separation between major sections.
- Use `12px` to `16px` gaps inside dense grids and control rows.

## IMS Home Launchpad

IMS Home is the deliberate exception to the normal operational page structure. It is an access launchpad, not a module dashboard or management-review surface.

Home header:

- Keep the header compact so workspace access remains visible without excessive scrolling.
- Use the approved Enshore dark blue as the main field with restrained `#63B1BC` glow, grid, ring, and signal-point details.
- Use `/enshore-e-outline-loop.mp4` as the silent, autoplaying, looping centre animation.
- Do not crop, stretch, recolour, add controls/audio, or replace the official animation with reconstructed artwork.
- If both the header and IMS hub animation are visible, their playback positions must remain synchronized.
- Keep copy short and access-oriented. Do not add module reviews, metrics, status summaries, or dashboard content to the header.

Workspace cards:

- Standard Card grid workspace cards use an explicit equal height of `216px`; content must not determine card height.
- New module cards inherit the same dimensions automatically.
- Cards show module identity, access state, and a clear launch action only. Detailed module summaries belong inside the module dashboard.
- Available cards use the established lift interaction: upward translation, slight scale, Enshore accent border/glow, elevated shadow, icon response, and launch-arrow response.
- Restricted cards remain visible when required by the permission design but must not navigate.

Home views:

- The desktop selector options are Card grid, Spotlight, Compact tiles, List, Two columns, and IMS hub. The selector is deliberately hidden on phones, which always use the simple workspace list.
- Spotlight provides one large workspace card with previous/next controls.
- IMS hub centres an enlarged official animation with compact workspace segments around it; at narrower widths it must become an animation-led grid rather than retaining an unusable orbit.
- Every view must use the same permission checks and module destinations.
- Store the selected view in browser local storage under `enshore-ims-home-view` and restore it on return.
- Do not restore the removed search bar, module filters, account-access explanatory sentence, status ribbon, labelled orbit pills, or Horizontal rail view unless explicitly requested.

## Hero Banners

Standard hero:

- Use `QualityPageHero`.
- Background is predominantly `#005670`, with `#63B1BC` used only as a supporting gradient accent away from white text.
- Color is white.
- Border radius is `24px`.
- Height is compact: `76px` in the current shared component.
- Horizontal padding is `28px`.
- Bottom margin is `20px`.
- Shadow uses the shared hero shadow.
- Hero title is compact, currently about `1.15rem`, `700`, line-height `1.2`.

Hero content rules:

- Title should be the workspace/page name, such as `Dashboard`, `Reports`, `Inspection Log`.
- Module context belongs in surrounding shell/nav or concise metadata, not large marketing copy.
- Keep hero text on one line when practical.
- Use context cards only if the shared hero supports them or the existing page already has that pattern.

Do:

- Keep the dark-blue Enshore hero consistent across modules.
- Use the same hero placement at the top of the page.

Do Not:

- Create tall marketing heroes for IMS workspaces.
- Use unrelated colours for module heroes.
- Put large paragraphs or decorative content in the hero.

## Top Meta And Status Rows

Use `ImsTopMetaRow` for the row beneath the hero.

Standard behavior:

- Left side: the exact link `Back to IMS Home`, Enshore dark blue and bold. Nested workspaces do not substitute a module-level back destination in this bar.
- Right side: the status message only.
- Refresh, PDF, create, export and other page commands must sit in the relevant tab/panel or a separate action row beneath the meta bar; they must never appear inside the white meta bar.
- Do not show standalone `Refresh` buttons beneath or beside the meta bar. Pages load automatically on entry and refresh their data after successful create, edit, delete, import or workflow operations. The dynamic status message communicates loading, readiness and errors.
- Background: white with slight transparency.
- Border: `1px solid #D0D0CE`.
- Border radius: `14px`.
- Padding: `8px 12px`.
- Bottom margin: `20px`.
- Layout wraps on smaller widths.

Status text should be plain and operational:

- `Status: Loaded ...`
- `Status: Saving ...`
- `Status: Generated PDF ...`

## KPI Cards

Use `QualityKpiCard`.

Standard card:

- Minimum height: `92px`.
- Background: white.
- Border radius: `16px`.
- Padding: `14px 16px`.
- Border: `1px solid #e2e8f0`.
- Top border: `4px solid` the accent colour.
- Label: muted `#64748b`, `12px`, `700`.
- Value: ink `#0f172a`, `26px`, `800`.
- Clickable cards use pointer cursor and should drill into filtered registers or linked pages.

Standard KPI grid:

- Use CSS grid.
- Common desktop patterns are 4 or 6 columns depending on module density.
- Gap is normally `12px` to `16px`.
- Bottom margin is normally `18px` to `20px`.
- Cards should stretch evenly and not resize the surrounding layout on hover.

KPI interaction:

- Hover lifts slightly with transform and stronger shadow via global `.quality-kpi-card`.
- Active KPI filters should show brand border and subtle brand outline.
- KPI clicks should set the relevant filter and switch to the register/detail view when applicable.

Do Not:

- Build ad hoc KPI cards when `QualityKpiCard` fits.
- Use KPI cards for long explanatory text.
- Make KPI grids inconsistent between equivalent modules.

## Interactive Dashboard Standard

The dashboard alignment completed on 11 August 2026 is the reference for operational dashboards and dashboard tabs.

- Dense primary dashboards divide content into a small number of persistent command views such as `Overview`, `Analytics`, and `Planning` or their closest operational equivalents.
- Do not add a second command-view row inside an existing workspace dashboard tab when the content is already concise; embedded dashboards keep their workspace tabs and inherit the shared analytics contract.
- Put reporting-period controls in the dashboard command bar. Do not place them in `ImsTopMetaRow` or allow them to create a detached page-action row.
- Overview shows the control pulse, executive signals, and immediate management focus. Analytics contains workload breakdowns, KPIs, closure health, and deeper trends. Planning contains actionable watchlists, upcoming work, and programme controls.
- Dashboard charts use light, high-contrast plotting surfaces unless a specialist visual has explicitly accessible white text. Axis labels, values, gridlines, and tooltips must remain readable against their background.
- Use approved semantic colours consistently: danger red for critical/overdue, warning amber for due pressure, brand dark blue for controlled/in-date, and brand accent for supporting series.
- Show bar values directly when this materially improves scanning. Charts and KPI tiers require visible spacing and must not visually merge.
- Every KPI, chart, bar, watchlist row, or signal that promises drill-down must continue to open the corresponding live filtered source.
- At the shared mobile breakpoint, command bars stack cleanly, tabs remain usable, analytics grids become one column, and no desktop workflow behaviour changes.

## Internal Tabs

Use `ImsTabs` for workspace views.

Standard tab row:

- Display flex.
- Gap: `10px`.
- Wrap allowed.
- Bottom margin: `20px`.

Standard tab button:

- Inactive background: pale Enshore brand tint `#eef7f8` on every workspace and nested tab.
- Active background: `#005670`.
- Active text: white.
- Border radius: `10px`.
- Padding: `10px 14px`.
- Minimum height: `44px`.
- Font weight: `800`.

Common tab sets:

- Dashboard
- Register
- Create
- Import
- Reports
- Evidence/actions/history where module-specific detail requires it

Do:

- Keep tab names short and operational.
- Keep tab order consistent: Dashboard, Register, Create, Import, Reports.

Do Not:

- Use a different tab visual style inside each module.
- Hide primary tabs inside cards when they are workspace-level navigation.

## Panels And Section Headers

Use `ImsPanel` and `ModuleSectionHeader` where practical.

Panel standard:

- Background: white.
- Border: `1px solid #dbe7f3`.
- Border radius: `18px`.
- Padding: `16px` for normal operational panels. Use `20px` only where a dense report or specialist workflow genuinely needs the extra breathing room.
- Shadow: `0 1px 3px rgba(15, 23, 42, 0.08)`.
- Box sizing: border-box.

Module section header:

- Enshore dark-blue brand background.
- White text.
- Border radius: `12px`.
- Padding: `10px 14px`.
- Bottom margin: `14px`.
- Title: `16px`, `800`.
- Subtitle: `13px`, white at slight opacity.
- Actions align right and wrap where needed.

Standard panel headings outside `ModuleSectionHeader`:

- Section title: `18px` to `20px`, ink, `700` to `900`.
- Subtitle: `13px` to `14px`, muted/slate, line-height around `1.4` to `1.55`.

## Create, Edit And Import Forms

Create forms, edit/detail panels, imports, report builders and dialog forms use the same control contract as register filters. A different tab must never look like a separate application.

- Labels: `13px`, `800`, Pantone cool gray 11 `#53565A`.
- Inputs and selects: `42px` high, white, `10px` radius, `#D0D0CE` border, `14px` text and `10px 12px` padding.
- Textareas: `96px` minimum height, vertically resizable; use a taller field only for genuinely long narrative content.
- Standard form grids use `repeat(auto-fit, minmax(220px, 1fr))`, a `12px` grid gap and `6px` between a label and its control.
- Fieldsets use a white background, `#D0D0CE` border, `12px` radius and `14px` padding. Legends use Enshore dark blue at `13px`, `800`.
- File controls, checkboxes and radio buttons use the same border and Enshore dark-blue focus/accent treatment.
- Keep the primary save/create action at the end of the form and group secondary actions beside it.
- Do not place a single short field inside an oversized full-width card. Use the responsive form grid or a compact inset section.
- Do not duplicate a panel inside another panel unless the inner box communicates a distinct workflow stage.
- Create and edit tabs should reveal advanced, review-only or infrequently used fields progressively when this reduces the initial form height without hiding required information.

## Detail Panels

Detail panels are central to registers. Selecting a row should open and scroll to the detail/edit panel.

Standard detail panel:

- Use a full-width section below the register or a split register/detail layout where already established.
- Border: `1px solid #dbe3ef`.
- Border radius: `18px`.
- Padding: `18px`.
- Background: often `linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)`.
- Shadow: subtle panel shadow.
- Gap: `18px`.
- Width: `100%`.

Behavior:

- Row/card click should call `scrollIntoView({ behavior: "smooth", block: "start" })`.
- Empty state should say what to select, for example `Click a row to open the full detail and edit panel.`
- Detail header should include the record number and clear title.
- Summary metadata should use compact grids, often `repeat(auto-fit, minmax(180px, 1fr))`.
- Detail footer should keep save/update/delete/close actions grouped at the bottom.

Do:

- Keep edit controls in the detail panel, not scattered across the register.
- Preserve linked actions, evidence, reports, and history sections where they exist.

Do Not:

- Replace detail panels with modals for normal register editing unless specifically requested.
- Make register row clicks fail to scroll to the selected detail.

## Registers And Tables

Registers should be dense, scannable, and filterable.

The HSE Observation Register is the permanent structural benchmark for every
register. Module-specific status, priority, risk and workflow colours remain
semantic to that register, but shell geometry, header treatment, typography,
row density, alignment and selected-row behaviour must not vary.

Standard filter panel:

- Use `ImsFilterPanel`.
- Legacy register toolbars must carry the shared `ims-filter-panel` class until migrated to `ImsFilterPanel`.
- Background: Enshore off-white `#ECECE7`.
- Border: `1px solid #D0D0CE`.
- Border radius: `16px`.
- Padding: `14px`.
- Bottom margin: `14px`.
- Shadow: `0 1px 3px rgba(0, 86, 112, 0.06)`.
- Top row commonly uses search plus Show/Hide Filters button.
- Filter grid uses `repeat(auto-fit, minmax(180px, 1fr))`.
- Use exact labels `Show Filters`, `Hide Filters`, and `Clear Filters`.
- Search inputs and selects use the same `42px` height, `10px` radius, `10px 12px` padding, white background, `#D0D0CE` border and `14px` text.
- Search boxes fill their available grid/flex column; do not add page-specific maximum widths.
- Focus uses a `#005670` border with a restrained `#63B1BC` outline.

Filter accuracy contract:

- Every active search, dropdown, toggle, KPI drill-down, date range and linked-record criterion combines with strict AND logic. Adding a filter must only retain or reduce the current result count; it must never broaden it.
- OR matching is permitted only inside one clearly labelled criterion, such as a text search across several fields or a multi-select value within a single filter.
- When filters apply to linked child records, all active child criteria must match the same child record. Do not allow one linked record to satisfy Status while another satisfies Category.
- Dropdown filters use exact normalised value matching. Free-text search may use case-insensitive substring matching across its documented searchable fields.
- Clearing one filter must not silently clear unrelated active filters. `Clear Filters` is the only general control that resets the complete filter set.
- KPI and quick-filter buttons must combine with visible filters unless their label/action explicitly says it is opening a fresh filtered view.
- Result summaries must reflect the final conjunctive result and use the format `Showing X of Y`.

Standard table:

- Wrap in horizontal overflow when needed.
- The table shell uses a white background, `1px solid #D0D0CE` border and
  `14px` radius. The table remains inset by `4px`, giving the header a clean
  gap from the shell edge.
- Do not impose an internal vertical scrollbar or page-specific register
  height. The page performs normal vertical scrolling; horizontal scrolling
  remains available where column count requires it.
- Editable controls inside programme/register rows use the compact `32px`
  table-control height. Normal Create/edit forms retain the standard `42px`
  control height.
- Inset the complete table by `4px` on every side of its shell; do not let the header touch the panel edge.
- Width: `calc(100% - 8px)` for semantic tables. Custom grid registers use the `ims-register-shell` inset instead so header and row columns remain aligned.
- Background: white.
- Font size: `12px`.
- Header background: Enshore Pantone 7708c `#005670`, retaining the compact Project Management ITP Tracker layout.
- Header text: white, `10px`, `800`, uppercase, letter spacing `0.04em`.
- Header top corners: `10px`; never mix square and rounded register headers.
- Header padding: `9px 10px`.
- Cell padding: `10px`.
- Cell border bottom: `1px solid #e4eaf0`.
- Cell line-height: around `1.35`.
- Every header and body cell is left-aligned, including numeric, status, date and action columns. Do not mix centred and left-aligned data within equivalent registers.
- Every first-column value is bold (`800`) to make the primary identifier consistently scannable.
- All other body-cell text is normal weight (`400`), including nested spans, links, badges, numbers and status values. Column headers and interactive action buttons remain bold as controls.
- Selected rows use pale brand tint `#eef7f8` with a `#005670` inset marker. Custom grid rows must expose `aria-selected` and `data-selected`; unselected rows remain white.
- For semantic tables, the selected marker belongs to the first `td` only. Never apply an inset marker or left-border effect to the complete `tr`, because collapsed table rendering can repeat it at every column boundary.
- Desktop row hover uses a restrained `#f7fafb`; selected rows use `#eef7f8` with an Enshore `#005670` inset marker.
- Table info row: `Showing X of Y`, slate, `13px`, `700`, margin `12px 0`.

Register actions:

- Place row actions in the final column.
- Use compact mini buttons only inside dense tables.
- Prefer row click for opening details and small buttons for explicit outputs such as PDF, Edit, Delete.

Mobile:

- Standard tables become labelled cards through `MobileTableEnhancer.tsx`; specialist flows such as HSE inspections may retain their purpose-built stacked cards.
- Mobile register cards must retain selected state with a brand border and expose secondary fields through Expand/Collapse where applicable.

## Reports

Quality Reports is the benchmark for report pages. HSE Reports and Asset Reports should mirror it.

Standard report page structure:

- Hero.
- Top meta row with back link, PDF/generation actions, and status.
- Two-column desktop grid:
  - report creation/edit form
  - management snapshot
- Saved reports panel below.
- Saved reports filter panel with search and Show/Hide Filters.
- Saved reports table with Month, Snapshot, Created, Actions.

Report panels:

- Use white panels with `18px` radius and `20px` padding.
- Snapshot cards use light alternate background `#f8fafc`, soft border, `14px` radius.
- Executive Summary and Next Month Focus are standard narrative fields.
- Generated PDFs should include executive summary where required by module handover.

Do:

- Keep monthly report wording concise and management-focused.
- Keep saved reports behavior consistent across Quality, HSE, and Assets.

Do Not:

- Make Asset Reports look like Document Control.
- Omit executive summary from HSE report PDFs.

## Dashboards

Dashboards should tell an operational story from live data.

Standard dashboard elements:

- Hero and top meta/status row.
- Filter controls such as year selector near top actions.
- KPI card grid for high-level counts.
- Clickable cards and panels that drill into module pages/registers.
- Charts and story panels in balanced grids, often 2-column or 3-column on desktop.
- Insight cards with concise labels, count/value, and link targets.

Dashboard style:

- Panels may use subtle white-to-light gradients.
- Charts should sit in white panels with stable heights.
- Avoid empty visual decoration; every graphic should communicate a real operational state.

Do Not:

- Build dashboards as static mockups.
- Use one-off oversized decorative cards where a shared KPI/report/card pattern exists.

## Navigation

`AppShell` owns primary navigation.

### Official Enshore Logo Assets

- Use `/enshore-primary-logo-colour.svg` on white and light backgrounds.
- Use `/enshore-primary-logo-reverse.svg` on Enshore dark-blue or other dark backgrounds.
- PDF, Word, and PowerPoint generators that require raster data use the matching high-resolution transparent `.png` files.
- Preserve the supplied `510.24 × 255.12` (2:1) artwork canvas. Never crop, stretch, recolour, rebuild, or add a strapline to the primary logo.
- The no-strapline primary logo must render at a minimum 10 mm artwork height in print outputs. Current document placements use an approximately 15 mm or larger 2:1 image canvas so the artwork inside the supplied clear-space canvas remains compliant.
- Preserve the exclusion zone included in the supplied canvas. Do not place text, rules, borders, or other graphics inside it.
- `/enshore-3rs-primary-rgb.jpg` is retained only for the HSE Observation campaign. It must remain secondary to the Enshore primary logo and must not replace it.
- Do not restore the obsolete `enshore-logo.png`, `enshore-header-logo.png`, `logo.png`, or strapline JPG assets. Use the canonical filenames above.

Top header:

- Sticky at top.
- White background.
- Border bottom: `1px solid #dbe3ef`.
- Shadow: `0 6px 20px rgba(15, 23, 42, 0.08)`.
- Shows Enshore branding, module title/subtitle, sign out, and signed-in person.
- Standard header max content width is `1320px`.

Side rail:

- Hidden on login, public observation, home, and field inspection modes.
- Fixed below the header.
- Collapsed width: `74px`.
- Expanded/pinned width: `236px`.
- Background: near-white with slight transparency.
- Border right: `1px solid #dbe3ef`.
- Shadow: `10px 0 28px rgba(15, 23, 42, 0.08)`.
- Nav item height: about `44px`.
- Active item background: `#005670`; text white.
- Hover item background: `#ECECE7`; icon background `#D0D0CE`; slight `translateX(3px)`.

Module navigation sets:

- Quality: Home, Dashboard, MOC, NCR, Audits, Actions, Reports.
- Documents: Home, Document Control, Certification.
- Assets: Home, Dashboard, Assets, Calibration, Inspection, Maintenance, Actions, Reports.
- Risk: Home, Dashboard, Register, Reviews, Controls, Opportunities, Actions, Reports.
- HSE: Home, Dashboard, Calendar, AINM, Observations, PTW, Inspections, Actions, Reports.
- Admin: Home, Admin Console.
- People: Home, People.
- Actions: Home, Actions.

Do:

- Add navigation items through `AppShell` and permission mapping.
- Keep labels short.
- Preserve side rail behavior and active state.

Do Not:

- Add page-local primary navigation that competes with the side rail.
- Recreate the shell/header inside module pages.

## Buttons And Action Placement

Use `ImsButton` or `ImsLinkButton`.

Standard buttons:

- Border radius: `10px`.
- Padding: `11px 16px`.
- Minimum height: `42px`.
- Font size: `14px`.
- Font weight: `800`.
- Primary: Enshore dark-blue background, white text.
- Secondary: `#e2e8f0` background, ink text.
- Danger: danger red background, white text.
- Ghost: white background, brand dark text, brand border.

Placement rules:

- Top-level page actions belong in the top meta row.
- Panel-specific actions belong in the `ModuleSectionHeader` action slot or section header row.
- Row-specific actions belong in the final table column.
- Save/update/delete actions belong at the bottom of forms or detail panels.
- Keep action rows flex-wrapped with `8px` to `10px` gaps.

Do Not:

- Use custom action colours for primary/secondary/danger cases.
- Put destructive actions beside primary saves without clear danger styling.

## Forms And Inputs

Standard input style:

- Width: `100%`.
- Minimum height: `42px`.
- Border radius: `10px`.
- Border: `1px solid #D0D0CE`.
- Padding: `10px 12px`.
- Font size: `14px`.
- Background: white.
- Text: `#000000`.

Standard form grid:

- Desktop: 2 columns for normal forms.
- Responsive: `repeat(auto-fit, minmax(180px, 1fr))` or single column on mobile.
- Gap: `12px` to `14px`.

Labels:

- Use `12px` to `13px`.
- Font weight `700` to `800`.
- Slate text.
- Uppercase labels are acceptable in checklist/table-like forms.

## Mobile Responsiveness

Mobile behavior should be deliberate, not left to accidental wrapping.

Standards:

- Every AppShell page inherits `ims-responsive-contract`. New modules and tabs must work within that contract rather than waiting for a later mobile retrofit.
- `MobileCompatibilityGuard.tsx` audits phone-width layouts during development and reports horizontal-overflow offenders. Treat its warning as a defect, not an optional polish item.
- The shared AppShell converts the desktop side rail to a compact bottom navigation at `720px` and below; do not add page-local competing mobile navigation.
- `src/components/MobileTableEnhancer.tsx` is the default register-card mechanism. Do not recreate its behavior independently in each module.
- Standard IMS tables are enhanced centrally into labelled mobile cards. Priority fields remain visible and secondary fields use the row-level `Expand` / `Collapse` control.
- Tables that must retain horizontal scrolling can opt out with `data-mobile-table="scroll"`; use this only where card conversion would damage meaning.
- Shared `ImsPanel` sections expose phone-only `Collapse` / `Expand` controls while remaining permanently expanded on desktop.
- Use `auto-fit/minmax` grids or explicit mobile style branches for complex workflows.
- At around `720px` and below, dense registers/checklists should become single-column/card layouts when needed.
- Field/mobile modes can simplify header and remove side rail.
- Keep touch targets at least around `42px` high.
- Forms should become one column.
- Tables should either scroll horizontally or transform into cards, depending on workflow importance.
- Detail panels on mobile use tighter padding, often `12px`, and smaller radius, around `14px`.
- Public and dedicated field routes may remove normal AppShell padding through an explicit modifier such as `ims-page-container--public`; never compensate for phone padding with desktop negative margins.
- Public form cards should use the full available width without horizontal page overflow. Controls must use `width: 100%`, `max-width: 100%`, `min-width: 0`, `box-sizing: border-box`, and a `16px` phone font size.
- Preserve desktop inline layout values above `720px`. Responsive corrections should be scoped to the shared phone breakpoint or a narrower route-specific breakpoint.

New module/tab definition of done:

- Uses AppShell and retains the `ims-responsive-contract` page container.
- Uses shared IMS primitives for tabs, panels, filters, controls and actions.
- Has no horizontal page overflow at `320px`, `390px` and `430px` widths.
- Keeps inputs, selects, textareas, uploads, embedded content and dialogs within the viewport.
- Uses labelled mobile cards for standard tables or documents an explicit `data-mobile-table="scroll"` exception.
- Keeps all actions reachable with touch targets around `42px` or taller.
- Preserves create/edit/read-only permissions and linked-record behavior on mobile.
- Is checked at desktop width to prove the responsive work did not alter the desktop layout.

Public HSE Observation Card:

- `/observe` is the public QR destination and has no standard AppShell header, side rail, bottom navigation, or authentication requirement.
- At `520px` and below, the page uses edge-aligned public-container padding, compact `12px` page padding, `14px` card padding, and no negative margins.
- Reporter choices use two equal columns; the final odd `Quick Fill` choice spans both columns.
- Observation inputs, selects, textareas, and evidence upload remain within the card width. The Enshore and 3Rs logos retain their aspect ratios and the heading may wrap.

Mobile HSE inspection behavior is the current best benchmark for complex field workflows:

- Dedicated mobile hero.
- KPI cards still visible.
- Register cards instead of dense table rows.
- Checklist items as stacked mobile cards.
- Evidence upload remains close to the checklist item.

Field Tools launchers:

- Direct field launchers must remain permission-aware and reuse the authoritative module workflow rather than creating a second data path.
- Query-driven field modes may hide dashboard KPIs and workspace tabs, use the compact AppShell field header, and return to `/field-tools`.
- Put essential capture fields first. Secondary ownership, classification and follow-up data should use a clearly labelled expandable section such as `Optional detail`.
- After a successful repeatable field capture, clear the form and keep the field workflow ready unless the process specifically requires opening the saved record.

## Typography

Global font:

- Azo Sans is the primary Enshore brand typeface and the first choice for the IMS.
- Use the CSS stack `"Azo Sans", "Segoe UI", Arial, Helvetica, sans-serif` so the interface remains usable until a licensed Azo Sans webfont is supplied.
- Calibri is reserved for internal Microsoft Office documents where Azo Sans is unavailable; it is not the IMS web-interface font.
- Body text colour: Enshore black `#000000`.
- Secondary and explanatory text: Pantone cool gray 11 `#53565A`.

Typical sizes:

- Hero title: `18px` in the compact shared hero.
- Section-bar title: `16px`; standalone panel/page section title: `18px`.
- Section subtitle: `13px`; standard body and controls: `14px`.
- KPI label: `12px`.
- KPI value: `26px`.
- Table header: `10px` uppercase.
- Table cell: `12px`.
- Button: `14px`.
- Badges/pills: `11px` to `12px`.

These sizes are semantic roles, not page-level suggestions. Do not introduce alternate sizes for the same role in a different module. Shared CSS classes override legacy inline values where necessary.

Rules:

- Keep typography compact inside operational panels.
- Do not scale font size with viewport width.
- Avoid negative letter spacing except where already present in existing components.
- Long text must wrap cleanly and not overlap controls.

### Generated PDF And Word Outputs

All generated reports, registers, forms, certificates, packs, and other downloadable documents use the same Enshore typography and colour system as the IMS. New generators must import the canonical tokens from `src/lib/exportTheme.ts` rather than introducing a local palette.

Typography:

- Word outputs request Azo Sans. Calibri is the permitted Microsoft Office fallback only where Azo Sans is not installed.
- PDF outputs use embedded Azo Sans when licensed font files are available. Until then, use jsPDF Helvetica as the portable fallback; do not substitute an unrelated decorative or condensed font.
- Standard print roles are: title `18pt`, heading `13pt`, subheading `11pt`, body `9pt`, table text `8pt`, and caption/footer `8pt`.
- Use bold weight for titles, headings, table headers, and primary record identifiers. Use normal weight for narrative body copy.

Colour and table treatment:

- Primary title bands and table headers: `#005670` with white text.
- Supporting accent: `#63B1BC`, used sparingly and never behind normal-sized white text.
- Main text: `#000000`; secondary text: `#53565A`.
- Page/alternate-row fill: `#ECECE7`; borders and rules: `#D0D0CE`.
- Warning and danger states use `#FFAD00` and `#F93822` respectively.
- Table bodies remain white with optional `#ECECE7` alternating rows. Do not use legacy slate-blue header, border, or zebra colours.
- `#78C57E` remains restricted to approved HSE/3Rs campaign material and `#503488` remains restricted to RapidScan.

Layout rules:

- Preserve the official Enshore logo artwork, clear space, aspect ratio, and minimum print size defined above.
- Repeat the report title/header and page number/footer on multipage outputs where the format supports it.
- Keep tables inside the printable page width, repeat column headers after page breaks, and prevent clipped text or split record identifiers.
- Word and PDF versions of the same record must use matching headings, field labels, colours, and information hierarchy.

## Colour And Styling Rules

Use the IMS palette consistently:

- Enshore dark blue for primary actions, active tabs, heroes, and key section headers.
- Enshore aqua for supporting accents, charts, and decorative highlights; do not place normal-sized white text directly on aqua.
- Enshore amber for warnings and attention states, and Enshore bright red for danger, overdue, and destructive states.
- Enshore off-white and cool greys for page backgrounds, secondary surfaces, borders, and muted text.
- White panels on Enshore off-white `#ECECE7` page backgrounds.
- Cool gray 11 `#53565A` for secondary information and cool gray 2 `#D0D0CE` for borders.
- Pantone 7708c `#005670` for open/in-progress and completed/success states where a distinction is not otherwise required; always pair colour with a text label.
- Red for overdue/danger/delete states.
- Amber for due soon/warning states.
- Do not use purple for general analytics; `#503488` is reserved for RapidScan.

Do:

- Use subtle shadows and borders for separation.
- Use gradients sparingly and mostly in heroes or dashboard story panels.
- Use pills/badges for status and priority.

Do Not:

- Introduce unrelated module colour systems.
- Use heavy dark themes for standard operational pages.
- Rely on colour alone; pair status colours with text.

## Consistency Rules

- Quality Management is the master reference unless a module handover names another benchmark.
- HSE pages are the closest second benchmark for mobile/field workflows.
- Asset pages follow the completed shared baseline; Quality/HSE remain useful structural references for new workflows.
- Document Control can have workflow-specific complexity, but must still use IMS shell, hero, panels, filters, and detail rhythm.
- Admin should stay simplified and uncluttered.
- People Management should remain distinct from Admin login access.
- Action tabs should preserve central `/actions` behavior and linked-record navigation.

Before implementing a page:

1. Identify the closest existing module page.
2. Reuse the shared component names from this file.
3. Match the established order and spacing.
4. Only add local style constants for genuinely page-specific needs.
5. Keep permissions, linked records, evidence, reports, and workflow status visible where relevant.

## Legacy Implementation Notes

- Some older pages still define local versions of hero, panel, button, filter, table, and report styles, but their rendered appearance is governed by the shared global contract.
- Some report pages retain local style constants; migrate these only during directly related work.
- Parked or specialist workflows may have different information architecture, but all visible shared elements still follow this contract.
- Complex mobile behavior uses the shared AppShell/table/panel foundation across all registers, with HSE inspections remaining the reference for specialised checklist and evidence workflows.

Do not treat these internal implementation notes as visual defects or create another system-wide standardisation project. Fix only evidenced regressions or migrate opportunistically during related work.
