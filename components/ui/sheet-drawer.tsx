"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string; // desktop max width e.g. "max-w-xl"
}

export function SheetDrawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  maxWidth = "max-w-lg",
}: SheetDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Content: Bottom sheet on mobile, centered rounded dialog on desktop */}
      <div
        className={cn(
          "relative z-50 w-full bg-card text-card-foreground shadow-2xl transition-all duration-300 ease-out",
          // Mobile: bottom sheet with safe area and pull handle
          "rounded-t-3xl max-h-[90vh] flex flex-col",
          // Tablet / Desktop: centered modal
          `sm:rounded-2xl sm:max-h-[85vh] sm:${maxWidth} sm:m-4`,
          className
        )}
      >
        {/* Mobile Pull Indicator */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors touch-target flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}
