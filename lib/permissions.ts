export type UserRole = "SUPER_ADMIN" | "EDITOR" | "VIEWER";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

export const APP_FEATURES = [
  { id: "dashboard", label: "Dashboard", labelBn: "ড্যাশবোর্ড" },
  { id: "orders", label: "Orders", labelBn: "অর্ডার ও ডেলিভারি" },
  { id: "products", label: "Products & Stock", labelBn: "পণ্য ও স্টক" },
  { id: "expenses", label: "Expenses", labelBn: "খরচ ব্যবস্থাপনা" },
  { id: "partners", label: "Partners & Equity", labelBn: "অংশীদার ও মূলধন" },
  { id: "accounts", label: "Accounts & Vaults", labelBn: "অ্যাকাউন্ট ও ফান্ড" },
  { id: "reports", label: "Reports & P&L", labelBn: "রিপোর্ট ও লাভ-ক্ষতি" },
  { id: "settings", label: "Settings", labelBn: "সেটিংস" },
] as const;

export const DEFAULT_APP_PERMISSIONS = [
  "dashboard",
  "orders",
  "products",
  "expenses",
  "partners",
  "accounts",
  "reports",
  "settings",
];

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isSuperAdmin: boolean;
  permissions?: string[];
}

export function canManageUsers(user: SessionUser | null): boolean {
  return !!user && (user.role === "SUPER_ADMIN" || user.isSuperAdmin);
}

export function canViewAuditLogs(user: SessionUser | null): boolean {
  return !!user && (user.role === "SUPER_ADMIN" || user.isSuperAdmin);
}

export function canMutateData(user: SessionUser | null): boolean {
  if (!user || user.status !== "APPROVED") return false;
  return user.role === "SUPER_ADMIN" || user.role === "EDITOR" || user.isSuperAdmin;
}

export function hasFeatureAccess(user: SessionUser | null, feature: string): boolean {
  if (!user || user.status !== "APPROVED") return false;
  // Super admin always has access to all features
  if (user.role === "SUPER_ADMIN" || user.isSuperAdmin) return true;
  // Specific restricted modules
  if (feature === "audit-logs" || feature === "users") return false;
  
  // Custom permissions assigned by Super Admin
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(feature);
  }
  // Default fallback: all regular features
  return DEFAULT_APP_PERMISSIONS.includes(feature);
}
