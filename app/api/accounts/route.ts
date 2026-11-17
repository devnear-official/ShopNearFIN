import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Account } from "@/models/Account";
import { Transaction } from "@/models/Transaction";
import { getSessionFromRequest } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { calculateAccountBalance } from "@/lib/formulas";

const DEFAULT_METHODS = ["CASH", "BKASH", "NAGAD", "BANK"] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();

    // Ensure all 4 accounts exist
    const accountsData = [];
    let totalLiquidity = 0;

    for (const method of DEFAULT_METHODS) {
      let account = await Account.findOne({ methodName: method });
      if (!account) {
        account = await Account.create({
          methodName: method,
          openingBalance: 0,
        });
      }

      // Fetch all transactions for this account
      const transactions = await Transaction.find({ accountId: account._id }).sort({ date: 1 });

      const balance = calculateAccountBalance(
        account.openingBalance,
        transactions.map((tx) => ({
          type: tx.type,
          amount: tx.amount,
          isDebit: tx.isDebit,
        }))
      );

      totalLiquidity += balance;

      accountsData.push({
        id: account._id.toString(),
        methodName: account.methodName,
        accountNumber: account.accountNumber || "",
        bankName: account.bankName || "",
        openingBalance: account.openingBalance,
        currentBalance: balance,
        transactionCount: transactions.length,
      });
    }

    // Monthly Cashflow metrics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await Transaction.find({
      date: { $gte: thirtyDaysAgo },
    }).sort({ date: -1 }).limit(30);

    return successResponse({
      accounts: accountsData,
      totalLiquidity,
      recentTransactions,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch accounts", "SERVER_ERROR", 500);
  }
}
