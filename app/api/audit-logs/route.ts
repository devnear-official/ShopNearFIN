import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { getSessionFromRequest } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    if (user.role !== "SUPER_ADMIN" && !user.isSuperAdmin) {
      return errorResponse("Forbidden. Only Super Admin can view audit logs.", "FORBIDDEN", 403);
    }

    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "30"));
    const moduleFilter = searchParams.get("module");
    const actionFilter = searchParams.get("action");
    const userEmailFilter = searchParams.get("userEmail");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const filter: any = {};
    if (moduleFilter && moduleFilter !== "ALL") filter.module = moduleFilter;
    if (actionFilter && actionFilter !== "ALL") filter.action = actionFilter;
    if (userEmailFilter && userEmailFilter !== "ALL") filter.userEmail = { $regex: userEmailFilter, $options: "i" };

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return successResponse({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch audit logs", "SERVER_ERROR", 500);
  }
}
