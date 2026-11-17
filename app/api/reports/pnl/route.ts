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
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Delivered orders for COGS and revenue
    const deliveredOrders = await Order.find({
      status: "DELIVERED",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalDeliveredSales = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalDeliveredOrdersCount = deliveredOrders.length;
    const cogs = calculateCOGS(deliveredOrders);
    const grossProfit = calculateGrossProfit(totalDeliveredSales, cogs);

    // 2. Expenses by category
    const expenses = await Expense.find({
      date: { $gte: startDate, $lte: endDate },
    });

    const netProfitData = calculateNetProfit(grossProfit, expenses);

    // 3. Partner investments & split
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

    const partnersSplit = calculateAllPartnersSplit(netProfitData.netProfit, partnerList);
    const totalInvestment = partnerList.reduce((sum, p) => sum + p.investment, 0);

    return successResponse({
      dateRange: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      summary: {
        totalDeliveredSales,
        totalDeliveredOrdersCount,
        cogs,
        grossProfit,
        grossMarginPercentage:
          totalDeliveredSales > 0 ? Math.round((grossProfit / totalDeliveredSales) * 10000) / 100 : 0,
        operatingExpenses: netProfitData.operatingExpenses,
        netProfit: netProfitData.netProfit,
        netMarginPercentage:
          totalDeliveredSales > 0 ? Math.round((netProfitData.netProfit / totalDeliveredSales) * 10000) / 100 : 0,
      },
      expensesBreakdown: netProfitData.breakdown,
      totalInvestment,
      partnersSplit,
      deliveredOrdersList: deliveredOrders.map((o) => ({
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        phone: o.phone,
        totalAmount: o.totalAmount,
        courier: o.courier,
        deliveredDate: o.updatedAt,
      })),
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to generate PnL report", "SERVER_ERROR", 500);
  }
}
