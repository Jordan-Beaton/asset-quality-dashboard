import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Zip, ZipDeflate } from "fflate";
import { formatBytes, packFileName, uniqueZipNames } from "./inspectionPack";

// Document packs for the notification email are stored in the same storage service as the
// evidence and linked with a six-month signed link. That keeps the link on the storage domain,
// which recipients' web filters already allow (the app's own domain is blocked by some of them).
//
// The storage service rejects any single file above its upload limit (about 50 MB on the current
// plan), so a record whose evidence is larger is split into numbered ZIP files that each fit.
// Raise the limit in Supabase and set INSPECTION_PACK_PART_MB to fit more in each ZIP.

const STORAGE_BUCKET = "project-documents";
const LINK_LIFETIME_SECONDS = 60 * 60 * 24 * 180;

export type PackSourceFile = { file_name: string; file_path: string; file_size: number | null; uploaded_at?: string | null };
export type StoredPackPart = { label: string; fileName: string; path: string; size: number; url: string; files: string[] };

function partLimitBytes() {
  const megabytes = Number(process.env.INSPECTION_PACK_PART_MB);
  return (Number.isFinite(megabytes) && megabytes >= 5 ? megabytes : 45) * 1024 * 1024;
}

// Files stay in upload order; a part is closed when the next file would push it past the limit.
export function planPackParts<T extends { file_size: number | null }>(files: T[], limit: number) {
  const parts: T[][] = [];
  let used = 0;
  files.forEach((file) => {
    const size = file.file_size || 0;
    if (!parts.length || (used + size > limit && parts[parts.length - 1].length)) {
      parts.push([]);
      used = 0;
    }
    parts[parts.length - 1].push(file);
    used += size;
  });
  return parts;
}

function fingerprint(files: PackSourceFile[], limit: number) {
  return createHash("sha1")
    .update(files.map((file) => `${file.file_path}:${file.file_size || 0}`).join("|") + `|${limit}`)
    .digest("hex")
    .slice(0, 16);
}

async function buildZip(supabase: SupabaseClient, entries: Array<{ file: PackSourceFile; name: string }>) {
  const chunks: Uint8Array[] = [];
  let failure: unknown = null;
  const zip = new Zip((error, chunk) => {
    if (error) failure = error;
    else chunks.push(chunk);
  });
  for (const { file, name } of entries) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(file.file_path);
    if (error || !data) throw new Error(`The file "${file.file_name}" could not be read to build the document pack.`);
    // deflated entries (even at the lowest effort) end themselves, so the ZIP opens on Windows and Mac
    const entry = new ZipDeflate(name, { level: 1 });
    zip.add(entry);
    entry.push(new Uint8Array(await data.arrayBuffer()), true);
    if (failure) throw failure;
  }
  zip.end();
  if (failure) throw failure;
  return Buffer.concat(chunks);
}

// Builds (or reuses) the stored ZIP file(s) for a record and returns six-month download links.
export async function ensureStoredPack(supabase: SupabaseClient, recordId: string, noiNumber: string, files: PackSourceFile[]): Promise<StoredPackPart[]> {
  const sorted = files.slice().sort((a, b) => String(a.uploaded_at || "").localeCompare(String(b.uploaded_at || "")));
  if (!sorted.length) return [];
  const limit = partLimitBytes();
  const names = uniqueZipNames(sorted.map((file) => file.file_name));
  const nameOf = new Map(sorted.map((file, index) => [file, names[index]]));
  const groups = planPackParts(sorted, limit);

  const recordFolder = sorted[0].file_path.split("/").slice(0, 3).join("/");
  const packsFolder = `${/\/inspection-records\/[^/]+$/.test(recordFolder) ? recordFolder : `inspection-records/${recordId}`}/packs`;
  const folder = `${packsFolder}/${fingerprint(sorted, limit)}`;
  const baseName = packFileName(noiNumber).replace(/\.zip$/i, "");

  const { data: existing } = await supabase.storage.from(STORAGE_BUCKET).list(folder, { limit: 100 });
  const present = new Set((existing || []).map((object) => object.name));

  const parts: StoredPackPart[] = [];
  for (let index = 0; index < groups.length; index += 1) {
    const fileName = groups.length === 1 ? `${baseName}.zip` : `${baseName} - part ${index + 1} of ${groups.length}.zip`;
    const path = `${folder}/${fileName}`;
    let size = 0;
    if (!present.has(fileName)) {
      const zipped = await buildZip(supabase, groups[index].map((file) => ({ file, name: nameOf.get(file)! })));
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, zipped, { upsert: true, contentType: "application/zip" });
      if (error) throw new Error(`The document pack could not be stored: ${error.message}`);
      size = zipped.length;
    } else {
      size = Number((existing || []).find((object) => object.name === fileName)?.metadata?.size) || 0;
    }
    const { data: signed, error: signError } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, LINK_LIFETIME_SECONDS, { download: fileName });
    if (signError || !signed?.signedUrl) throw new Error("The document pack link could not be created.");
    parts.push({
      label: groups.length === 1 ? "Download document pack (ZIP)" : `Download part ${index + 1} of ${groups.length}`,
      fileName,
      path,
      size,
      url: signed.signedUrl,
      files: groups[index].map((file) => file.file_name),
    });
  }

  // Packs built for an earlier set of files are no longer needed.
  const { data: old } = await supabase.storage.from(STORAGE_BUCKET).list(packsFolder, { limit: 100 });
  const stale = (old || []).filter((entry) => entry.name !== folder.split("/").pop());
  for (const entry of stale) {
    const { data: inner } = await supabase.storage.from(STORAGE_BUCKET).list(`${packsFolder}/${entry.name}`, { limit: 100 });
    if (inner?.length) await supabase.storage.from(STORAGE_BUCKET).remove(inner.map((object) => `${packsFolder}/${entry.name}/${object.name}`));
  }

  return parts;
}

export function describePack(parts: StoredPackPart[]) {
  const total = parts.reduce((sum, part) => sum + part.size, 0);
  return parts.length > 1
    ? `The documents (${formatBytes(total)}) are split into ${parts.length} ZIP files so each is a manageable size. Download all ${parts.length} to receive everything.`
    : `All documents${total ? ` (${formatBytes(total)})` : ""} are in one ZIP file.`;
}
