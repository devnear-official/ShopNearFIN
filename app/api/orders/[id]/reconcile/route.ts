import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Account } from "@/models/Account";
import { Transaction } from "@/models/Transaction";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { courierReconcileSchema } from "@/validators";
import { logAudit } from "@/lib/audit";
import { withTransaction } from "@/lib/db-tx";

export async function POST(
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

    const body = await req.json();
    const parseResult = courierReconcileSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    const { actualReceived, courierFeeDeducted, paymentMethod, note } = parseResult.data;

    await connectDB();
    const order = await Order.findById(params.id);
    if (!order) {
      return errorResponse("Order not found", "NOT_FOUND", 404);
    }

    if (order.status !== "DELIVERED") {
      return errorResponse("Only DELIVERED orders can be courier-reconciled.", "INVALID_STATUS", 400);
    }

    if (order.courierRemitted) {
      return errorResponse("This order has already been reconciled with the courier.", "ALREADY_RECONCILED", 400);
    }

    const oldValue = {
      actualReceived: order.actualReceived,
      courierFeeDeducted: order.courierFeeDeducted,
      courierRemitted: order.courierRemitted,
    };

    const result = await withTransaction(async (session) => {
      // 1. Update Order
      order.actualReceived = actualReceived;
      order.courierFeeDeducted = courierFeeDeducted;
      order.courierRemitted = true;
      order.reconciliationNote = note || `Reconciled via ${paymentMethod}`;
      await order.save({ session });

      // 2. Deposit actualReceived into Account Ledger
      let account = await Account.findOne({ methodName: paymentMethod }).session(session || null);
      if (!account) {
        const createdAccs = await Account.create(
          [
            {
              methodName: paymentMethod,
              openingBalance: 0,
            },
          ],
          { session }
        );
        account = createdAccs[0];
      }

      if (account) {
        await Transaction.create(
          [
            {
              accountId: account._id,
              accountMethod: paymentMethod,
              type: "IN",
              amount: actualReceived,
              isDebit: false,
              refType: "ORDER_COD",
              refId: order._id.toString(),
              note: `COD remittance for Order ${order.orderNumber} via ${order.courier}`,
              date: new Date(),
              createdBy: user.email,
            },
          ],
          { session }
        );
      }

      return order;
    });

    await logAudit({
      userEmail: user.email,
      action: "RECONCILE",
      module: "ORDERS",
      recordId: order._id.toString(),
      oldValue,
      newValue: {
        actualReceived: order.actualReceived,
        courierFeeDeducted: order.courierFeeDeducted,
        courierRemitted: true,
        paymentMethod,
        note,
      },
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(result, "Courier settlement reconciled and funds deposited to account ledger successfully.");
  } catch (error: any) {
    console.error("Courier reconciliation error:", error);
    return errorResponse(error.message || "Failed to reconcile courier payment", "SERVER_ERROR", 500);
  }
}
