import React from "react";
import { formatBDT } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface MoneyProps {
  amount: number;
  isPaisa?: boolean;
  showDecimals?: boolean;
  colorize?: boolean; // green for >0, red for <0
  className?: string;
  symbol?: string;
}

export function Money({
  amount,
  isPaisa = false,
  showDecimals = true,
  colorize = false,
  className,
  symbol = "৳ ",
}: MoneyProps) {
  const formatted = formatBDT(amount, { isPaisa, showDecimals, symbol });
  const val = Number(amount);

  let colorClass = "";
  if (colorize) {
    if (val > 0) colorClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
    else if (val < 0) colorClass = "text-rose-600 dark:text-rose-400 font-semibold";
    else colorClass = "text-muted-foreground";
  }

  return (
    <span className={cn("tabular-nums inline-block text-right font-medium tracking-tight", colorClass, className)}>
      {formatted}
    </span>
  );
}
