"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sun,
  Moon,
  Globe,
  Plus,
  ShieldCheck,
  Search,
  CheckCircle,
  Download,
  Menu,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { usePWAInstall, PWAInstallModal } from "@/components/pwa/PWAInstallPrompt";
import { cn } from "@/lib/utils";

export function TopHeader({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const {
    isInstallable,
    isInstalled,
    showIOSInstructions,
    setShowIOSInstructions,
    installApp,
  } = usePWAInstall();

  useEffect(() => {
    // Check initial dark mode from system or html class
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const getPageTitle = () => {
    if (pathname === "/dashboard") return t("dashboard");
    if (pathname.startsWith("/orders")) return t("orders");
    if (pathname.startsWith("/products")) return t("products");
    if (pathname.startsWith("/expenses")) return t("expenses");
    if (pathname.startsWith("/partners")) return t("partners");
    if (pathname.startsWith("/accounts")) return t("accounts");
    if (pathname.startsWith("/reports")) return t("reports");
    if (pathname.startsWith("/audit-logs")) return t("auditLogs");
    if (pathname.startsWith("/users")) return t("userManagement");
    if (pathname.startsWith("/settings")) return t("settings");
    return "ShopNearFin";
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between max-w-full">
      {/* Left: Hamburger (Mobile) + Brand Icon + Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-colors touch-target flex items-center justify-center shrink-0"
          title="Open Menu"
        >
          <Menu className="w-5 h-5 text-foreground stroke-[2.2]" />
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            SF
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-lg font-bold text-foreground leading-tight truncate">
            {getPageTitle()}
          </h1>
          <p className="hidden sm:block text-[11px] text-muted-foreground truncate">
            E-commerce Financial System
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* PWA Install Button (shown if installable or not standalone) */}
        {!isInstalled && (
          <button
            onClick={installApp}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-teal-600/10 hover:bg-teal-600/20 text-teal-700 dark:text-teal-300 border border-teal-600/30 transition-all touch-target active:scale-95 shadow-sm"
            title="Install Mobile App"
          >
            <Download className="w-4 h-4 animate-bounce shrink-0" />
            <span className="hidden xs:inline sm:inline leading-none">
              {language === "bn" ? "ইনস্টল" : "Install"}
            </span>
          </button>
        )}

        {/* Language Toggle (EN / বাং) */}
        <button
          onClick={() => setLanguage(language === "en" ? "bn" : "en")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-input bg-background/50 hover:bg-accent text-foreground transition-all touch-target"
          title="Toggle Language (English / বাংলা)"
        >
          <Globe className="w-3.5 h-3.5 text-teal-600" />
          <span>{language === "en" ? "বাংলা" : "EN"}</span>
        </button>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target flex items-center justify-center"
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      <PWAInstallModal
        open={showIOSInstructions}
        onClose={() => setShowIOSInstructions(false)}
      />
    </header>
  );
}
