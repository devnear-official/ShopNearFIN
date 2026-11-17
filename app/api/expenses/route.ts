import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Expense } from "@/models/Expense";
import { Account } from "@/models/Account";
import { Transaction } from "@/models/Transaction";
import { PartnersLedger } from "@/models/PartnersLedger";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { expenseSchema } from "@/validators";
import { logAudit } from "@/lib/audit";
import { withTransaction } from "@/lib/db-tx";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const category = searchParams.get("category");
    const paymentMethod = searchParams.get("paymentMethod");
    const paidBy = searchParams.get("paidBy");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();

    const filter: any = {};
    if (category && category !== "ALL") filter.category = category;
    if (paymentMethod && paymentMethod !== "ALL") filter.paymentMethod = paymentMethod;
    if (paidBy && paidBy !== "ALL") filter.paidBy = paidBy;

    if (search) {
      filter.note = { $regex: search, $options: "i" };
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Also get sum of expenses matching the filter
    const totalAmountAgg = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAmount = totalAmountAgg[0]?.total || 0;

    return successResponse({
      expenses,
      totalAmount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch expenses", "SERVER_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!canMutateData(user)) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const parseResult = expenseSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    const { category, amount, paymentMethod, note, paidBy, date, attachmentUrl } = parseResult.data;
    const expenseDate = date ? new Date(date) : new Date();

    await connectDB();

    const result = await withTransaction(async (session) => {
      // 1. Create Expense
      const expense = await Expense.create(
        [
          {
            category,
            amount,
            paymentMethod,
            note,
            paidBy,
            date: expenseDate,
            attachmentUrl: attachmentUrl || "",
            createdBy: user.email,
          },
        ],
        { session }
      );

      const createdExpense = expense[0];

      // 2. If paid by Partner personally -> Credit to Partner's Reimbursement (Payable Balance)
      if (paidBy && paidBy !== "Business") {
        await PartnersLedger.create(
          [
            {
              partnerName: paidBy,
              type: "REIMBURSEMENT",
              amount,
              paymentMethod,
              note: `Reimbursement for ${category} expense: ${note}`,
              date: expenseDate,
              createdBy: user.email,
            },
          ],
          { session }
        );
      } else {
        // 3. If paid by Business -> deduct from the account ledger
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
                amount,
                isDebit: true,
                refType: "EXPENSE",
                refId: createdExpense._id.toString(),
                note: `Expense: ${category} - ${note}`,
                date: expenseDate,
                createdBy: user.email,
              },
            ],
            { session }
          );
        }
      }

      return createdExpense;
    });

    await logAudit({
      userEmail: user.email,
      action: "CREATE",
      module: "EXPENSES",
      recordId: result._id.toString(),
      newValue: result.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(result, "Expense recorded successfully", 201);
  } catch (error: any) {
    console.error("Expense creation error:", error);
    return errorResponse(error.message || "Failed to record expense", "SERVER_ERROR", 500);
  }
}
