import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Account } from "@/models/Account";
import { Transaction } from "@/models/Transaction";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { accountTransferSchema } from "@/validators";
import { logAudit } from "@/lib/audit";
import { withTransaction } from "@/lib/db-tx";

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
    const parseResult = accountTransferSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    const { fromMethod, toMethod, amount, cashoutFee = 0, note } = parseResult.data;

    await connectDB();

    const fromAccount = await Account.findOne({ methodName: fromMethod });
    const toAccount = await Account.findOne({ methodName: toMethod });

    if (!fromAccount || !toAccount) {
      return errorResponse("One or both accounts do not exist", "ACCOUNT_NOT_FOUND");
    }

    const transferDate = new Date();

    const result = await withTransaction(async (session) => {
      // 1. Debit from source account (amount)
      const debitTx = await Transaction.create(
        [
          {
            accountId: fromAccount._id,
            accountMethod: fromMethod,
            type: "TRANSFER",
            amount,
            isDebit: true,
            refType: "TRANSFER",
            toAccountId: toAccount._id,
            toAccountMethod: toMethod,
            note: note || `Transfer to ${toMethod}`,
            date: transferDate,
            createdBy: user.email,
          },
        ],
        { session }
      );

      // 2. Credit to destination account (amount)
      const creditTx = await Transaction.create(
        [
          {
            accountId: toAccount._id,
            accountMethod: toMethod,
            type: "TRANSFER",
            amount,
            isDebit: false,
            refType: "TRANSFER",
            toAccountId: fromAccount._id,
            toAccountMethod: fromMethod,
            note: note || `Transfer from ${fromMethod}`,
            date: transferDate,
            createdBy: user.email,
          },
        ],
        { session }
      );

      return { debitTx: debitTx[0], creditTx: creditTx[0] };
    });

    await logAudit({
      userEmail: user.email,
      action: "CREATE",
      module: "ACCOUNTS",
      recordId: `${fromMethod}->${toMethod}`,
      newValue: { fromMethod, toMethod, amount, note },
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(
      result,
      `Successfully transferred ৳${amount} from ${fromMethod} to ${toMethod}`
    );
  } catch (error: any) {
    console.error("Transfer error:", error);
    return errorResponse(error.message || "Failed to transfer funds", "SERVER_ERROR", 500);
  }
}
