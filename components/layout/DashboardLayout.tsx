"use client";

import React, { useState } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { TopHeader } from "./TopHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { AiAssistant } from "@/components/ai/AiAssistant";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full max-w-[100vw] overflow-hidden bg-background">
      {/* Desktop Sidebar (>= 768px) */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 max-w-full overflow-hidden">
        {/* Top Header */}
        <TopHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Scrollable Viewport (with pb-24 on mobile to leave space for bottom nav) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 pb-28 md:pb-6 max-w-full">
          <div className="max-w-7xl mx-auto w-full space-y-5 sm:space-y-6">
            {children}
          </div>
        </main>

        {/* Mobile Fixed Bottom Nav (< 768px) & Left Hamburger Drawer */}
        <MobileBottomNav
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Global Live AI Assistant Floating Widget */}
        <AiAssistant />
      </div>
    </div>
  );
}
