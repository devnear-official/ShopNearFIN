import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { Expense } from "@/models/Expense";
import { Account } from "@/models/Account";
import { Transaction } from "@/models/Transaction";
import { PartnersLedger } from "@/models/PartnersLedger";
import { calculateAccountBalance } from "@/lib/formulas";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";

export function getDateRange(timeframe?: string) {
  const now = new Date();
  switch (timeframe) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 6 }), end: endOfWeek(now, { weekStartsOn: 6 }) }; // Saturday in BD
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "all_time":
      return { start: new Date("2020-01-01"), end: endOfDay(now) };
    case "this_month":
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export async function executeAiTool(name: string, args: any): Promise<any> {
  await connectDB();

  switch (name) {
    case "getProducts": {
      const filter: any = {};
      if (args?.search) {
        filter.$or = [
          { name: { $regex: args.search, $options: "i" } },
          { sku: { $regex: args.search, $options: "i" } },
        ];
      }
      if (args?.lowStockOnly) {
        filter.$expr = { $lte: ["$currentStock", "$lowStockLimit"] };
      }

      const products = await Product.find(filter).limit(30).lean();
      return products.map((p) => ({
        name: p.name,
        sku: p.sku,
        buyingPrice: p.buyingPrice,
        sellingPrice: p.sellingPrice,
        currentStock: p.currentStock,
        lowStockLimit: p.lowStockLimit,
        isLowStock: p.currentStock <= p.lowStockLimit,
        category: p.category,
      }));
    }

    case "getFinancialSummary": {
      const { start, end } = getDateRange(args?.timeframe);

      // Delivered orders in timeframe
      const deliveredOrders = await Order.find({
        status: "DELIVERED",
        createdAt: { $gte: start, $lte: end },
      }).lean();

      let totalDeliveredRevenue = 0;
      let totalDeliveredCOGS = 0;
      let totalCourierFee = 0;

      for (const ord of deliveredOrders) {
        const orderRev = ord.actualReceived > 0 ? ord.actualReceived : ord.totalAmount;
        totalDeliveredRevenue += orderRev;
        totalCourierFee += ord.courierFeeDeducted || 0;

        for (const item of ord.items) {
          totalDeliveredCOGS += (item.unitCost || 0) * (item.quantity || 1);
        }
      }

      const grossProfit = totalDeliveredRevenue - totalDeliveredCOGS;

      // All Expenses in timeframe
      const expenses = await Expense.find({
        date: { $gte: start, $lte: end },
      }).lean();

      let totalExpenses = 0;
      const expensesByCategory: Record<string, number> = {};

      for (const exp of expenses) {
        totalExpenses += exp.amount;
        expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
      }

      const netProfit = grossProfit - totalExpenses;
      const netProfitMargin = totalDeliveredRevenue > 0 ? ((netProfit / totalDeliveredRevenue) * 100).toFixed(1) + "%" : "0%";

      return {
        timeframe: args?.timeframe || "this_month",
        dateRange: { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] },
        deliveredOrdersCount: deliveredOrders.length,
        totalDeliveredRevenue,
        totalDeliveredCOGS,
        grossProfit,
        totalExpenses,
        expensesByCategory,
        netProfit,
        netProfitMargin,
      };
    }

    case "getExpensesBreakdown": {
      const { start, end } = getDateRange(args?.timeframe);
      const filter: any = {
        date: { $gte: start, $lte: end },
      };
      if (args?.category) {
        filter.category = args.category.toUpperCase();
      }

      const expenses = await Expense.find(filter).sort({ date: -1 }).limit(50).lean();
      const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

      return {
        timeframe: args?.timeframe || "this_month",
        totalAmount,
        count: expenses.length,
        expenses: expenses.map((e) => ({
          category: e.category,
          amount: e.amount,
          date: e.date ? new Date(e.date).toISOString().split("T")[0] : "",
          note: e.note || "",
          paymentMethod: e.paymentMethod,
          paidBy: e.paidBy || "",
        })),
      };
    }

    case "getOrdersSummary": {
      const allOrders = await Order.find().lean();
      const counts: Record<string, number> = {
        TOTAL: allOrders.length,
        PENDING: 0,
        CONFIRMED: 0,
        SHIPPED: 0,
        DELIVERED: 0,
        RETURNED: 0,
        CANCELLED: 0,
      };

      for (const ord of allOrders) {
        if (counts[ord.status] !== undefined) {
          counts[ord.status]++;
        }
      }

      const recentOrders = allOrders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((o) => ({
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          status: o.status,
          totalAmount: o.totalAmount,
          courier: o.courier,
          date: new Date(o.createdAt).toISOString().split("T")[0],
        }));

      return {
        orderCounts: counts,
        recentOrders,
      };
    }

    case "getAccountBalances": {
      const methods = ["CASH", "BKASH", "NAGAD", "BANK"] as const;
      const accountsList = [];
      let totalLiquidity = 0;

      for (const method of methods) {
        const account = await Account.findOne({ methodName: method });
        if (account) {
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
          accountsList.push({
            method: account.methodName,
            balance,
          });
        }
      }

      return {
        totalLiquidity,
        accounts: accountsList,
      };
    }

    case "getPartnersSummary": {
      const entries = await PartnersLedger.find().sort({ date: -1 }).lean();
      const partnersMap: Record<string, { totalInvested: number; totalWithdrawn: number; reimbursements: number }> = {};
      let totalAllInvestments = 0;

      for (const entry of entries) {
        const pName = entry.partnerName.trim();
        if (!partnersMap[pName]) {
          partnersMap[pName] = {
            totalInvested: 0,
            totalWithdrawn: 0,
            reimbursements: 0,
          };
        }
        if (entry.type === "INVESTMENT") {
          partnersMap[pName].totalInvested += entry.amount;
          totalAllInvestments += entry.amount;
        } else if (entry.type === "WITHDRAWAL") {
          partnersMap[pName].totalWithdrawn += entry.amount;
        } else if (entry.type === "REIMBURSEMENT") {
          partnersMap[pName].reimbursements += entry.amount;
        }
      }

      const partners = Object.entries(partnersMap).map(([name, data]) => ({
        partnerName: name,
        netBalance: data.totalInvested + data.reimbursements - data.totalWithdrawn,
        totalInvested: data.totalInvested,
        totalWithdrawn: data.totalWithdrawn,
        equityPercentage: totalAllInvestments > 0 ? Number(((data.totalInvested / totalAllInvestments) * 100).toFixed(1)) : 0,
      }));

      return { partners, totalAllInvestments };
    }

    default:
      return { error: `Tool ${name} not recognized` };
  }
}
