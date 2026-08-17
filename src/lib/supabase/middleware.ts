import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
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
  const isPublicObservationPage = request.nextUrl.pathname === "/observe";
  const isPublicObservationApi = request.nextUrl.pathname === "/api/hse-observations";
  const requestedPath =
    request.nextUrl.pathname + (request.nextUrl.search || "");
  const isPublicAsset =
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname === "/favicon.ico" ||
    /\.(svg|png|jpg|jpeg|gif|webp)$/.test(request.nextUrl.pathname);

  if (
    isPublicAsset ||
    isPublicAccessRequestApi ||
    isPublicObservationPage ||
    isPublicObservationApi
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
