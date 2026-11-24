"use client";

// Shared record screen, modelled on the Management of Change workbench: a header with the status and the next-step
// button, progress steps, a "still missing" list, and an optional live summary beside the form.
// The module keeps its own form fields. It wraps each group of fields in <WorkbenchStep> and passes the step list.
// Nothing here saves data or changes a status: it only shows where a record is and what is missing.

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type WorkbenchTone = "ok" | "warn" | "bad" | "neu" | "brand";

export type WorkbenchStepDef = {
  key: string;
  label: string;
  /** Short line under the label, for example "Sections A, B". */
  sub?: string;
  /** 0 to 100. Leave undefined for a step that only reports a state. */
  pct?: number | null;
  /** Used instead of a percentage, for example "Received" or "0 files". */
  state?: string;
};

export function StatusPill({ label, tone = "neu" }: { label: string; tone?: WorkbenchTone }) {
  return <span className={`ims-pill ims-pill--${tone}`}>{label}</span>;
}

/** Maps the status words used across the IMS to a tone, so every module colours them the same way. */
export function toneForStatus(status: string | null | undefined): WorkbenchTone {
  const value = (status || "").trim().toLowerCase();
  if (!value) return "neu";
  if (["closed", "complete", "completed", "approved", "effective", "issued", "done", "accepted"].includes(value)) return "ok";
  if (["overdue", "action required", "high", "rejected", "not effective", "immediate attention", "major"].includes(value)) return "bad";
  if (["in progress", "in review", "extended", "under review", "investigating"].includes(value)) return "brand";
  if (["open", "new", "awaiting issue", "pending", "due soon", "review due"].includes(value)) return "warn";
  return "neu";
}

/** A row of arrows showing where a record sits, for example Open > In Progress > Closed. */
export function StatusTrack({ steps, current }: { steps: string[]; current: string }) {
  const index = steps.findIndex((step) => step.toLowerCase() === (current || "").trim().toLowerCase());
  return (
    <div className="ims-track" role="list" aria-label="Status track">
      {steps.map((step, position) => {
        const state = index < 0 ? "todo" : position < index ? "done" : position === index ? "now" : "todo";
        return (
          <span key={step} role="listitem" className={`ims-track__step ims-track__step--${state}`} aria-current={state === "now" ? "step" : undefined}>
            {step}
          </span>
        );
      })}
    </div>
  );
}

export function RecordHeader({
  id,
  title,
  status,
  actions,
  note,
  track,
}: {
  id: string;
  title: string;
  status?: { label: string; tone?: WorkbenchTone } | null;
  /** The next-step button and Hide Panel, in the same place on every record. */
  actions?: ReactNode;
  /** One calm line: why the record is locked, or what happens next. */
  note?: ReactNode;
  track?: { steps: string[]; current: string } | null;
}) {
  return (
    <div className="ims-wb-head">
      <div className="ims-wb-head__row">
        <div style={{ minWidth: 0 }}>
          <div className="ims-wb-head__id">{id}</div>
          <div className="ims-wb-head__title">{title || "Untitled"}</div>
        </div>
        <div className="ims-wb-head__actions">
          {status?.label ? <StatusPill label={status.label} tone={status.tone ?? toneForStatus(status.label)} /> : null}
          {actions}
        </div>
      </div>
      {track ? <StatusTrack steps={track.steps} current={track.current} /> : null}
      {note ? <div className="ims-wb-head__note">{note}</div> : null}
    </div>
  );
}

