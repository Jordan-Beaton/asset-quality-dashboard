"use client";

import { useSyncExternalStore } from "react";

// True on a phone-width screen (720px and below, the same breakpoint the global phone CSS uses).
// Use it to render a different structure on phones, not just different styling.
// The server and the first client render report false, so the desktop markup is what first loads.
const PHONE_QUERY = "(max-width: 720px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(PHONE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function usePhoneLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false
  );
}
