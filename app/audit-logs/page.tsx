"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  RotateCw,
  Eye,
  CheckCircle,
  FileCode,
  Calendar,
  User,
  ArrowRight,
  Code,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetDrawer } from "@/components/ui/sheet-drawer";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";

const MODULES = ["ALL", "AUTH", "USERS", "PRODUCTS", "ORDERS", "EXPENSES", "PARTNERS", "ACCOUNTS", "SETTINGS"] as const;

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(val: any): React.ReactNode {
  if (val === null || val === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof val === "boolean") {
    return val ? (
      <span className="text-emerald-600 font-bold">Yes</span>
    ) : (
      <span className="text-rose-600 font-bold">No</span>
    );
  }
  if (typeof val === "number") {
    return val.toLocaleString("en-IN");
  }
  if (typeof val === "object") {
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-muted-foreground">Empty</span>;
      if (val.every((item) => typeof item === "string" || typeof item === "number")) {
        return val.join(", ");
      }
      return `${val.length} items`;
    }
    return JSON.stringify(val);
  }
  return String(val);
}

function AuditDetailsContent({ log, language }: { log: any; language: string }) {
  const [showRaw, setShowRaw] = useState(false);

  const oldVal = log.oldValue;
  const newVal = log.newValue;

  // Identify changed keys when both old and new exist
  const hasBoth = oldVal && newVal && typeof oldVal === "object" && typeof newVal === "object";
  let changedKeys: string[] = [];
  let unchangedKeys: string[] = [];

  if (hasBoth) {
    const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
    allKeys.forEach((key) => {
      // Exclude internal timestamps or db fields if unchanged
      if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
        changedKeys.push(key);
      } else {
        unchangedKeys.push(key);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Metadata Card */}
      <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-muted/40 border text-xs">
        <div>
          <span className="text-[10px] text-muted-foreground block">
            {language === "bn" ? "ব্যবহারকারীর ইমেইল" : "User Email"}:
          </span>
          <span className="font-bold text-foreground truncate block">{log.userEmail}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">
            {language === "bn" ? "মডিউল ও অ্যাকশন" : "Module & Action"}:
          </span>
          <span className="font-bold text-teal-700 dark:text-teal-400">
            {log.module} • {log.action}
          </span>
        </div>
        <div className="mt-1">
          <span className="text-[10px] text-muted-foreground block">
            {language === "bn" ? "রেকর্ড আইডি" : "Record ID"}:
          </span>
          <span className="font-mono text-[11px] text-foreground truncate block">{log.recordId}</span>
        </div>
        <div className="mt-1">
          <span className="text-[10px] text-muted-foreground block">IP Address:</span>
          <span className="font-mono text-[11px] text-foreground">{log.ip}</span>
        </div>
      </div>

      {/* 1. Diff View (When both Old and New values exist) */}
      {hasBoth && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            {language === "bn" ? "কি কি পরিবর্তন করা হয়েছে" : "Fields Changed"}:
          </h4>

          {changedKeys.length === 0 ? (
            <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground">
              {language === "bn" ? "কোনো ফিল্ড পরিবর্তন হয়নি" : "No specific field differences detected."}
            </div>
          ) : (
            <div className="space-y-2">
              {changedKeys.map((key) => (
                <div
                  key={key}
                  className="p-3 rounded-xl border border-border bg-card space-y-1.5 shadow-2xs"
                >
                  <span className="text-xs font-bold text-foreground block">
                    {formatFieldName(key)}
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                    <div className="flex-1 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 line-through">
                      <span className="text-[10px] text-rose-500 block uppercase font-bold">
                        {language === "bn" ? "আগের মান" : "Before"}
                      </span>
                      {formatValue(oldVal[key])}
                    </div>

                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 self-center hidden sm:block" />

                    <div className="flex-1 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900 font-bold">
                      <span className="text-[10px] text-emerald-600 block uppercase font-bold">
                        {language === "bn" ? "নতুন মান" : "After"}
                      </span>
                      {formatValue(newVal[key])}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. New Record View (When only New value exists, e.g. CREATE / INSERT) */}
      {!oldVal && newVal && typeof newVal === "object" && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            {language === "bn" ? "সংরক্ষিত তথ্যের বিবরণ" : "Recorded Record Details"}:
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(newVal).map(([k, v]) => (
              <div
                key={k}
                className="p-2.5 rounded-xl border border-border bg-card text-xs flex flex-col justify-between"
              >
                <span className="text-[10px] text-muted-foreground block font-medium">
                  {formatFieldName(k)}:
                </span>
                <span className="font-bold text-foreground mt-0.5 break-words">
                  {formatValue(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Deleted Record View (When only Old value exists, e.g. DELETE) */}
      {oldVal && !newVal && typeof oldVal === "object" && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            {language === "bn" ? "মুছে ফেলা তথ্যের বিবরণ" : "Deleted Record Details"}:
          </h4>

          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 space-y-1.5">
            {Object.entries(oldVal).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-rose-200/50 dark:border-rose-900/50 last:border-none">
                <span className="text-muted-foreground">{formatFieldName(k)}:</span>
                <span className="font-bold text-foreground">{formatValue(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Raw JSON Toggle (Collapsed by default so regular users never see code) */}
      <div className="pt-3 border-t border-border">
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
          <span>
            {showRaw
              ? language === "bn"
                ? "কারিগরি কোড লুকান (Hide Code)"
                : "Hide Technical Code"
              : language === "bn"
              ? "ডেভেলপার ভিউ / কোড দেখুন (Show Raw JSON)"
              : "Show Technical JSON"}
          </span>
          {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showRaw && (
          <div className="mt-2 space-y-2 animate-in fade-in">
            {oldVal && (
              <div>
                <span className="text-[10px] font-mono text-rose-600 block mb-1">Old State (JSON):</span>
                <pre className="p-2.5 rounded-xl bg-muted text-[10px] font-mono overflow-x-auto max-h-40 text-foreground">
                  {JSON.stringify(oldVal, null, 2)}
                </pre>
              </div>
            )}
            {newVal && (
              <div>
                <span className="text-[10px] font-mono text-emerald-600 block mb-1">New State (JSON):</span>
                <pre className="p-2.5 rounded-xl bg-muted text-[10px] font-mono overflow-x-auto max-h-40 text-foreground">
                  {JSON.stringify(newVal, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [userEmailSearch, setUserEmailSearch] = useState("");
  const [activeLog, setActiveLog] = useState<any>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (moduleFilter !== "ALL") params.set("module", moduleFilter);
      if (userEmailSearch) params.set("userEmail", userEmailSearch);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
      }
    } catch {
      toast("Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter]);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "CREATE":
        return "delivered";
      case "UPDATE":
      case "STATUS_CHANGE":
      case "RECONCILE":
        return "shipped";
      case "APPROVE_USER":
        return "delivered";
      case "REJECT_USER":
      case "DELETE":
        return "returned";
      default:
        return "secondary";
    }
  };

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-teal-600" />
            {t("auditLogs")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Append-only immutable record of all system mutations and user actions"
              : "সকল পরিবর্তন ও অনুমোদনের অপরিবর্তনযোগ্য নিরীক্ষা ট্রেইল"}
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors self-end sm:self-auto"
          title="Refresh logs"
        >
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
        </button>
      </div>

      {/* Module Horizontal Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full max-w-full">
        {MODULES.map((m) => (
          <button
            key={m}
            onClick={() => setModuleFilter(m)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              moduleFilter === m
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {m === "ALL" ? t("all") : m}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by user email..."
            value={userEmailSearch}
            onChange={(e) => setUserEmailSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Audit Log Items */}
      {loading && logs.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Audit Logs Found"
          description="Every create, update, or approval automatically records an immutable log here."
        />
      ) : (
        <div className="space-y-3">
          {/* Mobile Stacked View (< 768px) */}
          <div className="md:hidden space-y-2.5">
            {logs.map((log) => (
              <Card
                key={log._id}
                onClick={() => setActiveLog(log)}
                className="rounded-2xl p-4 shadow-sm border hover:border-teal-400 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={getActionBadgeVariant(log.action) as any}>
                      {log.action}
                    </Badge>
                    <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                      [{log.module}]
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <span className="truncate max-w-[200px] font-medium text-foreground">
                    {log.userEmail}
                  </span>
                  <span className="text-[10px] text-teal-600 font-semibold flex items-center gap-1">
                    {language === "bn" ? "বিস্তারিত দেখুন" : "View Details"} <Eye className="w-3 h-3" />
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3.5 pl-4">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Module</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Record ID</th>
                  <th className="p-3.5">IP</th>
                  <th className="p-3.5 pr-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-muted/30">
                    <td className="p-3.5 pl-4 text-muted-foreground text-xs">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="p-3.5">
                      <Badge variant={getActionBadgeVariant(log.action) as any}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-bold text-teal-700 dark:text-teal-400">
                      {log.module}
                    </td>
                    <td className="p-3.5 font-medium text-foreground truncate max-w-[180px]">
                      {log.userEmail}
                    </td>
                    <td className="p-3.5 font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                      {log.recordId}
                    </td>
                    <td className="p-3.5 text-xs text-muted-foreground">{log.ip}</td>
                    <td className="p-3.5 pr-4 text-right">
                      <Button
                        onClick={() => setActiveLog(log)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 rounded-lg text-xs gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{language === "bn" ? "বিস্তারিত" : "Details"}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sheet Drawer: Diff & Change Details */}
      <SheetDrawer
        isOpen={!!activeLog}
        onClose={() => setActiveLog(null)}
        title={language === "bn" ? "অডিট বিবরণ ও পরিবর্তন" : "Audit Details & Changes"}
        description={`${language === "bn" ? "রেকর্ড সংরক্ষণের সময়" : "Recorded at"} ${formatDateTime(activeLog?.timestamp)}`}
      >
        {activeLog && <AuditDetailsContent log={activeLog} language={language} />}
      </SheetDrawer>
    </DashboardLayout>
  );
}
