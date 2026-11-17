import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getSessionFromRequest, canManageUsers } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user || !canManageUsers(user)) {
      return errorResponse("Only Super Admin can view user management.", "FORBIDDEN", 403);
    }

    await connectDB();
    const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 });

    return successResponse({ users });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch users", "SERVER_ERROR", 500);
  }
}
