import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Account } from "@/models/Account";
import { Transaction } from "@/models/Transaction";
import { Order } from "@/models/Order";
import { Expense } from "@/models/Expense";
import { Product } from "@/models/Product";
import { getSessionFromRequest } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import {
  calculateAccountBalance,
  calculateCourierPendingBalance,
  calculateCOGS,
  calculateGrossProfit,
  calculateNetProfit,
} from "@/lib/formulas";

const DEFAULT_METHODS = ["CASH", "BKASH", "NAGAD", "BANK"] as const;

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const selectedMonth = searchParams.get("month"); // e.g. "2026-11"

    let monthStart: Date;
    let monthEnd: Date;

    if (selectedMonth) {
      const [y, m] = selectedMonth.split("-").map(Number);
      monthStart = new Date(y, m - 1, 1);
      monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 1. Account balances (Cash, bKash, Nagad, Bank)
    const balances: Record<string, number> = {
      CASH: 0,
      BKASH: 0,
      NAGAD: 0,
      BANK: 0,
    };
    let totalCashInHand = 0;

    for (const method of DEFAULT_METHODS) {
      let account = await Account.findOne({ methodName: method });
      if (!account) {
        account = await Account.create({ methodName: method, openingBalance: 0 });
      }

      const txs = await Transaction.find({ accountId: account._id });
      const bal = calculateAccountBalance(
        account.openingBalance,
        txs.map((t) => ({ type: t.type, amount: t.amount, isDebit: t.isDebit }))
      );

      balances[method] = bal;
      totalCashInHand += bal;
    }

    // 2. Courier Pending Balance
    const deliveredOrders = await Order.find({ status: "DELIVERED" });
    const courierPending = calculateCourierPendingBalance(deliveredOrders);

    // 3. Monthly Summary (for the selected month)
    const monthDeliveredOrders = await Order.find({
      status: "DELIVERED",
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });
    const monthlyDeliveredSales = monthDeliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const monthlyCOGS = calculateCOGS(monthDeliveredOrders);
    const monthlyGrossProfit = calculateGrossProfit(monthlyDeliveredSales, monthlyCOGS);

    const monthExpenses = await Expense.find({
      date: { $gte: monthStart, $lte: monthEnd },
    });
    const netProfitData = calculateNetProfit(monthlyGrossProfit, monthExpenses);

    // Total monthly sales all orders (including pending/shipped)
    const allMonthOrders = await Order.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: { $ne: "CANCELLED" },
    });
    const totalOrderRevenue = allMonthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 4. Low stock alerts (current_stock <= low_stock_limit)
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$currentStock", "$lowStockLimit"] },
    })
      .sort({ currentStock: 1 })
      .limit(10);

    // 5. 6-Month Chart Data (Sales vs Expenses & Profit trend)
    const chartData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });

      const dOrders = await Order.find({
        status: "DELIVERED",
        createdAt: { $gte: start, $lte: end },
      });
      const dSales = dOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const dCOGS = calculateCOGS(dOrders);
      const dGross = calculateGrossProfit(dSales, dCOGS);

      const dExpenses = await Expense.find({
        date: { $gte: start, $lte: end },
      });
      const dNetData = calculateNetProfit(dGross, dExpenses);

      chartData.push({
        month: label,
        sales: dSales,
        cogs: dCOGS,
        grossProfit: dGross,
        expenses: dNetData.operatingExpenses,
        netProfit: dNetData.netProfit,
      });
    }

    // Donut chart: Expense breakdown for the month
    const expenseDonut = [
      { name: "Ads & Boosting", key: "ADS", value: netProfitData.breakdown.ADS || 0, color: "#3B82F6" },
      { name: "Packaging", key: "PACKAGING", value: netProfitData.breakdown.PACKAGING || 0, color: "#F59E0B" },
      { name: "Return Loss", key: "RETURN_LOSS", value: netProfitData.breakdown.RETURN_LOSS || 0, color: "#EF4444" },
      { name: "Office & Other", key: "OTHER", value: netProfitData.breakdown.OTHER || 0, color: "#8B5CF6" },
    ].filter((item) => item.value > 0);

    return successResponse({
      cashBalances: {
        totalInHand: totalCashInHand,
        cash: balances.CASH,
        bKash: balances.BKASH,
        nagad: balances.NAGAD,
        bank: balances.BANK,
      },
      courierPending,
      monthlySummary: {
        selectedMonth: selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        totalOrderRevenue,
        totalDeliveredSales: monthlyDeliveredSales,
        cogs: monthlyCOGS,
        grossProfit: monthlyGrossProfit,
        operatingExpenses: netProfitData.operatingExpenses,
        netProfit: netProfitData.netProfit,
      },
      lowStockProducts,
      charts: {
        sixMonthTrend: chartData,
        expenseDonut,
      },
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return errorResponse(error.message || "Failed to fetch dashboard stats", "SERVER_ERROR", 500);
  }
}
