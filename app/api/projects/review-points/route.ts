import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "../../../../src/lib/supabase/server";
import {
  assignReviewPoints,
  decideReviewPoints,
  importReviewPoints,
  reopenReviewPoints,
  ReviewPointError,
  type ReviewActor,
} from "../../../../src/lib/reviewPointsServer";

export const runtime = "nodejs";
export const maxDuration = 60;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ReviewPointError("Review points are not configured on this environment.", 500);
  return createClient(url, key);
}

// The signed-in person, with the name shown on their sign-off taken from People Management
// (matched on login email), falling back to their account name.
async function resolveActor(supabase: ReturnType<typeof serviceClient>): Promise<ReviewActor> {
  const userClient = await createServerSupabaseClient();
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user || !data.user.email) throw new ReviewPointError("Authentication required.", 401);
  const email = data.user.email.toLowerCase();
  // underscores and percent signs are wildcards in a pattern match, so escape them to match this exact address
  const { data: person } = await supabase.from("people").select("name").ilike("email", email.replace(/[\\%_]/g, "\\$&")).eq("active", true).limit(1).maybeSingle();
  const metadata = data.user.user_metadata as { full_name?: string; name?: string } | undefined;
  return { userId: data.user.id, email, name: person?.name || metadata?.full_name || metadata?.name || email };
}

// POST /api/projects/review-points
// Body: { action: "import" | "assign" | "decide" | "reopen", ... }
export async function POST(request: Request) {
  try {
    const supabase = serviceClient();
    const actor = await resolveActor(supabase);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ReviewPointError("The request could not be read.");

    switch (body.action) {
      case "import":
        return NextResponse.json(await importReviewPoints(supabase, actor, {
          projectKey: String(body.projectKey || ""),
          itpId: String(body.itpId || ""),
          revisionId: String(body.revisionId || ""),
          points: Array.isArray(body.points) ? (body.points as never) : [],
        }));
      case "assign":
        return NextResponse.json(await assignReviewPoints(supabase, actor, { ids: body.ids, reviewer: body.reviewer, targetDate: body.targetDate }));
      case "decide":
        return NextResponse.json(await decideReviewPoints(supabase, actor, { ids: body.ids, decision: body.decision, note: body.note }));
      case "reopen":
        return NextResponse.json(await reopenReviewPoints(supabase, actor, { ids: body.ids, note: body.note }));
      default:
        throw new ReviewPointError("Unknown action.");
    }
  } catch (error) {
    if (error instanceof ReviewPointError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "The review point could not be saved." }, { status: 500 });
  }
}
