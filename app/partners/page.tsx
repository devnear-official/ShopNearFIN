"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  PieChart as PieIcon,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  FileText,
  RotateCw,
  Wallet,
  Sparkles,
  Receipt,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetDrawer } from "@/components/ui/sheet-drawer";
import { Input } from "@/components/ui/input";
import { FAB } from "@/components/ui/fab";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { canMutateData } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

const PARTNER_COLORS = ["#0D9488", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#10B981"];

export default function PartnersPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [partnersData, setPartnersData] = useState<any>(null);
  const [splitData, setSplitData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Modal State for new Partner Entry
  const [modalOpen, setModalOpen] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [entryType, setEntryType] = useState<"INVESTMENT" | "REIMBURSEMENT" | "WITHDRAWAL">("INVESTMENT");
  const [grossAmount, setGrossAmount] = useState<number>(0);
  const [cashoutFee, setCashoutFee] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("BANK");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto calculate fee for bKash/Nagad investment
  useEffect(() => {
    if (entryType === "INVESTMENT" && grossAmount > 0) {
      if (paymentMethod === "BKASH") {
        const fee = Math.round((grossAmount * 18.5) / 1000);
        setCashoutFee(fee);
      } else if (paymentMethod === "NAGAD") {
        const fee = Math.round((grossAmount * 15) / 1000);
        setCashoutFee(fee);
      } else {
        setCashoutFee(0);
      }
    } else {
      setCashoutFee(0);
    }
  }, [entryType, grossAmount, paymentMethod]);

  const netInvestmentAmount = Math.max(0, grossAmount - cashoutFee);

  const fetchPartnersLedger = async () => {
    try {
      setLoading(true);
      const [resLedger, resSplit] = await Promise.all([
        fetch("/api/partners"),
        fetch(`/api/partners/split?month=${selectedMonth}`),
      ]);

      const jsonLedger = await resLedger.json();
      const jsonSplit = await resSplit.json();

      if (jsonLedger.success) setPartnersData(jsonLedger.data);
      if (jsonSplit.success) setSplitData(jsonSplit.data);
    } catch (err) {
      console.error("Failed to load partner ledger", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnersLedger();
  }, [selectedMonth]);

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerName: partnerName.trim(),
          type: entryType,
          amount: entryType === "INVESTMENT" && cashoutFee > 0 ? netInvestmentAmount : Number(grossAmount),
          grossAmount: Number(grossAmount),
          cashoutFee: Number(cashoutFee) || 0,
          paymentMethod,
          date: entryDate ? new Date(entryDate) : new Date(),
          note,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to record transaction", "error");
        return;
      }

      toast(
        cashoutFee > 0
          ? `Recorded ৳${netInvestmentAmount} Net Investment (৳${cashoutFee} fee deducted from ৳${grossAmount})`
          : `Successfully recorded ${entryType} for ${partnerName}`,
        "success"
      );
      setModalOpen(false);
      setGrossAmount(0);
      setCashoutFee(0);
      setNote("");
      fetchPartnersLedger();
    } catch {
      toast("Error recording transaction", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePartner = async (nameToDelete: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete partner "${nameToDelete}" and all associated entries?`)) return;

    try {
      const res = await fetch(`/api/partners/${encodeURIComponent(nameToDelete)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to delete partner", "error");
        return;
      }
      toast(`Partner "${nameToDelete}" deleted successfully`, "success");
      fetchPartnersLedger();
    } catch {
      toast("Error deleting partner", "error");
    }
  };

  const handleExportXLSX = () => {
    if (!splitData?.partnersSplit) return;
    const rows = [
      ["ShopNearFin - Partner Equity & Profit Split Breakdown"],
      [`Period: ${selectedMonth}`],
      [`Net Period Profit: BDT ${splitData?.pnl?.netProfit || 0}`],
      [],
      ["Partner Name", "Total Investment (BDT)", "Equity Stake %", `Profit Share for ${selectedMonth} (BDT)`],
      ...splitData.partnersSplit.map((p: any) => [
        p.partnerName,
        p.investment,
        `${p.equityPercentage}%`,
        p.profitShare,
      ]),
      ["TOTAL", splitData?.totalInvestment || 0, "100%", splitData?.pnl?.netProfit || 0],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 26 }, { wch: 24 }, { wch: 18 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, ws, "Profit Split");
    XLSX.writeFile(wb, `Partner_Profit_Split_${selectedMonth}.xlsx`);
    toast("Excel (XLSX) exported successfully!", "success");
  };

  return (
    <DashboardLayout>
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            {t("partners")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Partners equity stakes, reimbursements, withdrawals & automated profit splitting"
              : "পার্টনারদের ইকুইটি শেয়ার, উত্তোলন ও স্বয়ংক্রিয় লভ্যাংশ বণ্টন"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-card text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none"
          />

          <Button
            onClick={handleExportXLSX}
            size="sm"
            variant="outline"
            className="h-10 rounded-xl text-xs gap-1.5"
            title="Export Excel (XLSX)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export XLSX</span>
          </Button>

          {canMutateData(user) && (
            <Button
              onClick={() => setModalOpen(true)}
              size="sm"
              className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t("quickAdd")}</span>
            </Button>
          )}
        </div>
      </div>

      {loading && !partnersData ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* 1. Equity Stakes Overview & Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 5-Partner Cards */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  Partner Equity Ownership Stakes
                </h3>
                <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                  Total Capital: <Money amount={partnersData?.totalAllInvestments || 0} />
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {partnersData?.partnersSummary?.map((partner: any, idx: number) => {
                  const color = PARTNER_COLORS[idx % PARTNER_COLORS.length];
                  return (
                    <Link
                      key={partner.partnerName}
                      href={`/partners/${encodeURIComponent(partner.partnerName)}`}
                      className="block group"
                    >
                      <Card className="rounded-2xl p-4 shadow-sm group-hover:border-teal-500/80 transition-all cursor-pointer active:scale-[0.99] bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {partner.partnerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-foreground group-hover:text-teal-600 transition-colors">
                                {partner.partnerName}
                              </h4>
                              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                                {partner.equityPercentage}% {t("equityPercentage")}
                              </span>
                            </div>
                          </div>

                          {canMutateData(user) && (
                            <button
                              type="button"
                              onClick={(e) => handleDeletePartner(partner.partnerName, e)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title={`Delete ${partner.partnerName}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-3 mt-3 border-t border-border/80 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">Investment</span>
                            <span className="font-bold text-foreground block mt-0.5 truncate">
                              <Money amount={partner.investments} showDecimals={false} />
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Payable</span>
                            <span className="font-bold text-emerald-600 block mt-0.5 truncate">
                              <Money amount={partner.reimbursements} showDecimals={false} />
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Withdrawn</span>
                            <span className="font-bold text-rose-600 block mt-0.5 truncate">
                              <Money amount={partner.withdrawals} showDecimals={false} />
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Equity Pie Chart */}
            <Card className="rounded-3xl p-5 flex flex-col justify-between">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-teal-600" />
                  Equity Distribution (%)
                </CardTitle>
              </CardHeader>
              <div className="h-52 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={partnersData?.partnersSummary || []}
                      dataKey="equityPercentage"
                      nameKey="partnerName"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {partnersData?.partnersSummary?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PARTNER_COLORS[index % PARTNER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${value}% Equity`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] pt-2 border-t">
                {partnersData?.partnersSummary?.map((p: any, idx: number) => (
                  <div key={p.partnerName} className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PARTNER_COLORS[idx % PARTNER_COLORS.length] }}
                    />
                    <span className="truncate">{p.partnerName}: {p.equityPercentage}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* 2. Auto Profit Split Table for Selected Period */}
          <Card className="rounded-3xl border-teal-300/60 dark:border-teal-800 shadow-md overflow-hidden bg-gradient-to-b from-card to-teal-50/10">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-900/5 dark:bg-teal-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t("autoProfitSplit")} ({selectedMonth})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Formula: Net Profit × (Partner Investment ÷ Total Capital)
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-muted-foreground block">Period Net Profit</span>
                <span className="text-xl font-black text-foreground">
                  <Money amount={splitData?.pnl?.netProfit || 0} colorize />
                </span>
              </div>
            </div>

            {/* Split Table */}
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold">
                    <th className="pb-3 pl-2">Partner</th>
                    <th className="pb-3 text-right">Total Invested</th>
                    <th className="pb-3 text-right">Equity Share</th>
                    <th className="pb-3 text-right pr-2">Calculated Profit Share (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {splitData?.partnersSplit?.map((item: any, idx: number) => (
                    <tr key={item.partnerName} className="hover:bg-muted/30">
                      <td className="py-3.5 pl-2 font-bold text-foreground flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PARTNER_COLORS[idx % PARTNER_COLORS.length] }}
                        />
                        {item.partnerName}
                      </td>
                      <td className="py-3.5 text-right font-medium text-muted-foreground">
                        <Money amount={item.investment} />
                      </td>
                      <td className="py-3.5 text-right font-bold text-teal-700 dark:text-teal-400">
                        {item.equityPercentage}%
                      </td>
                      <td className="py-3.5 text-right pr-2 font-black text-emerald-600 dark:text-emerald-400 text-base">
                        <Money amount={item.profitShare} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 3. Transaction History Table / Mobile Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-teal-600" />
              Partners Ledger Transactions
            </h3>

            {partnersData?.entries?.length === 0 ? (
              <EmptyState
                title="No Ledger Entries Yet"
                description="Record the first partner investment or capital entry to calculate equity."
                actionLabel={canMutateData(user) ? "+ Record Investment" : undefined}
                onAction={canMutateData(user) ? () => setModalOpen(true) : undefined}
              />
            ) : (
              <div className="space-y-2 sm:space-y-0">
                {/* Mobile Cards (< 768px) */}
                <div className="md:hidden space-y-2.5">
                  {partnersData?.entries?.map((entry: any) => (
                    <Card key={entry._id} className="rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-foreground">{entry.partnerName}</span>
                        <Badge
                          variant={
                            entry.type === "INVESTMENT"
                              ? "delivered"
                              : entry.type === "REIMBURSEMENT"
                              ? "pending"
                              : "returned"
                          }
                        >
                          {entry.type}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <span>{formatDate(entry.date)} via {entry.paymentMethod}</span>
                        <span className="text-base font-black text-foreground">
                          <Money amount={entry.amount} />
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-dashed">
                          {entry.note}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Desktop Table (>= 768px) */}
                <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                        <th className="p-3.5 pl-4">Date</th>
                        <th className="p-3.5">Partner</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Method</th>
                        <th className="p-3.5">Note</th>
                        <th className="p-3.5 pr-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {partnersData?.entries?.map((entry: any) => (
                        <tr key={entry._id} className="hover:bg-muted/30">
                          <td className="p-3.5 pl-4 text-muted-foreground">{formatDate(entry.date)}</td>
                          <td className="p-3.5 font-bold text-foreground">{entry.partnerName}</td>
                          <td className="p-3.5">
                            <Badge
                              variant={
                                entry.type === "INVESTMENT"
                                  ? "delivered"
                                  : entry.type === "REIMBURSEMENT"
                                  ? "pending"
                                  : "returned"
                              }
                            >
                              {entry.type}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-muted-foreground font-medium">{entry.paymentMethod}</td>
                          <td className="p-3.5 text-muted-foreground max-w-xs truncate">{entry.note || "—"}</td>
                          <td className="p-3.5 pr-4 text-right font-black text-foreground">
                            <Money amount={entry.amount} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* FAB for Mobile */}
      {canMutateData(user) && (
        <FAB onClick={() => setModalOpen(true)} label="New Entry" />
      )}

      {/* Sheet Drawer: Record Partner Transaction */}
      <SheetDrawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Partner Transaction"
        description="Record capital investment, expense reimbursement, or partner drawings."
      >
        <form onSubmit={handleSubmitEntry} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Partner Name
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Rahim, Karim, Tanvir, Sajib, Nafis"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              className="h-11"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "INVESTMENT", label: "Investment" },
                { type: "REIMBURSEMENT", label: "Reimburse" },
                { type: "WITHDRAWAL", label: "Withdrawal" },
              ].map((item: any) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setEntryType(item.type)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    entryType === item.type
                      ? "bg-teal-600 text-white border-teal-600"
                      : "border-input bg-card hover:bg-muted text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {entryType === "INVESTMENT" && "Adds to partner equity capital & deposits into business account."}
              {entryType === "REIMBURSEMENT" && "Personal expense claim credited to partner's payable balance."}
              {entryType === "WITHDRAWAL" && "Draws money out of business accounts & reduces available balance."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
            >
              <option value="BANK">Bank Account</option>
              <option value="CASH">CASH</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Amount (৳ BDT) *
            </label>
            <Input
              type="number"
              min="1"
              required
              placeholder="e.g. 50000"
              value={grossAmount || ""}
              onChange={(e) => setGrossAmount(parseFloat(e.target.value) || 0)}
              className="h-11 text-base font-bold"
            />
          </div>

          {/* Fee preview & breakdown for bKash/Nagad Investment */}
          {entryType === "INVESTMENT" && (paymentMethod === "BKASH" || paymentMethod === "NAGAD") && grossAmount > 0 && (
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{paymentMethod} Fee ({paymentMethod === "BKASH" ? "1.85%" : "1.5%"}):</span>
                <span className="font-bold text-rose-600">- ৳{cashoutFee}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="font-bold text-foreground">Net Investment Added:</span>
                <span className="font-black text-teal-700 dark:text-teal-400 text-sm">৳{netInvestmentAmount}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight pt-0.5">
                Fee bada diye <strong>৳{netInvestmentAmount}</strong> taka partner er total investment o equity te add hobe.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Date *
            </label>
            <Input
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="h-11 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Note / Reference
            </label>
            <Input
              type="text"
              placeholder="e.g. Initial seed funding tranche 1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {submitting ? "Saving..." : "Record Entry"}
            </Button>
          </div>
        </form>
      </SheetDrawer>
    </DashboardLayout>
  );
}
