import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { createClient as createServerSupabaseClient } from "../../../src/lib/supabase/server";

export const runtime = "nodejs";

// Matches the fixed dropdown options on the NCR edit form (app/ncr-capa/page.tsx).
// A returned document's Root Cause Category is only accepted if it matches one
// of these exactly (case-insensitive) - anything else is left for the user to
// pick manually rather than silently writing a value the dropdown can't render.
const rootCauseOptions = [
  "Human Error",
  "Procedure Gap",
  "Training / Competence",
  "Supplier Issue",
  "Design Issue",
  "Equipment Failure",
  "Other",
];

function clean(value: unknown) {
  return String(value ?? "").replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
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

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    const expectedNumber = clean(form.get("expectedNumber"));
    if (!(file instanceof File)) return NextResponse.json({ error: "Select a completed Word document." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ error: "Only generated .docx NCR reports can be imported." }, { status: 415 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "The returned NCR document exceeds 15 MB." }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const raw = (await mammoth.extractRawText({ buffer })).value.replace(/\r\n?/g, "\n");

    const ncrNumber = valueAfterLabel(raw, "NCR Number");
    if (!ncrNumber) {
      return NextResponse.json({ error: "No NCR Number was found. Upload an IMS-generated NCR report." }, { status: 422 });
    }
    if (expectedNumber && ncrNumber.toLowerCase() !== expectedNumber.toLowerCase()) {
      return NextResponse.json({ error: `This document is for ${ncrNumber}, not ${expectedNumber}.` }, { status: 409 });
    }

    // Status is deliberately never extracted here - closing (or reopening) an
    // NCR is always a manual, internal decision, never something a returned
    // supplier document can drive directly.
    const rootCauseRaw = sectionValue(raw, "Root Cause Category", ["Root Cause Description"]);
    const rootCauseCategory = rootCauseOptions.find((option) => option.toLowerCase() === rootCauseRaw.toLowerCase()) || "";

    return NextResponse.json({
      ncrNumber,
      fields: {
        containment_action: sectionValue(raw, "Containment Action", ["Corrective Action"]),
        corrective_action: sectionValue(raw, "Corrective Action", ["Root Cause Category"]),
        root_cause_category: rootCauseCategory,
        root_cause_description: sectionValue(raw, "Root Cause Description", [
          "Response / Proposed Action",
          "SUPPLIER / CLIENT RESPONSE",
          "Uploaded Evidence",
        ]),
        supplier_response: sectionValue(raw, "Response / Proposed Action", [
          "Acknowledgement / Responsible Contact",
          "Uploaded Evidence",
        ]),
        supplier_acknowledgement: sectionValue(raw, "Acknowledgement / Responsible Contact", ["Uploaded Evidence"]),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The completed NCR could not be read." }, { status: 422 });
  }
}
