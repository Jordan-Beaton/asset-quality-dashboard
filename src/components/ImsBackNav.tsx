"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_CHANGE_EVENT, labelForPath, markBackIntent, previousVisit, recordVisit } from "../lib/navHistory";

// The Back control at the top of every IMS page: returns to the screen the person came from (filters included),
// with a small IMS Home button beside it. With no earlier screen it is just "Back to IMS Home".
export function ImsBackNav() {
  const pathname = usePathname();
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setPrevious(previousVisit(window.location.pathname + window.location.search));
    // This runs before the shell has noted the visit, so note it here too (it is safe to do twice).
    recordVisit(window.location.pathname + window.location.search);
    refresh();
    window.addEventListener(NAV_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(NAV_CHANGE_EVENT, refresh);
  }, [pathname]);

  const target = previous && previous !== "/home" ? previous : null;
  const label = target ? labelForPath(target) : "IMS Home";

  return (
    <nav className="ims-back-nav" aria-label="Page navigation">
      <Link href={target || "/home"} aria-label={`Back to ${label}`} onClick={target ? markBackIntent : undefined}>
        <span aria-hidden="true">← </span>
        <span className="ims-back-long">Back to {label}</span>
        <span className="ims-back-short">{target ? label : "Home"}</span>
      </Link>
      {target ? (
        <Link href="/home" className="ims-back-home" aria-label="IMS Home">
          <span className="ims-back-long">IMS Home</span>
          <span className="ims-back-short">Home</span>
        </Link>
      ) : null}
    </nav>
  );
}
