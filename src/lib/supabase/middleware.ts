import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // The public Speak Up pages and their two APIs never look at who is signed in. They are let through before any
  // session check, and the visitor's cookies are removed from the request, so nothing links a signed-in member of
  // staff to a report. The marker header tells the layout not to load the signed-in IMS shell around the page.
  const publicPath = request.nextUrl.pathname;
  if (publicPath === "/speak-up" || publicPath === "/api/speak-up/public" || publicPath === "/api/speak-up/evidence" || publicPath === "/api/speak-up/reminders") {
    const forwarded = new Headers(request.headers);
    forwarded.delete("cookie");
    forwarded.set("x-speak-up-public", "1");
    return NextResponse.next({ request: { headers: forwarded } });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);

            response = NextResponse.next({
              request,
            });

            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isPublicAccessRequestApi =
    request.nextUrl.pathname === "/api/access-requests";
  const isPublicAuthApi = request.nextUrl.pathname === "/api/auth/login";
  const isPublicObservationPage = request.nextUrl.pathname === "/observe";
  const isPublicInspectionPackApi = request.nextUrl.pathname === "/api/projects/inspection-records/pack";
  const isPublicObservationApi =
    request.nextUrl.pathname === "/api/hse-observations" ||
    request.nextUrl.pathname === "/api/hse-observations/options";
  const isPublicInvitePage = request.nextUrl.pathname === "/invite";
  const isPublicInviteApi = request.nextUrl.pathname === "/api/invite-link";
  const requestedPath =
    request.nextUrl.pathname + (request.nextUrl.search || "");
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname === "/favicon.ico" ||
    /\.(svg|png|jpg|jpeg|gif|webp)$/.test(request.nextUrl.pathname);

  if (
    isPublicAsset ||
    isPublicAuthApi ||
    isPublicAccessRequestApi ||
    isPublicObservationPage ||
    isPublicObservationApi ||
    isPublicInspectionPackApi ||
    isPublicInvitePage ||
    isPublicInviteApi
  ) {
    return response;
  }

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", requestedPath);
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    const redirectTarget = request.nextUrl.searchParams.get("redirect") || "/";
    const safeRedirectTarget =
      redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")
        ? redirectTarget
        : "/";
    url.pathname = safeRedirectTarget.split("?")[0] || "/";
    url.search = "";
    const redirectQuery = safeRedirectTarget.includes("?")
      ? safeRedirectTarget.slice(safeRedirectTarget.indexOf("?") + 1)
      : "";
    if (redirectQuery) {
      url.search = `?${redirectQuery}`;
    }
    return NextResponse.redirect(url);
  }

  return response;
}
