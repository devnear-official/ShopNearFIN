"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Truck,
  TrendingUp,
  AlertTriangle,
  RotateCw,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Package,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetDrawer } from "@/components/ui/sheet-drawer";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { canMutateData } from "@/lib/permissions";

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Stock In Modal State
  const [stockInProduct, setStockInProduct] = useState<any>(null);
  const [stockInQty, setStockInQty] = useState<number>(10);
  const [stockInBuyingPrice, setStockInBuyingPrice] = useState<number>(0);
  const [stockInPaymentMethod, setStockInPaymentMethod] = useState("CASH");
  const [stockInLoading, setStockInLoading] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/stats?month=${selectedMonth}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Dashboard error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [selectedMonth]);

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInProduct) return;
    setStockInLoading(true);

    try {
      const res = await fetch(`/api/products/${stockInProduct._id}/stock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qty: stockInQty,
          buyingPrice: stockInBuyingPrice,
          paymentMethod: stockInPaymentMethod,
          paidBy: "Business",
          note: `Quick stock-in from dashboard alert for ${stockInProduct.name}`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to stock in product", "error");
        return;
      }

      toast(`Successfully added ${stockInQty} units to ${stockInProduct.name}!`, "success");
      setStockInProduct(null);
      fetchDashboardStats();
    } catch {
      toast("Error restocking product", "error");
    } finally {
      setStockInLoading(false);
    }
  };

  const openStockInModal = (product: any) => {
    setStockInProduct(product);
    setStockInBuyingPrice(product.buyingPrice);
    setStockInQty(10);
  };

  return (
    <DashboardLayout>
      {/* Top action row: Month Selector & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {t("dashboard")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Live overview of liquidity, courier receivables, and net profit"
              : "চলতি ব্যালেন্স, কুরিয়ার বকেয়া ও নিট মুনাফার লাইভ চিত্র"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 sm:flex-none h-10 px-3 rounded-xl border border-input bg-card text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none"
          />
          <button
            onClick={fetchDashboardStats}
            className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors touch-target flex items-center justify-center shrink-0"
            title="Refresh data"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* 1. Cash Balances Section (Cash, bKash, Nagad, Bank & Total) */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{t("cashBalances")}</span>
              </h3>
              <div className="self-start sm:self-auto text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 shadow-xs shrink-0 flex items-center gap-1.5">
                <span className="text-muted-foreground">{t("totalLiquidity")}:</span>
                <span className="font-extrabold text-teal-800 dark:text-teal-200">
                  <Money amount={data?.cashBalances?.totalInHand || 0} />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Cash Card */}
              <Card className="rounded-2xl border-teal-200/50 bg-gradient-to-br from-card to-teal-50/20 dark:to-teal-950/20 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {t("cash")}
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xs font-bold">
                      ৳
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-foreground">
                    <Money amount={data?.cashBalances?.cash || 0} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Cash in drawer & vault</p>
                </CardContent>
              </Card>

              {/* bKash Card */}
              <Card className="rounded-2xl border-pink-200/50 bg-gradient-to-br from-card to-pink-50/20 dark:to-pink-950/20 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-pink-700 dark:text-pink-400 uppercase tracking-wider">
                      {t("bkash")}
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 flex items-center justify-center text-[10px] font-black">
                      bK
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-foreground">
                    <Money amount={data?.cashBalances?.bKash || 0} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Merchant / Personal wallet</p>
                </CardContent>
              </Card>

              {/* Nagad Card */}
              <Card className="rounded-2xl border-orange-200/50 bg-gradient-to-br from-card to-orange-50/20 dark:to-orange-950/20 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                      {t("nagad")}
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 flex items-center justify-center text-[10px] font-black">
                      NG
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-foreground">
                    <Money amount={data?.cashBalances?.nagad || 0} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Nagad mobile wallet</p>
                </CardContent>
              </Card>

              {/* Bank Card */}
              <Card className="rounded-2xl border-blue-200/50 bg-gradient-to-br from-card to-blue-50/20 dark:to-blue-950/20 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      {t("bank")}
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black">
                      BK
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-foreground">
                    <Money amount={data?.cashBalances?.bank || 0} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Business checking account</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 2. Courier Pending Balance Section */}
          <section>
            <Card className="rounded-3xl border-border/80 shadow-sm overflow-hidden">
              <div className="p-5 bg-gradient-to-r from-teal-900 to-teal-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-teal-200" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{t("courierPending")}</h3>
                    <p className="text-xs text-teal-200/80">
                      {language === "en"
                        ? "Delivered parcels awaiting courier remittance"
                        : "ডেলিভার্ড পার্সেলের বকেয়া টাকা"}
                    </p>
                  </div>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-xs text-teal-200 block">Total Unremitted COD</span>
                  <span className="text-2xl font-black tracking-tight text-white">
                    <Money amount={data?.courierPending?.totalPending || 0} symbol="৳ " />
                  </span>
                </div>
              </div>

              {/* By Courier Breakdown chips */}
              <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-card border-t">
                {Object.entries(data?.courierPending?.byCourier || {}).map(([courierName, amount]: any) => (
                  <div key={courierName} className="p-2.5 sm:p-3 rounded-2xl bg-muted/40 border border-border/60">
                    <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground block truncate">
                      {courierName}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-foreground block mt-0.5 truncate">
                      <Money amount={amount} />
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* 3. Monthly Financial Summary (Delivered Sales, COGS, Gross, Net Profit) */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              {t("monthlySummary")} ({selectedMonth})
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Delivered Sales */}
              <Card className="rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">{t("totalSales")}</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-lg sm:text-2xl font-black text-foreground">
                  <Money amount={data?.monthlySummary?.totalDeliveredSales || 0} />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">Delivered orders only</span>
              </Card>

              {/* COGS */}
              <Card className="rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">{t("cogs")}</span>
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-lg sm:text-2xl font-black text-foreground">
                  <Money amount={data?.monthlySummary?.cogs || 0} />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">Cost of delivered items</span>
              </Card>

              {/* Gross Profit */}
              <Card className="rounded-2xl p-4 sm:p-5 bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-teal-800 dark:text-teal-200">{t("grossProfit")}</span>
                  <DollarSign className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-lg sm:text-2xl font-black text-teal-700 dark:text-teal-300">
                  <Money amount={data?.monthlySummary?.grossProfit || 0} />
                </div>
                <span className="text-[10px] text-teal-600/80 mt-1 block">Sales − COGS</span>
              </Card>

              {/* Net Profit */}
              <Card
                className={`rounded-2xl p-4 sm:p-5 border-2 ${
                  (data?.monthlySummary?.netProfit || 0) >= 0
                    ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
                    : "bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">{t("netProfit")}</span>
                  {(data?.monthlySummary?.netProfit || 0) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  )}
                </div>
                <div className="text-lg sm:text-2xl font-black">
                  <Money amount={data?.monthlySummary?.netProfit || 0} colorize />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Gross − Op. Expenses (৳{data?.monthlySummary?.operatingExpenses || 0})
                </span>
              </Card>
            </div>
          </section>

          {/* 4. Charts Section: 6 Months Trend & Expense Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales vs Expenses Trend (2 cols on desktop) */}
            <Card className="lg:col-span-2 rounded-3xl p-5">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base font-bold">{t("salesVsExpenses")}</CardTitle>
                <CardDescription className="text-xs">Past 6 months revenue vs operational costs</CardDescription>
              </CardHeader>
              <div className="h-56 sm:h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.charts?.sixMonthTrend || []} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `৳${val / 1000}k`} />
                    <Tooltip
                      formatter={(value: any) => [`৳ ${Number(value).toLocaleString()}`, ""]}
                      contentStyle={{ borderRadius: 12, fontSize: 11 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                    <Bar dataKey="sales" name="Sales" fill="#0D9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Expense Breakdown Donut (1 col) */}
            <Card className="rounded-3xl p-5 flex flex-col justify-between">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base font-bold">{t("expenseBreakdown")}</CardTitle>
                <CardDescription className="text-xs">Category allocation for {selectedMonth}</CardDescription>
              </CardHeader>
              <div className="h-56 w-full flex items-center justify-center">
                {data?.charts?.expenseDonut?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.charts.expenseDonut}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                      >
                        {data.charts.expenseDonut.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`৳ ${Number(value).toLocaleString()}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">No operating expenses this month</p>
                )}
              </div>
              <div className="space-y-1.5 pt-2 border-t border-border">
                {data?.charts?.expenseDonut?.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-foreground"><Money amount={item.value} /></span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* 5. Stock Alerts Section (current_stock <= low_stock_limit) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {t("stockAlerts")}
              </h3>
              <span className="text-xs text-muted-foreground">
                {data?.lowStockProducts?.length || 0} products low in stock
              </span>
            </div>

            {data?.lowStockProducts?.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-border bg-card/40 text-center text-xs text-muted-foreground">
                ✓ All products are well stocked above their low-stock limit.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data?.lowStockProducts?.map((product: any) => (
                  <Card
                    key={product._id}
                    className="rounded-2xl border-amber-200/80 dark:border-amber-900/60 p-4 bg-card hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-foreground line-clamp-1">{product.name}</h4>
                          <span className="text-[10px] font-mono text-muted-foreground">SKU: {product.sku}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-black">
                          {product.currentStock} left
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span>Buy: <Money amount={product.buyingPrice} /></span>
                        <span>•</span>
                        <span>Sell: <Money amount={product.sellingPrice} /></span>
                      </div>
                    </div>

                    {canMutateData(user) && (
                      <Button
                        onClick={() => openStockInModal(product)}
                        size="sm"
                        variant="outline"
                        className="w-full mt-3 h-9 text-xs rounded-xl border-teal-600/30 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {t("stockIn")}
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Stock In Bottom Sheet Drawer for Quick Action */}
      <SheetDrawer
        isOpen={!!stockInProduct}
        onClose={() => setStockInProduct(null)}
        title={`Stock In: ${stockInProduct?.name}`}
        description={`Current stock: ${stockInProduct?.currentStock} units | SKU: ${stockInProduct?.sku}`}
      >
        <form onSubmit={handleStockInSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Add Quantity (Pcs)
            </label>
            <Input
              type="number"
              min="1"
              required
              value={stockInQty}
              onChange={(e) => setStockInQty(parseInt(e.target.value) || 0)}
              className="h-11"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Wholesale Buying Price per Unit (৳)
            </label>
            <Input
              type="number"
              min="0"
              required
              value={stockInBuyingPrice}
              onChange={(e) => setStockInBuyingPrice(parseFloat(e.target.value) || 0)}
              className="h-11"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Total Purchase Cost: <Money amount={stockInQty * stockInBuyingPrice} />
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Paid From Account
            </label>
            <select
              value={stockInPaymentMethod}
              onChange={(e) => setStockInPaymentMethod(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
            >
              <option value="CASH">CASH</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="BANK">Bank Account</option>
            </select>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={stockInLoading}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {stockInLoading ? "Restocking..." : "Confirm Stock In & Record Purchase"}
            </Button>
          </div>
        </form>
      </SheetDrawer>
    </DashboardLayout>
  );
}