export function RecordSteps({ steps, active, onChange, ariaLabel = "Record steps" }: { steps: WorkbenchStepDef[]; active: string; onChange: (key: string) => void; ariaLabel?: string }) {
  return (
    <div className="ims-steps" role="tablist" aria-label={ariaLabel}>
      {steps.map((step, position) => {
        const isActive = step.key === active;
        const pct = step.pct == null ? null : Math.max(0, Math.min(100, Math.round(step.pct)));
        const tone = pct === 100 ? "done" : pct != null && pct > 0 && pct < 50 ? "low" : "mid";
        return (
          <button key={step.key} type="button" role="tab" aria-selected={isActive} className={`ims-step${isActive ? " ims-step--on" : ""}`} onClick={() => onChange(step.key)}>
            <span className="ims-step__top">
              <span>{`${position + 1}  ${step.label}`}</span>
              <span className="ims-step__pct">{pct == null ? step.state || "" : `${pct}%`}</span>
            </span>
            {step.sub ? <span className="ims-step__sub">{step.sub}</span> : null}
            {pct == null ? null : (
              <span className={`ims-meter ims-meter--${tone}`}>
                <span style={{ width: `${pct}%` }} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function MissingChips({ items, gate, onJump }: { items: Array<string | { label: string; step?: string }>; gate: string; onJump?: (step: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="ims-missing ims-missing--ok" role="status">
        <b>Ready: nothing is missing before {gate}.</b>
      </div>
    );
  }
  return (
    <div className="ims-missing" role="status">
      <b>
        {items.length} item{items.length === 1 ? "" : "s"} still missing before {gate}
      </b>
      <div>
        {items.map((item) => {
          const label = typeof item === "string" ? item : item.label;
          const step = typeof item === "string" ? undefined : item.step;
          return step && onJump ? (
            <button key={label} type="button" className="ims-chip ims-chip--link" onClick={() => onJump(step)}>
              {label}
            </button>
          ) : (
            <span key={label} className="ims-chip">
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export type DocPreviewSection = { heading: string; rows: Array<{ label: string; value: string | null | undefined; step?: string }> };

/** A live summary of what will go into the report or document, with unfinished fields shown as amber blanks. */
export function DocPreview({ title, sections, onJump }: { title: string; sections: DocPreviewSection[]; onJump?: (step: string) => void }) {
  return (
    <aside className="ims-doc" aria-label={title}>
      <div className="ims-doc__title">{title}</div>
      {sections.map((section) => (
        <div key={section.heading}>
          <div className="ims-doc__band">{section.heading}</div>
          {section.rows.map((row) => {
            const value = (row.value ?? "").toString().trim();
            return (
              <div key={`${section.heading}-${row.label}`} className="ims-doc__row">
                <span className="ims-doc__label">{row.label}</span>
                <span>
                  {value ? (
                    value
                  ) : row.step && onJump ? (
                    <button type="button" className="ims-doc__blank ims-doc__blank--link" onClick={() => onJump(row.step!)}>
                      to be completed
                    </button>
                  ) : (
                    <span className="ims-doc__blank">to be completed</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

type WorkbenchContextValue = { active: string; showAll: boolean };
const WorkbenchContext = createContext<WorkbenchContextValue>({ active: "", showAll: true });

/** Wrap each group of existing fields in this. It shows only when its step is active, or when "All sections" is on. */
export function WorkbenchStep({ stepKey, children }: { stepKey: string; children: ReactNode }) {
  const { active, showAll } = useContext(WorkbenchContext);
  const visible = showAll || active === stepKey;
  return (
    <div className="ims-wb-pane" data-step={stepKey} hidden={!visible}>
      {children}
    </div>
  );
}

type ViewMode = "form" | "split" | "report";

/**
 * The whole record screen. Mount it with key={record id} so the step resets when another record is opened.
 * children: the module's own form sections, each wrapped in <WorkbenchStep>.
 * side: the live summary (a <DocPreview>, linked record card, history). Leave out when there is nothing to show.
 */
export function RecordWorkbench({
  header,
  steps,
  initialStep,
  missing,
  gate,
  side,
  reportLabel = "Report",
  children,
}: {
  header: ReactNode;
  steps: WorkbenchStepDef[];
  initialStep?: string;
  missing?: Array<string | { label: string; step?: string }>;
  gate: string;
  side?: ReactNode;
  reportLabel?: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(initialStep && steps.some((step) => step.key === initialStep) ? initialStep : steps[0]?.key || "");
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState<ViewMode>(side ? "split" : "form");
  const hasSide = Boolean(side);
  const effectiveView: ViewMode = hasSide ? view : "form";

  return (
    <WorkbenchContext.Provider value={{ active, showAll }}>
      <div className="ims-wb" data-view={effectiveView}>
        {header}
        <div className="ims-wb-tools">
          <button type="button" className={`ims-wb-toggle${showAll ? " ims-wb-toggle--on" : ""}`} aria-pressed={showAll} onClick={() => setShowAll((current) => !current)} title="Show every section on one long page, as before">
            All sections
          </button>
          {hasSide ? (
            <div role="group" aria-label="Form and report layout" className="ims-wb-views">
              {(["form", "split", "report"] as ViewMode[]).map((option) => (
                <button key={option} type="button" aria-pressed={view === option} className={view === option ? "on" : ""} onClick={() => setView(option)}>
                  {option === "form" ? "Form" : option === "split" ? "Split" : reportLabel}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <RecordSteps steps={steps} active={active} onChange={(key) => { setShowAll(false); setActive(key); }} />
        <div className="ims-wb-body">
          <div className="ims-wb-form">{children}</div>
          {hasSide ? (
            <div className="ims-wb-side">
              {missing ? <MissingChips items={missing} gate={gate} onJump={(key) => { setShowAll(false); setActive(key); }} /> : null}
              {side}
            </div>
          ) : missing ? (
            <div className="ims-wb-side">
              <MissingChips items={missing} gate={gate} onJump={(key) => { setShowAll(false); setActive(key); }} />
            </div>
          ) : null}
        </div>
      </div>
    </WorkbenchContext.Provider>
  );
}

/** Share of the given checks that are done, as a whole percentage. Returns 100 when there is nothing to check. */
export function percentDone(checks: boolean[]) {
  if (checks.length === 0) return 100;
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
