import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();
    const order = await Order.findById(params.id);
    if (!order) {
      return errorResponse("Order not found", "NOT_FOUND", 404);
    }

    return successResponse({ order });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch order", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!canMutateData(user)) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    await connectDB();
    const order = await Order.findById(params.id);
    if (!order) {
      return errorResponse("Order not found", "NOT_FOUND", 404);
    }

    const oldValue = order.toObject();
    await Order.findByIdAndDelete(params.id);

    await logAudit({
      userEmail: user.email,
      action: "DELETE",
      module: "ORDERS",
      recordId: params.id,
      oldValue,
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(null, "Order deleted successfully");
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete order", "SERVER_ERROR", 500);
  }
}
