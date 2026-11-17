import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { signupSchema } from "@/validators";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const body = await req.json();

    const parseResult = signupSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    const { name, email, password } = parseResult.data;

    await connectDB();

    // Check if email already registered or matches superadmin email
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || "superadmin@shopnearfin.com").toLowerCase();
    if (email.toLowerCase() === superAdminEmail) {
      return errorResponse("This email address is reserved.", "EMAIL_TAKEN", 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse("An account with this email already exists.", "EMAIL_TAKEN", 400);
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "VIEWER",
      status: "PENDING",
    });

    await logAudit({
      userEmail: newUser.email,
      action: "CREATE",
      module: "USERS",
      recordId: newUser._id.toString(),
      newValue: { name: newUser.name, email: newUser.email, status: "PENDING", role: "VIEWER" },
      ip,
    });

    return successResponse(
      {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        status: newUser.status,
        role: newUser.role,
      },
      "Account registered successfully. Your account is pending Super Admin approval.",
      201
    );
  } catch (error: any) {
    console.error("Signup error:", error);
    return errorResponse(error.message || "Failed to register account", "SERVER_ERROR", 500);
  }
}
