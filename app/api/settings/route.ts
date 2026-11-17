import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Setting } from "@/models/Setting";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { settingsSchema } from "@/validators";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    await connectDB();
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        businessName: "ShopNearFin E-commerce",
        currencySymbol: "৳",
        defaultLowStockLimit: 5,
        stockOutTriggerRule: "ON_SHIPPED",
        couriers: ["Steadfast", "Pathao", "RedX", "Paperfly", "Other"],
        defaultDeliveryCharge: 120,
      });
    }

    return successResponse(settings);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch settings", "SERVER_ERROR", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (!canMutateData(user)) {
      return errorResponse("Permission denied. Editor or Super Admin required.", "FORBIDDEN", 403);
    }

    const body = await req.json();
    const parseResult = settingsSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    await connectDB();
    let settings = await Setting.findOne();
    const oldValue = settings ? settings.toObject() : null;

    if (!settings) {
      settings = new Setting(parseResult.data);
    } else {
      Object.assign(settings, parseResult.data);
    }
    await settings.save();

    await logAudit({
      userEmail: user.email,
      action: "UPDATE",
      module: "SETTINGS",
      recordId: settings._id.toString(),
      oldValue,
      newValue: settings.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(settings, "Settings saved successfully");
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update settings", "SERVER_ERROR", 500);
  }
}
