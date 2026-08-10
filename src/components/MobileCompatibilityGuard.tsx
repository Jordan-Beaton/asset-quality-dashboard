"use client";

import { useEffect } from "react";

export function MobileCompatibilityGuard({ routeKey }: { routeKey: string }) {
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    let frame = 0;
    let lastWarningSignature = "";
    let mutationObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const audit = () => {
      frame = 0;
      const root = document.querySelector<HTMLElement>(".ims-responsive-contract");
      if (!root || !media.matches) {
        root?.removeAttribute("data-mobile-overflow");
        return;
      }

      const rootRect = root.getBoundingClientRect();
      const offenders = Array.from(root.querySelectorAll<HTMLElement>("main *, form *, section *, article *"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1);
        })
        .slice(0, 5);
      const hasOverflow = root.scrollWidth > root.clientWidth + 1 || offenders.length > 0;
      root.dataset.mobileOverflow = hasOverflow ? "true" : "false";
      const warningSignature = hasOverflow
        ? offenders.map((element) => `${element.tagName}.${String(element.className)}`).join("|") || "root-overflow"
        : "";

      if (hasOverflow && process.env.NODE_ENV !== "production" && warningSignature !== lastWarningSignature) {
        lastWarningSignature = warningSignature;
        console.warn("IMS mobile compatibility contract detected horizontal overflow.", {
          route: routeKey,
          offenders: offenders.map((element) => ({
            element: element.tagName.toLowerCase(),
            className: element.className,
          })),
        });
      } else if (!hasOverflow) {
        lastWarningSignature = "";
      }
    };

    const scheduleAudit = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(audit);
    };

    scheduleAudit();
    media.addEventListener("change", scheduleAudit);
    mutationObserver = new MutationObserver(scheduleAudit);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    const root = document.querySelector<HTMLElement>(".ims-responsive-contract");
    if (root) {
      resizeObserver = new ResizeObserver(scheduleAudit);
      resizeObserver.observe(root);
    }

    return () => {
      media.removeEventListener("change", scheduleAudit);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [routeKey]);

  return null;
}
