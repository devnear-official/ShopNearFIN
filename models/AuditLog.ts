import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  userEmail: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE_USER" | "REJECT_USER" | "STATUS_CHANGE" | "RECONCILE";
  module: "AUTH" | "USERS" | "PRODUCTS" | "ORDERS" | "EXPENSES" | "PARTNERS" | "ACCOUNTS" | "SETTINGS";
  recordId: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ip?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userEmail: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "APPROVE_USER", "REJECT_USER", "STATUS_CHANGE", "RECONCILE"],
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: ["AUTH", "USERS", "PRODUCTS", "ORDERS", "EXPENSES", "PARTNERS", "ACCOUNTS", "SETTINGS"],
      required: true,
      index: true,
    },
    recordId: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: "127.0.0.1" },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AuditLogSchema.index({ timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
