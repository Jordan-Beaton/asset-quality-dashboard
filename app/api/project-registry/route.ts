import { NextResponse } from "next/server";
import { getServiceClient, getSignedInEmail, requireAdmin } from "../../../src/lib/requireAdmin";
import { FALLBACK_PROJECTS, RESERVED_PROJECT_KEYS, cleanParts, slugifyProjectName, type RegistryProject } from "../../../src/lib/projectList";

// The shared project list. GET lists projects for any signed-in person; POST (admins only) adds a project and its
// MOC numbering series in one step, so the project is immediately available everywhere.

export const dynamic = "force-dynamic";

async function loadProjects(): Promise<{ projects: RegistryProject[]; fallback: boolean }> {
  const service = getServiceClient();
  const projectRes = await service
    .from("ims_reference_projects")
    .select("name,type,active,project_key")
    .not("project_key", "is", null)
    .eq("type", "Project")
    .order("name", { ascending: true });
  if (projectRes.error) return { projects: FALLBACK_PROJECTS, fallback: true };

  const seriesRes = await service.from("moc_series").select("series_key,prefix,project_key,last_number,parts");
  const series = seriesRes.error ? [] : seriesRes.data || [];
  const byKey = new Map(series.filter((row) => row.project_key).map((row) => [String(row.project_key), row]));

  const projects = (projectRes.data || [])
    .filter((row) => row.active !== false)
    .map((row) => {
      const key = String(row.project_key);
      const match = byKey.get(key);
      return {
        key,
        name: String(row.name),
        type: String(row.type || "Project"),
        active: row.active !== false,
        mocPrefix: match?.prefix ? String(match.prefix) : null,
        parts: Array.isArray(match?.parts) ? (match?.parts as string[]) : [],
        mocCount: Number(match?.last_number || 0),
      } satisfies RegistryProject;
    });
  return { projects, fallback: false };
}

export async function GET() {
  try {
    if (!(await getSignedInEmail())) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const result = await loadProjects();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ projects: FALLBACK_PROJECTS, fallback: true, error: error instanceof Error ? error.message : "Unable to load projects." });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireAdmin();
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = (await request.json()) as { name?: string; prefix?: string; parts?: unknown };
    const name = String(body.name ?? "").replace(/\s+/g, " ").trim();
    const prefix = String(body.prefix ?? "").trim().toUpperCase();
    const parts = cleanParts(body.parts);
    const key = slugifyProjectName(name);

    if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Enter the project name (2 to 60 characters)." }, { status: 400 });
    if (!key || RESERVED_PROJECT_KEYS.has(key)) return NextResponse.json({ error: "That project name cannot be used. Choose a different name." }, { status: 400 });
    if (!/^[A-Z]{3,4}$/.test(prefix)) return NextResponse.json({ error: "The MOC prefix must be 3 or 4 letters." }, { status: 400 });

    const service = getServiceClient();

    const escapeLike = (value: string) => value.replace(/[\\%_]/g, (match) => `\\${match}`);
    const nameClash = await service.from("ims_reference_projects").select("name").ilike("name", escapeLike(name)).limit(1);
    if (nameClash.error) return NextResponse.json({ error: "The project list is not set up yet. Run scripts/sql/project_registry.sql in Supabase first." }, { status: 500 });
    if ((nameClash.data || []).length) return NextResponse.json({ error: `A project called ${nameClash.data![0].name} already exists.` }, { status: 409 });
    const keyClash = await service.from("ims_reference_projects").select("name").eq("project_key", key).limit(1);
    if (!keyClash.error && (keyClash.data || []).length) return NextResponse.json({ error: `The name is too similar to ${keyClash.data![0].name}. Choose a different name.` }, { status: 409 });

    const prefixClash = await service.from("moc_series").select("label").eq("prefix", prefix).limit(1);
    if (prefixClash.error) return NextResponse.json({ error: "The MOC numbering table is not set up yet. Run scripts/sql/project_registry.sql in Supabase first." }, { status: 500 });
    if ((prefixClash.data || []).length) return NextResponse.json({ error: `The prefix ${prefix} is already used by ${prefixClash.data![0].label}.` }, { status: 409 });

    const inserted = await service.from("ims_reference_projects").insert({ name, type: "Project", active: true, project_key: key }).select("id").single();
    if (inserted.error || !inserted.data) return NextResponse.json({ error: inserted.error?.message || "Could not add the project." }, { status: 400 });

    const series = await service.from("moc_series").insert({ series_key: key, label: name, prefix, project_key: key, last_number: 0, parts });
    if (series.error) {
      await service.from("ims_reference_projects").delete().eq("id", inserted.data.id);
      return NextResponse.json({ error: series.error.message }, { status: 400 });
    }

    try {
      await service.from("ims_audit_log").insert({
        actor_email: access.email,
        action_type: "Add Project",
        target_type: "Project",
        target_reference: name,
        summary: `Added project ${name} (MOC prefix ${prefix}${parts.length ? `, parts ${parts.join(", ")}` : ""}).`,
      });
    } catch {
      /* the audit log is best effort */
    }

    return NextResponse.json({ ok: true, project: { key, name, type: "Project", active: true, mocPrefix: prefix, parts, mocCount: 0 } satisfies RegistryProject });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add the project." }, { status: 500 });
  }
}
