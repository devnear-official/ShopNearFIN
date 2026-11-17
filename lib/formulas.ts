import { toPaisa, toTaka } from "./currency";

export interface OrderItemCalc {
  quantity: number;
  unitPrice: number; // in Taka or Paisa
  unitCost: number;  // in Taka or Paisa
}

export interface DeliveredOrderCalc {
  status: string;
  items: OrderItemCalc[];
  totalAmount?: number;
  actualReceived?: number;
  courierRemitted?: boolean;
}

export interface ExpenseCalc {
  category: "ADS" | "PACKAGING" | "PURCHASE" | "RETURN_LOSS" | "OTHER" | string;
  amount: number; // in Taka or Paisa
}

export interface PartnerInvestment {
  partnerName: string;
  totalInvestment: number; // in Taka or Paisa
}

export interface TransactionCalc {
  type: "IN" | "OUT" | "TRANSFER";
  amount: number;
  isDebit?: boolean; // outgoing
}

/**
 * 1. Calculate Cost of Goods Sold (COGS)
 * Sum of (unitCost * quantity) for DELIVERED orders only.
 */
export function calculateCOGS(deliveredOrders: { items: { quantity: number; unitCost: number }[] }[]): number {
  return deliveredOrders.reduce((total, order) => {
    const orderCost = order.items.reduce((sum, item) => {
      return sum + Number(item.unitCost) * Number(item.quantity);
    }, 0);
    return total + orderCost;
  }, 0);
}

/**
 * 2. Calculate Gross Profit
 * Gross Profit = Total Delivered Sales - COGS
 */
export function calculateGrossProfit(totalDeliveredSales: number, cogs: number): number {
  return Number(totalDeliveredSales) - Number(cogs);
}

/**
 * 3. Calculate Net Profit
 * Net Profit = Gross Profit - Operating Expenses (Ads + Packaging + Return Delivery Loss + Other)
 * Note: PURCHASE is inventory asset purchase (stock in), not an operating period expense.
 */
export function calculateNetProfit(
  grossProfit: number,
  expenses: { category: string; amount: number }[]
): {
  netProfit: number;
  operatingExpenses: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {
    ADS: 0,
    PACKAGING: 0,
    RETURN_LOSS: 0,
    OTHER: 0,
    PURCHASE: 0,
  };

  let operatingExpenses = 0;

  for (const exp of expenses) {
    const cat = exp.category.toUpperCase();
    const amt = Number(exp.amount);
    if (breakdown[cat] !== undefined) {
      breakdown[cat] += amt;
    } else {
      breakdown[cat] = amt;
    }

    // Operating expenses deduct from Gross Profit
    if (cat !== "PURCHASE") {
      operatingExpenses += amt;
    }
  }

  const netProfit = Number(grossProfit) - operatingExpenses;

  return {
    netProfit,
    operatingExpenses,
    breakdown,
  };
}

/**
 * 4. Partner Equity Percentage
 * Partner Equity % = (partner_total_investment / total_all_investment) * 100
 */
export function calculatePartnerEquity(
  partnerInvestment: number,
  totalAllInvestment: number
): number {
  if (!totalAllInvestment || totalAllInvestment <= 0) return 0;
  const percentage = (Number(partnerInvestment) / Number(totalAllInvestment)) * 100;
  return Math.round(percentage * 100) / 100; // round to 2 decimals
}

/**
 * 5. Partner Profit Share
 * Partner Profit Share = Net Profit * (Equity % / 100)
 */
export function calculatePartnerProfitShare(netProfit: number, equityPercentage: number): number {
  const share = Number(netProfit) * (Number(equityPercentage) / 100);
  return Math.round(share * 100) / 100;
}

/**
 * Calculate multi-partner profit split summary table
 */
export function calculateAllPartnersSplit(
  netProfit: number,
  partners: { partnerName: string; investment: number }[]
) {
  const totalInvestment = partners.reduce((sum, p) => sum + Number(p.investment), 0);

  return partners.map((p) => {
    const equityPct = calculatePartnerEquity(p.investment, totalInvestment);
    const profitShare = calculatePartnerProfitShare(netProfit, equityPct);
    return {
      partnerName: p.partnerName,
      investment: p.investment,
      equityPercentage: equityPct,
      profitShare,
    };
  });
}

/**
 * 6. Courier Pending Balance
 * Sum of (actual expected COD amount) for DELIVERED orders where courierRemitted == false
 */
export function calculateCourierPendingBalance(
  orders: { status: string; totalAmount: number; courierRemitted: boolean; courier?: string }[]
): {
  totalPending: number;
  byCourier: Record<string, number>;
} {
  let totalPending = 0;
  const byCourier: Record<string, number> = {
    Steadfast: 0,
    Pathao: 0,
    RedX: 0,
    Other: 0,
  };

  for (const order of orders) {
    if (order.status === "DELIVERED" && !order.courierRemitted) {
      const amt = Number(order.totalAmount);
      totalPending += amt;
      const courierKey = order.courier && byCourier[order.courier] !== undefined ? order.courier : "Other";
      byCourier[courierKey] = (byCourier[courierKey] || 0) + amt;
    }
  }

  return { totalPending, byCourier };
}

/**
 * 7. Account Balance from Ledger
 * openingBalance + totalIn - totalOut
 */
export function calculateAccountBalance(
  openingBalance: number,
  transactions: { type: "IN" | "OUT" | "TRANSFER"; amount: number; isDebit?: boolean }[]
): number {
  let balance = Number(openingBalance);

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    if (tx.type === "IN") {
      balance += amt;
    } else if (tx.type === "OUT") {
      balance -= amt;
    } else if (tx.type === "TRANSFER") {
      // If isDebit is true, money moved out of this account
      if (tx.isDebit) {
        balance -= amt;
      } else {
        balance += amt;
      }
    }
  }

  return Math.round(balance * 100) / 100;
}
