"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Wallet,
  Calendar,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  FileText,
  CreditCard,
  Percent,
  CheckCircle2,
  Trash2,
  ExternalLink,
  RotateCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { canMutateData } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partnerName = decodeURIComponent(params.name as string);

  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"entries" | "expenses">("entries");
  const [deleting, setDeleting] = useState(false);

  const fetchPartnerData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/partners/${encodeURIComponent(partnerName)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        toast(json.message || "Failed to load partner details", "error");
      }
    } catch {
      toast("Error loading partner details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partnerName) {
      fetchPartnerData();
    }
  }, [partnerName]);

  const handleDeletePartner = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete partner "${partnerName}" and all their financial records? This action is permanent and audited.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/partners/${encodeURIComponent(partnerName)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast(`Partner "${partnerName}" deleted successfully`, "success");
        router.push("/partners");
      } else {
        toast(json.message || "Failed to delete partner", "error");
      }
    } catch {
      toast("Network error deleting partner", "error");
    } finally {
      setDeleting(false);
    }
  };

  const summary = data?.summary || {
    totalInvestments: 0,
    totalReimbursements: 0,
    totalWithdrawals: 0,
    netBalance: 0,
    equityPercentage: 0,
    totalAllInvestments: 0,
  };

  const entries = data?.entries || [];
  const personalExpenses = data?.personalExpenses || [];

  return (
    <DashboardLayout>
      {/* Top Bar with Back Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/partners"
            className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center touch-target"
            title="Back to Partners"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {partnerName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                {summary.equityPercentage}% {language === "bn" ? "অংশীদারিত্ব" : "Equity"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === "bn"
                ? "অংশীদারের সকল বিনিয়োগ, উত্তোলন ও খরচের বিস্তারিত ইতিহাস"
                : "Complete timeline of capital investments, profit withdrawals, and expenses"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={fetchPartnerData}
            className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors touch-target flex items-center justify-center"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
          </button>

          {canMutateData(user) && (
            <Button
              onClick={handleDeletePartner}
              disabled={deleting}
              variant="outline"
              size="sm"
              className="h-10 rounded-xl text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 touch-target"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleting ? "Deleting..." : "Delete Partner"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-2xl p-4 border border-border shadow-sm bg-card">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {language === "bn" ? "মোট বিনিয়োগ" : "Total Invested"}
          </span>
          <span className="text-lg sm:text-2xl font-black text-foreground mt-1 block">
            <Money amount={summary.totalInvestments} />
          </span>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold block mt-1">
            {summary.equityPercentage}% of ৳ {summary.totalAllInvestments.toLocaleString("en-IN")}
          </span>
        </Card>

        <Card className="rounded-2xl p-4 border border-border shadow-sm bg-card">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {language === "bn" ? "ব্যক্তিগত খরচ (বকেয়া)" : "Personal Expense (Payable)"}
          </span>
          <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            <Money amount={summary.totalReimbursements} />
          </span>
          <span className="text-[10px] text-muted-foreground block mt-1">
            {personalExpenses.length} {language === "bn" ? "টি ব্যক্তিগত খরচ" : "records"}
          </span>
        </Card>

        <Card className="rounded-2xl p-4 border border-border shadow-sm bg-card">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {language === "bn" ? "উত্তোলন" : "Total Withdrawn"}
          </span>
          <span className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
            <Money amount={summary.totalWithdrawals} />
          </span>
          <span className="text-[10px] text-muted-foreground block mt-1">
            {language === "bn" ? "লাভ ও মূলধন প্রত্যাহার" : "Capital / profit payouts"}
          </span>
        </Card>

        <Card className="rounded-2xl p-4 border border-teal-500/40 shadow-sm bg-teal-50/20 dark:bg-teal-950/20">
          <span className="text-[11px] font-medium text-muted-foreground block">
            {language === "bn" ? "নেট মূলধন ব্যালেন্স" : "Net Partner Balance"}
          </span>
          <span className="text-lg sm:text-2xl font-black text-teal-700 dark:text-teal-300 mt-1 block">
            <Money amount={summary.netBalance} />
          </span>
          <span className="text-[10px] text-teal-600 font-semibold block mt-1">
            Invested + Payable - Withdrawn
          </span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("entries")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "entries"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>
            {language === "bn" ? "বিনিয়োগ ও লেনদেন" : "Capital & Ledger History"} ({entries.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "expenses"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>
            {language === "bn" ? "ব্যক্তিগত খরচ" : "Paid Expenses"} ({personalExpenses.length})
          </span>
        </button>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : activeTab === "entries" ? (
        /* Capital & Ledger Entries Tab */
        entries.length === 0 ? (
          <EmptyState
            title="No Ledger Records Found"
            description={`No capital investments or withdrawals have been recorded for ${partnerName} yet.`}
          />
        ) : (
          <div className="space-y-3">
            {/* Mobile Stacked View (< 768px) */}
            <div className="md:hidden space-y-3">
              {entries.map((e: any) => {
                const isInvest = e.type === "INVESTMENT";
                const isReimburse = e.type === "REIMBURSEMENT";
                return (
                  <Card key={e._id} className="rounded-2xl p-4 shadow-sm border bg-card space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isInvest
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : isReimburse
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {isInvest ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : isReimburse ? (
                            <Receipt className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            {e.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(e.date)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-base font-extrabold ${
                            isInvest || isReimburse
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isInvest || isReimburse ? "+" : "-"} <Money amount={e.amount} />
                        </span>
                      </div>
                    </div>

                    {/* bKash / Payment Method details & Gross breakdown */}
                    <div className="text-xs space-y-1 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Account / Method:</span>
                        <span className="font-semibold text-foreground">
                          {e.accountName || "Vault"} {e.paymentMethod ? `(${e.paymentMethod})` : ""}
                        </span>
                      </div>

                      {e.cashoutFee > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400">
                          <span>Cashout Fee Deducted:</span>
                          <span className="font-semibold">- ৳ {e.cashoutFee}</span>
                        </div>
                      )}

                      {e.grossAmount && e.grossAmount !== e.amount && (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Gross Deposited:</span>
                          <span>৳ {e.grossAmount.toLocaleString("en-IN")}</span>
                        </div>
                      )}

                      {e.description && (
                        <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span className="font-medium text-foreground">Note: </span>
                          {e.description}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <Card className="hidden md:block rounded-3xl overflow-hidden border border-border shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Account / Gateway</th>
                    <th className="py-3 px-4">Fee / Gross Details</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {entries.map((e: any) => {
                    const isInvest = e.type === "INVESTMENT";
                    const isReimburse = e.type === "REIMBURSEMENT";
                    return (
                      <tr key={e._id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground font-medium">
                          {formatDate(e.date)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isInvest
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : isReimburse
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {e.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-foreground font-medium">
                          {e.accountName || "Vault"}
                          {e.paymentMethod ? (
                            <span className="text-[11px] text-muted-foreground ml-1.5">
                              ({e.paymentMethod})
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {e.cashoutFee > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                              Fee: ৳ {e.cashoutFee} (Gross: ৳ {e.grossAmount})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                          {e.description || "—"}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-black text-sm ${
                            isInvest || isReimburse
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isInvest || isReimburse ? "+" : "-"} <Money amount={e.amount} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )
      ) : (
        /* Expenses Paid Personal Tab */
        personalExpenses.length === 0 ? (
          <EmptyState
            title="No Personal Expenses Recorded"
            description={`No expenses have been marked as paid personally by ${partnerName}.`}
          />
        ) : (
          <div className="space-y-3">
            {/* Mobile Stacked View (< 768px) */}
            <div className="md:hidden space-y-3">
              {personalExpenses.map((exp: any) => (
                <Card key={exp._id} className="rounded-2xl p-4 shadow-sm border bg-card space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                        {exp.category}
                      </span>
                      <h4 className="font-bold text-sm text-foreground mt-0.5">
                        {exp.note || "Expense"}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(exp.date)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-foreground">
                        <Money amount={exp.amount} />
                      </span>
                      <span
                        className={`block text-[10px] font-bold ${
                          exp.isReimbursed
                            ? "text-emerald-600"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {exp.isReimbursed ? "Reimbursed" : "Unpaid / Payable"}
                      </span>
                    </div>
                  </div>

                  {exp.attachmentUrl && (
                    <a
                      href={exp.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Receipt Attachment
                    </a>
                  )}
                </Card>
              ))}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <Card className="hidden md:block rounded-3xl overflow-hidden border border-border shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Expense Note</th>
                    <th className="py-3 px-4">Receipt</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {personalExpenses.map((exp: any) => (
                    <tr key={exp._id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground font-medium">
                        {formatDate(exp.date)}
                      </td>
                      <td className="py-3 px-4 font-bold text-teal-700 dark:text-teal-400">
                        {exp.category}
                      </td>
                      <td className="py-3 px-4 text-foreground font-medium max-w-xs truncate">
                        {exp.note || "—"}
                      </td>
                      <td className="py-3 px-4">
                        {exp.attachmentUrl ? (
                          <a
                            href={exp.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline font-semibold"
                          >
                            <span>Receipt</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            exp.isReimbursed
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {exp.isReimbursed ? "Reimbursed" : "Unpaid"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sm text-foreground">
                        <Money amount={exp.amount} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )
      )}
    </DashboardLayout>
  );
}
