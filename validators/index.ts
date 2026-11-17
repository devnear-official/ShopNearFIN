import { z } from "zod";

// Bangladeshi phone regex: 013, 014, 015, 016, 017, 018, 019 followed by 8 digits = 11 digits total
export const bdPhoneRegex = /^01[3-9]\d{8}$/;

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").trim(),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Please enter a valid email address").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required").trim(),
  sku: z.string().min(2, "SKU is required").trim(),
  buyingPrice: z.coerce.number().min(0, "Buying price must be positive"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be positive"),
  currentStock: z.coerce.number().int().min(0, "Current stock must be non-negative").default(0),
  lowStockLimit: z.coerce.number().int().min(1, "Low stock limit must be at least 1").default(5),
  category: z.string().optional().default("General"),
});

export const stockInSchema = z.object({
  qty: z.coerce.number().int().positive("Quantity must be greater than 0"),
  buyingPrice: z.coerce.number().min(0, "Buying price must be non-negative").optional(),
  paymentMethod: z.enum(["CASH", "BKASH", "NAGAD", "BANK"]).default("CASH"),
  paidBy: z.string().default("Business"),
  note: z.string().optional().default("Stock in from wholesale"),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  unitCost: z.coerce.number().min(0, "Unit cost must be non-negative"),
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
});

export const orderSchema = z.object({
  customerName: z.string().min(2, "Customer name is required").trim(),
  phone: z
    .string()
    .trim()
    .regex(bdPhoneRegex, "Invalid Bangladeshi phone number. Must be 11 digits starting with 01X (e.g. 01712345678)"),
  address: z.string().min(3, "Full delivery address is required").trim(),
  items: z.array(orderItemSchema).min(1, "At least one item is required in the order"),
  deliveryCharge: z.coerce.number().min(0).default(120),
  discount: z.coerce.number().min(0).default(0),
  courier: z.string().min(1).default("Steadfast"),
  trackingId: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "SHIPPED", "DELIVERED", "RETURNED", "CANCELLED"]),
  note: z.string().optional().default(""),
  returnDeliveryCharge: z.coerce.number().min(0).optional(),
});

export const courierReconcileSchema = z.object({
  actualReceived: z.coerce.number().min(0, "Actual received must be positive"),
  courierFeeDeducted: z.coerce.number().min(0, "Courier fee deducted must be positive"),
  paymentMethod: z.enum(["CASH", "BKASH", "NAGAD", "BANK"]).default("BANK"),
  note: z.string().optional().default("Courier COD settlement"),
});

export const expenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "BKASH", "NAGAD", "BANK"]),
  note: z.string().min(2, "Note/description is required").trim(),
  paidBy: z.string().min(1, "Paid by is required").trim().default("Business"),
  date: z.string().or(z.date()).optional(),
  attachmentUrl: z.string().optional().default(""),
});

export const partnerLedgerSchema = z.object({
  partnerName: z.string().min(2, "Partner name is required").trim(),
  type: z.enum(["INVESTMENT", "REIMBURSEMENT", "WITHDRAWAL"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  grossAmount: z.coerce.number().positive().optional(),
  cashoutFee: z.coerce.number().min(0).optional().default(0),
  paymentMethod: z.enum(["CASH", "BKASH", "NAGAD", "BANK"]),
  note: z.string().optional().default(""),
  date: z.string().or(z.date()).optional(),
});

export const accountTransferSchema = z.object({
  fromMethod: z.enum(["CASH", "BKASH", "NAGAD", "BANK"]),
  toMethod: z.enum(["CASH", "BKASH", "NAGAD", "BANK"]),
  amount: z.coerce.number().positive("Transfer amount must be greater than 0"),
  cashoutFee: z.coerce.number().min(0).optional().default(0),
  note: z.string().optional().default("Account transfer"),
}).refine((data) => data.fromMethod !== data.toMethod, {
  message: "Source and destination accounts must be different",
  path: ["toMethod"],
});

export const userApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]).optional().default("APPROVED"),
  role: z.enum(["EDITOR", "VIEWER", "SUPER_ADMIN"]).optional(),
  permissions: z.array(z.string()).optional(),
});

export const settingsSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  currencySymbol: z.string().default("৳"),
  defaultLowStockLimit: z.coerce.number().int().min(1),
  stockOutTriggerRule: z.enum(["ON_CREATED", "ON_SHIPPED", "ON_DELIVERED"]),
  couriers: z.array(z.string()).min(1),
  defaultDeliveryCharge: z.coerce.number().min(0),
  geminiApiKey: z.string().optional(),
});
