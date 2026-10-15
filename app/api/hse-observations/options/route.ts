import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "../../../../src/lib/supabase/server";
import {
  buildProjectLabel,
  cleanProjectText,
  defaultObservationProjects,
  mergeProjectLists,
  projectNameKey,
} from "../../../../src/lib/observationProjects";

export const runtime = "nodejs";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

async function addedProjects(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("hse_observation_projects").select("name").order("created_at", { ascending: true }).limit(500);
  if (error) return { names: [] as string[], missing: true };
  return { names: ((data || []) as Array<{ name: string }>).map((row) => row.name), missing: false };
}

// Previously entered Vessel / Worksite names, so people pick an existing spelling instead of
// typing a new variant. Spellings that differ only by capitalisation or spacing are merged,
// keeping the one used most often.
async function vesselSuggestions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("hse_observations")
    .select("vessel_worksite,project")
    .not("vessel_worksite", "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return [] as Array<{ name: string; projects: string[] }>;
  const groups = new Map<string, { spellings: Map<string, number>; projects: Set<string>; count: number }>();
  ((data || []) as Array<{ vessel_worksite: string | null; project: string | null }>).forEach((row) => {
    const name = cleanProjectText(row.vessel_worksite);
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!key) return;
    const group = groups.get(key) || { spellings: new Map<string, number>(), projects: new Set<string>(), count: 0 };
    group.spellings.set(name, (group.spellings.get(name) || 0) + 1);
    if (row.project) group.projects.add(row.project);
    group.count += 1;
    groups.set(key, group);
  });
  return [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 300)
    .map((group) => ({
      name: [...group.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0],
      projects: [...group.projects],
    }));
}

async function signedInUser() {
  try {
    const client = await createServerSupabaseClient();
    const { data } = await client.auth.getUser();
    return data.user || null;
  } catch {
    return null;
  }
}

// Public: the observation form needs the project list and vessel suggestions without a sign-in.
export async function GET() {
  const supabase = serviceClient();
  const user = await signedInUser();
  if (!supabase) {
    return NextResponse.json({ projects: defaultObservationProjects, vessels: [], canAddProject: false });
  }
  const [added, vessels] = await Promise.all([addedProjects(supabase), vesselSuggestions(supabase)]);
  return NextResponse.json({
    projects: mergeProjectLists(defaultObservationProjects, added.names),
    vessels,
    canAddProject: Boolean(user) && !added.missing,
  });
}

// Signed-in IMS users only: add a project to the shared list.
export async function POST(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to the IMS to add a project." }, { status: 401 });
  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "Project list is not configured on this environment." }, { status: 500 });

  let body: { name?: unknown; number?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The project could not be read." }, { status: 400 });
  }
  const name = cleanProjectText(body.name, 60);
  const number = cleanProjectText(body.number, 24);
  if (name.length < 2) return NextResponse.json({ error: "Enter the project name." }, { status: 400 });
  const label = buildProjectLabel(name, number);

  const added = await addedProjects(supabase);
  if (added.missing) {
    return NextResponse.json({ error: "Adding projects needs the one-off database setup (scripts/sql/hse_observation_projects_vessel.sql) to be run first." }, { status: 503 });
  }
  const existing = mergeProjectLists(defaultObservationProjects, added.names);
  const duplicate = existing.find((project) => projectNameKey(project) === projectNameKey(label));
  if (duplicate) {
    return NextResponse.json({ error: `"${duplicate}" is already in the list.`, project: duplicate }, { status: 409 });
  }

  const { error } = await supabase.from("hse_observation_projects").insert({ name: label, created_by: user.id });
  if (error) {
    return NextResponse.json({ error: error.message.includes("duplicate") ? "That project is already in the list." : error.message }, { status: error.message.includes("duplicate") ? 409 : 500 });
  }
  return NextResponse.json({ project: label, projects: mergeProjectLists(existing, [label]) });
}
