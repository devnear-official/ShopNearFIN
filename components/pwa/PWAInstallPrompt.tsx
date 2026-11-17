"use client";

import React, { useState, useEffect } from "react";
import { Download, Share, PlusSquare, CheckCircle, X, Smartphone } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already in standalone display mode (installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // If iOS and not standalone, it can be added to home screen
    if (isIOSDevice) {
      setIsInstallable(true);
    }

    // Listen for Chrome/Edge/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (isInstalled) return;

    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback for browsers without beforeinstallprompt or desktop
      alert("To install this app, tap your browser's menu (⋮) and select 'Install app' or 'Add to Home screen'.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (err) {
      console.error("PWA install error:", err);
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    showIOSInstructions,
    setShowIOSInstructions,
    installApp,
  };
}

export function PWAInstallModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const isBn = language === "bn";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              SF
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {isBn ? "অ্যাপ ইনস্টল করুন" : "Install ShopNearFin"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isBn ? "মোবাইলের হোম স্ক্রিনে যুক্ত করুন" : "Add to Phone Home Screen"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full touch-target flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isBn
              ? "iPhone বা iPad এ ব্রাউজারের মাধ্যমে সহজে অ্যাপটি হোম স্ক্রিনে ইনস্টল করুন:"
              : "To install this app on iPhone or iPad Safari:"}
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
              <div className="w-7 h-7 rounded-xl bg-teal-600/10 text-teal-600 flex items-center justify-center shrink-0 font-bold text-xs">
                1
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Share className="w-3.5 h-3.5 text-teal-600" />
                  {isBn ? "Share বাটনে ট্যাপ করুন" : "Tap the Share button"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isBn ? "Safari এর নিচের বারে অবস্থিত শেয়ার আইকন" : "Located at the bottom bar in Safari"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
              <div className="w-7 h-7 rounded-xl bg-teal-600/10 text-teal-600 flex items-center justify-center shrink-0 font-bold text-xs">
                2
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <PlusSquare className="w-3.5 h-3.5 text-teal-600" />
                  {isBn ? "'Add to Home Screen' বেছে নিন" : "Select 'Add to Home Screen'"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isBn ? "তালিকা স্ক্রোল করে 'Add to Home Screen' এ চাপুন" : "Scroll down and tap 'Add to Home Screen'"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
              <div className="w-7 h-7 rounded-xl bg-teal-600/10 text-teal-600 flex items-center justify-center shrink-0 font-bold text-xs">
                3
              </div>
              <div className="text-xs">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
                  {isBn ? "'Add' বাটনে ট্যাপ করুন" : "Tap 'Add' in top right"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isBn ? "অ্যাপটি আপনার ফোনের হোম স্ক্রিনে সেভ হয়ে যাবে" : "The app icon will now appear on your phone screen"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full mt-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-2.5"
        >
          {isBn ? "বুঝেছি / সম্পন্ন" : "Got it"}
        </Button>
      </div>
    </div>
  );
}
