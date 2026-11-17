"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABProps {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function FAB({ onClick, label = "New", icon, className }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed right-4 bottom-24 z-40 sm:hidden flex items-center justify-center gap-2",
        "bg-primary text-primary-foreground shadow-xl shadow-teal-700/35 border border-white/20",
        "h-14 px-5 rounded-full font-bold text-sm transition-all active:scale-95 touch-target",
        className
      )}
      aria-label={label}
    >
      {icon || <Plus className="w-5 h-5 stroke-[2.5]" />}
      <span>{label}</span>
    </button>
  );
}
