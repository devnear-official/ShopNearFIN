"use client";

import React, { useState, useEffect } from "react";
import {
  FileBarChart,
  FileSpreadsheet,
  RotateCw,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/ui/toast";
import { formatBDT } from "@/lib/currency";

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Date range filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
  });

  const fetchPnLReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/pnl?startDate=${startDate}&endDate=${endDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      toast("Failed to load report", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnLReport();
  }, [startDate, endDate]);

  const exportXLSX = () => {
    if (!data) return;
    const s = data.summary;

    // Sheet 1: P&L Summary & Partner Splits
    const pnlRows = [
      ["ShopNearFin - Profit & Loss (P&L) Statement"],
      [`Reporting Period: ${startDate} to ${endDate}`],
      [`Generated On: ${new Date().toLocaleDateString("en-GB")}`],
      [],
      ["1. SALES REVENUE & DIRECT COSTS", "AMOUNT (BDT)", "NOTES / FORMULA"],
      ["Total Delivered Orders Count", s.totalDeliveredOrdersCount, "Count of completed customer deliveries"],
      ["Total Delivered Sales Revenue", s.totalDeliveredSales, "Gross revenue collected from delivered orders"],
      ["Less: Cost of Goods Sold (COGS)", s.cogs, "Direct purchase/production cost of goods"],
      ["GROSS PROFIT", s.grossProfit, "Sales Revenue - COGS"],
      ["Gross Margin %", `${s.grossMarginPercentage}%`, "(Gross Profit / Sales) * 100"],
      [],
      ["2. OPERATING EXPENSES", "AMOUNT (BDT)", "EXPENSE CATEGORY"],
      ["Ads & Marketing Boosting", data.expensesBreakdown?.ADS || 0, "Facebook / Meta / TikTok Ads"],
      ["Packaging Materials", data.expensesBreakdown?.PACKAGING || 0, "Boxes, poly, tapes, flyers"],
      ["Customer Return Delivery Loss", data.expensesBreakdown?.RETURN_LOSS || 0, "Courier return freight costs"],
      ["Office, Utilities & Other Misc", data.expensesBreakdown?.OTHER || 0, "Overheads & operating costs"],
      ["TOTAL OPERATING EXPENSES", s.operatingExpenses, "Sum of all business operating costs"],
      [],
      ["3. NET PROFIT & MARGIN", "AMOUNT (BDT)", "RESULT"],
      ["NET PROFIT (GROSS PROFIT - EXPENSES)", s.netProfit, "Final company profit for this period"],
      ["Net Profit Margin %", `${s.netMarginPercentage}%`, "(Net Profit / Sales) * 100"],
      [],
      ["4. PARTNER PROFIT SPLIT (অংশীদারিত্ব ও লভ্যাংশ বণ্টন)", "TOTAL CAPITAL (BDT)", "EQUITY %", "PROFIT SHARE (BDT)"],
      ...(data.partnersSplit || []).map((p: any) => [
        p.partnerName,
        p.investment,
        `${p.equityPercentage}%`,
        p.profitShare,
      ]),
      ["TOTAL", data.totalInvestment || 0, "100%", s.netProfit],
    ];

    const wb = XLSX.utils.book_new();
    const wsPnL = XLSX.utils.aoa_to_sheet(pnlRows);
    wsPnL["!cols"] = [{ wch: 42 }, { wch: 22 }, { wch: 38 }, { wch: 26 }];
    XLSX.utils.book_append_sheet(wb, wsPnL, "P&L Summary");

    // Sheet 2: Delivered Orders List
    if (data.deliveredOrdersList && data.deliveredOrdersList.length > 0) {
      const orderRows = [
        ["Order Number", "Customer Name", "Phone", "Courier", "Delivered Amount (BDT)"],
        ...data.deliveredOrdersList.map((o: any) => [
          o.orderNumber,
          o.customerName,
          o.phone,
          o.courier || "N/A",
          o.totalAmount,
        ]),
      ];
      const wsOrders = XLSX.utils.aoa_to_sheet(orderRows);
      wsOrders["!cols"] = [{ wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, wsOrders, "Delivered Orders");
    }

    XLSX.writeFile(wb, `ShopNearFin_PnL_${startDate}_to_${endDate}.xlsx`);
    toast(
      language === "bn"
        ? "এক্সেল (XLSX) ফাইল সফলভাবে ডাউনলোড হয়েছে!"
        : "Excel (XLSX) statement downloaded successfully!",
      "success"
    );
  };

  return (
    <DashboardLayout>
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-teal-600" />
            {t("reports")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Comprehensive Profit & Loss (P&L) audit, margins, and partner equity split"
              : "লাভ-ক্ষতি বিবরণী, মোট ও নিট মার্জিন এবং পার্টনারভিত্তিক লভ্যাংশ"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={exportXLSX}
            size="sm"
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 shadow-sm touch-target"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{language === "bn" ? "এক্সেল ডাউনলোড (XLSX)" : "Download XLSX"}</span>
          </Button>
        </div>
      </div>

      {/* Date Range Picker (Hidden in print) */}
      <Card className="rounded-2xl p-4 print:hidden border shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Report Date Range:
          </span>
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 text-xs"
            />
            <span className="text-xs text-muted-foreground font-bold">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <button
            onClick={fetchPnLReport}
            className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors self-end sm:self-auto"
            title="Refresh Report"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>
      </Card>

      {/* Printable Report Document Container */}
      {loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-6 print:m-0 print:p-0">
          {/* Header visible on print */}
          <div className="hidden print:block pb-4 border-b border-gray-400">
            <h1 className="text-2xl font-bold">E-commerce Finance System</h1>
            <h2 className="text-lg font-semibold text-teal-800">Profit & Loss Statement (P&L)</h2>
            <p className="text-xs text-gray-600">
              Period: {startDate} to {endDate} | Printed: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Core PnL Statement Card */}
          <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
            <div className="p-5 bg-muted/40 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">Profit & Loss Statement</h3>
                <p className="text-xs text-muted-foreground">
                  Reporting Period: {startDate} — {endDate} ({data?.summary?.totalDeliveredOrdersCount || 0} Delivered Orders)
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Net Profit</span>
                <span className="text-2xl font-black">
                  <Money amount={data?.summary?.netProfit || 0} colorize />
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Revenue & Gross Profit Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-border/60 text-sm">
                  <span className="font-semibold text-foreground">1. Total Delivered Sales Revenue</span>
                  <span className="font-black text-foreground">
                    <Money amount={data?.summary?.totalDeliveredSales || 0} />
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border/60 text-sm pl-4 text-muted-foreground">
                  <span>Less: Cost of Goods Sold (COGS)</span>
                  <span className="font-semibold text-foreground">
                    - <Money amount={data?.summary?.cogs || 0} />
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-sm">
                  <span className="font-bold text-teal-900 dark:text-teal-200">
                    Gross Profit (Margin: {data?.summary?.grossMarginPercentage}%)
                  </span>
                  <span className="font-black text-teal-700 dark:text-teal-300 text-base">
                    <Money amount={data?.summary?.grossProfit || 0} />
                  </span>
                </div>
              </div>

              {/* Operating Expenses Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. Operating Expenses
                </h4>

                <div className="divide-y divide-border/60 text-xs sm:text-sm">
                  <div className="flex items-center justify-between py-2 pl-4">
                    <span className="text-muted-foreground">Ads & Marketing Boosting</span>
                    <span className="font-semibold"><Money amount={data?.expensesBreakdown?.ADS || 0} /></span>
                  </div>

                  <div className="flex items-center justify-between py-2 pl-4">
                    <span className="text-muted-foreground">Packaging (Boxes, Poly, Tapes)</span>
                    <span className="font-semibold"><Money amount={data?.expensesBreakdown?.PACKAGING || 0} /></span>
                  </div>

                  <div className="flex items-center justify-between py-2 pl-4">
                    <span className="text-muted-foreground">Customer Return Delivery Loss</span>
                    <span className="font-semibold text-rose-600"><Money amount={data?.expensesBreakdown?.RETURN_LOSS || 0} /></span>
                  </div>

                  <div className="flex items-center justify-between py-2 pl-4">
                    <span className="text-muted-foreground">Office, Utilities & Other Misc</span>
                    <span className="font-semibold"><Money amount={data?.expensesBreakdown?.OTHER || 0} /></span>
                  </div>

                  <div className="flex items-center justify-between py-2 pl-2 font-bold text-foreground">
                    <span>Total Operating Expenses</span>
                    <span className="text-rose-600 font-bold">- <Money amount={data?.summary?.operatingExpenses || 0} /></span>
                  </div>
                </div>
              </div>

              {/* Net Profit Final Row */}
              <div className="pt-3 border-t-2 border-border">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/60 border">
                  <div>
                    <span className="font-black text-base sm:text-lg text-foreground block">
                      Net Profit (Net Margin: {data?.summary?.netMarginPercentage}%)
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Formula: Gross Profit − Total Operating Expenses
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black">
                    <Money amount={data?.summary?.netProfit || 0} colorize />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Partner Profit Split Table */}
          <Card className="rounded-3xl border shadow-sm p-6 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  Automated Partner Profit Split Breakdown
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Period Net Profit (৳{data?.summary?.netProfit || 0}) distributed according to equity shares.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-3 pl-3">Partner Name</th>
                    <th className="p-3 text-right">Total Investment</th>
                    <th className="p-3 text-right">Equity Stake</th>
                    <th className="p-3 text-right pr-3">Profit Allocation (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data?.partnersSplit?.map((p: any) => (
                    <tr key={p.partnerName} className="hover:bg-muted/30">
                      <td className="p-3 pl-3 font-bold text-foreground">{p.partnerName}</td>
                      <td className="p-3 text-right font-medium text-muted-foreground">
                        <Money amount={p.investment} />
                      </td>
                      <td className="p-3 text-right font-bold text-teal-700 dark:text-teal-400">
                        {p.equityPercentage}%
                      </td>
                      <td className="p-3 text-right pr-3 font-black text-emerald-600 dark:text-emerald-400 text-base">
                        <Money amount={p.profitShare} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
