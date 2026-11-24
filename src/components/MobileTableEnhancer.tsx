"use client";

import { useEffect } from "react";

const priorityHeadingPattern = /(^|\s)(no\.?|number|title|name|status|owner|assigned|priority|due|date|project|location|type)(\s|$)/i;

// A long register turns into a very long column of cards on a phone (one register ran to about 36 screens),
// so the first batch is shown with a "Show more" button. Search and filters still work on every record.
const MOBILE_ROW_BATCH = 25;
const visibleRowCounts = new WeakMap<HTMLTableElement, number>();

export function MobileTableEnhancer({ routeKey }: { routeKey: string }) {
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    let observer: MutationObserver | null = null;
    let scheduled = false;

    const clearTable = (table: HTMLTableElement) => {
      table.classList.remove("ims-mobile-card-table");
      table.querySelectorAll<HTMLTableCellElement>("td[data-mobile-label]").forEach((cell) => {
        cell.removeAttribute("data-mobile-label");
        cell.classList.remove("ims-mobile-card-primary", "ims-mobile-card-secondary");
      });
      table.querySelectorAll<HTMLTableRowElement>("tr[data-mobile-expanded]").forEach((row) => row.removeAttribute("data-mobile-expanded"));
      table.querySelectorAll<HTMLButtonElement>(".ims-mobile-row-toggle").forEach((button) => button.remove());
      table.querySelectorAll<HTMLTableRowElement>("tr[data-mobile-hidden]").forEach((row) => row.removeAttribute("data-mobile-hidden"));
      removeMoreButton(table);
    };

    const removeMoreButton = (table: HTMLTableElement) => {
      const next = table.nextElementSibling;
      if (next && next.classList.contains("ims-mobile-more")) next.remove();
    };

    // Show the first batch of rows, plus any selected row, and a button for the rest.
    const limitRows = (table: HTMLTableElement) => {
      const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>(":scope > tbody > tr"));
      const shown = visibleRowCounts.get(table) || MOBILE_ROW_BATCH;
      if (rows.length <= MOBILE_ROW_BATCH) {
        rows.forEach((row) => row.removeAttribute("data-mobile-hidden"));
        removeMoreButton(table);
        return;
      }
      rows.forEach((row, index) => {
        const keep = index < shown || row.getAttribute("aria-selected") === "true" || row.dataset.selected === "true";
        if (keep) row.removeAttribute("data-mobile-hidden");
        else row.setAttribute("data-mobile-hidden", "true");
      });
      const hidden = rows.filter((row) => row.getAttribute("data-mobile-hidden") === "true").length;
      let button = table.nextElementSibling as HTMLButtonElement | null;
      if (!button || !button.classList.contains("ims-mobile-more")) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "ims-mobile-more";
        button.addEventListener("click", () => {
          visibleRowCounts.set(table, (visibleRowCounts.get(table) || MOBILE_ROW_BATCH) + MOBILE_ROW_BATCH);
          scheduleScan();
        });
        table.insertAdjacentElement("afterend", button);
      }
      if (!hidden) {
        button.remove();
        return;
      }
      const label = `Show ${Math.min(MOBILE_ROW_BATCH, hidden)} more (${hidden} not shown)`;
      if (button.textContent !== label) button.textContent = label;
    };

    const enhanceTable = (table: HTMLTableElement) => {
      if (table.classList.contains("observation-table") || table.dataset.mobileTable === "scroll") return;
      const headings = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th")).map((heading) => heading.textContent?.trim() || "Detail");
      if (!headings.length) return;

      table.classList.add("ims-mobile-card-table");
      table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
        const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>(":scope > td"));
        if (!cells.length || cells.some((cell) => cell.colSpan > 1)) return;

        let visiblePriorityCount = 0;
        cells.forEach((cell, index) => {
          const heading = headings[index] || `Detail ${index + 1}`;
          cell.dataset.mobileLabel = heading;
          const isPriority = index === 0 || (priorityHeadingPattern.test(heading) && visiblePriorityCount < 5);
          cell.classList.toggle("ims-mobile-card-primary", isPriority);
          cell.classList.toggle("ims-mobile-card-secondary", !isPriority);
          if (isPriority) visiblePriorityCount += 1;
        });

        if (!cells.some((cell) => cell.classList.contains("ims-mobile-card-secondary"))) return;
        if (row.querySelector(".ims-mobile-row-toggle")) return;
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "ims-mobile-row-toggle";
        toggle.textContent = "Expand";
        toggle.setAttribute("aria-expanded", "false");
        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const expanded = row.dataset.mobileExpanded === "true";
          row.dataset.mobileExpanded = expanded ? "false" : "true";
          toggle.textContent = expanded ? "Expand" : "Collapse";
          toggle.setAttribute("aria-expanded", String(!expanded));
        });
        cells[0].appendChild(toggle);
      });
      limitRows(table);
    };

    const scan = () => {
      scheduled = false;
      const tables = document.querySelectorAll<HTMLTableElement>(".ims-page-container table");
      tables.forEach((table) => {
        table.classList.add("ims-data-table");
        const wrapper = table.parentElement;
        if (wrapper && !wrapper.matches("td, th")) {
          wrapper.classList.add("ims-register-table-wrap");
        }
        if (media.matches) enhanceTable(table);
        else clearTable(table);
      });
    };

    const scheduleScan = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(scan);
    };

    scan();
    media.addEventListener("change", scheduleScan);
    observer = new MutationObserver(scheduleScan);
    const page = document.querySelector(".ims-page-container");
    if (page) observer.observe(page, { childList: true, subtree: true });

    return () => {
      media.removeEventListener("change", scheduleScan);
      observer?.disconnect();
      document.querySelectorAll<HTMLTableElement>(".ims-mobile-card-table").forEach(clearTable);
    };
  }, [routeKey]);

  return null;
}
