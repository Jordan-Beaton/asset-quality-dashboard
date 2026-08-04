# Wadden Sea Open Points Compliance Map

## Controlled sources reviewed

- `G-PMO.02.201-2GW-MA-Quality_Management (4).pdf`
- `ENS25-012-QAC-PLA-201 (Project Quality Plan) Rev B.docx`

The Employer document uses activity code `CA_Act_1699 - Open Points`. The originally supplied `CA_ACT_1669` appears to be a transcription error.

## ADM implementation

| Requirement | System control | Operating evidence |
| --- | --- | --- |
| ADM_11852 | Dedicated electronic register for physical Works outstanding after inspections/tests; inspection/test, ITP and NOI traceability are mandatory workflow fields. | Register row and linked source references. |
| ADM_11853 | CDE registration/mirror dates, submission reference, weekly mirror KPI and exportable controlled register. | CDE submission evidence and weekly Excel/Word/PDF export. |
| ADM_11854 | Required Critical/Major/Minor severity, linked NCR, and Converted to NCR status. | Severity/history and NCR reference. |
| ADM_13641 | Employer source automatically calculates a seven-day CDE registration deadline and dashboard exception. | Employer-raised KPI and registration timestamp. |
| ADM_13618 | Critical/Major deadlines derive from phase end; Minor derives from Taking-Over. Employer extension and TOC agreement require controlled references. | Due-date exception, extension/TOC fields and evidence. |
| ADM_11856 | Closed records require resolution, verifier, verification date, closure date and closure/Employer evidence. Joint inspection is an evidence type. | Closure report and evidence pack. |
| ADM_09227 | Unable to Correct requires an explanation and remains visibly open; Formal Employer Close-out is separately controlled. | Reason, formal close-out reference and Employer evidence. |
| ADM_13626 | Unique ID plus description, identified date, severity, SBS, WBS, phase, linked risk and evidence fields. | Register export and record detail. |
| ADM_13610 | Register is continuously available to authenticated IMS users. | Live Project Reports tab. |
| ADM_13639 | Status-specific timescales are calculated from controlled project milestones and Employer agreements. | Settings and calculated due date. |

## Quality Plan alignment

The Quality Plan Rev B currently describes Open Points through NCR and Audit registers, with unique ID, owner, target date, status, weekly review and monthly reporting. The dedicated register strengthens those controls and retains NCR/Audit linkage rather than replacing it. The next controlled Quality Plan revision should name this dedicated register as the project master source.

## Boundaries requiring an operational process

- The Employer CDE has no connected API in this IMS. The system creates the export, tracks the seven-day/weekly requirement and stores the submission evidence, but a user must upload it to the CDE and mark the mirror complete.
- Employer severity changes, extensions, TOC inclusion and formal close-out remain Employer decisions. The IMS records their references and evidence; it cannot grant them.
- Phase milestones, SBS/WBS lists and Taking-Over date must be maintained in Open Points Settings before deadline automation can be relied upon.
- Joint verification is a real inspection/meeting. The system records the result and evidence but cannot perform the verification.

## Acceptance checks

1. Apply `scripts/sql/project_open_points.sql` to the target Supabase project.
2. Configure phases, Taking-Over date, SBS and WBS values in Settings.
3. Raise Enshore, Employer, supplier and subcontractor test records.
4. Confirm an Employer point receives a seven-day registration deadline.
5. Confirm Critical/Major due at phase end and Minor at Taking-Over.
6. Confirm overdue and CDE KPIs drill into the register.
7. Confirm closure is rejected without verification and closure evidence.
8. Upload and reopen each evidence type from storage.
9. Generate Excel, Word, PDF and a single-record closure report.
10. Confirm insert/update/delete events appear in `project_open_point_history`.
