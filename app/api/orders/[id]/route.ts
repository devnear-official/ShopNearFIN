import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Transaction } from "@/models/Transaction";
import { Expense } from "@/models/Expense";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { Setting } from "@/models/Setting";
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

    // 1. Delete associated transactions so cash/vault balance decreases immediately!
    await Transaction.deleteMany({
      $or: [
        { refId: order._id.toString() },
        {
          refType: "ORDER_COD",
          note: { $regex: order.orderNumber, $options: "i" },
        },
      ],
    });

    // 2. Delete any associated expenses (e.g. return delivery loss recorded for this order)
    await Expense.deleteMany({ referenceId: order._id.toString() });

    // 3. If stock was deducted for this order, restore stock back
    let shouldRestoreStock = false;

    // Check if any OUT movement exists for this order
    const outMovements = await StockMovement.find({
      type: "OUT",
      reference: { $regex: order.orderNumber, $options: "i" },
    });

    const returnMovements = await StockMovement.find({
      type: "RETURN",
      reference: { $regex: order.orderNumber, $options: "i" },
    });

    if (outMovements.length > 0) {
      const totalOut = outMovements.reduce((sum, m) => sum + (m.qty || 0), 0);
      const totalRet = returnMovements.reduce((sum, m) => sum + (m.qty || 0), 0);
      if (totalOut > totalRet) {
        shouldRestoreStock = true;
      }
    } else if (order.status !== "CANCELLED" && order.status !== "RETURNED") {
      const settings = await Setting.findOne();
      const stockRule = settings?.stockOutTriggerRule || "ON_SHIPPED";
      if (
        order.status === "SHIPPED" ||
        order.status === "DELIVERED" ||
        stockRule === "ON_CREATED"
      ) {
        shouldRestoreStock = true;
      }
    }

    if (shouldRestoreStock) {
      for (const item of order.items) {
        if (item.productId && item.quantity > 0) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { currentStock: item.quantity },
          });

          await StockMovement.create({
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            type: "RETURN",
            qty: item.quantity,
            reference: `Order ${order.orderNumber} Deleted`,
            note: `Restocked items because order ${order.orderNumber} was deleted`,
            date: new Date(),
            createdBy: user.email,
          });
        }
      }
    }

    // 4. Delete the order document
    await Order.findByIdAndDelete(params.id);

    await logAudit({
      userEmail: user.email,
      action: "DELETE",
      module: "ORDERS",
      recordId: params.id,
      oldValue,
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(
      null,
      `Order "${order.orderNumber}" deleted successfully and cash/stock adjusted.`
    );
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete order", "SERVER_ERROR", 500);
  }
}
