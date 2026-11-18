// One-off import of the Wadden Sea MOC register workbook into the IMS MOC section.
//
//   node scripts/import-wadden-sea-mocs.mjs <workbook.xlsx> [--extras extras.json] [--apply]
//
// Without --apply it only prints what it would write. Run scripts/sql/moc_project_series.sql first.
//
// Keeps the numbers the client already holds (NEX-MOC-001 to NEX-MOC-007), titles exactly as written in the workbook,
// and leaves every action owner blank. The original owner and target text of each action is kept in the MOC's internal
// notes so nothing is lost. A workbook status of "To confirm" loads as Draft with "status still to be confirmed" ticked.
//
// Safe to re-run: MOCs that already exist in the Wadden Sea series are skipped, never overwritten.

import { createRequire } from "module";
import path from "path";
import fs from "fs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const require = createRequire(path.join(root, "package.json"));
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(root, ".env.local"), quiet: true });

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const workbookPath = args.find((arg) => !arg.startsWith("--") && arg.endsWith(".xlsx"));
const extrasIndex = args.indexOf("--extras");
const extras = extrasIndex >= 0 ? JSON.parse(fs.readFileSync(args[extrasIndex + 1], "utf8")) : {};
if (!workbookPath) throw new Error("Give the path to the MOC register workbook.");

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const pad = (n) => String(n).padStart(2, "0");
function isoDate(value) {
  if (typeof value === "number" && value > 59) {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}` : null;
  }
  const text = clean(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) return `${match[3].length === 2 ? `20${match[3]}` : match[3]}-${pad(match[2])}-${pad(match[1])}`;
  return null;
}

const workbook = XLSX.read(fs.readFileSync(workbookPath), { type: "buffer" });
function sheetRows(name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Sheet ${name} not found`);
  const all = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
  const headerIndex = all.findIndex((row) => row.map((cell) => clean(cell).toLowerCase()).includes("moc no"));
  const header = all[headerIndex].map(clean);
  return all.slice(headerIndex + 1).map((row) => Object.fromEntries(header.map((label, index) => [label, row[index]])));
}
const col = (row, label) => {
  const key = Object.keys(row).find((candidate) => candidate.toLowerCase().startsWith(label.toLowerCase()));
  return key ? row[key] : "";
};

const mocRows = sheetRows("Register").filter((row) => clean(col(row, "MOC No")));
const actionRows = sheetRows("Actions").filter((row) => clean(col(row, "MOC No")) && clean(col(row, "Description")));

function actionStatus(value) {
  const text = clean(value).toLowerCase();
  if (/^(complete|completed|closed|done)$/.test(text)) return "Complete";
  if (/in progress|ongoing/.test(text)) return "Ongoing";
  if (/hold/.test(text)) return "Hold";
  return "Open";
}

function mocStatus(value) {
  const text = clean(value).toLowerCase();
  if (text.startsWith("closed")) return { status: "Closed", toConfirm: false };
  if (text.startsWith("under review")) return { status: "In Review", toConfirm: false };
  if (text.startsWith("approved") || text.startsWith("implemented")) return { status: "Approved", toConfirm: false };
  if (text.startsWith("draft")) return { status: "Draft", toConfirm: false };
  return { status: "Draft", toConfirm: true };
}

function appliesTo(value) {
  const tokens = clean(value).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  if (!tokens.length || tokens.includes("ALL")) return ["All"];
  return tokens.filter((token) => ["BA3", "LW2", "LW4"].includes(token));
}

