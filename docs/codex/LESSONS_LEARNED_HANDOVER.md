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
- `Prevention Intelligence` provides an evidence-grounded free-text question workspace. It consolidates historic failures into a short prevention brief instead of listing every matching record, and every caution links back to its supporting Lessons Learned records.
- Prevention questions screen the complete Failure repository, combine keyword and semantic retrieval, and deeply analyse up to 250 relevance-ranked candidates in controlled batches of 35 with three-way parallel processing before a final synthesis. The UI must separately report total records screened, candidate records analysed and strongest records cited. Never present a retrieval ceiling as the exact number of matching lessons; historic wording requires controlled categorisation for an auditable exact count.
- The same workspace accepts PDF, DOCX and TXT procedures (20 MB maximum), compares their readable content with relevant historic failures, and returns advisory control gaps/cautions without declaring the document approved or compliant.
- Prevention Intelligence deliberately uses `OPENAI_BUSINESS_API_KEY`; it must not fall back to the older `OPENAI_API_KEY`. The key remains server-side in the secured route handlers.
- Procedure review stages Word/PDF/TXT uploads temporarily in the secured `lessons-learned-evidence` bucket instead of sending multipart files through the Vercel function body. DOCX and text-based PDF content is extracted locally; unreadable, scanned, legacy `.doc`, or structurally unusual files use an AI-native file-reading fallback. Temporary review files are removed after processing. Encrypted, password-protected, corrupt, or genuinely content-free files remain unsupported and must return a specific readable error.
- Full-document review and unrestricted repository questioning have separate evidence budgets: free-text questions may deeply analyse up to 250 relevance-ranked candidates, while document reviews analyse the strongest 80 candidates alongside the complete extracted document so 50-100 page procedures remain within the server execution window. The UI must translate non-JSON proxy/timeout responses into a readable operational error rather than exposing `<!DOCTYPE>` parsing text.
- Semantic retrieval uses `text-embedding-3-small` by default and the Supabase pgvector index defined in `scripts/sql/lessons_learned_prevention_ai.sql`. Before the migration/index is ready, question and procedure reviews retain a keyword-retrieval fallback and clearly label it.
- The Master Admin-only `Build / Refresh Index` operation uses paginated index reconciliation and resumable batches of 20, with browser/server timeouts and automatic retry. Missing lessons are prioritised before changed lessons so the displayed count reflects real coverage. Successful create, edit and import workflows automatically index only the affected Failure records; records changed away from Failure are removed from the semantic index. The full rebuild is therefore a one-off recovery/admin operation, not a requirement after every new lesson. Question and procedure results are written to `lessons_learned_ai_analyses` when the migration is available.

## Analytics direction

- Prioritise repeat themes, recurring departments/projects/assets, open-action ageing, criticality, trend direction and failure recurrence.
- Historic narrative quality varies; avoid overstating automated conclusions where source descriptions are vague or inconsistent.
- Preserve blame-free language and focus findings on processes, controls and prevention.
- Use the rotating learning panel for concise, positive prevention messages derived from actual records.
- Prefer Prevention Intelligence semantic recurrence over user-entered repeat-group equality when evaluating systemic recurrence. AI findings must consolidate repeated evidence into practical cautions and cite only lesson UUIDs supplied to the model.
- AI is decision support, not an approval authority. Preserve confidence labels and explicit evidence limitations, especially where historic wording is weak.

## Prevention Intelligence deployment

1. Apply `scripts/sql/lessons_learned_prevention_ai.sql` in the live Supabase SQL editor.
2. In the OpenAI business project, create a project-scoped API key and configure an appropriate project budget/usage alert.
3. In Vercel Project Settings -> Environment Variables, add the secret as `OPENAI_BUSINESS_API_KEY` for Production (and Preview only if required). Never paste the key into source, Supabase, GitHub, documentation or Codex chat.
4. Optional model overrides are `OPENAI_LESSONS_MODEL` and `OPENAI_LESSONS_EMBEDDING_MODEL`; defaults are `gpt-5-mini` and `text-embedding-3-small`.
5. Redeploy, open Lessons Learned -> Prevention Intelligence, confirm the business connection status, then run `Build / Refresh Index` as Master Admin until the indexed and failure totals match.
6. Validate a known question such as trenching and one controlled Word/PDF procedure. Confirm every displayed caution opens only its cited supporting lessons.

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
