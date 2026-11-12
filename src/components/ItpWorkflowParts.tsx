"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  daysLate,
  daysWaiting,
  formatShortDate,
  gateSteps,
  holderOf,
  initialsOf,
  type ItpPerson,
  type WorkflowRevision,
} from "../lib/itpWorkflow";

export type PersonOption = { id: string; name: string; role: string | null; department: string | null; email: string | null };

// Sends one change to the stage gate. The server checks who is signed in; it throws the server's own message on refusal.
export async function callWorkflow<T = { ok: boolean; warning?: string }>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/projects/itp-workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "That change could not be saved.");
  return result as T;
}

export function optionLabel(person: PersonOption) {
  const detail = [person.role, person.department].filter(Boolean).join(", ");
  return detail ? `${person.name} · ${detail}` : person.name;
}

// The two gates as small linked chips: Review, then Approval.
export function GateChips({ revision }: { revision: Pick<WorkflowRevision, "workflow_state"> }) {
  const steps = gateSteps(revision.workflow_state);
  const reviewLabel = revision.workflow_state === "With Supplier" ? "Review: comments" : "Review";
  return (
    <span className="itp-gates">
      <span className={`itp-gs ${steps.review}`}>{reviewLabel}</span>
      <span className="itp-gl" aria-hidden="true" />
      <span className={`itp-gs ${steps.approval}`}>Approval</span>
    </span>
  );
}

// Who the ITP is waiting on, and for how long.
export function WaitingOn({ revision, supplier }: { revision: WorkflowRevision; supplier: string | null }) {
  if (revision.workflow_state === "Approved") return <span className="itp-muted">Complete</span>;
  if (revision.workflow_state === "With Supplier") {
    return (
      <span className="itp-person">
        <span className="itp-av ext" aria-hidden="true">{(supplier || "SU").slice(0, 2).toUpperCase()}</span>
        <span className="itp-who">{supplier || "Supplier"}<span className="itp-sub">revised ITP due</span></span>
      </span>
    );
  }
  const holder = holderOf(revision);
  if (!holder) {
    return (
      <span className="itp-person">
        <span className="itp-av none" aria-hidden="true">?</span>
        <span className="itp-who itp-late">No {revision.workflow_state === "Awaiting Approval" ? "approver" : "reviewer"}<span className="itp-sub">choose one to start the clock</span></span>
      </span>
    );
  }
  const waiting = daysWaiting(revision);
  return (
    <span className="itp-person">
      <span className="itp-av" aria-hidden="true">{initialsOf(holder.name)}</span>
      <span className="itp-who">{holder.name}<span className="itp-sub">{waiting === 0 ? "today" : `${waiting} ${waiting === 1 ? "day" : "days"}`}</span></span>
    </span>
  );
}

export function DueCell({ revision }: { revision: WorkflowRevision }) {
  if (!revision.gate_due_date || revision.workflow_state === "Approved" || revision.workflow_state === "With Supplier") return <span className="itp-muted">—</span>;
  const late = daysLate(revision);
  if (late > 0) return <span className="itp-late">{formatShortDate(revision.gate_due_date)}<span className="itp-sub itp-late">{late} {late === 1 ? "day" : "days"} late</span></span>;
  return <span>{formatShortDate(revision.gate_due_date)}</span>;
}

function validEmail(person: PersonOption) {
  return Boolean(person.email && person.email.includes("@"));
}

function matches(person: PersonOption, needle: string) {
  if (!needle) return true;
  const haystack = [person.name, person.role, person.department, person.email].filter(Boolean).join(" ").toLowerCase();
  return needle.toLowerCase().split(/\s+/).every((part) => haystack.includes(part));
}

