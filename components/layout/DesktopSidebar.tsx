"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  Wallet,
  FileBarChart,
  ShieldAlert,
  UserCog,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/orders", label: t("orders"), icon: ShoppingCart },
    { href: "/products", label: t("products"), icon: Package },
    { href: "/expenses", label: t("expenses"), icon: Receipt },
    { href: "/partners", label: t("partners"), icon: Users },
    { href: "/accounts", label: t("accounts"), icon: Wallet },
    { href: "/reports", label: t("reports"), icon: FileBarChart },
    { href: "/audit-logs", label: t("auditLogs"), icon: ShieldAlert },
    ...(user?.role === "SUPER_ADMIN"
      ? [{ href: "/users", label: t("userManagement"), icon: UserCog }]
      : []),
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-card/60 backdrop-blur-md transition-all duration-300 select-none z-30 shrink-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              SF
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-sm text-foreground tracking-tight block">
                ShopNearFin
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wider block">
                Financial Ledger
              </span>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              SF
            </div>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
            collapsed && "mx-auto mt-2"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-transform group-hover:scale-105",
                  isActive ? "text-teal-600 dark:text-teal-400 stroke-[2.2]" : "text-muted-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer User Info */}
      <div className="p-3 border-t border-border">
        {!collapsed ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() || "AD"}
              </div>
              <div className="truncate text-left leading-tight">
                <p className="text-xs font-semibold truncate text-foreground">{user?.name}</p>
                <span className="text-[10px] text-teal-600 font-semibold uppercase">{user?.role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title={t("logout")}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title={t("logout")}
            className="w-full flex items-center justify-center p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
