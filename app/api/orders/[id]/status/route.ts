import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Setting } from "@/models/Setting";
import { StockMovement } from "@/models/StockMovement";
import { Expense } from "@/models/Expense";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { orderStatusSchema } from "@/validators";
import { logAudit } from "@/lib/audit";
import { withTransaction } from "@/lib/db-tx";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!canMutateData(user)) {
      return errorResponse("Permission denied. Editor or Super Admin role required.", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const parseResult = orderStatusSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    const { status: targetStatus, note, returnDeliveryCharge } = parseResult.data;

    await connectDB();
    const order = await Order.findById(params.id);
    if (!order) {
      return errorResponse("Order not found", "NOT_FOUND", 404);
    }

    const currentStatus = order.status;
    if (currentStatus === targetStatus) {
      return successResponse(order, "Status unchanged");
    }

    // 1. Validate status transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED", "RETURNED", "CANCELLED"],
      DELIVERED: [], // final
      RETURNED: [],  // final
      CANCELLED: [], // final
    };

    if (!validTransitions[currentStatus]?.includes(targetStatus)) {
      return errorResponse(
        `Invalid status transition from ${currentStatus} to ${targetStatus}. Valid transitions are: ${validTransitions[currentStatus]?.join(", ") || "none"}`,
        "INVALID_TRANSITION",
        400
      );
    }

    // Fetch settings for stock-out rule
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    const stockRule = settings.stockOutTriggerRule || "ON_SHIPPED";

    const oldValue = {
      status: order.status,
      statusHistory: [...order.statusHistory],
    };

    const result = await withTransaction(async (session) => {
      // 2. Stock deductions & movements
      if (targetStatus === "SHIPPED") {
        if (stockRule === "ON_SHIPPED") {
          // Deduct stock for all items
          for (const item of order.items) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { currentStock: -item.quantity } },
              { session }
            );

            await StockMovement.create(
              [
                {
                  productId: item.productId,
                  productName: item.productName,
                  sku: item.sku,
                  type: "OUT",
                  qty: item.quantity,
                  reference: `Order ${order.orderNumber} Shipped`,
                  note: `Stock out for shipment to ${order.customerName}`,
                  date: new Date(),
                  createdBy: user.email,
                },
              ],
              { session }
            );
          }
        }
      } else if (targetStatus === "DELIVERED") {
        if (stockRule === "ON_DELIVERED") {
          for (const item of order.items) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { currentStock: -item.quantity } },
              { session }
            );

            await StockMovement.create(
              [
                {
                  productId: item.productId,
                  productName: item.productName,
                  sku: item.sku,
                  type: "OUT",
                  qty: item.quantity,
                  reference: `Order ${order.orderNumber} Delivered`,
                  note: `Stock out on delivery to ${order.customerName}`,
                  date: new Date(),
                  createdBy: user.email,
                },
              ],
              { session }
            );
          }
        }
      } else if (targetStatus === "RETURNED") {
        // Return to stock: items go back to currentStock
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { currentStock: item.quantity } },
            { session }
          );

          await StockMovement.create(
            [
              {
                productId: item.productId,
                productName: item.productName,
                sku: item.sku,
                type: "RETURN",
                qty: item.quantity,
                reference: `Order ${order.orderNumber} Returned`,
                note: `Restocked returned item from ${order.customerName}`,
                date: new Date(),
                createdBy: user.email,
              },
            ],
            { session }
          );
        }

        // Return loss: automatically record round-trip delivery charge as RETURN_LOSS expense!
        // Round trip: returnDeliveryCharge or 2x original delivery charge
        const returnLossAmount =
          returnDeliveryCharge !== undefined && returnDeliveryCharge > 0
            ? returnDeliveryCharge
            : order.deliveryCharge * 2;

        if (returnLossAmount > 0) {
          await Expense.create(
            [
              {
                category: "RETURN_LOSS",
                amount: returnLossAmount,
                paymentMethod: "CASH", // Default or courier deduction
                note: `Return delivery loss for Order ${order.orderNumber} (${order.courier})`,
                paidBy: "Business",
                date: new Date(),
                referenceId: order._id.toString(),
                createdBy: user.email,
              },
            ],
            { session }
          );
        }
      } else if (targetStatus === "CANCELLED") {
        // If it was already shipped and cancelled later, restore stock
        if (currentStatus === "SHIPPED" && stockRule === "ON_SHIPPED") {
          for (const item of order.items) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { currentStock: item.quantity } },
              { session }
            );

            await StockMovement.create(
              [
                {
                  productId: item.productId,
                  productName: item.productName,
                  sku: item.sku,
                  type: "RETURN",
                  qty: item.quantity,
                  reference: `Order ${order.orderNumber} Cancelled after Ship`,
                  note: `Restocked items from cancelled order`,
                  date: new Date(),
                  createdBy: user.email,
                },
              ],
              { session }
            );
          }
        }
      }

      // Update Order Status and History
      order.status = targetStatus;
      order.statusHistory.push({
        status: targetStatus,
        changedBy: user.email,
        changedAt: new Date(),
        note: note || `Order status updated to ${targetStatus}`,
      });

      await order.save({ session });
      return order;
    });

    await logAudit({
      userEmail: user.email,
      action: "STATUS_CHANGE",
      module: "ORDERS",
      recordId: order._id.toString(),
      oldValue,
      newValue: { status: order.status, note },
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(result, `Order status changed to ${targetStatus}`);
  } catch (error: any) {
    console.error("Order status update error:", error);
    return errorResponse(error.message || "Failed to update order status", "SERVER_ERROR", 500);
  }
}
