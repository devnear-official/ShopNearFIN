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
  CheckSquare,
  Square,
  Lock,
  Unlock,
  Sliders,
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
import { APP_FEATURES, DEFAULT_APP_PERMISSIONS } from "@/lib/permissions";

export default function UsersPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [assignedRole, setAssignedRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [assignedStatus, setAssignedStatus] = useState<"APPROVED" | "REJECTED" | "PENDING">("APPROVED");
  const [assignedPermissions, setAssignedPermissions] = useState<string[]>(DEFAULT_APP_PERMISSIONS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== "SUPER_ADMIN" && !user.isSuperAdmin) {
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

  const openUserDrawer = (u: any) => {
    setActiveUser(u);
    setAssignedRole(u.role === "VIEWER" ? "VIEWER" : "EDITOR");
    setAssignedStatus(u.status || "PENDING");
    setAssignedPermissions(
      Array.isArray(u.permissions) && u.permissions.length > 0
        ? u.permissions
        : [...DEFAULT_APP_PERMISSIONS]
    );
  };

  const togglePermission = (featureId: string) => {
    setAssignedPermissions((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId]
    );
  };

  const selectAllPermissions = () => {
    setAssignedPermissions([...DEFAULT_APP_PERMISSIONS]);
  };

  const deselectAllPermissions = () => {
    setAssignedPermissions([]);
  };

  const handleSaveUser = async (targetStatus?: "APPROVED" | "REJECTED") => {
    if (!activeUser) return;
    setSubmitting(true);
    const finalStatus = targetStatus || assignedStatus;

    try {
      const res = await fetch(`/api/users/${activeUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: finalStatus,
          role: assignedRole,
          permissions: assignedPermissions,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to update user", "error");
        return;
      }

      if (finalStatus === "APPROVED" && activeUser.status === "REJECTED") {
        toast(
          language === "bn"
            ? `${activeUser.name}-কে পুনরায় এক্সেস প্রদান করা হয়েছে!`
            : `Access successfully restored for ${activeUser.name}!`,
          "success"
        );
      } else if (finalStatus === "REJECTED") {
        toast(
          language === "bn"
            ? `${activeUser.name}-এর এক্সেস বাতিল করা হয়েছে`
            : `User ${activeUser.name} access revoked/rejected`,
          "success"
        );
      } else {
        toast(
          language === "bn"
            ? `${activeUser.name}-এর রোল ও অনুমতি আপডেট করা হয়েছে!`
            : `User ${activeUser.name} updated successfully!`,
          "success"
        );
      }

      setActiveUser(null);
      fetchUsers();
    } catch {
      toast("Error updating user", "error");
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
              ? "Super Admin control panel: manage approval, roles, and feature-level access per user"
              : "নতুন ব্যবহারকারী অনুমোদন, রোল নির্ধারণ ও নির্দিষ্ট ফিচার এক্সেস কন্ট্রোল (সুপার এডমিন)"}
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors self-end sm:self-auto touch-target flex items-center justify-center"
          title="Refresh user list"
        >
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
        </button>
      </div>

      {/* Information Banner */}
      <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-start gap-3">
        <Shield className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 dark:text-teal-200 leading-relaxed space-y-1">
          <p className="font-bold">
            {language === "bn" ? "নিরাপত্তা ও ফিচার নিয়ন্ত্রণ:" : "Security & Granular Permission Policy:"}
          </p>
          <p>
            {language === "bn"
              ? "সুপার এডমিন যেকোনো ইউজারের রোল পরিবর্তন করতে পারেন এবং কোন কোন ফিচার তাদের স্ক্রিনে প্রদর্শিত হবে তা টিকচিহ্ন দিয়ে নির্ধারণ করতে পারেন। বাতিলকৃত (Rejected) ইউজারকেও যেকোনো সময় পুনরায় এক্সেস প্রদান করা যায়।"
              : "Super Admin can configure roles and choose exactly which modules each user sees in their navigation. Rejected users can be granted access back anytime."}
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
            {users.map((u) => {
              const isRejected = u.status === "REJECTED";
              const isPending = u.status === "PENDING";
              return (
                <Card key={u._id} className="rounded-2xl p-4 shadow-sm border bg-card space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{u.name}</h4>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/80">
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      Role: {u.role}
                    </span>
                    <span className="text-[10px]">
                      {u.permissions?.length ?? 8} Features Allowed
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border/80">
                    {isPending ? (
                      <Button
                        onClick={() => openUserDrawer(u)}
                        size="sm"
                        className="w-full h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 touch-target shadow-xs"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{language === "bn" ? "অনুমোদন ও এক্সেস দিন" : "Review & Approve"}</span>
                      </Button>
                    ) : isRejected ? (
                      <Button
                        onClick={() => openUserDrawer(u)}
                        size="sm"
                        className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 touch-target shadow-xs"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>{language === "bn" ? "পুনরায় এক্সেস দিন" : "Re-grant Access"}</span>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => openUserDrawer(u)}
                        size="sm"
                        variant="outline"
                        className="w-full h-9 rounded-xl text-xs font-bold gap-1.5 border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 touch-target"
                      >
                        <Sliders className="w-4 h-4 text-teal-600" />
                        <span>{language === "bn" ? "অনুমতি ও রোল পরিবর্তন" : "Manage Access & Role"}</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3.5 pl-4">Name</th>
                  <th className="p-3.5">Email Address</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Approval Status</th>
                  <th className="p-3.5">Allowed Features</th>
                  <th className="p-3.5">Registered Date</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => {
                  const isRejected = u.status === "REJECTED";
                  const isPending = u.status === "PENDING";
                  return (
                    <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 pl-4 font-bold text-foreground">{u.name}</td>
                      <td className="p-3.5 font-medium text-muted-foreground">{u.email}</td>
                      <td className="p-3.5 font-semibold text-teal-700 dark:text-teal-400">
                        {u.role}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {u.permissions?.length ?? 8} of {APP_FEATURES.length}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="p-3.5 pr-4 text-right">
                        {isPending ? (
                          <Button
                            onClick={() => openUserDrawer(u)}
                            size="sm"
                            className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{language === "bn" ? "অনুমোদন করুন" : "Review & Decide"}</span>
                          </Button>
                        ) : isRejected ? (
                          <Button
                            onClick={() => openUserDrawer(u)}
                            size="sm"
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>{language === "bn" ? "পুনরায় এক্সেস দিন" : "Re-grant Access"}</span>
                          </Button>
                        ) : (
                          <Button
                            onClick={() => openUserDrawer(u)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 border-teal-600/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                          >
                            <Sliders className="w-3.5 h-3.5 text-teal-600" />
                            <span>{language === "bn" ? "এক্সেস ও রোল" : "Manage Access"}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sheet Drawer: Role & Feature Access Control */}
      <SheetDrawer
        isOpen={!!activeUser}
        onClose={() => setActiveUser(null)}
        title={
          activeUser?.status === "REJECTED"
            ? language === "bn"
              ? `এক্সেস প্রদান ও অনুমতি: ${activeUser?.name}`
              : `Re-grant Access & Permissions: ${activeUser?.name}`
            : activeUser?.status === "PENDING"
            ? language === "bn"
              ? `নতুন ব্যবহারকারী অনুমোদন: ${activeUser?.name}`
              : `Authorize Account: ${activeUser?.name}`
            : language === "bn"
            ? `রোল ও ফিচার নিয়ন্ত্রণ: ${activeUser?.name}`
            : `Role & Feature Permissions: ${activeUser?.name}`
        }
        description={`Email: ${activeUser?.email} • ${
          language === "bn" ? "বর্তমান স্ট্যাটাস" : "Current Status"
        }: ${activeUser?.status} (${activeUser?.role})`}
      >
        {activeUser && (
          <div className="space-y-5">
            {/* If Rejected Banner */}
            {activeUser.status === "REJECTED" && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {language === "bn" ? "এই অ্যাকাউন্টটি বর্তমানে বাতিল/স্থগিত রয়েছে" : "This account is currently Rejected"}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    {language === "bn"
                      ? "নিচে 'অনুমোদন ও এক্সেস দিন' বাটনে ক্লিক করলেই ব্যবহারকারী সাথে সাথে নতুন নির্ধারিত রোল ও ফিচার নিয়ে লগইন করতে পারবেন।"
                      : "Click 'Grant Access & Approve' below to restore their login access with the selected role and permissions."}
                  </p>
                </div>
              </div>
            )}

            {/* 1. Role Selection */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                {language === "bn" ? "সিস্টেম রোল (Role)" : "Assign System Role"}
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
                      ? "অনুমোদিত ফিচারে নতুন ডেটা তৈরি ও পরিবর্তন করতে পারে।"
                      : "Can create & edit data in authorized features."}
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
                      ? "অনুমোদিত ফিচারের তথ্য শুধুমাত্র দেখতে পারে (Read-only)।"
                      : "Read-only access to authorized features."}
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Feature Checkboxes */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    {language === "bn" ? "ব্যবহারকারীর দৃশ্যমান ফিচারসমূহ" : "Allowed Feature Modules"}
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {language === "bn"
                      ? "যে যে ফিচারে টিক থাকবে কেবল সেগুলোই ব্যবহারকারীর সাইডবার ও স্ক্রিনে আসবে"
                      : "Select which sections will be visible to this user"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllPermissions}
                    className="text-[10px] font-bold text-teal-600 hover:underline"
                  >
                    {language === "bn" ? "সবগুলো" : "All"}
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <button
                    type="button"
                    onClick={deselectAllPermissions}
                    className="text-[10px] font-bold text-muted-foreground hover:underline"
                  >
                    {language === "bn" ? "মুছুন" : "Clear"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {APP_FEATURES.map((feat) => {
                  const checked = assignedPermissions.includes(feat.id);
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => togglePermission(feat.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors ${
                        checked
                          ? "border-teal-500/60 bg-teal-50/50 dark:bg-teal-950/30 text-foreground"
                          : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="text-xs truncate">
                        <span className="font-semibold block truncate">
                          {language === "bn" ? feat.labelBn : feat.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          /{feat.id}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Action Buttons */}
            <div className="pt-4 border-t border-border space-y-2.5">
              {activeUser.status === "PENDING" ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleSaveUser("APPROVED")}
                    disabled={submitting}
                    className="h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 touch-target shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{language === "bn" ? "অনুমোদন করুন" : "Approve Account"}</span>
                  </Button>

                  <Button
                    onClick={() => handleSaveUser("REJECTED")}
                    disabled={submitting}
                    variant="destructive"
                    className="h-12 rounded-xl font-semibold text-xs gap-1.5 touch-target"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{language === "bn" ? "বাতিল করুন" : "Reject Account"}</span>
                  </Button>
                </div>
              ) : activeUser.status === "REJECTED" ? (
                <div className="space-y-2">
                  <Button
                    onClick={() => handleSaveUser("APPROVED")}
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 touch-target shadow-sm"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>
                      {submitting
                        ? language === "bn" ? "প্রক্রিয়াকরণ হচ্ছে..." : "Granting Access..."
                        : language === "bn" ? "অনুমোদন ও এক্সেস প্রদান করুন" : "Grant Access & Approve"}
                    </span>
                  </Button>

                  <Button
                    onClick={() => handleSaveUser("REJECTED")}
                    disabled={submitting}
                    variant="outline"
                    className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:bg-muted touch-target"
                  >
                    <span>{language === "bn" ? "স্থগিত রেখে পরিবর্তন সংরক্ষণ করুন" : "Save Changes (Keep Rejected)"}</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => handleSaveUser("APPROVED")}
                    disabled={submitting}
                    className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 touch-target shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {submitting
                        ? language === "bn" ? "সংরক্ষণ হচ্ছে..." : "Saving..."
                        : language === "bn" ? "অনুমতি ও রোল সংরক্ষণ করুন" : "Save Role & Permissions"}
                    </span>
                  </Button>

                  <Button
                    onClick={() => handleSaveUser("REJECTED")}
                    disabled={submitting}
                    variant="outline"
                    className="w-full h-10 rounded-xl text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 touch-target"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{language === "bn" ? "এক্সেস স্থগিত/বাতিল করুন (Reject)" : "Revoke / Reject Access"}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetDrawer>
    </DashboardLayout>
  );
}