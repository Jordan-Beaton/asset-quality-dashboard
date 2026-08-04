import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { createClient as createServerSupabaseClient } from "../../../src/lib/supabase/server";

export const runtime = "nodejs";

const allowedStatuses = new Set(["Open", "In Progress", "Closed"]);

function clean(value: unknown) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function valueAfterLabel(text: string, label: string) {
  const lines = text.split("\n").map(clean);
  const index = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase());
  return index >= 0 ? clean(lines.slice(index + 1).find(Boolean)) : "";
}

function sectionValue(text: string, label: string, nextLabels: string[]) {
  const next = nextLabels.map(escapeRegExp).join("|");
  const pattern = new RegExp(`(?:^|\\n)\\s*${escapeRegExp(label)}\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:${next})\\s*\\n|$)`, "i");
  const match = text.match(pattern);
  return clean(match?.[1]?.split("\n").map(clean).filter(Boolean).join("\n"));
}

function normaliseDate(value: string) {
  if (!value || value === "-") return "";
  const iso = value.match(/^\d{4}-\d{2}-\d{2}$/);
  if (iso) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    const expectedReference = clean(form.get("expectedReference"));
    const expectedFindingId = clean(form.get("expectedFindingId"));
    if (!(file instanceof File)) return NextResponse.json({ error: "Select a completed Word document." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "Only generated .docx finding reports can be imported." }, { status: 415 });
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "The returned finding document exceeds 15 MB." }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const raw = (await mammoth.extractRawText({ buffer })).value.replace(/\r\n?/g, "\n");
    const reference = valueAfterLabel(raw, "Finding Ref");
    const recordId = valueAfterLabel(raw, "IMS Record ID");
    if (!reference) return NextResponse.json({ error: "No Finding Ref was found. Upload an IMS-generated finding report." }, { status: 422 });
    if (expectedReference && reference.toLowerCase() !== expectedReference.toLowerCase()) {
      return NextResponse.json({ error: `This document is for ${reference}, not ${expectedReference}.` }, { status: 409 });
    }
    if (recordId && expectedFindingId && recordId !== expectedFindingId) {
      return NextResponse.json({ error: "The document IMS Record ID does not match this finding." }, { status: 409 });
    }

    const statusRaw = valueAfterLabel(raw, "Status");
    const status = [...allowedStatuses].find((item) => item.toLowerCase() === statusRaw.toLowerCase()) || "";
    const rootCause = sectionValue(raw, "Root Cause", ["Containment Action", "Corrective Action", "Uploaded Evidence"]);
    const containmentAction = sectionValue(raw, "Containment Action", ["Corrective Action", "Uploaded Evidence"]);
    const correctiveAction = sectionValue(raw, "Corrective Action", ["Uploaded Evidence"]);

    return NextResponse.json({
      reference,
      recordId,
      fields: {
        owner: valueAfterLabel(raw, "Owner"),
        status,
        due_date: normaliseDate(valueAfterLabel(raw, "Due Date")),
        closure_date: normaliseDate(valueAfterLabel(raw, "Closure Date")),
        root_cause: rootCause,
        containment_action: containmentAction,
        corrective_action: correctiveAction,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The completed finding could not be read." }, { status: 422 });
  }
}
