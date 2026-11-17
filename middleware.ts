import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "super-secret-jwt-key-change-this-in-production-min-32-chars";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const TOKEN_COOKIE_NAME = "shopnearfin_token";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/partners",
  "/products",
  "/orders",
  "/expenses",
  "/accounts",
  "/reports",
  "/audit-logs",
  "/users",
  "/settings",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;

  let sessionUser: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionUser = payload;
    } catch {
      sessionUser = null;
    }
  }

  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPath = pathname === "/login" || pathname === "/signup";

  // Redirect unauthenticated users from protected dashboard routes to /login
  if (isProtectedPath) {
    if (!sessionUser) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-specific protection: only SUPER_ADMIN can access /users
    if (pathname.startsWith("/users") && sessionUser.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Redirect authenticated users from /login or /signup to /dashboard
  if (isAuthPath && sessionUser) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|api/).*)",
  ],
};
