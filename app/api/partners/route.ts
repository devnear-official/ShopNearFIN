import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { PartnersLedger } from "@/models/PartnersLedger";
import { Account } from "@/models/Account";
import { Transaction } from "@/models/Transaction";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { partnerLedgerSchema } from "@/validators";
import { logAudit } from "@/lib/audit";
import { calculatePartnerEquity } from "@/lib/formulas";
import { withTransaction } from "@/lib/db-tx";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const partnerNameFilter = searchParams.get("partnerName");

    const filter: any = {};
    if (partnerNameFilter && partnerNameFilter !== "ALL") {
      filter.partnerName = partnerNameFilter;
    }

    const entries = await PartnersLedger.find(filter).sort({ date: -1 });

    // Aggregate summaries per partner
    const allEntries = await PartnersLedger.find();
    const partnerStatsMap: Record<
      string,
      {
        partnerName: string;
        investments: number;
        reimbursements: number;
        withdrawals: number;
        netBalance: number;
        equityPercentage: number;
      }
    > = {};

    let totalAllInvestments = 0;

    for (const entry of allEntries) {
      const pName = entry.partnerName.trim();
      if (!partnerStatsMap[pName]) {
        partnerStatsMap[pName] = {
          partnerName: pName,
          investments: 0,
          reimbursements: 0,
          withdrawals: 0,
          netBalance: 0,
          equityPercentage: 0,
        };
      }

      if (entry.type === "INVESTMENT") {
        partnerStatsMap[pName].investments += entry.amount;
        totalAllInvestments += entry.amount;
      } else if (entry.type === "REIMBURSEMENT") {
        partnerStatsMap[pName].reimbursements += entry.amount;
      } else if (entry.type === "WITHDRAWAL") {
        partnerStatsMap[pName].withdrawals += entry.amount;
      }
    }

    // Compute equity and net balances
    const partnersSummary = Object.values(partnerStatsMap).map((p) => {
      p.equityPercentage = calculatePartnerEquity(p.investments, totalAllInvestments);
      // Net available/payable = (Investments + Reimbursements) - Withdrawals
      p.netBalance = p.investments + p.reimbursements - p.withdrawals;
      return p;
    });

    return successResponse({
      entries,
      partnersSummary,
      totalAllInvestments,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch partner ledger", "SERVER_ERROR", 500);
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
    const parseResult = partnerLedgerSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    const { partnerName, type, amount, grossAmount, cashoutFee = 0, paymentMethod, note, date } = parseResult.data;
    const entryDate = date ? new Date(date) : new Date();

    await connectDB();

    const result = await withTransaction(async (session) => {
      // 1. Create PartnersLedger entry (Net amount invested)
      const entryNote = note || (cashoutFee > 0 ? `${type} via ${paymentMethod} (Gross: ৳${grossAmount || amount + cashoutFee}, Fee: ৳${cashoutFee})` : `${type} by ${partnerName}`);
      const entry = await PartnersLedger.create(
        [
          {
            partnerName,
            type,
            amount,
            paymentMethod,
            note: entryNote,
            date: entryDate,
            createdBy: user.email,
          },
        ],
        { session }
      );

      // 2. Adjust business account ledger if money entered or exited business accounts
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
        const genTxNumber = () => `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        if (type === "INVESTMENT") {
          // Partner puts net money INTO business account
          await Transaction.create(
            [
              {
                transactionNumber: genTxNumber(),
                accountId: account._id,
                accountMethod: paymentMethod,
                type: "IN",
                amount,
                isDebit: false,
                refType: "INVESTMENT",
                refId: entry[0]._id.toString(),
                note: `Capital Investment by ${partnerName}${cashoutFee > 0 ? ` (Net after ৳${cashoutFee} fee)` : ""}`,
                date: entryDate,
                createdBy: user.email,
              },
            ],
            { session }
          );
        } else if (type === "WITHDRAWAL") {
          // Partner takes money OUT of business account
          await Transaction.create(
            [
              {
                transactionNumber: genTxNumber(),
                accountId: account._id,
                accountMethod: paymentMethod,
                type: "OUT",
                amount,
                isDebit: true,
                refType: "WITHDRAWAL",
                refId: entry[0]._id.toString(),
                note: `Partner Withdrawal / Drawing by ${partnerName}`,
                date: entryDate,
                createdBy: user.email,
              },
            ],
            { session }
          );
        }
      }

      return entry[0];
    });

    await logAudit({
      userEmail: user.email,
      action: "CREATE",
      module: "PARTNERS",
      recordId: result._id.toString(),
      newValue: result.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(result, `Partner ${type.toLowerCase()} recorded successfully`, 201);
  } catch (error: any) {
    console.error("Partner ledger error:", error);
    return errorResponse(error.message || "Failed to record partner transaction", "SERVER_ERROR", 500);
  }
}
