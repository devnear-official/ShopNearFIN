import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { Order } from "@/models/Order";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { productSchema } from "@/validators";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();

    // Self-healing: Reconcile orphan stock deductions from previously deleted orders
    try {
      const outMovements = await StockMovement.find({
        type: "OUT",
        reference: { $regex: /Order (ORD-[^\s]+)/i },
      });

      for (const sm of outMovements) {
        const match = sm.reference.match(/Order (ORD-[^\s]+)/i);
        if (match && match[1]) {
          const ordNum = match[1];
          const orderExists = await Order.exists({ orderNumber: ordNum });
          if (!orderExists) {
            // Order was deleted! Check if we already created a compensatory RETURN for this deletion
            const returnSm = await StockMovement.findOne({
              type: "RETURN",
              reference: { $regex: ordNum, $options: "i" },
            });
            if (!returnSm) {
              await Product.findByIdAndUpdate(sm.productId, {
                $inc: { currentStock: sm.qty },
              });
              await StockMovement.create({
                productId: sm.productId,
                productName: sm.productName,
                sku: sm.sku,
                type: "RETURN",
                qty: sm.qty,
                reference: `Order ${ordNum} Deleted`,
                note: `Automatically restocked orphan stock movement from deleted order ${ordNum}`,
                date: new Date(),
                createdBy: "System Reconciliation",
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Stock reconciliation error:", e);
    }
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const search = searchParams.get("search")?.trim() || "";
    const lowStockOnly = searchParams.get("lowStock") === "true";

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    if (lowStockOnly) {
      filter.$expr = { $lte: ["$currentStock", "$lowStockLimit"] };
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return successResponse({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch products", "SERVER_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!canMutateData(user)) {
      return errorResponse("Viewers cannot create products. Editor or Super Admin role required.", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const parseResult = productSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    await connectDB();
    const data = parseResult.data;

    const existing = await Product.findOne({ sku: data.sku.toUpperCase() });
    if (existing) {
      return errorResponse(`Product with SKU '${data.sku.toUpperCase()}' already exists.`, "DUPLICATE_SKU", 400);
    }

    const product = await Product.create({
      name: data.name,
      sku: data.sku.toUpperCase(),
      buyingPrice: data.buyingPrice,
      sellingPrice: data.sellingPrice,
      currentStock: data.currentStock,
      lowStockLimit: data.lowStockLimit,
      category: data.category || "General",
    });

    await logAudit({
      userEmail: user.email,
      action: "CREATE",
      module: "PRODUCTS",
      recordId: product._id.toString(),
      newValue: product.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(product, "Product created successfully", 201);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to create product", "SERVER_ERROR", 500);
  }
}
