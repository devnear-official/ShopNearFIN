import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import {
  UserRole,
  UserStatus,
  SessionUser,
  canManageUsers,
  canMutateData,
} from "./permissions";

export { canManageUsers, canMutateData };
export type { UserRole, UserStatus, SessionUser };

const JWT_SECRET_STRING = process.env.JWT_SECRET || "super-secret-jwt-key-change-this-in-production-min-32-chars";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const TOKEN_COOKIE_NAME = "shopnearfin_token";

/**
 * Super Admin check purely against environment variables
 */
export function isSuperAdminCredentials(email: string, pass: string): boolean {
  const envEmail = (process.env.SUPERADMIN_EMAIL || "superadmin@shopnearfin.com").trim().toLowerCase();
  const envPassword = (process.env.SUPERADMIN_PASSWORD || "SuperAdmin@2026").trim();

  return email.trim().toLowerCase() === envEmail && pass.trim() === envPassword;
}

export function getSuperAdminSession(): SessionUser {
  return {
    id: "super-admin-root",
    name: "Super Administrator",
    email: (process.env.SUPERADMIN_EMAIL || "superadmin@shopnearfin.com").trim().toLowerCase(),
    role: "SUPER_ADMIN",
    status: "APPROVED",
    isSuperAdmin: true,
  };
}

/**
 * Sign JWT token
 */
export async function signToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verify JWT token string
 */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Get current session from cookie store (for Server Components and Route Handlers)
 */
export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Get current session from NextRequest (for middleware and route handlers)
 */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return verifyToken(authHeader.substring(7));
    }
    return null;
  }
  return verifyToken(token);
}

/**
 * Password hashing helpers
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export { TOKEN_COOKIE_NAME };
