import { createHmac, timingSafeEqual } from "node:crypto";

// A "document pack" is every file on an inspection record in one ZIP. The ZIP is built while it
// downloads (the storage service caps a single stored file at about 50 MB, which a pack of
// inspection evidence can exceed), and is reached through a signed link that stays valid for six
// months so recipients can open it long after the email arrives.

export const PACK_LINK_LIFETIME_SECONDS = 60 * 60 * 24 * 180;

function packSecret() {
  const secret = process.env.INSPECTION_PACK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Document pack links are not configured.");
  return secret;
}

function signature(recordId: string, expires: number) {
  return createHmac("sha256", packSecret()).update(`inspection-pack:${recordId}:${expires}`).digest("hex");
}

export function buildPackUrl(origin: string, recordId: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + PACK_LINK_LIFETIME_SECONDS;
  const params = new URLSearchParams({ record: recordId, exp: String(expires), sig: signature(recordId, expires) });
  return `${origin}/api/projects/inspection-records/pack?${params.toString()}`;
}

export type PackLinkCheck = { ok: true } | { ok: false; status: number; error: string };

export function checkPackLink(recordId: string, expiresRaw: string, sig: string, now = Date.now()): PackLinkCheck {
  const expires = Number(expiresRaw);
  if (!recordId || !Number.isFinite(expires) || !sig) return { ok: false, status: 400, error: "This document pack link is not valid." };
  const expected = Buffer.from(signature(recordId, expires));
  const supplied = Buffer.from(sig);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return { ok: false, status: 403, error: "This document pack link is not valid." };
  }
  if (expires * 1000 < now) {
    return { ok: false, status: 410, error: "This document pack link has expired. Ask the Enshore project team to send it again." };
  }
  return { ok: true };
}

// File names inside the ZIP: no folders, no characters Windows rejects, no duplicates.
export function uniqueZipNames(names: string[]) {
  const used = new Set<string>();
  return names.map((original) => {
    const base = String(original || "file").replace(/[\\/:*?"<>|\u0000-\u001F]+/g, "-").replace(/^\.+/, "").trim() || "file";
    const dot = base.lastIndexOf(".");
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const extension = dot > 0 ? base.slice(dot) : "";
    let candidate = base;
    for (let count = 2; used.has(candidate.toLowerCase()); count += 1) candidate = `${stem} (${count})${extension}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

export function packFileName(noiNumber: string) {
  return `NOI-${String(noiNumber || "").replace(/[^A-Za-z0-9._-]+/g, "-")} Document Pack.zip`;
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
