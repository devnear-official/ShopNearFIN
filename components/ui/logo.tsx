import React from "react";
import Image from "next/image";

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function BrandLogo({ size = 36, className = "", showText = false }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-sm ring-1 ring-teal-500/30"
        style={{ width: size, height: size }}
      >
        <Image
          src="/icons/icon-192x192.png"
          alt="ShopNearFin Logo"
          width={size}
          height={size}
          priority
          className="w-full h-full object-cover"
        />
      </div>

      {showText && (
        <div className="leading-tight">
          <span className="font-extrabold text-sm text-foreground tracking-tight block">
            ShopNearFin
          </span>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wider block">
            Financial Ledger
          </span>
        </div>
      )}
    </div>
  );
}
