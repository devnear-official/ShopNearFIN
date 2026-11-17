"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  RotateCw,
  Building2,
  Smartphone,
  Coins,
  History,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetDrawer } from "@/components/ui/sheet-drawer";
import { Input } from "@/components/ui/input";
import { FAB } from "@/components/ui/fab";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { canMutateData } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

const METHODS = ["CASH", "BKASH", "NAGAD", "BANK"] as const;

export default function AccountsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [fromMethod, setFromMethod] = useState("BKASH");
  const [toMethod, setToMethod] = useState("CASH");
  const [amount, setAmount] = useState<number>(0);
  const [transferNote, setTransferNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      toast("Failed to load accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromMethod === toMethod) {
      toast("Source and destination accounts must be different", "error");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/accounts/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMethod,
          toMethod,
          amount: Number(amount),
          note: transferNote.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Transfer failed", "error");
        return;
      }

      toast(`Successfully transferred ৳${amount} from ${fromMethod} to ${toMethod}!`, "success");
      setTransferModalOpen(false);
      setAmount(0);
      setTransferNote("");
      fetchAccounts();
    } catch {
      toast("Error executing transfer", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountIcon = (method: string) => {
    switch (method) {
      case "BANK":
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case "BKASH":
        return <Smartphone className="w-5 h-5 text-pink-600" />;
      case "NAGAD":
        return <Smartphone className="w-5 h-5 text-orange-600" />;
      default:
        return <Coins className="w-5 h-5 text-teal-600" />;
    }
  };

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-teal-600" />
            {t("accounts")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Strict ledger balances: Opening + Income − Expenses ± Transfers"
              : "লেজারভিত্তিক চলতি স্থিতি ও অ্যাকাউন্টসমূহের মধ্যকার ব্যালেন্স স্থানান্তর"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {canMutateData(user) && (
            <Button
              onClick={() => setTransferModalOpen(true)}
              size="sm"
              className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{t("transferFunds")}</span>
            </Button>
          )}

          <button
            onClick={fetchAccounts}
            className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors"
            title="Refresh balances"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : (
        <>
          {/* Total Liquidity Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-900 to-teal-800 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-teal-200 uppercase tracking-wider font-bold">
                Consolidated Liquid Capital
              </span>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                <Money amount={data?.totalLiquidity || 0} symbol="৳ " />
              </div>
              <p className="text-[11px] text-teal-200/80 mt-1">
                Sum of live balances across Cash, bKash, Nagad, and Bank accounts
              </p>
            </div>
            {canMutateData(user) && (
              <Button
                onClick={() => setTransferModalOpen(true)}
                variant="secondary"
                className="bg-white text-teal-900 hover:bg-teal-50 font-bold text-xs rounded-xl"
              >
                <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                Inter-Account Transfer
              </Button>
            )}
          </div>

          {/* 4 Account Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data?.accounts?.map((acc: any) => (
              <Card key={acc.id} className="rounded-2xl p-5 border shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-muted/60 flex items-center justify-center">
                      {getAccountIcon(acc.methodName)}
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted px-2 py-0.5 rounded-full">
                      {acc.transactionCount} transactions
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-foreground">{acc.methodName}</h3>
                  <div className="text-xl sm:text-2xl font-black text-foreground mt-2">
                    <Money amount={acc.currentBalance} />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-border/80 text-[11px] text-muted-foreground flex justify-between items-center">
                  <span>Opening: <Money amount={acc.openingBalance} /></span>
                  <span className="font-semibold text-teal-600">Ledger Verified</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Recent Cashflow Activity (Last 30 days) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-teal-600" />
              {t("cashflowHistory")}
            </h3>

            {data?.recentTransactions?.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center border rounded-2xl bg-card">
                No recent transactions recorded in the ledger.
              </p>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="p-3.5 pl-4">Date & Time</th>
                      <th className="p-3.5">Account</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Reference & Note</th>
                      <th className="p-3.5 pr-4 text-right">Flow (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data?.recentTransactions?.map((tx: any) => {
                      const isMoneyIn = tx.type === "IN" || (tx.type === "TRANSFER" && !tx.isDebit);
                      return (
                        <tr key={tx._id} className="hover:bg-muted/30">
                          <td className="p-3.5 pl-4 text-muted-foreground text-xs">
                            {formatDateTime(tx.date)}
                          </td>
                          <td className="p-3.5 font-bold text-foreground">{tx.accountMethod}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isMoneyIn
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {tx.type} {tx.isDebit ? "(Out)" : "(In)"}
                            </span>
                          </td>
                          <td className="p-3.5 text-xs text-muted-foreground max-w-sm truncate">
                            <span className="font-semibold text-foreground mr-1.5">[{tx.refType}]</span>
                            {tx.note || "—"}
                          </td>
                          <td className="p-3.5 pr-4 text-right font-black">
                            <span className={isMoneyIn ? "text-emerald-600" : "text-rose-600"}>
                              {isMoneyIn ? "+" : "-"}
                              <Money amount={tx.amount} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* FAB on Mobile */}
      {canMutateData(user) && (
        <FAB onClick={() => setTransferModalOpen(true)} label="Transfer" />
      )}

      {/* Sheet Drawer: Inter-Account Transfer */}
      <SheetDrawer
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transfer Funds Between Accounts"
        description="Transfers move liquid balances without affecting profit and loss."
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {t("fromAccount")} *
              </label>
              <select
                value={fromMethod}
                onChange={(e) => setFromMethod(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {t("toAccount")} *
              </label>
              <select
                value={toMethod}
                onChange={(e) => setToMethod(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Transfer Amount (৳) *
            </label>
            <Input
              type="number"
              min="1"
              required
              placeholder="e.g. 20000"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="h-11 text-base font-bold text-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Transfer Note / Reference
            </label>
            <Input
              type="text"
              placeholder="e.g. Bank cash withdrawal to counter cash"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {submitting ? "Processing Transfer..." : "Execute Transfer"}
            </Button>
          </div>
        </form>
      </SheetDrawer>
    </DashboardLayout>
  );
}
