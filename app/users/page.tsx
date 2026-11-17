"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserCog,
  CheckCircle2,
  XCircle,
  RotateCw,
  Shield,
  Clock,
  UserCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetDrawer } from "@/components/ui/sheet-drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

export default function UsersPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [assignedRole, setAssignedRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.users);
      }
    } catch {
      toast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (status: "APPROVED" | "REJECTED") => {
    if (!activeUser) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/users/${activeUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          role: assignedRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Approval update failed", "error");
        return;
      }

      toast(`User ${activeUser.name} marked as ${status}!`, "success");
      setActiveUser(null);
      fetchUsers();
    } catch {
      toast("Error processing approval", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!activeUser) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/users/${activeUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: assignedRole,
          status: activeUser.status || "APPROVED",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to update role", "error");
        return;
      }

      toast(`User ${activeUser.name}'s role updated to ${assignedRole}!`, "success");
      setActiveUser(null);
      fetchUsers();
    } catch {
      toast("Error updating role", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-teal-600" />
            {t("userManagement")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Super Admin approval gate: authorize pending signups & assign roles"
              : "নতুন ব্যবহারকারীদের অনুমোদন প্রদান ও অনুমতি নির্ধারণ (সুপার এডমিন)"}
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors self-end sm:self-auto"
          title="Refresh user list"
        >
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
        </button>
      </div>

      {/* Information Banner */}
      <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-start gap-3">
        <Shield className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
          <p className="font-bold">Security Enforcement Rule:</p>
          <p>
            When a user signs up, their account remains in <strong>PENDING</strong> status until you approve them and assign their role (<strong>EDITOR</strong> can manage orders/expenses, while <strong>VIEWER</strong> is read-only).
          </p>
        </div>
      </div>

      {/* Users List */}
      {loading && users.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title="No Users Registered"
          description="Newly registered partners or employees will appear here for your approval."
        />
      ) : (
        <div className="space-y-3">
          {/* Mobile Stacked Cards (< 768px) */}
          <div className="md:hidden space-y-2.5">
            {users.map((u) => (
              <Card key={u._id} className="rounded-2xl p-4 shadow-sm border">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{u.name}</h4>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                  <StatusBadge status={u.status} />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-2.5 border-t border-border/80">
                  <span className="font-semibold text-teal-700 dark:text-teal-400">
                    Role: {u.role}
                  </span>
                  <span className="text-[10px]">Registered: {formatDate(u.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/80">
                  {u.status === "PENDING" ? (
                    <Button
                      onClick={() => {
                        setActiveUser(u);
                        setAssignedRole(u.role === "VIEWER" ? "EDITOR" : u.role);
                      }}
                      size="sm"
                      className="w-full h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 touch-target shadow-xs"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{language === "bn" ? "অনুমোদন ও রোল নির্ধারণ" : "Review & Approve"}</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setActiveUser(u);
                        setAssignedRole(u.role);
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full h-9 rounded-xl text-xs font-bold gap-1.5 border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 touch-target"
                    >
                      <UserCog className="w-4 h-4 text-teal-600" />
                      <span>{language === "bn" ? "রোল পরিবর্তন করুন" : "Change Role"}</span>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3.5 pl-4">Name</th>
                  <th className="p-3.5">Email Address</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Approval Status</th>
                  <th className="p-3.5">Registered Date</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-muted/30">
                    <td className="p-3.5 pl-4 font-bold text-foreground">{u.name}</td>
                    <td className="p-3.5 font-medium text-muted-foreground">{u.email}</td>
                    <td className="p-3.5 font-semibold text-teal-700 dark:text-teal-400">
                      {u.role}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="p-3.5 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="p-3.5 pr-4 text-right">
                      {u.status === "PENDING" ? (
                        <Button
                          onClick={() => {
                            setActiveUser(u);
                            setAssignedRole("EDITOR");
                          }}
                          size="sm"
                          className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "অনুমোদন করুন" : "Review & Decide"}</span>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setActiveUser(u);
                            setAssignedRole(u.role);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                        >
                          <UserCog className="w-3.5 h-3.5 text-teal-600" />
                          <span>{language === "bn" ? "রোল পরিবর্তন" : "Change Role"}</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sheet Drawer: Approve / Reject / Role Selection */}
      <SheetDrawer
        isOpen={!!activeUser}
        onClose={() => setActiveUser(null)}
        title={
          activeUser?.status === "PENDING"
            ? language === "bn"
              ? `অ্যাকাউন্ট অনুমোদন: ${activeUser?.name}`
              : `Authorize Account: ${activeUser?.name}`
            : language === "bn"
            ? `রোল পরিবর্তন: ${activeUser?.name}`
            : `Change Role: ${activeUser?.name}`
        }
        description={`Email: ${activeUser?.email} • ${
          language === "bn" ? "বর্তমান রোল" : "Current Role"
        }: ${activeUser?.role}`}
      >
        {activeUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                {language === "bn" ? "নতুন রোল নির্বাচন করুন" : "Assign System Role"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignedRole("EDITOR")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    assignedRole === "EDITOR"
                      ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="font-bold text-xs block text-foreground">EDITOR</span>
                  <span className="text-[10px] text-muted-foreground block mt-1 leading-snug">
                    {language === "bn"
                      ? "অর্ডার তৈরি, স্টক ইন ও খরচ রেকর্ড করতে পারে।"
                      : "Can create & edit orders, stock, expenses, and partner ledgers."}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignedRole("VIEWER")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    assignedRole === "VIEWER"
                      ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="font-bold text-xs block text-foreground">VIEWER</span>
                  <span className="text-[10px] text-muted-foreground block mt-1 leading-snug">
                    {language === "bn"
                      ? "শুধুমাত্র ড্যাশবোর্ড, রিপোর্ট ও অডিট দেখতে পারে।"
                      : "Read-only access to dashboard, reports, and audit logs."}
                  </span>
                </button>
              </div>
            </div>

            {activeUser.status === "PENDING" ? (
              <div className="grid grid-cols-2 gap-3 pt-3">
                <Button
                  onClick={() => handleApprove("APPROVED")}
                  disabled={submitting}
                  className="h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 touch-target shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === "bn" ? "অনুমোদন করুন" : "Approve Account"}</span>
                </Button>

                <Button
                  onClick={() => handleApprove("REJECTED")}
                  disabled={submitting}
                  variant="destructive"
                  className="h-12 rounded-xl font-semibold text-xs gap-1.5 touch-target"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{language === "bn" ? "বাতিল করুন" : "Reject Account"}</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                <Button
                  onClick={handleUpdateRole}
                  disabled={submitting || assignedRole === activeUser.role}
                  className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 touch-target shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {submitting
                      ? language === "bn"
                        ? "সংরক্ষণ হচ্ছে..."
                        : "Updating..."
                      : language === "bn"
                      ? "রোল পরিবর্তন সংরক্ষণ করুন"
                      : `Save Role as ${assignedRole}`}
                  </span>
                </Button>

                <Button
                  onClick={() => handleApprove("REJECTED")}
                  disabled={submitting}
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 touch-target"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{language === "bn" ? "এক্সেস স্থগিত করুন (Revoke Access)" : "Revoke Access"}</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetDrawer>
    </DashboardLayout>
  );
}
