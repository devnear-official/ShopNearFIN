import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Setting } from "@/models/Setting";
import { StockMovement } from "@/models/StockMovement";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { orderSchema } from "@/validators";
import { logAudit } from "@/lib/audit";
import { withTransaction } from "@/lib/db-tx";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const status = searchParams.get("status");
    const courier = searchParams.get("courier");
    const courierRemitted = searchParams.get("courierRemitted");
    const search = searchParams.get("search")?.trim();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const filter: any = {};

    if (status && status !== "ALL") {
      filter.status = status;
    }

    if (courier && courier !== "ALL") {
      filter.courier = courier;
    }

    if (courierRemitted !== null && courierRemitted !== undefined && courierRemitted !== "") {
      filter.courierRemitted = courierRemitted === "true";
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { trackingId: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return successResponse({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch orders", "SERVER_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!canMutateData(user)) {
      return errorResponse("Viewers cannot create orders. Editor or Super Admin role required.", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const parseResult = orderSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    await connectDB();
    const data = parseResult.data;

    // Generate unique readable order number e.g. ORD-20261116-XXXX
    const countToday = await Order.countDocuments();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${(countToday + 1).toString().padStart(3, "0")}-${randomSuffix}`;

    // Calculate total amount = sum(items) + deliveryCharge - discount
    let itemsTotal = 0;
    const validatedItems = [];

    for (const item of data.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return errorResponse(`Product not found: ${item.productName}`, "PRODUCT_NOT_FOUND");
      }

      const unitCost = Number(product.buyingPrice);
      const unitPrice = Number(item.unitPrice || product.sellingPrice);
      const quantity = Number(item.quantity);

      itemsTotal += unitPrice * quantity;

      validatedItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        unitCost, // Snapshot cost
      });
    }

    const totalAmount = itemsTotal + Number(data.deliveryCharge || 0) - Number(data.discount || 0);

    const order = await Order.create({
      orderNumber,
      customerName: data.customerName,
      phone: data.phone,
      address: data.address,
      items: validatedItems,
      deliveryCharge: data.deliveryCharge,
      discount: data.discount,
      totalAmount,
      courier: data.courier,
      trackingId: data.trackingId || "",
      status: "PENDING",
      actualReceived: 0,
      courierFeeDeducted: 0,
      courierRemitted: false,
      notes: data.notes || "",
      statusHistory: [
        {
          status: "PENDING",
          changedBy: user.email,
          changedAt: new Date(),
          note: "Order created",
        },
      ],
      createdBy: user.email,
    });

    // Stock deduction if trigger rule is ON_CREATED
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});
    if (settings.stockOutTriggerRule === "ON_CREATED") {
      for (const item of validatedItems) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { currentStock: -item.quantity },
        });
        await StockMovement.create({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          type: "OUT",
          qty: item.quantity,
          reference: `Order ${orderNumber} Created`,
          note: `Stock out on order creation for ${data.customerName}`,
          date: new Date(),
          createdBy: user.email,
        });
      }
    }

    await logAudit({
      userEmail: user.email,
      action: "CREATE",
      module: "ORDERS",
      recordId: order._id.toString(),
      newValue: order.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(order, "Order created successfully", 201);
  } catch (error: any) {
    console.error("Create order error:", error);
    return errorResponse(error.message || "Failed to create order", "SERVER_ERROR", 500);
  }
}
