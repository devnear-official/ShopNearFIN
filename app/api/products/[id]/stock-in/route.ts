import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { Expense } from "@/models/Expense";
import { Account } from "@/models/Account";
import { Transaction } from "@/models/Transaction";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { stockInSchema } from "@/validators";
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
    const parseResult = stockInSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    const { qty, buyingPrice, paymentMethod, paidBy, note } = parseResult.data;

    await connectDB();
    const product = await Product.findById(params.id);
    if (!product) {
      return errorResponse("Product not found", "NOT_FOUND", 404);
    }

    const effectiveBuyingPrice = buyingPrice !== undefined ? buyingPrice : product.buyingPrice;
    const totalPurchaseCost = effectiveBuyingPrice * qty;

    const result = await withTransaction(async (session) => {
      // 1. Update Product Stock and price if provided
      const oldStock = product.currentStock;
      product.currentStock += qty;
      if (buyingPrice !== undefined && buyingPrice > 0) {
        product.buyingPrice = buyingPrice;
      }
      await product.save({ session });

      // 2. Create Stock Movement
      const movement = await StockMovement.create(
        [
          {
            productId: product._id,
            productName: product.name,
            sku: product.sku,
            type: "IN",
            qty,
            reference: `Wholesale purchase: +${qty} units`,
            note: note || `Stock in @ ৳${effectiveBuyingPrice}/unit`,
            date: new Date(),
            createdBy: user.email,
          },
        ],
        { session }
      );

      // 3. Create PURCHASE Expense Entry
      const expense = await Expense.create(
        [
          {
            category: "PURCHASE",
            amount: totalPurchaseCost,
            paymentMethod,
            note: `Stock In for ${product.name} (SKU: ${product.sku}) - ${qty} pcs @ ৳${effectiveBuyingPrice}`,
            paidBy,
            date: new Date(),
            referenceId: product._id.toString(),
            createdBy: user.email,
          },
        ],
        { session }
      );

      // 4. Record Transaction in Account ledger if paid by Business
      if (paidBy === "Business") {
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
                type: "OUT",
                amount: totalPurchaseCost,
                isDebit: true,
                refType: "EXPENSE",
                refId: expense[0]._id.toString(),
                note: `Stock In purchase expense for ${product.name}`,
                date: new Date(),
                createdBy: user.email,
              },
            ],
            { session }
          );
        }
      }

      return {
        product,
        oldStock,
        movement: movement[0],
        expense: expense[0],
      };
    });

    await logAudit({
      userEmail: user.email,
      action: "UPDATE",
      module: "PRODUCTS",
      recordId: product._id.toString(),
      oldValue: { currentStock: result.oldStock },
      newValue: {
        currentStock: result.product.currentStock,
        stockInQty: qty,
        expenseId: result.expense._id.toString(),
      },
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(
      {
        product: result.product,
        addedStock: qty,
        purchaseExpense: result.expense,
      },
      `Successfully added ${qty} units to stock and created purchase expense.`
    );
  } catch (error: any) {
    console.error("Stock in error:", error);
    return errorResponse(error.message || "Failed to stock in product", "SERVER_ERROR", 500);
  }
}
