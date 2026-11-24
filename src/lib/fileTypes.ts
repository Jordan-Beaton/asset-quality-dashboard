// The file types the IMS accepts for documents and evidence, in one place so every upload box agrees.
// Phones often report an empty or generic file type, so the type is also worked out from the file name;
// that keeps Word, Excel and PowerPoint files opening in the right app after they are uploaded.

export const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  dot: "application/msword",
  dotx: "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  rtf: "application/rtf",
  msg: "application/vnd.ms-outlook",
  zip: "application/zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

// For a file picker that takes documents (PDF, Word, Excel, PowerPoint, text) and photos.
export const IMS_DOCUMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.heic,.heif";

// For evidence pickers that also open the camera on a phone.
export const IMS_EVIDENCE_ACCEPT = `image/*,${IMS_DOCUMENT_ACCEPT}`;

export function fileExtension(name: string) {
  const match = /\.([A-Za-z0-9]+)$/.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

export function mimeForFileName(name: string) {
  return MIME_BY_EXTENSION[fileExtension(name)] || "";
}

// The content type to store with an upload. A usable browser-reported type wins; a missing or generic one
// is replaced by the type for the file extension.
export function uploadContentType(file: { name: string; type?: string }) {
  const reported = (file.type || "").trim().toLowerCase();
  if (reported && reported !== "application/octet-stream") return reported;
  return mimeForFileName(file.name) || reported || "application/octet-stream";
}
