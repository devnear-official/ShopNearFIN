import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
  transactionNumber?: string;
  accountId: mongoose.Types.ObjectId;
  accountMethod: "CASH" | "BKASH" | "NAGAD" | "BANK";
  type: "IN" | "OUT" | "TRANSFER";
  amount: number;
  isDebit?: boolean; // True if this transaction record represents money leaving the account
  refType: "ORDER_COD" | "EXPENSE" | "INVESTMENT" | "WITHDRAWAL" | "TRANSFER" | "MANUAL";
  refId?: string;
  note?: string;
  toAccountId?: mongoose.Types.ObjectId;
  toAccountMethod?: "CASH" | "BKASH" | "NAGAD" | "BANK";
  date: Date;
  createdBy: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionNumber: {
      type: String,
      unique: true,
      sparse: true,
      default: () => `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    accountMethod: {
      type: String,
      enum: ["CASH", "BKASH", "NAGAD", "BANK"],
      required: true,
      index: true,
    },
    type: { type: String, enum: ["IN", "OUT", "TRANSFER"], required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    isDebit: { type: Boolean, default: false },
    refType: {
      type: String,
      enum: ["ORDER_COD", "EXPENSE", "INVESTMENT", "WITHDRAWAL", "TRANSFER", "MANUAL"],
      required: true,
    },
    refId: { type: String, default: "" },
    note: { type: String, default: "" },
    toAccountId: { type: Schema.Types.ObjectId, ref: "Account" },
    toAccountMethod: { type: String, enum: ["CASH", "BKASH", "NAGAD", "BANK"] },
    date: { type: Date, default: Date.now, index: true },
    createdBy: { type: String, default: "system" },
  },
  { timestamps: true }
);

TransactionSchema.index({ accountId: 1, date: -1 });

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);
