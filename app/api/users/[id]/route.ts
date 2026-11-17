import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getSessionFromRequest, canManageUsers } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { userApprovalSchema } from "@/validators";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSessionFromRequest(req);
    if (!sessionUser || !canManageUsers(sessionUser)) {
      return errorResponse("Only Super Admin can approve or reject users.", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const parseResult = userApprovalSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    const { status, role, permissions } = parseResult.data;

    await connectDB();
    const existingUser = await User.findById(params.id);
    if (!existingUser) {
      return errorResponse("User not found", "NOT_FOUND", 404);
    }

    const oldValue = {
      status: existingUser.status,
      role: existingUser.role,
      permissions: existingUser.permissions,
    };

    if (status) {
      existingUser.status = status;
    }
    if (role) {
      existingUser.role = role;
    }
    if (permissions && Array.isArray(permissions)) {
      existingUser.permissions = permissions;
    }
    await existingUser.save();

    const action: "APPROVE_USER" | "REJECT_USER" | "UPDATE" =
      status && oldValue.status !== status
        ? status === "APPROVED"
          ? "APPROVE_USER"
          : "REJECT_USER"
        : "UPDATE";

    await logAudit({
      userEmail: sessionUser.email,
      action,
      module: "USERS",
      recordId: existingUser._id.toString(),
      oldValue,
      newValue: {
        status: existingUser.status,
        role: existingUser.role,
        permissions: existingUser.permissions,
      },
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(
      {
        id: existingUser._id.toString(),
        name: existingUser.name,
        email: existingUser.email,
        status: existingUser.status,
        role: existingUser.role,
        permissions: existingUser.permissions,
      },
      `User ${existingUser.name} updated successfully (${existingUser.status}, ${existingUser.role})`
    );
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update user", "SERVER_ERROR", 500);
  }
}
