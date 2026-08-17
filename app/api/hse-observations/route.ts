import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const evidenceBucket = "quality-evidence";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function makeObservationNumber(supabase: SupabaseClient) {
  if (typeof supabase.rpc === "function") {
    const { data, error } = await supabase.rpc("next_hse_observation_number");
    if (!error && typeof data === "string" && data.trim()) {
      return data.trim();
    }
  }

  let maxNumber = 0;
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("hse_observations")
      .select("observation_number")
      .ilike("observation_number", "OBS-%")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = (data || []) as Array<{ observation_number: string | null }>;

    rows.forEach((record) => {
      const match = String(record.observation_number || "").match(/^OBS\s*-\s*(\d+)\s*$/i);
      if (!match) return;
      maxNumber = Math.max(maxNumber, Number(match[1]));
    });

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return `OBS-${String(maxNumber + 1).padStart(3, "0")}`;
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 140);
}

function isSupabaseKeyError(message: string) {
  return /invalid api key|invalid jwt|jwt/i.test(message);
}

function configurationErrorMessage() {
  return [
    "Observation submit is not configured correctly on Vercel.",
    "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    "SUPABASE_SERVICE_ROLE_KEY must be the Supabase service_role key, not the anon key.",
  ].join(" ");
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: configurationErrorMessage() }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const description = clean(formData.get("description"));

    if (!description) {
      return NextResponse.json({ error: "Please enter the observation details before submitting." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const observationId = crypto.randomUUID();
    const observationNumber = await makeObservationNumber(supabase);
    const files = formData.getAll("evidence").filter((item): item is File => item instanceof File && item.size > 0);

    const payload = {
      id: observationId,
      observation_number: observationNumber,
      reporter_type: clean(formData.get("reporter_type")) || "Quick Fill",
      reporter_name: clean(formData.get("reporter_name")) || null,
      reporter_company: clean(formData.get("reporter_company")) || null,
      reporter_contact: clean(formData.get("reporter_contact")) || null,
      project: clean(formData.get("project")) || null,
      site_location: clean(formData.get("site_location")) || null,
      observation_date: clean(formData.get("observation_date")) || new Date().toISOString().slice(0, 10),
      observation_time: clean(formData.get("observation_time")) || null,
      observation_type: clean(formData.get("observation_type")) || "Observation",
      category: clean(formData.get("category")) || null,
      risk_level: clean(formData.get("risk_level")) || null,
      title: clean(formData.get("title")) || null,
      description,
      immediate_action: clean(formData.get("immediate_action")) || null,
      suggested_action: clean(formData.get("suggested_action")) || null,
      status: "New",
      source_qr: clean(formData.get("source_qr")) || "public-qr",
    };

    const { error: insertError } = await supabase.from("hse_observations").insert(payload);

    if (insertError) {
      if (isSupabaseKeyError(insertError.message)) {
        return NextResponse.json({ error: configurationErrorMessage() }, { status: 500 });
      }

      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const evidenceRows = [];
    for (const [fileIndex, file] of files.entries()) {
      const fileName = safeFileName(file.name || "observation-evidence");
      const filePath = `hse-observations/${observationId}/${Date.now()}-${fileIndex}-${fileName}`;
      const upload = await supabase.storage.from(evidenceBucket).upload(filePath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

      if (upload.error) {
        continue;
      }

      evidenceRows.push({
        observation_id: observationId,
        file_name: file.name || fileName,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type || null,
      });
    }

    if (evidenceRows.length) {
      await supabase.from("hse_observation_evidence").insert(evidenceRows);
    }

    return NextResponse.json({
      observationNumber,
      evidenceUploaded: evidenceRows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Observation submit failed.";
    if (isSupabaseKeyError(message)) {
      return NextResponse.json({ error: configurationErrorMessage() }, { status: 500 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
