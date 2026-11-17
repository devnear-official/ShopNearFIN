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
  Plus,
  Edit3,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SheetDrawer } from "@/components/ui/sheet-drawer";
import { Input } from "@/components/ui/input";
import { FAB } from "@/components/ui/fab";
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

  // New Transaction / Investment Modal State
  const [modalOpen, setModalOpen] = useState(false);
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

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grossAmount <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }
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
          ? `Recorded ৳${netInvestmentAmount.toLocaleString("en-IN")} Net Investment (৳${cashoutFee} fee deducted from ৳${grossAmount.toLocaleString("en-IN")})`
          : `Successfully recorded ${entryType} for ${partnerName}`,
        "success"
      );
      setModalOpen(false);
      setGrossAmount(0);
      setCashoutFee(0);
      setNote("");
      fetchPartnerData();
    } catch {
      toast("Error recording transaction", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Entry State
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editType, setEditType] = useState<"INVESTMENT" | "REIMBURSEMENT" | "WITHDRAWAL">("INVESTMENT");
  const [editGrossAmount, setEditGrossAmount] = useState<number>(0);
  const [editCashoutFee, setEditCashoutFee] = useState<number>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState("BANK");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (editType === "INVESTMENT" && editGrossAmount > 0) {
      if (editPaymentMethod === "BKASH") {
        setEditCashoutFee(Math.round((editGrossAmount * 18.5) / 1000));
      } else if (editPaymentMethod === "NAGAD") {
        setEditCashoutFee(Math.round((editGrossAmount * 15) / 1000));
      } else {
        setEditCashoutFee(0);
      }
    } else {
      setEditCashoutFee(0);
    }
  }, [editType, editGrossAmount, editPaymentMethod]);

  const editNetAmount = Math.max(0, editGrossAmount - editCashoutFee);

  const openEditModal = (entry: any) => {
    setEditingEntry(entry);
    setEditType(entry.type);
    const gross = entry.grossAmount || (entry.cashoutFee ? entry.amount + entry.cashoutFee : entry.amount);
    setEditGrossAmount(gross);
    setEditCashoutFee(entry.cashoutFee || 0);
    setEditPaymentMethod(entry.paymentMethod || "BANK");
    setEditDate(entry.date ? new Date(entry.date).toISOString().split("T")[0] : "");
    setEditNote(entry.note || entry.description || "");
    setEditModalOpen(true);
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    if (editGrossAmount <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }
    setEditSubmitting(true);

    const netAmount = editType === "INVESTMENT" && editCashoutFee > 0 ? editNetAmount : Number(editGrossAmount);

    try {
      const res = await fetch(`/api/partners/entry/${editingEntry._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editType,
          amount: netAmount,
          grossAmount: Number(editGrossAmount),
          cashoutFee: Number(editCashoutFee) || 0,
          paymentMethod: editPaymentMethod,
          date: editDate ? new Date(editDate) : new Date(),
          note: editNote,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to update entry", "error");
        return;
      }

      toast("Partner entry and cash/vault balance updated successfully!", "success");
      setEditModalOpen(false);
      setEditingEntry(null);
      fetchPartnerData();
    } catch {
      toast("Error updating entry", "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string, amount: number) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this ৳${amount.toLocaleString("en-IN")} ledger entry? The cash/vault balance will also be updated.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/partners/entry/${entryId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to delete entry", "error");
        return;
      }
      toast("Entry deleted and cash/vault balance updated!", "success");
      fetchPartnerData();
    } catch {
      toast("Error deleting entry", "error");
    }
  };

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
              onClick={() => setModalOpen(true)}
              size="sm"
              className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 touch-target shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{language === "bn" ? "নতুন বিনিয়োগ / লেনদেন" : "Add Entry"}</span>
            </Button>
          )}

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

                    {canMutateData(user) && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                        <Button
                          onClick={() => openEditModal(e)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                          <span>{language === "bn" ? "এডিট" : "Edit"}</span>
                        </Button>
                        <Button
                          onClick={() => handleDeleteEntry(e._id, e.amount)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "ডিলিট" : "Delete"}</span>
                        </Button>
                      </div>
                    )}
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
                    <th className="py-3 px-4 text-right">{language === "bn" ? "অ্যাকশন" : "Actions"}</th>
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
                          {e.description || e.note || "—"}
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
                        <td className="py-3 px-4 text-right">
                          {canMutateData(user) && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(e)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
                                title="Edit Entry"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(e._id, e.amount)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
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

      {/* Mobile Floating Action Button */}
      {canMutateData(user) && (
        <FAB
          onClick={() => setModalOpen(true)}
          icon={<Plus className="w-6 h-6" />}
          label={language === "bn" ? "নতুন বিনিয়োগ" : "Add Entry"}
        />
      )}

      {/* New Investment / Transaction Drawer for this Partner */}
      <SheetDrawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          language === "bn"
            ? `${partnerName}-এর মূলধন বিনিয়োগ বা লেনদেন`
            : `Add Capital or Ledger Entry: ${partnerName}`
        }
        description={
          language === "bn"
            ? "অংশীদারের মূলধন বিনিয়োগ, উত্তোলন বা খরচের টাকা পরিশোধ রেকর্ড করুন"
            : "Record capital investment, withdrawals, or reimbursement for this partner"
        }
      >
        <form onSubmit={handleSubmitEntry} className="space-y-4">
          {/* Partner Name (Fixed / Pre-filled) */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "অংশীদারের নাম (Partner)" : "Partner Name"}
            </label>
            <input
              type="text"
              value={partnerName}
              disabled
              className="w-full h-11 px-3.5 rounded-xl border border-input bg-muted/60 text-foreground font-bold text-sm cursor-not-allowed"
            />
          </div>

          {/* Entry Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "লেনদেনের ধরন (Transaction Type)" : "Transaction Type"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEntryType("INVESTMENT")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  entryType === "INVESTMENT"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-600 font-bold"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <ArrowDownRight className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span className="text-[11px] block">{language === "bn" ? "বিনিয়োগ (In)" : "Investment"}</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType("WITHDRAWAL")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  entryType === "WITHDRAWAL"
                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 ring-2 ring-rose-600 font-bold"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                <span className="text-[11px] block">{language === "bn" ? "উত্তোলন (Out)" : "Withdrawal"}</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType("REIMBURSEMENT")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  entryType === "REIMBURSEMENT"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 ring-2 ring-blue-600 font-bold"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <Receipt className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <span className="text-[11px] block">{language === "bn" ? "পরিশোধ" : "Reimburse"}</span>
              </button>
            </div>
          </div>

          {/* Business Account / Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "ব্যবসায়িক অ্যাকাউন্ট / মাধ্যম" : "Business Account / Gateway"}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-input bg-card text-foreground text-sm font-medium focus:ring-2 focus:ring-teal-600"
            >
              <option value="BANK">Bank Account (সিটি / ব্র্যাক / অন্যান্য)</option>
              <option value="CASH">Cash Vault (ক্যাশ ফান্ড)</option>
              <option value="BKASH">bKash (বিকাশ মার্চেন্ট / পার্সোনাল)</option>
              <option value="NAGAD">Nagad (নগদ অ্যাকাউন্ট)</option>
            </select>
          </div>

          {/* Gross Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {entryType === "INVESTMENT" && (paymentMethod === "BKASH" || paymentMethod === "NAGAD")
                ? language === "bn" ? "প্রদত্ত গ্রস টাকার পরিমাণ (Gross Sent Amount)" : "Gross Sent Amount (৳)"
                : language === "bn" ? "টাকার পরিমাণ (Amount)" : "Amount (৳)"}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">৳</span>
              <Input
                type="number"
                min="1"
                step="any"
                value={grossAmount || ""}
                onChange={(e) => setGrossAmount(Number(e.target.value))}
                placeholder="e.g. 50000"
                className="pl-8 h-11 rounded-xl text-base font-bold"
                required
              />
            </div>
          </div>

          {/* bKash / Nagad Fee Calculation Box (if investment via MFS) */}
          {entryType === "INVESTMENT" && (paymentMethod === "BKASH" || paymentMethod === "NAGAD") && (
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{paymentMethod === "BKASH" ? "bKash Cashout Fee (1.85%)" : "Nagad Cashout Fee (1.5%)"}:</span>
                <div className="flex items-center gap-1.5">
                  <span>৳</span>
                  <input
                    type="number"
                    min="0"
                    value={cashoutFee}
                    onChange={(e) => setCashoutFee(Number(e.target.value))}
                    className="w-20 h-7 px-2 rounded-lg border border-input bg-card text-foreground font-bold text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between font-black text-sm text-foreground pt-1.5 border-t border-teal-200/60 dark:border-teal-800/60">
                <span>{language === "bn" ? "ব্যবসায় জমা হওয়া নেট মূলধন" : "Net Business Capital (Equity)"}:</span>
                <span className="text-emerald-700 dark:text-emerald-300">
                  ৳ {netInvestmentAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {language === "bn"
                  ? "ক্যাশআউট চার্জ কর্তনের পর অবশিষ্ট নেট টাকা কোম্পানির মূলধন ও অ্যাকাউন্টে যোগ হবে।"
                  : "Net amount after cashout fee will be credited to business capital balance."}
              </p>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "তারিখ (Date)" : "Date"}
            </label>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "বিবরণ / নোট (ঐচ্ছিক)" : "Note / Reference (Optional)"}
            </label>
            <Input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={language === "bn" ? "যেমন: দ্বিতীয় কিস্তির বিনিয়োগ" : "e.g. 2nd round capital injection"}
              className="h-11 rounded-xl"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting || grossAmount <= 0}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 touch-target shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? language === "bn" ? "সংরক্ষণ হচ্ছে..." : "Recording..."
                  : language === "bn"
                  ? `${entryType === "INVESTMENT" ? "বিনিয়োগ" : entryType} সংরক্ষণ করুন`
                  : `Record ${entryType}`}
              </span>
            </Button>
          </div>
        </form>
      </SheetDrawer>

      {/* Edit Entry Drawer */}
      <SheetDrawer
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingEntry(null);
        }}
        title={
          language === "bn"
            ? `${partnerName}-এর লেনদেন পরিবর্তন (Edit Entry)`
            : `Edit Partner Entry: ${partnerName}`
        }
        description={
          language === "bn"
            ? "লেনদেনের পরিমাণ, গেটওয়ে বা বিবরণ পরিবর্তন করুন। ক্যাশ ও ব্যাংক ফান্ড স্বয়ংক্রিয়ভাবে আপডেট হবে।"
            : "Update amount, payment method, or note. Business cash and vault balance will sync automatically."
        }
      >
        <form onSubmit={handleUpdateEntry} className="space-y-4">
          {/* Partner Name (Fixed) */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "অংশীদারের নাম (Partner)" : "Partner Name"}
            </label>
            <input
              type="text"
              value={partnerName}
              disabled
              className="w-full h-11 px-3.5 rounded-xl border border-input bg-muted/60 text-foreground font-bold text-sm cursor-not-allowed"
            />
          </div>

          {/* Entry Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "লেনদেনের ধরন (Transaction Type)" : "Transaction Type"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEditType("INVESTMENT")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  editType === "INVESTMENT"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-600 font-bold"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <ArrowDownRight className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span className="text-[11px] block">{language === "bn" ? "বিনিয়োগ (In)" : "Investment"}</span>
              </button>

              <button
                type="button"
                onClick={() => setEditType("WITHDRAWAL")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  editType === "WITHDRAWAL"
                    ? "border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 ring-2 ring-rose-600 font-bold"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                <span className="text-[11px] block">{language === "bn" ? "উত্তোলন (Out)" : "Withdrawal"}</span>
              </button>

              <button
                type="button"
                onClick={() => setEditType("REIMBURSEMENT")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  editType === "REIMBURSEMENT"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 ring-2 ring-blue-600 font-bold"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <Receipt className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <span className="text-[11px] block">{language === "bn" ? "পরিশোধ" : "Reimburse"}</span>
              </button>
            </div>
          </div>

          {/* Business Account / Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "ব্যবসায়িক অ্যাকাউন্ট / মাধ্যম" : "Business Account / Gateway"}
            </label>
            <select
              value={editPaymentMethod}
              onChange={(e) => setEditPaymentMethod(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-input bg-card text-foreground text-sm font-medium focus:ring-2 focus:ring-teal-600"
            >
              <option value="BANK">Bank Account (সিটি / ব্র্যাক / অন্যান্য)</option>
              <option value="CASH">Cash Vault (ক্যাশ ফান্ড)</option>
              <option value="BKASH">bKash (বিকাশ মার্চেন্ট / পার্সোনাল)</option>
              <option value="NAGAD">Nagad (নগদ অ্যাকাউন্ট)</option>
            </select>
          </div>

          {/* Gross Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {editType === "INVESTMENT" && (editPaymentMethod === "BKASH" || editPaymentMethod === "NAGAD")
                ? language === "bn" ? "প্রদত্ত গ্রস টাকার পরিমাণ (Gross Sent Amount)" : "Gross Sent Amount (৳)"
                : language === "bn" ? "টাকার পরিমাণ (Amount)" : "Amount (৳)"}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">৳</span>
              <Input
                type="number"
                min="1"
                step="any"
                value={editGrossAmount || ""}
                onChange={(e) => setEditGrossAmount(Number(e.target.value))}
                placeholder="e.g. 50000"
                className="pl-8 h-11 rounded-xl text-base font-bold"
                required
              />
            </div>
          </div>

          {/* bKash / Nagad Fee Calculation Box (if investment via MFS) */}
          {editType === "INVESTMENT" && (editPaymentMethod === "BKASH" || editPaymentMethod === "NAGAD") && (
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{editPaymentMethod === "BKASH" ? "bKash Cashout Fee (1.85%)" : "Nagad Cashout Fee (1.5%)"}:</span>
                <div className="flex items-center gap-1.5">
                  <span>৳</span>
                  <input
                    type="number"
                    min="0"
                    value={editCashoutFee}
                    onChange={(e) => setEditCashoutFee(Number(e.target.value))}
                    className="w-20 h-7 px-2 rounded-lg border border-input bg-card text-foreground font-bold text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between font-black text-sm text-foreground pt-1.5 border-t border-teal-200/60 dark:border-teal-800/60">
                <span>{language === "bn" ? "ব্যবসায় জমা হওয়া নেট মূলধন" : "Net Business Capital (Equity)"}:</span>
                <span className="text-emerald-700 dark:text-emerald-300">
                  ৳ {editNetAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "তারিখ (Date)" : "Date"}
            </label>
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              {language === "bn" ? "বিবরণ / নোট (ঐচ্ছিক)" : "Note / Reference (Optional)"}
            </label>
            <Input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={editSubmitting || editGrossAmount <= 0}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 touch-target shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {editSubmitting
                  ? language === "bn" ? "পরিবর্তন সংরক্ষণ হচ্ছে..." : "Updating..."
                  : language === "bn" ? "পরিবর্তন সংরক্ষণ করুন" : "Save Changes"}
              </span>
            </Button>
          </div>
        </form>
      </SheetDrawer>
    </DashboardLayout>
  );
}
