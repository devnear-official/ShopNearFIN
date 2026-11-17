import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  isSuperAdminCredentials,
  getSuperAdminSession,
  signToken,
  comparePassword,
  TOKEN_COOKIE_NAME,
} from "@/lib/auth";
import { loginSchema } from "@/validators";
import { checkRateLimit, errorResponse, successResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    
    // Rate limit login attempts: 5 per minute per IP
    const rateCheck = checkRateLimit(`login:${ip}`, 5, 60000);
    if (!rateCheck.allowed) {
      return errorResponse("Too many login attempts. Please wait 1 minute before trying again.", "RATE_LIMITED", 429);
    }

    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    const { email, password } = parseResult.data;

    const isSecure =
      req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

    // 1. Check Super Admin credentials purely from environment variables
    if (isSuperAdminCredentials(email, password)) {
      const superAdminSession = getSuperAdminSession();
      const token = await signToken(superAdminSession);

      await logAudit({
        userEmail: superAdminSession.email,
        action: "CREATE",
        module: "AUTH",
        recordId: superAdminSession.id,
        newValue: { note: "Super Admin logged in successfully" },
        ip,
      });

      const response = successResponse({ user: superAdminSession }, "Super Admin authenticated successfully");
      response.cookies.set({
        name: TOKEN_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
      return response;
    }

    // 2. Check Database Users
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return errorResponse("Invalid email or password", "AUTH_FAILED", 401);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse("Invalid email or password", "AUTH_FAILED", 401);
    }

    // 3. Check Account Status
    if (user.status === "PENDING") {
      return errorResponse(
        "Your account is pending Super Admin approval. Please contact the administrator.",
        "ACCOUNT_PENDING",
        403
      );
    }

    if (user.status === "REJECTED") {
      return errorResponse("Your account registration was rejected by the administrator.", "ACCOUNT_REJECTED", 403);
    }

    const userSession = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isSuperAdmin: false,
    };

    const token = await signToken(userSession);

    await logAudit({
      userEmail: user.email,
      action: "CREATE",
      module: "AUTH",
      recordId: user._id.toString(),
      newValue: { note: "User logged in successfully" },
      ip,
    });

    const response = successResponse({ user: userSession }, "Login successful");
    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return errorResponse(error.message || "Failed to log in", "SERVER_ERROR", 500);
  }
}
