import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockMovement extends Document {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  type: "IN" | "OUT" | "RETURN";
  qty: number;
  reference: string;
  note?: string;
  date: Date;
  createdBy?: string;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    type: { type: String, enum: ["IN", "OUT", "RETURN"], required: true, index: true },
    qty: { type: Number, required: true },
    reference: { type: String, required: true }, // e.g. "Order #ORD-101" or "Wholesale Purchase"
    note: { type: String, default: "" },
    date: { type: Date, default: Date.now, index: true },
    createdBy: { type: String, default: "system" },
  },
  { timestamps: true }
);

export const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement || mongoose.model<IStockMovement>("StockMovement", StockMovementSchema);
