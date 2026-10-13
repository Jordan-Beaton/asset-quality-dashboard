import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const ITP_BUCKET = "project-documents";

type StoredItp = { ok: true; buffer: Buffer; fileName: string } | { ok: false; status: number; error: string };

// Loads a stored ITP revision on the server so the browser never has to upload the
// file again. Hosting platforms cap request bodies at a few MB, which would make any
// large ITP impossible to scan; a short file reference has no such limit.
//
// The caller's own client confirms they may see that revision row (so only recorded
// ITP files can be read, not arbitrary storage paths); the file itself is then read
// with the service client so it does not depend on storage-policy details.
export async function downloadStoredItp(userClient: SupabaseClient, filePath: string): Promise<StoredItp> {
  if (!filePath || filePath.startsWith("/") || filePath.split("/").some((part) => part === ".." || part === ".")) {
    return { ok: false, status: 400, error: "The ITP file reference is not valid." };
  }

  const { data: revision, error: revisionError } = await userClient
    .from("project_itp_revisions")
    .select("file_name")
    .eq("file_path", filePath)
    .limit(1)
    .maybeSingle();
  if (revisionError || !revision) return { ok: false, status: 404, error: "That ITP file was not found." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, status: 500, error: "ITP scanning is not configured on this environment." };

  const { data, error } = await createClient(url, key).storage.from(ITP_BUCKET).download(filePath);
  if (error || !data) return { ok: false, status: 404, error: `The stored ITP could not be read: ${error?.message || "no data returned"}` };

  return { ok: true, buffer: Buffer.from(await data.arrayBuffer()), fileName: String(revision.file_name || filePath.split("/").pop() || "ITP") };
}
