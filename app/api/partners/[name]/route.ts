import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { PartnersLedger } from "@/models/PartnersLedger";
import { Expense } from "@/models/Expense";
import { getSessionFromRequest } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { calculatePartnerEquity } from "@/lib/formulas";

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const partnerName = decodeURIComponent(params.name).trim();
    await connectDB();

    // 1. Fetch all entries for this partner (case-insensitive regex)
    const nameRegex = new RegExp(`^${partnerName}$`, "i");
    const entries = await PartnersLedger.find({ partnerName: nameRegex }).sort({ date: -1 });

    // 2. Fetch expenses personally paid by this partner
    const personalExpenses = await Expense.find({ paidBy: nameRegex }).sort({ date: -1 });

    // 3. Compute total capital across all partners to calculate accurate equity %
    const allInvestmentsAgg = await PartnersLedger.aggregate([
      { $match: { type: "INVESTMENT" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAllInvestments = allInvestmentsAgg[0]?.total || 0;

    let totalInvestments = 0;
    let totalReimbursements = 0;
    let totalWithdrawals = 0;

    for (const e of entries) {
      if (e.type === "INVESTMENT") totalInvestments += e.amount;
      else if (e.type === "REIMBURSEMENT") totalReimbursements += e.amount;
      else if (e.type === "WITHDRAWAL") totalWithdrawals += e.amount;
    }

    const equityPercentage = calculatePartnerEquity(totalInvestments, totalAllInvestments);
    const netBalance = totalInvestments + totalReimbursements - totalWithdrawals;

    return successResponse({
      partnerName,
      summary: {
        totalInvestments,
        totalReimbursements,
        totalWithdrawals,
        netBalance,
        equityPercentage,
        totalAllInvestments,
      },
      entries,
      personalExpenses,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to load partner statement", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    const { canMutateData } = await import("@/lib/auth");
    if (!canMutateData(user)) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const partnerName = decodeURIComponent(params.name).trim();
    await connectDB();

    const nameRegex = new RegExp(`^${partnerName}$`, "i");
    const deletedEntries = await PartnersLedger.find({ partnerName: nameRegex });
    await PartnersLedger.deleteMany({ partnerName: nameRegex });

    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      userEmail: user.email,
      action: "DELETE",
      module: "PARTNERS",
      recordId: partnerName,
      oldValue: { count: deletedEntries.length, partnerName },
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(null, `Partner "${partnerName}" and all associated entries deleted successfully`);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete partner", "SERVER_ERROR", 500);
  }
}
