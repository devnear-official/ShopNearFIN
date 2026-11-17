import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPartnersLedger extends Document {
  partnerName: string;
  type: "INVESTMENT" | "REIMBURSEMENT" | "WITHDRAWAL";
  amount: number;
  grossAmount?: number;
  cashoutFee?: number;
  paymentMethod: "CASH" | "BKASH" | "NAGAD" | "BANK";
  note?: string;
  date: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PartnersLedgerSchema = new Schema<IPartnersLedger>(
  {
    partnerName: { type: String, required: true, trim: true, index: true },
    type: {
      type: String,
      enum: ["INVESTMENT", "REIMBURSEMENT", "WITHDRAWAL"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    grossAmount: { type: Number },
    cashoutFee: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BKASH", "NAGAD", "BANK"],
      required: true,
    },
    note: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const PartnersLedger: Model<IPartnersLedger> =
  mongoose.models.PartnersLedger || mongoose.model<IPartnersLedger>("PartnersLedger", PartnersLedgerSchema);
