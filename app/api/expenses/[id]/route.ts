import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Expense } from "@/models/Expense";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { expenseSchema } from "@/validators";
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
    const expense = await Expense.findById(params.id);
    if (!expense) {
      return errorResponse("Expense not found", "NOT_FOUND", 404);
    }

    return successResponse(expense);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to fetch expense", "SERVER_ERROR", 500);
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
    const parseResult = expenseSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.errors[0].message, "VALIDATION_ERROR");
    }

    await connectDB();
    const expense = await Expense.findById(params.id);
    if (!expense) {
      return errorResponse("Expense not found", "NOT_FOUND", 404);
    }

    const oldValue = expense.toObject();
    const { category, amount, paymentMethod, note, paidBy, date, attachmentUrl } = parseResult.data;

    expense.category = category;
    expense.amount = amount;
    expense.paymentMethod = paymentMethod;
    expense.note = note;
    expense.paidBy = paidBy;
    if (date) expense.date = new Date(date);
    if (attachmentUrl !== undefined) expense.attachmentUrl = attachmentUrl;

    await expense.save();

    await logAudit({
      userEmail: user.email,
      action: "UPDATE",
      module: "EXPENSES",
      recordId: expense._id.toString(),
      oldValue,
      newValue: expense.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(expense, "Expense updated successfully");
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update expense", "SERVER_ERROR", 500);
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
    const expense = await Expense.findById(params.id);
    if (!expense) {
      return errorResponse("Expense not found", "NOT_FOUND", 404);
    }

    const oldValue = expense.toObject();
    await Expense.findByIdAndDelete(params.id);

    await logAudit({
      userEmail: user.email,
      action: "DELETE",
      module: "EXPENSES",
      recordId: params.id,
      oldValue,
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(null, "Expense deleted successfully");
  } catch (error: any) {
    return errorResponse(error.message || "Failed to delete expense", "SERVER_ERROR", 500);
  }
}
