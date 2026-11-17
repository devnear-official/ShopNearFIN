import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Expense } from "@/models/Expense";
import { PartnersLedger } from "@/models/PartnersLedger";
import { getSessionFromRequest } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import {
  calculateCOGS,
  calculateGrossProfit,
  calculateNetProfit,
  calculateAllPartnersSplit,
} from "@/lib/formulas";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get("month"); // YYYY-MM format, e.g. "2026-11"

    let startDate: Date;
    let endDate: Date;

    if (month) {
      const [year, m] = month.split("-").map(Number);
      startDate = new Date(year, m - 1, 1);
      endDate = new Date(year, m, 0, 23, 59, 59, 999);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Get Delivered Orders for the period
    const deliveredOrders = await Order.find({
      status: "DELIVERED",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalDeliveredSales = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const cogs = calculateCOGS(deliveredOrders);
    const grossProfit = calculateGrossProfit(totalDeliveredSales, cogs);

    // 2. Get Expenses for the period
    const expenses = await Expense.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const netProfitCalc = calculateNetProfit(grossProfit, expenses);

    // 3. Get all partner investments up to date
    const investmentEntries = await PartnersLedger.find({ type: "INVESTMENT" });
    const partnerInvestmentsMap: Record<string, number> = {};

    for (const entry of investmentEntries) {
      const name = entry.partnerName.trim();
      partnerInvestmentsMap[name] = (partnerInvestmentsMap[name] || 0) + entry.amount;
    }

    const partnerList = Object.entries(partnerInvestmentsMap).map(([partnerName, investment]) => ({
      partnerName,
      investment,
    }));

    const splitResult = calculateAllPartnersSplit(netProfitCalc.netProfit, partnerList);
    const totalAllInvestment = partnerList.reduce((sum, p) => sum + p.investment, 0);

    return successResponse({
      period: {
        startDate,
        endDate,
        month: month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
      },
      pnl: {
        totalDeliveredSales,
        cogs,
        grossProfit,
        operatingExpenses: netProfitCalc.operatingExpenses,
        netProfit: netProfitCalc.netProfit,
        expenseBreakdown: netProfitCalc.breakdown,
      },
      totalAllInvestment,
      partnersSplit: splitResult,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to calculate profit split", "SERVER_ERROR", 500);
  }
}
