import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "access_token";
const ROLE_COOKIE = "role";

const enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
}

export function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;

  const dashboardGroupPrefixes = [
    "/dashboard",
    "/projects",
    "/worklogs",
    "/settings",
  ];
  const isDashboard = dashboardGroupPrefixes.some((p) =>
    pathname.startsWith(p)
  );
  const isAdmin = pathname.startsWith("/admin");
  if (!isDashboard && !isAdmin) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
  const role = (req.cookies.get(ROLE_COOKIE)?.value || "").toUpperCase();

  const loginPath = process.env.NEXT_PUBLIC_NO_AUTH_REDIRECT || "/login";

  if (!token) {
    const dest = encodeURIComponent(pathname + (search || ""));
    const url = new URL(loginPath, origin);
    url.searchParams.set("d", dest);
    return NextResponse.redirect(url);
  }

  if (isDashboard) {
    if (role !== Role.USER) {
      const url = new URL(role === Role.ADMIN ? "/admin" : loginPath, origin);
      return NextResponse.redirect(url);
    }
  }

  if (isAdmin) {
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
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/worklogs/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
