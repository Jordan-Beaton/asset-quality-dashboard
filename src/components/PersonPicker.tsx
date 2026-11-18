"use client";

// One way to choose a person from the People register. Type to search, pick a name, and it shows as a chip.
// Only people in the register can be chosen. A name that is already saved but is not in the register
// (for example an old free-text entry) is shown as such so it can be replaced, never silently dropped.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type PersonPickerPerson = {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
};

const brand = "#005670";
const accent = "#63B1BC";
const border = "#D0D0CE";
const muted = "#53565A";
const tint = "#EEF7F8";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] || "" : "")).toUpperCase();
}

const avatarStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: brand,
  color: "#ffffff",
  display: "inline-grid",
  placeItems: "center",
  fontSize: 10.5,
  fontWeight: 800,
  flex: "none",
};

export function PersonPicker({
  value,
  onChange,
  people,
  placeholder = "Search people",
  disabled = false,
  compact = false,
  ariaLabel,
}: {
  value: string;
  onChange: (name: string) => void;
  people: PersonPickerPerson[];
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const [listBox, setListBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const selected = useMemo(() => {
    const target = value.trim().toLowerCase();
    return target ? people.find((person) => person.name.trim().toLowerCase() === target) || null : null;
  }, [people, value]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => !q || person.name.toLowerCase().includes(q) || (person.department || "").toLowerCase().includes(q)).slice(0, 60);
  }, [people, query]);

  function place() {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const flip = below < 180 && above > below;
    const maxHeight = Math.max(120, Math.min(280, flip ? above : below));
    setListBox({
      top: flip ? Math.max(8, rect.top - 4 - Math.min(280, maxHeight)) : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
      maxHeight,
    });
  }

  useEffect(() => {
    if (!open) return;
    place();
    const onScroll = (event: Event) => {
      if (listRef.current && event.target instanceof Node && listRef.current.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function choose(person: PersonPickerPerson) {
    onChange(person.name);
    setQuery("");
    setOpen(false);
  }

  const boxStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: compact ? 38 : 42,
    padding: "0 8px 0 10px",
    borderRadius: 10,
    border: `1px solid ${focused ? brand : border}`,
    background: compact ? "#F4F8F8" : "#ffffff",
    boxShadow: focused ? "0 0 0 3px rgba(99, 177, 188, 0.32)" : "none",
    overflow: "hidden",
    boxSizing: "border-box",
    width: "100%",
    opacity: disabled ? 0.7 : 1,
  };

  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <div
        ref={boxRef}
        style={boxStyle}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          window.setTimeout(() => setOpen(false), 120);
        }}
      >
        {value ? (
          <>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: selected ? tint : "#ECECE7",
                border: `1px solid ${selected ? accent : "#FFAD00"}`,
                borderRadius: 99,
                padding: "2px 6px 2px 3px",
                fontWeight: 600,
                fontSize: 13.5,
                minWidth: 0,
                maxWidth: "100%",
              }}
            >
              <span style={{ ...avatarStyle, background: selected ? brand : muted }} aria-hidden="true">
                {initials(value)}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
              {!disabled ? (
                <button
                  type="button"
                  aria-label={`Clear ${value}`}
                  onClick={() => onChange("")}
                  style={{ border: 0, background: "transparent", color: muted, fontSize: 16, lineHeight: 1, padding: "0 4px", cursor: "pointer" }}
                >
                  ×
                </button>
              ) : null}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: muted, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>
              {!selected ? (
                <>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFAD00" }} aria-hidden="true" />
                  Not in People register
                </>
              ) : !selected.email ? (
                <>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFAD00" }} aria-hidden="true" />
                  No email on file
                </>
              ) : (
                selected.department || ""
              )}
            </span>
          </>
        ) : (
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={ariaLabel || placeholder}
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => {
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (!open) return setOpen(true);
                if (!matches.length) return;
                setActive((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
              } else if (event.key === "Enter") {
                event.preventDefault();
                const person = matches[active];
                if (open && person) choose(person);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            style={{ border: 0, outline: 0, background: "transparent", font: "inherit", fontSize: 14, color: "#000000", minWidth: 0, flex: 1, padding: "4px 0", boxShadow: "none" }}
          />
        )}
      </div>

      {open && !value && listBox ? (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          style={{
            position: "fixed",
            zIndex: 1000,
            top: listBox.top,
            left: listBox.left,
            width: listBox.width,
            maxHeight: listBox.maxHeight,
            overflowY: "auto",
            background: "#ffffff",
            border: `1px solid ${border}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.14)",
            padding: 4,
          }}
        >
          {matches.length ? (
            matches.map((person, index) => (
              <div
                key={person.id}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(person);
                }}
                onMouseEnter={() => setActive(index)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "7px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: index === active ? tint : "transparent",
                }}
              >
                <span style={{ ...avatarStyle, width: 28, height: 28 }} aria-hidden="true">
                  {initials(person.name)}
                </span>
                <span style={{ fontSize: 14 }}>
                  {person.name}
                  <small style={{ display: "block", color: muted, fontSize: 12 }}>{person.department || "No department"}</small>
                </span>
                {person.email ? null : <span style={{ fontSize: 11, fontWeight: 700, color: muted }}>No email</span>}
              </div>
            ))
          ) : (
            <div style={{ padding: 10, color: muted, fontSize: 13 }}>
              No one in the People register matches &ldquo;{query}&rdquo;. Add them on the People page first.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
