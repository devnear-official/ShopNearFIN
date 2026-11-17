import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAccount extends Document {
  methodName: "CASH" | "BKASH" | "NAGAD" | "BANK";
  accountNumber?: string;
  bankName?: string;
  openingBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    methodName: {
      type: String,
      enum: ["CASH", "BKASH", "NAGAD", "BANK"],
      required: true,
      unique: true,
      index: true,
    },
    accountNumber: { type: String, default: "" },
    bankName: { type: String, default: "" },
    openingBalance: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const Account: Model<IAccount> =
  mongoose.models.Account || mongoose.model<IAccount>("Account", AccountSchema);
