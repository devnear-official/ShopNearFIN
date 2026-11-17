export type UserRole = "SUPER_ADMIN" | "EDITOR" | "VIEWER";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isSuperAdmin: boolean;
}

export function canManageUsers(user: SessionUser | null): boolean {
  return !!user && user.role === "SUPER_ADMIN";
}

export function canMutateData(user: SessionUser | null): boolean {
  if (!user || user.status !== "APPROVED") return false;
  return user.role === "SUPER_ADMIN" || user.role === "EDITOR";
}
