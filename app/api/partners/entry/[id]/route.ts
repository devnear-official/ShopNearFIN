import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { PartnersLedger } from "@/models/PartnersLedger";
import { Account } from "@/models/Account";
import { Transaction } from "@/models/Transaction";
import { getSessionFromRequest, canMutateData } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

export async function PATCH(
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

    const { id } = params;
    const body = await req.json();
    const { amount, grossAmount, cashoutFee = 0, paymentMethod, type, note, date } = body;

    if (!amount || amount <= 0) {
      return errorResponse("Amount must be greater than 0", "VALIDATION_ERROR");
    }

    await connectDB();
    const entry = await PartnersLedger.findById(id);
    if (!entry) {
      return errorResponse("Ledger entry not found", "NOT_FOUND", 404);
    }

    const oldValue = entry.toObject();
    const entryDate = date ? new Date(date) : entry.date;
    const newType = type || entry.type;
    const newMethod = paymentMethod || entry.paymentMethod;
    const finalAmount = Number(amount);
    const finalGrossAmount = grossAmount !== undefined ? Number(grossAmount) : finalAmount + (Number(cashoutFee) || 0);
    const finalCashoutFee = Number(cashoutFee) || 0;

    // 1. Update PartnersLedger
    entry.type = newType;
    entry.amount = finalAmount;
    entry.grossAmount = finalGrossAmount;
    entry.cashoutFee = finalCashoutFee;
    entry.paymentMethod = newMethod;
    if (note !== undefined) entry.note = note;
    entry.date = entryDate;
    await entry.save();

    // 2. Synchronize business Account & Transaction so Cash/Bank balances update in real-time
    let account = await Account.findOne({ methodName: newMethod });
    if (!account) {
      account = await Account.create({
        methodName: newMethod,
        openingBalance: 0,
      });
    }

    // Look for linked transaction
    let tx = await Transaction.findOne({ refId: entry._id.toString() });
    if (!tx && (oldValue.type === "INVESTMENT" || oldValue.type === "WITHDRAWAL")) {
      tx = await Transaction.findOne({
        refType: oldValue.type,
        note: { $regex: entry.partnerName, $options: "i" },
        amount: oldValue.amount,
      });
    }

    const genTxNumber = () => `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    if (newType === "INVESTMENT") {
      if (tx) {
        tx.accountId = account._id;
        tx.accountMethod = newMethod;
        tx.type = "IN";
        tx.amount = finalAmount;
        tx.isDebit = false;
        tx.refType = "INVESTMENT";
        tx.refId = entry._id.toString();
        tx.note = note || `Capital Investment by ${entry.partnerName}${finalCashoutFee > 0 ? ` (Net after ৳${finalCashoutFee} fee)` : ""}`;
        tx.date = entryDate;
        await tx.save();
      } else {
        await Transaction.create({
          transactionNumber: genTxNumber(),
          accountId: account._id,
          accountMethod: newMethod,
          type: "IN",
          amount: finalAmount,
          isDebit: false,
          refType: "INVESTMENT",
          refId: entry._id.toString(),
          note: note || `Capital Investment by ${entry.partnerName}${finalCashoutFee > 0 ? ` (Net after ৳${finalCashoutFee} fee)` : ""}`,
          date: entryDate,
          createdBy: user.email,
        });
      }
    } else if (newType === "WITHDRAWAL") {
      if (tx) {
        tx.accountId = account._id;
        tx.accountMethod = newMethod;
        tx.type = "OUT";
        tx.amount = finalAmount;
        tx.isDebit = true;
        tx.refType = "WITHDRAWAL";
        tx.refId = entry._id.toString();
        tx.note = note || `Partner Withdrawal / Drawing by ${entry.partnerName}`;
        tx.date = entryDate;
        await tx.save();
      } else {
        await Transaction.create({
          transactionNumber: genTxNumber(),
          accountId: account._id,
          accountMethod: newMethod,
          type: "OUT",
          amount: finalAmount,
          isDebit: true,
          refType: "WITHDRAWAL",
          refId: entry._id.toString(),
          note: note || `Partner Withdrawal / Drawing by ${entry.partnerName}`,
          date: entryDate,
          createdBy: user.email,
        });
      }
    } else if (newType === "REIMBURSEMENT" && tx) {
      // If changed to Reimbursement, delete the vault transaction
      await Transaction.findByIdAndDelete(tx._id);
    }

    // 3. Log Audit
    await logAudit({
      userEmail: user.email,
      action: "UPDATE",
      module: "PARTNERS",
      recordId: entry._id.toString(),
      oldValue,
      newValue: entry.toObject(),
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(entry, "Partner entry updated successfully");
  } catch (error: any) {
    console.error("Update partner entry error:", error);
    return errorResponse(error.message || "Failed to update entry", "SERVER_ERROR", 500);
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

    const { id } = params;
    await connectDB();
    const entry = await PartnersLedger.findById(id);
    if (!entry) {
      return errorResponse("Entry not found", "NOT_FOUND", 404);
    }

    const oldValue = entry.toObject();

    // 1. Delete the ledger entry
    await PartnersLedger.findByIdAndDelete(id);

    // 2. Delete the associated transaction so cash/vault balances decrease properly
    await Transaction.deleteMany({
      $or: [
        { refId: id },
        {
          refType: { $in: ["INVESTMENT", "WITHDRAWAL"] },
          note: { $regex: entry.partnerName, $options: "i" },
          amount: entry.amount,
        },
      ],
    });

    // 3. Log Audit
    await logAudit({
      userEmail: user.email,
      action: "DELETE",
      module: "PARTNERS",
      recordId: id,
      oldValue,
      ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return successResponse(null, "Entry deleted successfully and vault balance adjusted");
  } catch (error: any) {
    console.error("Delete partner entry error:", error);
    return errorResponse(error.message || "Failed to delete entry", "SERVER_ERROR", 500);
  }
}