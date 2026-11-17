import { describe, it, expect } from "vitest";
import {
  calculateCOGS,
  calculateGrossProfit,
  calculateNetProfit,
  calculatePartnerEquity,
  calculatePartnerProfitShare,
  calculateAllPartnersSplit,
  calculateCourierPendingBalance,
  calculateAccountBalance,
} from "../lib/formulas";
import { formatBanglaNumber, formatBDT, toPaisa, toTaka } from "../lib/currency";

describe("Bangladeshi Currency Formatting & Paisa Conversions", () => {
  it("converts between Taka and Paisa accurately", () => {
    expect(toPaisa(1250.75)).toBe(125075);
    expect(toTaka(125075)).toBe(1250.75);
    expect(toPaisa(0)).toBe(0);
  });

  it("formats Bangladeshi numbers with lakh and crore groupings", () => {
    expect(formatBanglaNumber(500)).toBe("500.00");
    expect(formatBanglaNumber(1000)).toBe("1,000.00");
    expect(formatBanglaNumber(15000)).toBe("15,000.00");
    expect(formatBanglaNumber(125000)).toBe("1,25,000.00"); // 1 lakh 25 thousand
    expect(formatBanglaNumber(1234567)).toBe("12,34,567.00"); // 12 lakh 34 thousand 567
    expect(formatBanglaNumber(12345678)).toBe("1,23,45,678.00"); // 1 crore 23 lakh
  });

  it("formats BDT currency with ৳ symbol", () => {
    expect(formatBDT(1234567)).toBe("৳ 12,34,567.00");
    expect(formatBDT(123456700, { isPaisa: true })).toBe("৳ 12,34,567.00");
  });
});

describe("Core Business Financial Formulas", () => {
  it("calculates COGS for DELIVERED orders only", () => {
    const deliveredOrders = [
      {
        items: [
          { quantity: 2, unitCost: 350 }, // 700
          { quantity: 1, unitCost: 500 }, // 500
        ],
      },
      {
        items: [
          { quantity: 3, unitCost: 400 }, // 1200
        ],
      },
    ];

    const cogs = calculateCOGS(deliveredOrders);
    expect(cogs).toBe(2400);
  });

  it("calculates Gross Profit = Total Delivered Sales - COGS", () => {
    const totalDeliveredSales = 10000;
    const cogs = 6000;
    const grossProfit = calculateGrossProfit(totalDeliveredSales, cogs);
    expect(grossProfit).toBe(4000);
  });

  it("calculates Net Profit = Gross Profit - Operating Expenses", () => {
    const grossProfit = 50000;
    const expenses = [
      { category: "ADS", amount: 12000 },
      { category: "PACKAGING", amount: 3000 },
      { category: "RETURN_LOSS", amount: 2000 },
      { category: "OTHER", amount: 5000 },
      { category: "PURCHASE", amount: 40000 }, // Capital inventory purchase (not operating expense deducted from Gross Profit)
    ];

    const result = calculateNetProfit(grossProfit, expenses);
    // Operating expenses = 12000 + 3000 + 2000 + 5000 = 22000
    expect(result.operatingExpenses).toBe(22000);
    // Net profit = 50000 - 22000 = 28000
    expect(result.netProfit).toBe(28000);
    expect(result.breakdown.ADS).toBe(12000);
  });

  it("calculates Partner Equity % and Partner Profit Share for 5 partners", () => {
    const partners = [
      { partnerName: "Rahim", investment: 200000 }, // 20%
      { partnerName: "Karim", investment: 300000 }, // 30%
      { partnerName: "Tanvir", investment: 250000 }, // 25%
      { partnerName: "Sajib", investment: 150000 }, // 15%
      { partnerName: "Nafis", investment: 100000 }, // 10%
    ];

    const totalInvestment = 1000000;
    const equityRahim = calculatePartnerEquity(partners[0].investment, totalInvestment);
    expect(equityRahim).toBe(20);

    const netProfit = 100000;
    const shareRahim = calculatePartnerProfitShare(netProfit, equityRahim);
    expect(shareRahim).toBe(20000);

    const splits = calculateAllPartnersSplit(netProfit, partners);
    expect(splits).toHaveLength(5);
    expect(splits[0].profitShare).toBe(20000);
    expect(splits[1].profitShare).toBe(30000);
    expect(splits[2].profitShare).toBe(25000);
    expect(splits[3].profitShare).toBe(15000);
    expect(splits[4].profitShare).toBe(10000);

    const sumProfitShare = splits.reduce((sum, s) => sum + s.profitShare, 0);
    expect(sumProfitShare).toBe(100000);
  });

  it("calculates Courier Pending Balance for DELIVERED orders not yet remitted", () => {
    const orders = [
      { status: "DELIVERED", totalAmount: 1500, courierRemitted: false, courier: "Steadfast" },
      { status: "DELIVERED", totalAmount: 2500, courierRemitted: false, courier: "Pathao" },
      { status: "DELIVERED", totalAmount: 3000, courierRemitted: true, courier: "Steadfast" }, // remitted, not pending
      { status: "PENDING", totalAmount: 1200, courierRemitted: false, courier: "Steadfast" }, // not delivered yet
      { status: "RETURNED", totalAmount: 800, courierRemitted: false, courier: "RedX" }, // returned
    ];

    const result = calculateCourierPendingBalance(orders);
    expect(result.totalPending).toBe(4000); // 1500 + 2500
    expect(result.byCourier.Steadfast).toBe(1500);
    expect(result.byCourier.Pathao).toBe(2500);
  });

  it("calculates Account Balances correctly from ledger transactions", () => {
    const openingBalance = 50000;
    const transactions: { type: "IN" | "OUT" | "TRANSFER"; amount: number; isDebit?: boolean }[] = [
      { type: "IN", amount: 20000 }, // Cash sale COD received
      { type: "OUT", amount: 5000 },  // Cash expense
      { type: "TRANSFER", amount: 10000, isDebit: true }, // Transferred out to bKash
    ];

    const finalBalance = calculateAccountBalance(openingBalance, transactions);
    // 50000 + 20000 - 5000 - 10000 = 55000
    expect(finalBalance).toBe(55000);
  });
});
