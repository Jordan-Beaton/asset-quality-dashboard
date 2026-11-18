"use client";

// Reads the shared project list (/api/project-registry). Shared between components, fetched once per page load and
// refreshed after a project is added. If the list cannot be read, the two original projects are shown so nothing breaks.

import { useCallback, useEffect, useState } from "react";
import { FALLBACK_PROJECTS, type RegistryProject } from "./projectList";

let cache: RegistryProject[] | null = null;
let inflight: Promise<RegistryProject[]> | null = null;
const listeners = new Set<(projects: RegistryProject[]) => void>();

async function fetchProjects(): Promise<RegistryProject[]> {
  try {
    const response = await fetch("/api/project-registry", { cache: "no-store" });
    if (!response.ok) return cache || FALLBACK_PROJECTS;
    const payload = (await response.json()) as { projects?: RegistryProject[] };
    return Array.isArray(payload.projects) && payload.projects.length ? payload.projects : FALLBACK_PROJECTS;
  } catch {
    return cache || FALLBACK_PROJECTS;
  }
}

export async function refreshProjectRegistry() {
  inflight = fetchProjects();
  const projects = await inflight;
  inflight = null;
  cache = projects;
  listeners.forEach((listener) => listener(projects));
  return projects;
}

export function useProjectRegistry(enabled = true) {
  const [projects, setProjects] = useState<RegistryProject[]>(cache || FALLBACK_PROJECTS);
  const [loaded, setLoaded] = useState(Boolean(cache));

  useEffect(() => {
    const listener = (next: RegistryProject[]) => {
      setProjects(next);
      setLoaded(true);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (cache) {
      setProjects(cache);
      setLoaded(true);
      return;
    }
    void (inflight || refreshProjectRegistry());
  }, [enabled]);

  const refresh = useCallback(() => refreshProjectRegistry(), []);
  return { projects, loaded, refresh };
}
