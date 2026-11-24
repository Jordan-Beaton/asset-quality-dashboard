// One way to open and save files across the IMS, built for phones as well as desktops.
//
// Why this exists: phone browsers are strict about two things the desktop ignores.
//  1. window.open() called after an await (for example after fetching a signed storage link) is treated as a
//     pop-up and blocked on iPhones and many Android in-app browsers, so "View file" silently did nothing.
//  2. A download link that is clicked without being attached to the page, or whose blob address is released
//     straight away, produces an empty or failed download on Safari and some Android browsers.

// Open a file (PDF, Word, Excel, PowerPoint, image...) from a link that was fetched asynchronously.
// Returns true when it opened in a new tab. If the browser blocks the new tab, it opens in this tab instead
// so the file always opens; the Back button returns to the IMS.
export function openFileUrl(url: string): boolean {
  if (!url) return false;
  let opened: Window | null = null;
  try {
    opened = window.open(url, "_blank");
  } catch {
    opened = null;
  }
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // some browsers will not let the opener be cleared; the file still opens
    }
    return true;
  }
  window.location.assign(url);
  return false;
}

// Save a generated file (Word, Excel, PDF...) to the device.
export function saveBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Releasing the address immediately cancels the download on Safari; give the browser time to read it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Open a generated PDF for viewing: a new tab where the browser allows it, otherwise save it so it is never lost.
export function openOrSaveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  let opened: Window | null = null;
  try {
    opened = window.open(url, "_blank");
  } catch {
    opened = null;
  }
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // see openFileUrl
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    return true;
  }
  URL.revokeObjectURL(url);
  saveBlobAsFile(blob, fileName);
  return false;
}
