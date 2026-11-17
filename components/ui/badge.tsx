import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        // Status colors specified by design system
        pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
        shipped: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
        delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
        returned: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
        cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700",
        teal: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  switch (s) {
    case "PENDING":
      return <Badge variant="pending">Pending</Badge>;
    case "SHIPPED":
      return <Badge variant="shipped">Shipped</Badge>;
    case "DELIVERED":
      return <Badge variant="delivered">Delivered</Badge>;
    case "RETURNED":
      return <Badge variant="returned">Returned</Badge>;
    case "CANCELLED":
      return <Badge variant="cancelled">Cancelled</Badge>;
    case "APPROVED":
      return <Badge variant="delivered">Approved</Badge>;
    case "REJECTED":
      return <Badge variant="returned">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export { Badge, badgeVariants };
