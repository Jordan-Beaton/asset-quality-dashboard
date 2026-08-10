# IMS UI Standards

This file is the single source of truth for reproducing the IMS visual language. A new Codex thread should read this file with `IMS_MASTER_HANDOVER.md` before creating or changing any IMS page.

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

- The supported selector options are Card grid, Spotlight, Compact tiles, List, Two columns, and IMS hub.
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

- Left side: back link, normally Enshore dark blue and bold.
- Right side: action buttons and a status banner.
- Background: white with slight transparency.
- Border: `1px solid #dbe3ef`.
- Border radius: `16px`.
- Padding: `12px 14px`.
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

## Internal Tabs

Use `ImsTabs` for workspace views.

Standard tab row:

- Display flex.
- Gap: `10px`.
- Wrap allowed.
- Bottom margin: `20px`.

Standard tab button:

- Inactive background: `#e2e8f0`.
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
- Padding: `20px`.
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

Standard filter panel:

- Use `ImsFilterPanel`.
- Background: `#f8fafc`.
- Border: `1px solid #dbe4ef`.
- Border radius: `16px`.
- Padding: `14px`.
- Bottom margin: `14px`.
- Top row commonly uses search plus Show/Hide Filters button.
- Filter grid uses `repeat(auto-fit, minmax(180px, 1fr))`.
- Use exact labels `Show Filters`, `Hide Filters`, and `Clear Filters`.

Standard table:

- Wrap in horizontal overflow when needed.
- Width: `100%`.
- Background: white.
- Font size: `13px`.
- Header background: `#f8fafc`.
- Header text: `#334155`, `12px`, `900`, uppercase, letter spacing `0.04em`.
- Header padding: `12px 14px`.
- Cell padding: `12px 14px`.
- Cell border bottom: `1px solid #edf2f7`.
- Cell line-height: around `1.45`.
- Table info row: `Showing X of Y`, slate, `13px`, `700`, margin `12px 0`.

Register actions:

- Place row actions in the final column.
- Use compact mini buttons only inside dense tables.
- Prefer row click for opening details and small buttons for explicit outputs such as PDF, Edit, Delete.

Mobile:

- On narrow/mobile operational flows, tables can become stacked cards when implemented, as in HSE inspections.
- Mobile register cards should retain selected state with brand border.

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
- Border: `1px solid #cbd5e1`.
- Padding: `10px 12px`.
- Font size: `14px`.
- Background: white.
- Text: `#0f172a`.

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

- Use `auto-fit/minmax` grids or explicit mobile style branches for complex workflows.
- At around `720px` and below, dense registers/checklists should become single-column/card layouts when needed.
- Field/mobile modes can simplify header and remove side rail.
- Keep touch targets at least around `42px` high.
- Forms should become one column.
- Tables should either scroll horizontally or transform into cards, depending on workflow importance.
- Detail panels on mobile use tighter padding, often `12px`, and smaller radius, around `14px`.

Mobile HSE inspection behavior is the current best benchmark for complex field workflows:

- Dedicated mobile hero.
- KPI cards still visible.
- Register cards instead of dense table rows.
- Checklist items as stacked mobile cards.
- Evidence upload remains close to the checklist item.

## Typography

Global font:

- Arial/Helvetica/sans-serif.
- Body text colour: `#0f172a`.

Typical sizes:

- Hero title: about `18px` to `22px` in the compact shared hero.
- Section title: `18px` to `20px`.
- Section subtitle/body: `13px` to `14px`.
- KPI label: `12px`.
- KPI value: `26px`.
- Table header: `12px` uppercase.
- Table cell: `13px`.
- Button: `14px`.
- Badges/pills: `11px` to `12px`.

Rules:

- Keep typography compact inside operational panels.
- Do not scale font size with viewport width.
- Avoid negative letter spacing except where already present in existing components.
- Long text must wrap cleanly and not overlap controls.

## Colour And Styling Rules

Use the IMS palette consistently:

- Enshore dark blue for primary actions, active tabs, heroes, and key section headers.
- Enshore aqua for supporting accents, charts, and decorative highlights; do not place normal-sized white text directly on aqua.
- Enshore amber for warnings and attention states, and Enshore bright red for danger, overdue, and destructive states.
- Enshore off-white and cool greys for page backgrounds, secondary surfaces, borders, and muted text.
- White panels on light slate page background.
- Slate and muted text for secondary information.
- Blue for open/in-progress states where established.
- Green for completed/success states.
- Red for overdue/danger/delete states.
- Amber for due soon/warning states.
- Purple for secondary analytical/evidence accents.

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
- Asset pages should be standardised toward Quality/HSE.
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

## Known Inconsistencies To Watch

- Some older pages still define local versions of hero, panel, button, filter, table, and report styles instead of using `ImsPrimitives`.
- Some report pages match the visual pattern but still use local style constants rather than shared primitives.
- Asset Management layout remains less standardised than Quality/HSE.
- Some HSE parked pages, such as PTW and removed/legacy tabs, may not represent the target standard.
- Complex mobile behavior is implemented well in HSE inspections but is not uniformly applied across all registers.

When touching these areas, prefer moving toward the standards above without risky rewrites.
