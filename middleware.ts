import { NextRequest, NextResponse } from "next/server";

// Cookie keys should match those set on login
const ACCESS_TOKEN_COOKIE = "access_token";
const ROLE_COOKIE = "role";

const enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
}

export function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;

  // Only guard dashboard and admin route groups; other paths pass through
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  if (!isDashboard && !isAdmin) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
  const role = (req.cookies.get(ROLE_COOKIE)?.value || "").toUpperCase();

  const loginPath = process.env.NEXT_PUBLIC_NO_AUTH_REDIRECT || "/login";

  // If no token, redirect to login (preserve destination via d param)
  if (!token) {
    const dest = encodeURIComponent(pathname + (search || ""));
    const url = new URL(loginPath, origin);
    url.searchParams.set("d", dest);
    return NextResponse.redirect(url);
  }

  // Authenticated but enforce role-based access
  if (isDashboard) {
    // Only USER may access /dashboard
    if (role !== Role.USER) {
      // If admin, redirect to /admin; otherwise to login
      const url = new URL(role === Role.ADMIN ? "/admin" : loginPath, origin);
      return NextResponse.redirect(url);
    }
  }

  if (isAdmin) {
    // Only ADMIN may access /admin
    if (role !== Role.ADMIN) {
      const url = new URL(
        role === Role.USER ? "/dashboard" : loginPath,
        origin
      );
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Limit middleware to only the guarded route groups
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
