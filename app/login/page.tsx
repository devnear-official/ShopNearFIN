"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, Globe, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, setLanguage } = useLanguage();
  const { refreshUser } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to sign in. Please verify your credentials.");
        return;
      }

      toast("Signed in successfully!", "success");
      await refreshUser();
      const redirectUrl = searchParams.get("from") || "/dashboard";
      window.location.href = redirectUrl;
    } catch (err: any) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-teal-950 via-teal-900 to-background p-4 sm:p-6">
      {/* Top bar with language toggle */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500 text-teal-950 font-black text-sm flex items-center justify-center">
            SF
          </div>
          <span className="font-extrabold text-sm text-teal-100 tracking-tight">ShopNearFin</span>
        </div>
        <button
          onClick={() => setLanguage(language === "en" ? "bn" : "en")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-900/60 border border-teal-700/50 text-teal-200 text-xs font-semibold hover:bg-teal-800/80 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === "en" ? "বাংলা" : "EN"}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <Card className="rounded-3xl border-border/60 shadow-2xl backdrop-blur-xl bg-card/95">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              {language === "en" ? "Welcome Back" : "স্বাগতম"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              {language === "en"
                ? "E-commerce Financial Ledger System"
                : "ই-কমার্স ফিনান্সিয়াল লেজার সিস্টেম"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-8">
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="leading-relaxed font-medium">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {language === "en" ? "Email Address" : "ইমেইল এড্রেস"}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="pl-10 h-12 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  {language === "en" ? "Password" : "পাসওয়ার্ড"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-11 h-12 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white mt-2 shadow-md shadow-teal-700/20"
              >
                {loading ? "Signing In..." : language === "en" ? "Sign In" : "লগইন করুন"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                {language === "en" ? "New partner or employee?" : "নতুন একাউন্ট প্রয়োজন?"}{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 ml-1"
                >
                  {language === "en" ? "Register Account" : "রেজিস্ট্রেশন করুন"}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center py-2 text-[11px] text-muted-foreground">
        Secure Financial Management &bull; Built for Bangladeshi Online Businesses
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-teal-950 flex items-center justify-center text-teal-200 text-sm font-semibold">
          Loading login portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
