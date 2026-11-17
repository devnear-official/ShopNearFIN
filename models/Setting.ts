import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISetting extends Document {
  businessName: string;
  currencySymbol: string;
  defaultLowStockLimit: number;
  stockOutTriggerRule: "ON_CREATED" | "ON_SHIPPED" | "ON_DELIVERED";
  couriers: string[];
  defaultDeliveryCharge: number;
  geminiApiKey?: string;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    businessName: { type: String, default: "ShopNearFin E-commerce" },
    currencySymbol: { type: String, default: "৳" },
    defaultLowStockLimit: { type: Number, default: 5 },
    stockOutTriggerRule: {
      type: String,
      enum: ["ON_CREATED", "ON_SHIPPED", "ON_DELIVERED"],
      default: "ON_SHIPPED",
    },
    couriers: {
      type: [String],
      default: ["Steadfast", "Pathao", "RedX", "Paperfly", "Other"],
    },
    defaultDeliveryCharge: { type: Number, default: 120 },
    geminiApiKey: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);
