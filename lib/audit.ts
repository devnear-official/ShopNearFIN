import { AuditLog } from "@/models/AuditLog";
import { connectDB } from "./db";

export interface LogAuditParams {
  userEmail: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE_USER" | "REJECT_USER" | "STATUS_CHANGE" | "RECONCILE";
  module: "AUTH" | "USERS" | "PRODUCTS" | "ORDERS" | "EXPENSES" | "PARTNERS" | "ACCOUNTS" | "SETTINGS";
  recordId: string;
  oldValue?: any;
  newValue?: any;
  ip?: string;
}

export async function logAudit(params: LogAuditParams) {
  try {
    await connectDB();
    await AuditLog.create({
      userEmail: params.userEmail,
      action: params.action,
      module: params.module,
      recordId: params.recordId,
      oldValue: params.oldValue ? JSON.parse(JSON.stringify(params.oldValue)) : null,
      newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : null,
      ip: params.ip || "127.0.0.1",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Audit logs should never crash the main transaction if DB write fails, but keep logged
  }
}
