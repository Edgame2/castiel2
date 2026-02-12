/**
 * Route protection: redirect unauthenticated requests to /login.
 * Uses accessToken cookie. Runs on every request so 307 causes browser to navigate.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/accept-invitation",
  "/logout",
  "/unauthorized",
];

function isPublicPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return PUBLIC_PATHS.some((p) => normalized === p || normalized.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:ico|png|svg|webp)$).*)"],
};
