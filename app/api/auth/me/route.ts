import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  getSessionFromRequest,
  signToken,
  TOKEN_COOKIE_NAME,
  getSuperAdminSession,
} from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionFromRequest(req);
  if (!sessionUser) {
    return errorResponse("Not authenticated", "UNAUTHORIZED", 401);
  }

  // If superadmin from env
  if (sessionUser.isSuperAdmin || sessionUser.id === "super-admin-root") {
    const superAdmin = getSuperAdminSession();
    return successResponse({ user: superAdmin });
  }

  // Fetch live state from database
  await connectDB();
  const dbUser = await User.findById(sessionUser.id);
  if (!dbUser) {
    return errorResponse("User not found or deleted", "UNAUTHORIZED", 401);
  }

  if (dbUser.status === "REJECTED") {
    const res = errorResponse("Your account access has been revoked or rejected by the Super Admin.", "ACCOUNT_REJECTED", 403);
    res.cookies.delete(TOKEN_COOKIE_NAME);
    return res;
  }

  if (dbUser.status === "PENDING") {
    const res = errorResponse("Your account is pending Super Admin approval.", "ACCOUNT_PENDING", 403);
    return res;
  }

  const freshUser = {
    id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    status: dbUser.status,
    permissions: dbUser.permissions && dbUser.permissions.length > 0
      ? dbUser.permissions
      : ["dashboard", "orders", "products", "expenses", "partners", "accounts", "reports", "settings"],
    isSuperAdmin: false,
  };

  const response = successResponse({ user: freshUser });

  // If role, status or permissions changed from the cookie, issue a fresh cookie
  const roleChanged = sessionUser.role !== dbUser.role;
  const statusChanged = sessionUser.status !== dbUser.status;
  const permChanged = JSON.stringify(sessionUser.permissions) !== JSON.stringify(freshUser.permissions);

  if (roleChanged || statusChanged || permChanged) {
    const isSecure =
      req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    const newToken = await signToken(freshUser);
    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  return response;
}
