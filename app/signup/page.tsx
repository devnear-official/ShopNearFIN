"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useToast } from "@/components/ui/toast";
import { BrandLogo } from "@/components/ui/logo";

export default function SignupPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSuccess, setSuccessSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to register. Please check your inputs.");
        return;
      }

      setSuccessSuccess(true);
      toast("Account registered successfully!", "success");
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-teal-950 via-teal-900 to-background p-4 sm:p-6">
      {/* Top brand header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <BrandLogo size={32} />
          <span className="font-extrabold text-sm text-teal-100 tracking-tight">ShopNearFin</span>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto my-auto py-6">
        <Card className="rounded-3xl border-border/60 shadow-2xl backdrop-blur-xl bg-card/95">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              {language === "en" ? "Create Account" : "একাউন্ট তৈরি করুন"}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              {language === "en"
                ? "Register to access the E-commerce Financial System"
                : "ফিনান্সিয়াল সিস্টেমে যুক্ত হতে নিবন্ধন করুন"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-8">
            {successSuccess ? (
              <div className="py-6 text-center space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Registration Submitted!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Your account has been created with status <strong>PENDING</strong>. A Super Admin must approve your account and assign your permissions before you can sign in.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => router.push("/login")}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12"
                  >
                    Return to Login
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {errorMessage && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
                    {errorMessage}
                  </div>
                )}

                <div className="mb-5 p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-xs text-teal-800 dark:text-teal-300">
                  <p className="font-semibold mb-0.5">Approval Policy Note:</p>
                  <p>All new accounts are created as <strong>VIEWER (Pending)</strong> until approved by the Super Admin.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      {language === "en" ? "Full Name" : "পুরো নাম"}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Tanvir Ahmed"
                        className="pl-10 h-12 rounded-xl text-sm"
                      />
                    </div>
                  </div>

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
                        placeholder="tanvir@business.com"
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
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
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
                    {loading ? "Registering..." : language === "en" ? "Submit Registration" : "নিবন্ধন সম্পন্ন করুন"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <p className="text-xs text-muted-foreground">
                    {language === "en" ? "Already have an account?" : "ইতিমধ্যে একাউন্ট আছে?"}{" "}
                    <Link
                      href="/login"
                      className="font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 ml-1"
                    >
                      {language === "en" ? "Sign In" : "লগইন করুন"}
                    </Link>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
