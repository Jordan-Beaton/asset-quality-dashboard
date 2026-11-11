"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { markBackIntent, recordVisit } from "../lib/navHistory";

function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    recordVisit(pathname + (search ? `?${search}` : ""));
  }, [pathname, search]);

  // The browser's own Back button counts as going back too. The capture phase runs before the router updates the page,
  // so the marker is in place by the time the new screen is recorded.
  useEffect(() => {
    window.addEventListener("popstate", markBackIntent, true);
    return () => window.removeEventListener("popstate", markBackIntent, true);
  }, []);

  return null;
}

// Mounted once in the app shell. It notes each IMS screen the person visits so the Back button knows where to return to.
export function NavTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
