import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { productSchema } from "@/validators";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();
    const product = await Product.findById(params.id);
    if (!product) {
      return errorResponse("Product not found", "NOT_FOUND", 404);
    }

    const movements = await StockMovement.find({ productId: product._id })
      .sort({ date: -1 })
      .limit(50);

    return successResponse({ product, movements });
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch product", "SERVER_ERROR", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!canMutateData(user)) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const parseResult = productSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    await connectDB();
    const product = await Product.findById(params.id);
    if (!product) {
      return errorResponse("Product not found", "NOT_FOUND", 404);
    }

    const oldValue = product.toObject();
    const data = parseResult.data;

    product.name = data.name;
    product.sku = data.sku.toUpperCase();
    product.buyingPrice = data.buyingPrice;
    product.sellingPrice = data.sellingPrice;
    product.currentStock = data.currentStock;
    product.lowStockLimit = data.lowStockLimit;
    if (data.category) product.category = data.category;

    await product.save();

    await logAudit({
      userEmail: user.email,
      action: "UPDATE",
      module: "PRODUCTS",
      recordId: product._id.toString(),
      oldValue,
      newValue: product.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(product, "Product updated successfully");
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update product", "SERVER_ERROR", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!canMutateData(user)) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    await connectDB();
    const product = await Product.findById(params.id);
    if (!product) {
      return errorResponse("Product not found", "NOT_FOUND", 404);
    }

    const oldValue = product.toObject();
    await Product.findByIdAndDelete(params.id);

    await logAudit({
      userEmail: user.email,
      action: "DELETE",
      module: "PRODUCTS",
      recordId: params.id,
      oldValue,
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(null, "Product deleted successfully");
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete product", "SERVER_ERROR", 500);
  }
}
