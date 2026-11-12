import { NextResponse } from "next/server";
import { getSiteOrigin } from "../../../../src/lib/inviteLinks";
import {
  ItpWorkflowError,
  assignPeople,
  decideApproval,
  decideReview,
  postComment,
  remindHolder,
  resolveActor,
  serviceClient,
  setCommentStatus,
  startWorkflow,
  type Ctx,
} from "../../../../src/lib/itpWorkflowServer";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/projects/itp-workflow
// Body: { action: "start" | "assign" | "review" | "approval" | "comment" | "commentStatus" | "remind", ... }
// Every change to the ITP stage gate comes through here. The signed-in person is checked against the person named on the
// gate, and the name, date and time recorded are stamped by the server.
export async function POST(request: Request) {
  try {
    const service = serviceClient();
    const actor = await resolveActor(service);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ItpWorkflowError("The request could not be read.");
    const ctx: Ctx = { service, actor, origin: getSiteOrigin(request) || new URL(request.url).origin };

    switch (body.action) {
      case "start":
        return NextResponse.json(await startWorkflow(ctx, body as never));
      case "assign":
        return NextResponse.json(await assignPeople(ctx, body as never));
      case "review":
        return NextResponse.json(await decideReview(ctx, body as never));
      case "approval":
        return NextResponse.json(await decideApproval(ctx, body as never));
      case "comment":
        return NextResponse.json(await postComment(ctx, body as never));
      case "commentStatus":
        return NextResponse.json(await setCommentStatus(ctx, body as never));
      case "remind":
        return NextResponse.json(await remindHolder(ctx, body as never));
      default:
        throw new ItpWorkflowError("Unknown action.");
    }
  } catch (error) {
    if (error instanceof ItpWorkflowError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "The change could not be saved." }, { status: 500 });
  }
}
