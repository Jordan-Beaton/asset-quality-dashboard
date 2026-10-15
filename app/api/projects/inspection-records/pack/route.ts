import { createClient } from "@supabase/supabase-js";
import { Zip, ZipDeflate, ZipPassThrough } from "fflate";
import { checkPackLink, packFileName, uniqueZipNames } from "../../../../../src/lib/inspectionPack";

export const runtime = "nodejs";
export const maxDuration = 300;

const STORAGE_BUCKET = "project-documents";

function json(error: string, status: number) {
  return new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });
}

// GET /api/projects/inspection-records/pack?record=<id>&exp=<unix seconds>&sig=<signature>
// Public by signature, like the sign-off links: the signed link in the email is the access.
// Streams every file of the record as one ZIP, so the pack can be any size.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const recordId = params.get("record") || "";

  let check;
  try {
    check = checkPackLink(recordId, params.get("exp") || "", params.get("sig") || "");
  } catch (error) {
    return json(error instanceof Error ? error.message : "Document pack links are not configured.", 500);
  }
  if (!check.ok) return json(check.error, check.status);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json("Inspection records service is not configured.", 500);
  const supabase = createClient(url, key);

  const { data: record, error } = await supabase
    .from("inspection_records")
    .select("noi_number, inspection_record_files(file_name, file_path, uploaded_at)")
    .eq("id", recordId)
    .maybeSingle();
  if (error || !record) return json("That inspection record could not be found.", 404);

  const files = ((record.inspection_record_files || []) as Array<{ file_name: string; file_path: string; uploaded_at: string | null }>)
    .slice()
    .sort((a, b) => String(a.uploaded_at || "").localeCompare(String(b.uploaded_at || "")));
  if (!files.length) return json("There are no files on this inspection record yet.", 404);
  const names = uniqueZipNames(files.map((file) => file.file_name));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let failure: unknown = null;
      // Hold back while the downloader is not keeping up, so a large pack is never all in memory.
      const pending: Uint8Array[] = [];
      const flush = async () => {
        while (pending.length) {
          while ((controller.desiredSize ?? 1) <= 0) await new Promise((resolve) => setTimeout(resolve, 15));
          controller.enqueue(pending.shift()!);
        }
      };
      const zip = new Zip((err, chunk) => {
        if (err) failure = err;
        else pending.push(chunk);
      });
      try {
        for (let index = 0; index < files.length; index += 1) {
          const entryName = names[index];
          let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
          try {
            const { data: signed } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(files[index].file_path, 600);
            const response = signed?.signedUrl ? await fetch(signed.signedUrl) : null;
            if (response?.ok && response.body) reader = response.body.getReader();
          } catch {
            reader = null;
          }
          if (!reader) {
            const note = new ZipPassThrough(`COULD NOT INCLUDE - ${entryName}.txt`);
            zip.add(note);
            note.push(encoder.encode(`The file "${files[index].file_name}" could not be read when this pack was created. Please contact the Enshore project team.`), true);
          } else {
            // Deflated entries (even at the lowest effort) end themselves, so the ZIP opens in macOS Archive
            // Utility as well as Windows; unsized stored entries do not.
            const entry = new ZipDeflate(entryName, { level: 1 });
            zip.add(entry);
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              entry.push(value);
              await flush();
            }
            entry.push(new Uint8Array(0), true);
          }
          await flush();
          if (failure) throw failure;
        }
        zip.end();
        await flush();
        controller.close();
      } catch (streamError) {
        controller.error(streamError);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${packFileName(record.noi_number).replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