const records = mocRows.map((row) => {
  const clientRef = clean(col(row, "MOC No"));
  const match = clientRef.match(/MOC-(\d+)/i);
  if (!match) throw new Error(`Cannot read a number from ${clientRef}`);
  const number = Number(match[1]);
  const { status, toConfirm } = mocStatus(col(row, "Status"));
  const type = /temporary/i.test(clean(col(row, "Type"))) ? "Temporary" : "Permanent";
  const from = isoDate(col(row, "Implementation From"));
  const to = isoDate(col(row, "Implementation To"));
  const own = actionRows.filter((action) => clean(col(action, "MOC No")).toLowerCase() === clientRef.toLowerCase());
  const keptText = [];
  const items = own.map((action, index) => {
    const target = isoDate(col(action, "Target"));
    const targetText = clean(col(action, "Target"));
    const owner = clean(col(action, "Responsible"));
    const no = clean(col(action, "Action No")) || String(index + 1);
    if (owner || (targetText && !target)) keptText.push(`Action ${no}: owner "${owner || "-"}"${targetText && !target ? `, target "${targetText}"` : ""}`);
    return {
      sort_order: index,
      action_no: no,
      description: clean(col(action, "Description")),
      responsible_person: "",
      target_date: target,
      status: actionStatus(col(action, "Status")),
      link_key: crypto.randomUUID(),
    };
  });
  const internal = clean(col(row, "Internal Notes"));
  const notes = [internal, keptText.length ? `Original action owners and targets from the SharePoint register (owners left blank in the IMS): ${keptText.join("; ")}.` : ""].filter(Boolean).join("\n\n");
  const extra = extras[number] || {};
  return {
    number,
    parent: {
      series_key: "wadden-sea",
      series_number: number,
      project_key: "wadden-sea",
      moc_report_no: `NEX-MOC-${String(number).padStart(3, "0")}`,
      moc_report_title: clean(col(row, "Title")),
      project_worksite_address: "Wadden Sea",
      applies_to: appliesTo(col(row, "Applies to")),
      client_reference: clientRef,
      moc_coordinator_name: clean(col(row, "MOC Coordinator")),
      responsible_manager_name: clean(col(row, "Responsible Manager")),
      change_type: type,
      temporary_valid_from: type === "Temporary" ? from : null,
      temporary_valid_to: type === "Temporary" ? to : null,
      implementation_from: from,
      implementation_to: to,
      status,
      status_to_confirm: toConfirm,
      next_step: clean(col(row, "Next Step")) || null,
      next_step_owner: clean(col(row, "Next Step Owner")) || null,
      next_step_due: isoDate(col(row, "Next Step Due")),
      report_notes: notes || null,
      ...extra,
    },
    items,
  };
});

console.log(`${records.length} MOCs and ${records.reduce((sum, record) => sum + record.items.length, 0)} actions read from the workbook.\n`);
for (const record of records) {
  const p = record.parent;
  console.log(`${p.moc_report_no} | ${p.moc_report_title} | ${p.applies_to.join("+")} | ${p.change_type} | ${p.status}${p.status_to_confirm ? " (to confirm)" : ""} | ${p.implementation_from || "-"} to ${p.implementation_to || "-"} | ${record.items.length} actions | ref ${p.client_reference}`);
}

if (!apply) {
  console.log("\nDry run only. Add --apply to write these to the IMS.");
  process.exit(0);
}

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const series = await service.from("moc_series").select("series_key,last_number").eq("series_key", "wadden-sea").maybeSingle();
if (series.error || !series.data) throw new Error("The Wadden Sea numbering series is missing. Run scripts/sql/moc_project_series.sql first.");
const existing = await service.from("moc_reports").select("series_number").eq("series_key", "wadden-sea");
if (existing.error) throw existing.error;
const taken = new Set((existing.data || []).map((row) => row.series_number));

const defaultSignoff = (table) => table;
void defaultSignoff;
let created = 0;
for (const record of records.sort((a, b) => a.number - b.number)) {
  if (taken.has(record.number)) {
    console.log(`Skipping ${record.parent.moc_report_no}: already in the IMS.`);
    continue;
  }
  const inserted = await service.from("moc_reports").insert(record.parent).select("id,moc_report_no").single();
  if (inserted.error) throw new Error(`${record.parent.moc_report_no}: ${inserted.error.message}`);
  const id = inserted.data.id;
  if (record.items.length) {
    const rows = record.items.map((item) => ({ ...item, moc_report_id: id }));
    const result = await service.from("moc_action_plan_items").insert(rows);
    if (result.error) {
      await service.from("moc_reports").delete().eq("id", id);
      throw new Error(`${record.parent.moc_report_no} actions: ${result.error.message}`);
    }
  }
  console.log(`Created ${inserted.data.moc_report_no} with ${record.items.length} actions.`);
  created += 1;
}
console.log(`\nDone. ${created} MOCs created.`);
