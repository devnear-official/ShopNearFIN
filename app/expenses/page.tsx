"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Search,
  RotateCw,
  Building,
  User,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  Edit,
  Trash2,
  Calendar,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
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

const DEFAULT_CATEGORIES = ["ADS", "PACKAGING", "PURCHASE", "RETURN_LOSS", "OTHER"];
const PAYMENT_METHODS = ["CASH", "BKASH", "NAGAD", "BANK"] as const;

export default function ExpensesPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Available categories list (combining defaults + any custom from records)
  const [categoriesList, setCategoriesList] = useState<string[]>(DEFAULT_CATEGORIES);

  // Create/Edit Expense Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [category, setCategory] = useState("ADS");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("BKASH");
  const [paidBy, setPaidBy] = useState("Business");
  const [note, setNote] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data.expenses);
        setTotalAmount(json.data.totalAmount);

        // Collect unique categories
        const dynamicCats = new Set<string>(DEFAULT_CATEGORIES);
        json.data.expenses.forEach((e: any) => {
          if (e.category) dynamicCats.add(e.category);
        });
        setCategoriesList(Array.from(dynamicCats));
      }
    } catch {
      toast("Failed to load expenses", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast("Please select an image file (PNG, JPG, WEBP)", "error");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Image upload failed", "error");
        return;
      }

      setAttachmentUrl(json.data.url);
      toast(
        json.data.isLocal
          ? "Receipt uploaded locally. Set Cloudinary credentials in .env.local for Cloudinary."
          : "Receipt uploaded to Cloudinary successfully!",
        "success"
      );
    } catch {
      toast("Failed to upload image", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreateModal = () => {
    setEditingExpenseId(null);
    setCategory("ADS");
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setAmount(0);
    setPaymentMethod("BKASH");
    setPaidBy("Business");
    setNote("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setAttachmentUrl("");
    setCreateModalOpen(true);
  };

  const openEditModal = (expense: any) => {
    setEditingExpenseId(expense._id);
    if (DEFAULT_CATEGORIES.includes(expense.category)) {
      setCategory(expense.category);
      setIsCustomCategory(false);
      setCustomCategoryInput("");
    } else {
      setIsCustomCategory(true);
      setCustomCategoryInput(expense.category);
    }
    setAmount(expense.amount);
    setPaymentMethod(expense.paymentMethod);
    setPaidBy(expense.paidBy);
    setNote(expense.note);
    setExpenseDate(expense.date ? new Date(expense.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setAttachmentUrl(expense.attachmentUrl || "");
    setCreateModalOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string, expenseNote: string) => {
    if (!confirm(`Are you sure you want to delete expense "${expenseNote}"?`)) return;

    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to delete expense", "error");
        return;
      }
      toast("Expense deleted successfully", "success");
      fetchExpenses();
    } catch {
      toast("Error deleting expense", "error");
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const finalCategory = isCustomCategory
      ? customCategoryInput.trim().toUpperCase().replace(/\s+/g, "_")
      : category;

    if (!finalCategory) {
      toast("Please enter a category name", "error");
      setSubmitting(false);
      return;
    }

    try {
      const url = editingExpenseId ? `/api/expenses/${editingExpenseId}` : "/api/expenses";
      const method = editingExpenseId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: finalCategory,
          amount: Number(amount),
          paymentMethod,
          paidBy: paidBy.trim(),
          note: note.trim(),
          date: expenseDate ? new Date(expenseDate) : new Date(),
          attachmentUrl: attachmentUrl.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to save expense", "error");
        return;
      }

      toast(
        editingExpenseId
          ? "Expense updated successfully!"
          : paidBy !== "Business"
          ? `Expense recorded & credited to ${paidBy}'s payable reimbursement balance!`
          : "Expense recorded successfully",
        "success"
      );
      setCreateModalOpen(false);
      setEditingExpenseId(null);
      setAmount(0);
      setNote("");
      setAttachmentUrl("");
      setIsCustomCategory(false);
      setCustomCategoryInput("");
      fetchExpenses();
    } catch {
      toast("Error saving expense", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "ADS":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "PACKAGING":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "PURCHASE":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "RETURN_LOSS":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "OTHER":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800";
    }
  };

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-teal-600" />
            {t("expenses")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Track business operating costs, ads, packaging, custom categories, and partner reimbursements"
              : "বিজ্ঞাপন, প্যাকেজিং, কাস্টম ক্যাটাগরি ও পার্টনারের ব্যক্তিগত খরচ দাবি"}
          </p>
        </div>

        {canMutateData(user) && (
          <Button
            onClick={openCreateModal}
            size="sm"
            className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5 hidden sm:flex shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Expense</span>
          </Button>
        )}
      </div>

      {/* Category Horizontal Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full max-w-full">
        <button
          onClick={() => setCategoryFilter("ALL")}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
            categoryFilter === "ALL"
              ? "bg-teal-700 text-white shadow-sm"
              : "bg-card border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {t("all")}
        </button>
        {categoriesList.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              categoryFilter === c
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Search and Summary */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by expense note/vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchExpenses()}
            className="pl-10 h-10 rounded-xl text-xs w-full"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-muted/40 border">
            Total: <span className="font-bold text-foreground"><Money amount={totalAmount} /></span>
          </div>

          <button
            onClick={fetchExpenses}
            className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors touch-target flex items-center justify-center"
            title="Refresh list"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Expenses List */}
      {loading && expenses.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          title="No Expenses Recorded"
          description="Log operational expenses like Facebook ads, courier packaging, custom categories, or office supplies."
          actionLabel={canMutateData(user) ? "+ Add Expense" : undefined}
          onAction={canMutateData(user) ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {/* Mobile Stacked Cards (< 768px) with Tap to Expand */}
          <div className="md:hidden space-y-3">
            {expenses.map((e) => {
              const isExpanded = expandedId === e._id;
              return (
                <Card
                  key={e._id}
                  onClick={() => setExpandedId(isExpanded ? null : e._id)}
                  className="rounded-2xl p-4 shadow-sm border border-border/80 bg-card cursor-pointer transition-all active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(e.category)}`}>
                          {e.category.replace(/_/g, " ")}
                        </span>
                        {e.attachmentUrl && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-semibold">
                            <ImageIcon className="w-3 h-3 text-teal-600" /> Receipt
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-foreground mt-1.5 truncate">
                        {e.note}
                      </h4>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-rose-600 dark:text-rose-400 block">
                        <Money amount={e.amount} />
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(e.date)}
                      </span>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2.5 pt-2 border-t border-border/60">
                    <div className="flex items-center gap-1 truncate max-w-[200px]">
                      {e.paidBy === "Business" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-400 truncate">
                          <Building className="w-3 h-3 shrink-0" /> Business
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 truncate">
                          <User className="w-3 h-3 shrink-0" /> {e.paidBy}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-1">({e.paymentMethod})</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-teal-600">
                      <span>{isExpanded ? "Hide" : "Details"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Expanded Details View */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2.5 text-xs animate-in fade-in">
                      <div className="p-2.5 rounded-xl bg-muted/40 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="font-bold text-foreground">{e.category.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment Method:</span>
                          <span className="font-medium text-foreground">{e.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Paid By:</span>
                          <span className="font-medium text-foreground">{e.paidBy}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Recorded By:</span>
                          <span className="font-medium text-foreground">{e.createdBy || "System"}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[11px] mb-0.5">Description / Reason:</span>
                        <p className="text-xs font-medium text-foreground bg-background p-2.5 rounded-xl border border-border">
                          {e.note}
                        </p>
                      </div>

                      {e.attachmentUrl && (
                        <div className="mt-2">
                          <span className="text-muted-foreground block text-[11px] mb-1">Receipt / Proof:</span>
                          <a
                            href={e.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(evt) => evt.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View Uploaded Receipt
                          </a>
                        </div>
                      )}

                      {/* Action buttons on Mobile expanded view */}
                      {canMutateData(user) && (
                        <div className="flex items-center gap-2 pt-2 border-t mt-3">
                          <Button
                            onClick={(evt) => {
                              evt.stopPropagation();
                              openEditModal(e);
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1 text-teal-700 border-teal-600/30"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit Expense
                          </Button>
                          <Button
                            onClick={(evt) => {
                              evt.stopPropagation();
                              handleDeleteExpense(e._id, e.note);
                            }}
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 rounded-xl text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop Table (>= 768px) */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3.5 pl-4">Date</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Description / Note</th>
                  <th className="p-3.5">Paid By</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Receipt</th>
                  <th className="p-3.5 text-right">Amount (৳)</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {expenses.map((e) => (
                  <tr key={e._id} className="hover:bg-muted/30">
                    <td className="p-3.5 pl-4 text-muted-foreground whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryColor(e.category)}`}>
                        {e.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-foreground max-w-sm truncate">{e.note}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      {e.paidBy === "Business" ? (
                        <span className="text-xs text-muted-foreground">Business</span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                          {e.paidBy} (Reimbursable)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-xs text-muted-foreground font-medium">{e.paymentMethod}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      {e.attachmentUrl ? (
                        <a
                          href={e.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 text-xs font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      <Money amount={e.amount} />
                    </td>
                    <td className="p-3.5 pr-4 text-right space-x-1.5 whitespace-nowrap">
                      {canMutateData(user) && (
                        <>
                          <Button
                            onClick={() => openEditModal(e)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 rounded-lg text-xs"
                            title="Edit Expense"
                          >
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteExpense(e._id, e.note)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAB for Mobile */}
      {canMutateData(user) && (
        <FAB onClick={openCreateModal} label="New Expense" />
      )}

      {/* Sheet Drawer: Record / Edit Expense */}
      <SheetDrawer
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingExpenseId ? "Edit Expense Entry" : "Record New Expense"}
        description="Choose expense category, amount, date, payment method, description, and upload receipt image."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          {/* Category Selector with Custom Category Support */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-teal-600" /> Category *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-[11px] font-semibold text-teal-600 hover:underline"
              >
                {isCustomCategory ? "Select Standard Category" : "+ Add New Category"}
              </button>
            </div>

            {isCustomCategory ? (
              <div className="space-y-1.5">
                <Input
                  type="text"
                  required
                  placeholder="e.g. UTILITY, OFFICE_RENT, INFLUENCER..."
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  className="h-11 font-medium"
                />
                <p className="text-[10px] text-muted-foreground">
                  Enter custom category name for why you are expanding (e.g. Rent, Influencer fee, Food, Software).
                </p>
              </div>
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
              >
                <option value="ADS">ADS (Facebook/Google Ads Boosting)</option>
                <option value="PACKAGING">PACKAGING (Boxes, Tape, Poly bags)</option>
                <option value="PURCHASE">PURCHASE (Wholesale Inventory Restock)</option>
                <option value="RETURN_LOSS">RETURN_LOSS (Customer Return Charges)</option>
                <option value="OTHER">OTHER (Office, Courier bills, Miscellaneous)</option>
                {categoriesList
                  .filter((c) => !DEFAULT_CATEGORIES.includes(c))
                  .map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Expense Amount (৳) *
              </label>
              <Input
                type="number"
                min="1"
                required
                placeholder="e.g. 3500"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="h-11 text-base font-bold text-rose-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Expense Date *
              </label>
              <Input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="h-11 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Paid By *
            </label>
            <Input
              type="text"
              required
              placeholder="'Business' or partner name (e.g. Rahim)"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="h-11"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Note: If paid by a Partner personal account, it will automatically credit that partner's <strong>Payable Reimbursement</strong> balance.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Description / Reason for Expense *
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Winter campaign ad boosting on Meta / Office internet bill"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Receipt Image Upload (Cloudinary with local fallback) */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Receipt / Bill Image (Cloudinary)
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-input hover:border-teal-600 bg-muted/20 cursor-pointer transition-colors touch-target">
                <Upload className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-medium text-foreground">
                  {uploadingImage ? "Uploading to Cloud..." : "Choose Image (Voucher / Memo)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>

              {attachmentUrl && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Check className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="truncate font-medium text-foreground">{attachmentUrl}</span>
                  </div>
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 dark:text-teal-300 font-bold shrink-0 ml-2"
                  >
                    Preview
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting || uploadingImage}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm"
            >
              {submitting ? "Saving..." : "Record Expense"}
            </Button>
          </div>
        </form>
      </SheetDrawer>
    </DashboardLayout>
  );
}
