"use client";

import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, RotateCw, CheckCircle2, Sparkles, Eye, EyeOff, ExternalLink } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { canMutateData } from "@/lib/permissions";

export default function SettingsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("ShopNearFin E-commerce");
  const [currencySymbol, setCurrencySymbol] = useState("৳");
  const [defaultLowStockLimit, setDefaultLowStockLimit] = useState(5);
  const [stockOutTriggerRule, setStockOutTriggerRule] = useState<"ON_CREATED" | "ON_SHIPPED" | "ON_DELIVERED">("ON_SHIPPED");
  const [couriersText, setCouriersText] = useState("Steadfast, Pathao, RedX, Paperfly, Other");
  const [defaultDeliveryCharge, setDefaultDeliveryCharge] = useState(120);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        const s = json.data;
        setBusinessName(s.businessName || "ShopNearFin E-commerce");
        setCurrencySymbol(s.currencySymbol || "৳");
        setDefaultLowStockLimit(s.defaultLowStockLimit || 5);
        setStockOutTriggerRule(s.stockOutTriggerRule || "ON_SHIPPED");
        setCouriersText(s.couriers?.join(", ") || "Steadfast, Pathao, RedX, Paperfly, Other");
        setDefaultDeliveryCharge(s.defaultDeliveryCharge || 120);
        setGeminiApiKey(s.geminiApiKey || "");
      }
    } catch {
      toast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const couriers = couriersText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          currencySymbol,
          defaultLowStockLimit: Number(defaultLowStockLimit),
          stockOutTriggerRule,
          couriers,
          defaultDeliveryCharge: Number(defaultDeliveryCharge),
          geminiApiKey: geminiApiKey.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to update settings", "error");
        return;
      }

      toast("System settings updated successfully!", "success");
    } catch {
      toast("Error updating settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-teal-600" />
            {t("settings")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Configure business metadata, stock-out rules, couriers and thresholds"
              : "ব্যবসার তথ্য, স্টক ছাড়করণ নিয়মাবলী ও কুরিয়ার সেটিংস"}
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors self-end sm:self-auto"
          title="Refresh settings"
        >
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-3xl" />
      ) : (
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          {!canMutateData(user) && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 font-medium">
              {language === "bn"
                ? "আপনি বর্তমানে ভিউয়ার (VIEWER) রোলে আছেন। সেটিংস পরিবর্তন করার অনুমতি শুধুমাত্র এডিটর ও সুপার এডমিনের রয়েছে।"
                : "You are currently viewing settings in read-only mode (VIEWER role). Only Editors and Super Admins can modify settings."}
            </div>
          )}

          <Card className="rounded-3xl border shadow-sm p-6 bg-card space-y-4">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base font-bold">General Business Settings</CardTitle>
              <CardDescription className="text-xs">
                Branding and default operational values
              </CardDescription>
            </CardHeader>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Business Organization Name
              </label>
              <Input
                type="text"
                required
                disabled={!canMutateData(user)}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Currency Symbol
                </label>
                <Input
                  type="text"
                  required
                  disabled={!canMutateData(user)}
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Default Delivery Charge (৳)
                </label>
                <Input
                  type="number"
                  min="0"
                  required
                  disabled={!canMutateData(user)}
                  value={defaultDeliveryCharge}
                  onChange={(e) => setDefaultDeliveryCharge(parseFloat(e.target.value) || 0)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="pt-2 border-t">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Stock-Out Inventory Trigger Rule
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                <button
                  type="button"
                  disabled={!canMutateData(user)}
                  onClick={() => setStockOutTriggerRule("ON_CREATED")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    stockOutTriggerRule === "ON_CREATED"
                      ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600"
                      : "border-border bg-card"
                  } ${!canMutateData(user) ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  <span className="font-bold text-xs block text-foreground">On Order Created</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Deducts warehouse stock immediately when an order is created.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!canMutateData(user)}
                  onClick={() => setStockOutTriggerRule("ON_SHIPPED")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    stockOutTriggerRule === "ON_SHIPPED"
                      ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600"
                      : "border-border bg-card"
                  } ${!canMutateData(user) ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  <span className="font-bold text-xs block text-foreground">On Shipped (Default)</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Deducts warehouse stock the moment the order is marked SHIPPED.
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!canMutateData(user)}
                  onClick={() => setStockOutTriggerRule("ON_DELIVERED")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    stockOutTriggerRule === "ON_DELIVERED"
                      ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600"
                      : "border-border bg-card"
                  } ${!canMutateData(user) ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  <span className="font-bold text-xs block text-foreground">On Delivered</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Deducts stock only after the customer physically receives the parcel.
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Default Low Stock Alert Threshold
                </label>
                <Input
                  type="number"
                  min="1"
                  required
                  disabled={!canMutateData(user)}
                  value={defaultLowStockLimit}
                  onChange={(e) => setDefaultLowStockLimit(parseInt(e.target.value) || 5)}
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Couriers (Comma-separated)
                </label>
                <Input
                  type="text"
                  required
                  disabled={!canMutateData(user)}
                  value={couriersText}
                  onChange={(e) => setCouriersText(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>Google Gemini AI Assistant API Key</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-medium"
                >
                  <span>Get Free Key from Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  disabled={!canMutateData(user)}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="h-11 pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Used to power the live AI Financial & Inventory Assistant. You can also define it in <code className="bg-muted px-1 py-0.5 rounded text-[10px]">.env.local</code> as <code className="bg-muted px-1 py-0.5 rounded text-[10px]">GEMINI_API_KEY</code>.
              </p>
            </div>

            {canMutateData(user) && (
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
                </Button>
              </div>
            )}
          </Card>
        </form>
      )}
    </DashboardLayout>
  );
}
