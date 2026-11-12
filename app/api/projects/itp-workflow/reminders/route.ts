import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSiteOrigin } from "../../../../../src/lib/inviteLinks";
import { ItpWorkflowError, runReminders, serviceClient } from "../../../../../src/lib/itpWorkflowServer";

export const runtime = "nodejs";
export const maxDuration = 60;

// Called on weekday mornings by the scheduler (see vercel.json). Reminds whoever holds an ITP gate: once the day before it
// is due, then daily once overdue (the Quality Lead is copied on the third), then weekly. Add ?dry=1 to see what would be
// sent without sending anything.

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ItpWorkflowError("Reminders are not set up on this environment.", 503);
    const supplied = request.headers.get("authorization") || "";
    if (!timingSafeEqual(sha256(supplied), sha256(`Bearer ${secret}`))) throw new ItpWorkflowError("Not allowed.", 401);

    const dryRun = new URL(request.url).searchParams.get("dry") === "1";
    const origin = getSiteOrigin(request) || new URL(request.url).origin;
    const result = await runReminders(serviceClient(), origin, dryRun);
    return NextResponse.json({ dryRun, ...result }, { headers });
  } catch (error) {
    if (error instanceof ItpWorkflowError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reminders could not run." }, { status: 500, headers });
  }
}
