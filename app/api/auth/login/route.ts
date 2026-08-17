import { NextResponse } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Local IMS sign-in failed", error);
    return NextResponse.json(
      { error: "The authentication service could not be reached. Please retry." },
      { status: 503 }
    );
  }
}
