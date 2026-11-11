"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "next/navigation";
import { syncCurrentVisit } from "./navHistory";

// These hooks work like useState, but the value also lives in the page address (for example ?status=Open), so a filter
// survives opening a record and coming back, can be bookmarked, and can be sent to a colleague as a link.
// A value equal to its default is left out of the address, so an unfiltered page keeps a clean URL.

const WRITE_DELAY_MS = 150;

function writeParam(key: string, value: string, fallback: string) {
  const url = new URL(window.location.href);
  if (value === "" || value === fallback) url.searchParams.delete(key);
  else url.searchParams.set(key, value);

  const current = window.location.pathname + window.location.search + window.location.hash;
  const next = url.pathname + url.search + url.hash;
  if (next === current) return;

  window.history.replaceState(window.history.state, "", next);
  // The Back button on the next screen must return to this exact filtered state.
  syncCurrentVisit(url.pathname + url.search);
}

// `allowed` guards typed filters: an address with a value the page does not recognise falls back to the default.
export function useUrlState<T extends string = string>(key: string, initial: NoInfer<T>, allowed?: readonly NoInfer<T>[]): [T, Dispatch<SetStateAction<T>>] {
  const searchParams = useSearchParams();

  const fromRaw = useCallback(
    (raw: string | null): T => {
      if (raw === null) return initial;
      if (allowed && !allowed.includes(raw as T)) return initial;
      return raw as T;
    },
    [initial, allowed]
  );

  const [value, setValue] = useState<T>(() => fromRaw(searchParams.get(key)));
  const latest = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      const next = typeof action === "function" ? (action as (previous: T) => T)(latest.current) : action;
      if (next === latest.current) return;
      latest.current = next;
      setValue(next);

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        writeParam(key, next, initial);
      }, WRITE_DELAY_MS);
    },
    [key, initial]
  );

  // A link on the same page that changes the address (for example "Open overdue actions") should change the filter too.
  const addressSignature = searchParams.toString();
  useEffect(() => {
    if (timer.current) return;
    const external = fromRaw(new URLSearchParams(window.location.search).get(key));
    if (external !== latest.current) {
      latest.current = external;
      setValue(external);
    }
  }, [addressSignature, key, fromRaw]);

  // Leaving the page must not let a late write land on the next page's address.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return [value, set];
}

export function useUrlFlag(key: string, initial = false): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [raw, setRaw] = useUrlState<string>(key, initial ? "1" : "0", ["0", "1"]);
  const setFlag = useCallback<Dispatch<SetStateAction<boolean>>>(
    (action) => {
      setRaw((previous) => {
        const next = typeof action === "function" ? (action as (previous: boolean) => boolean)(previous === "1") : action;
        return next ? "1" : "0";
      });
    },
    [setRaw]
  );
  return [raw === "1", setFlag];
}

export function useUrlList(key: string): [string[], Dispatch<SetStateAction<string[]>>] {
  const [raw, setRaw] = useUrlState<string>(key, "");
  const setList = useCallback<Dispatch<SetStateAction<string[]>>>(
    (action) => {
      setRaw((previous) => {
        const current = previous ? previous.split(",") : [];
        const next = typeof action === "function" ? (action as (previous: string[]) => string[])(current) : action;
        return next.join(",");
      });
    },
    [setRaw]
  );
  return [raw ? raw.split(",") : [], setList];
}
