"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Menu,
  Users,
  Wallet,
  FileBarChart,
  ShieldAlert,
  UserCog,
  Settings,
  LogOut,
  X,
  Download,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePWAInstall, PWAInstallModal } from "@/components/pwa/PWAInstallPrompt";
import { hasFeatureAccess } from "@/lib/permissions";
import { BrandLogo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export function MobileBottomNav({
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const { user, logout } = useAuth();
  const [internalMoreOpen, setInternalMoreOpen] = useState(false);
  const {
    isInstallable,
    isInstalled,
    showIOSInstructions,
    setShowIOSInstructions,
    installApp,
  } = usePWAInstall();

  const isDrawerOpen = mobileMenuOpen !== undefined ? mobileMenuOpen : internalMoreOpen;
  const setDrawerOpen = setMobileMenuOpen || setInternalMoreOpen;

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.isSuperAdmin;

  const candidateMainItems = [
    { key: "dashboard", href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { key: "orders", href: "/orders", label: t("orders"), icon: ShoppingCart },
    { key: "products", href: "/products", label: t("products"), icon: Package },
    { key: "expenses", href: "/expenses", label: t("expenses"), icon: Receipt },
    { key: "partners", href: "/partners", label: t("partners"), icon: Users },
  ];

  const mainNavItems = candidateMainItems
    .filter((item) => hasFeatureAccess(user, item.key))
    .slice(0, 5);

  const candidateMoreItems = [
    { key: "dashboard", href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { key: "orders", href: "/orders", label: t("orders"), icon: ShoppingCart },
    { key: "products", href: "/products", label: t("products"), icon: Package },
    { key: "expenses", href: "/expenses", label: t("expenses"), icon: Receipt },
    { key: "partners", href: "/partners", label: t("partners"), icon: Users },
    { key: "accounts", href: "/accounts", label: t("accounts"), icon: Wallet },
    { key: "reports", href: "/reports", label: t("reports"), icon: FileBarChart },
    ...(isSuperAdmin
      ? [
          { key: "audit-logs", href: "/audit-logs", label: t("auditLogs"), icon: ShieldAlert },
          { key: "users", href: "/users", label: t("userManagement"), icon: UserCog },
        ]
      : []),
    { key: "settings", href: "/settings", label: t("settings"), icon: Settings },
  ];

  const moreNavItems = candidateMoreItems.filter((item) => {
    if (item.key === "audit-logs" || item.key === "users") return isSuperAdmin;
    return hasFeatureAccess(user, item.key);
  });

  return (
    <>
      {/* Fixed Bottom Navigation Bar on Mobile (< 768px) with 5 direct icons */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16 px-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1.5 touch-target transition-all active:scale-95",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] mt-1 truncate max-w-[64px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Top Left Hamburger Slide-over Navigation Sheet on Mobile */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-50 w-[82vw] max-w-xs bg-card h-full border-r border-border shadow-2xl p-5 pb-safe flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-300">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <div className="flex items-center gap-2.5">
                  <BrandLogo size={36} />
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground">ShopNearFin</h3>
                    <p className="text-[11px] text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-full touch-target flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation items inside mobile drawer */}
              <div className="space-y-1">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]",
                        isActive
                          ? "bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4 space-y-2">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 text-xs font-semibold touch-target transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("logout")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <PWAInstallModal
        open={showIOSInstructions}
        onClose={() => setShowIOSInstructions(false)}
      />
    </>
  );
}