// A type-to-search picker for People. With about 200 people a plain drop-down is slow, so typing narrows the list;
// the arrow keys, Enter and Escape work as in any combo box.
export function PersonCombo({
  id,
  selectedEmail,
  people,
  onPick,
  placeholder = "Choose from People",
  clearLabel,
  disabled,
  exclude = [],
  resetOnPick,
}: {
  id: string;
  selectedEmail: string;
  people: PersonOption[];
  onPick: (person: PersonOption | null) => void;
  placeholder?: string;
  clearLabel?: string;
  disabled?: boolean;
  exclude?: string[];
  resetOnPick?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hiddenKey = exclude.filter(Boolean).map((email) => email.toLowerCase()).sort().join("|");
  const selected = people.find((person) => validEmail(person) && person.email?.toLowerCase() === selectedEmail.toLowerCase());
  const selectedLabel = selected ? optionLabel(selected) : selectedEmail;

  const options = useMemo(() => {
    const hidden = new Set(hiddenKey ? hiddenKey.split("|") : []);
    return people.filter((person) => validEmail(person) && !hidden.has((person.email as string).toLowerCase()) && matches(person, text)).slice(0, 60);
  }, [people, hiddenKey, text]);
  const rows: Array<PersonOption | null> = clearLabel && selectedEmail && !text ? [null, ...options] : options;

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) { setOpen(false); setText(""); }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function choose(person: PersonOption | null) {
    onPick(person);
    setOpen(false);
    setText("");
  }

  return (
    <div ref={wrapRef} className="itp-combo">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && rows[active] !== undefined ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        disabled={disabled}
        className="itp-combo-input"
        placeholder={open || resetOnPick || !(selected || selectedEmail) ? (open && (selected || selectedEmail) ? "Type to search" : placeholder) : undefined}
        value={open ? text : resetOnPick ? "" : selectedLabel}
        onFocus={() => { setOpen(true); setActive(0); }}
        onClick={() => setOpen(true)}
        onChange={(event) => { setText(event.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(rows.length - 1, index + 1)); }
          else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
          else if (event.key === "Enter" && open && rows[active] !== undefined) { event.preventDefault(); choose(rows[active]); }
          else if (event.key === "Escape" || event.key === "Tab") { setOpen(false); setText(""); }
        }}
      />
      <span className="itp-combo-caret" aria-hidden="true">▾</span>
      {open ? (
        <ul id={`${id}-list`} role="listbox" className="itp-combo-list">
          {rows.length === 0 ? <li className="itp-combo-empty">No one matches &ldquo;{text}&rdquo;</li> : null}
          {rows.map((person, index) => (
            <li
              key={person ? person.id : "clear"}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={person ? person.email?.toLowerCase() === selectedEmail.toLowerCase() : false}
              className={`itp-combo-opt${index === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => { event.preventDefault(); choose(person); }}
            >
              {person ? <><strong>{person.name}</strong><span>{[person.role, person.department].filter(Boolean).join(", ") || "No role recorded"}</span></> : <em>{clearLabel}</em>}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// A person chosen from People Management.
export function PersonSelect({
  id,
  value,
  onChange,
  people,
  placeholder = "Choose from People",
  disabled,
  exclude = [],
}: {
  id: string;
  value: string;
  onChange: (email: string) => void;
  people: PersonOption[];
  placeholder?: string;
  disabled?: boolean;
  exclude?: string[];
}) {
  return (
    <PersonCombo id={id} selectedEmail={value} people={people} disabled={disabled} exclude={exclude} placeholder={placeholder} clearLabel={placeholder} onPick={(person) => onChange(person?.email || "")} />
  );
}

// People who are copied on every email for this ITP but do not make a decision.
export function NotifyPicker({ id, value, onChange, people, exclude = [], disabled }: { id: string; value: ItpPerson[]; onChange: (next: ItpPerson[]) => void; people: PersonOption[]; exclude?: string[]; disabled?: boolean }) {
  const taken = [...exclude, ...value.map((item) => item.email)];
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {value.length ? (
        <div className="itp-chiplist">
          {value.map((person) => (
            <span key={person.email} className="itp-personchip">
              {person.name}
              {!disabled ? <button type="button" aria-label={`Remove ${person.name}`} onClick={() => onChange(value.filter((item) => item.email !== person.email))}>×</button> : null}
            </span>
          ))}
        </div>
      ) : null}
      {!disabled ? (
        <PersonCombo
          id={id}
          selectedEmail=""
          people={people}
          exclude={taken}
          resetOnPick
          placeholder={value.length ? "Add another person" : "Add someone to copy in (optional)"}
          onPick={(person) => { if (person?.email) onChange([...value, { name: person.name, email: person.email }]); }}
        />
      ) : null}
    </div>
  );
}
