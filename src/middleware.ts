import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // --- Subdomain routing (gallery) ---
  const mainDomains = [
    "koetik.studio.my.id",
    "www.koetik.studio.my.id",
    "localhost:3000",
    "localhost",
  ];
  const isMainDomain = mainDomains.some((d) => hostname === d || hostname.startsWith(`${d}:`)) || hostname.includes("ngrok");

  if (!isMainDomain && hostname.includes(".")) {
    const slug = hostname.split(".")[0];

    // Skip rewrite for _next, api, static files
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    // Rewrite subdomain to /g/[slug]
    const url = request.nextUrl.clone();
    url.pathname = `/g/${slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // --- Auth guard for /admin routes ---
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const { user, supabaseResponse } = await updateSession(request);

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // --- Refresh session for auth callback ---
  if (pathname.startsWith("/auth")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
