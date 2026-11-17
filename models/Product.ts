import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  sku: string;
  buyingPrice: number;
  sellingPrice: number;
  currentStock: number;
  lowStockLimit: number;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    buyingPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    currentStock: { type: Number, required: true, default: 0 },
    lowStockLimit: { type: Number, required: true, default: 5 },
    category: { type: String, default: "General" },
  },
  { timestamps: true }
);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
