import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number; // Snapshot of cost at order creation time
}

export interface IStatusHistory {
  status: "PENDING" | "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELLED";
  changedBy: string;
  changedAt: Date;
  note?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  items: IOrderItem[];
  deliveryCharge: number;
  discount: number;
  totalAmount: number; // Items total + delivery - discount
  courier: "Steadfast" | "Pathao" | "RedX" | "Other" | string;
  trackingId?: string;
  status: "PENDING" | "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELLED";
  actualReceived: number; // Money remitted by courier
  courierFeeDeducted: number; // Courier charge / COD charge deducted
  courierRemitted: boolean;
  reconciliationNote?: string;
  statusHistory: IStatusHistory[];
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      enum: ["PENDING", "SHIPPED", "DELIVERED", "RETURNED", "CANCELLED"],
      required: true,
    },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    items: { type: [OrderItemSchema], required: true },
    deliveryCharge: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true },
    courier: { type: String, required: true, default: "Steadfast" },
    trackingId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["PENDING", "SHIPPED", "DELIVERED", "RETURNED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    actualReceived: { type: Number, default: 0 },
    courierFeeDeducted: { type: Number, default: 0 },
    courierRemitted: { type: Boolean, default: false },
    reconciliationNote: { type: String, default: "" },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    notes: { type: String, default: "" },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1, courierRemitted: 1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
