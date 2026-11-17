import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpense extends Document {
  category: string; // Dynamic or standard: ADS, PACKAGING, PURCHASE, RETURN_LOSS, OTHER or custom
  amount: number;
  paymentMethod: "CASH" | "BKASH" | "NAGAD" | "BANK";
  note: string;
  paidBy: string; // Business or Partner Name
  date: Date;
  attachmentUrl?: string;
  referenceId?: string; // e.g. orderId for return loss
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    category: {
      type: String,
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BKASH", "NAGAD", "BANK"],
      required: true,
      index: true,
    },
    note: { type: String, required: true },
    paidBy: { type: String, required: true, default: "Business" },
    date: { type: Date, default: Date.now, index: true },
    attachmentUrl: { type: String, default: "" },
    referenceId: { type: String, default: "" },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: -1 });

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
