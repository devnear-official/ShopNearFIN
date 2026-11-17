import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { StockMovement } from "../models/StockMovement";
import { Order } from "../models/Order";
import { Expense } from "../models/Expense";
import { Account } from "../models/Account";
import { Transaction } from "../models/Transaction";
import { PartnersLedger } from "../models/PartnersLedger";
import { Setting } from "../models/Setting";
import { AuditLog } from "../models/AuditLog";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/shopnearfin";

async function seed() {
  console.log("Connecting to MongoDB for seeding...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB at:", MONGODB_URI);

  // Clear existing collections
  console.log("Clearing existing collections...");
  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    StockMovement.deleteMany({}),
    Order.deleteMany({}),
    Expense.deleteMany({}),
    Account.deleteMany({}),
    Transaction.deleteMany({}),
    PartnersLedger.deleteMany({}),
    Setting.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // 1. Create Default Settings
  console.log("Creating default settings...");
  await Setting.create({
    businessName: "ShopNearFin BD (E-commerce Finance)",
    currencySymbol: "৳",
    defaultLowStockLimit: 5,
    stockOutTriggerRule: "ON_SHIPPED",
    couriers: ["Steadfast", "Pathao", "RedX", "Paperfly", "Other"],
    defaultDeliveryCharge: 120,
  });

  // 2. Create Initial Users
  console.log("Creating initial users...");
  const salt = await bcrypt.genSalt(10);
  const editorHash = await bcrypt.hash("Editor@2026", salt);
  const viewerHash = await bcrypt.hash("Viewer@2026", salt);

  const editorUser = await User.create({
    name: "Tariqul Islam (Editor)",
    email: "editor@shopnearfin.com",
    passwordHash: editorHash,
    role: "EDITOR",
    status: "APPROVED",
  });

  const pendingUser = await User.create({
    name: "Kamrul Hasan (Pending)",
    email: "kamrul@shopnearfin.com",
    passwordHash: viewerHash,
    role: "VIEWER",
    status: "PENDING",
  });

  // 3. Setup Accounts & Initial Balances
  console.log("Setting up financial accounts...");
  const cashAccount = await Account.create({ methodName: "CASH", openingBalance: 25000 });
  const bkashAccount = await Account.create({ methodName: "BKASH", openingBalance: 45000 });
  const nagadAccount = await Account.create({ methodName: "NAGAD", openingBalance: 30000 });
  const bankAccount = await Account.create({
    methodName: "BANK",
    openingBalance: 150000,
    bankName: "City Bank",
    accountNumber: "1503928174001",
  });

  // 4. Record 5 Partner Investments
  console.log("Recording 5-Partner capital investments...");
  const partners = [
    { name: "Rahim Ahmed", amount: 300000, method: "BANK", note: "Primary founder seed capital" },
    { name: "Karim Chowdhury", amount: 250000, method: "BANK", note: "Co-founder capital tranche 1" },
    { name: "Tanvir Rahman", amount: 200000, method: "BANK", note: "Operations & tech investment" },
    { name: "Sajib Mahmud", amount: 150000, method: "BANK", note: "Logistics investment" },
    { name: "Nafis Imtiaz", amount: 100000, method: "BANK", note: "Marketing seed tranche" },
  ];

  for (const p of partners) {
    const entry = await PartnersLedger.create({
      partnerName: p.name,
      type: "INVESTMENT",
      amount: p.amount,
      paymentMethod: p.method,
      note: p.note,
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      createdBy: "superadmin@shopnearfin.com",
    });

    await Transaction.create({
      accountId: bankAccount._id,
      accountMethod: "BANK",
      type: "IN",
      amount: p.amount,
      isDebit: false,
      refType: "INVESTMENT",
      refId: entry._id.toString(),
      note: `Capital Investment by ${p.name}`,
      date: entry.date,
      createdBy: "superadmin@shopnearfin.com",
    });
  }

  // Also add 1 Partner Reimbursement
  const reimbEntry = await PartnersLedger.create({
    partnerName: "Rahim Ahmed",
    type: "REIMBURSEMENT",
    amount: 15000,
    paymentMethod: "BKASH",
    note: "Paid for Facebook boosting from personal dual-currency card",
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    createdBy: "superadmin@shopnearfin.com",
  });

  // 5. Create Catalog Products
  console.log("Adding catalog products...");
  const productData = [
    {
      name: "Smart Watch Ultra 2 with AMOLED Display",
      sku: "SW-ULTRA2-SLV",
      buyingPrice: 1650,
      sellingPrice: 2850,
      currentStock: 34,
      lowStockLimit: 5,
      category: "Wearables",
    },
    {
      name: "TWS Wireless Earbuds Pro ANC",
      sku: "TWS-EARBUD-BLK",
      buyingPrice: 850,
      sellingPrice: 1750,
      currentStock: 3, // LOW STOCK ALERT
      lowStockLimit: 5,
      category: "Audio",
    },
    {
      name: "Premium Linen Casual Shirt (Navy Blue)",
      sku: "SHIRT-LIN-NVY-L",
      buyingPrice: 620,
      sellingPrice: 1290,
      currentStock: 48,
      lowStockLimit: 10,
      category: "Men's Fashion",
    },
    {
      name: "Magnetic 10,000mAh Fast Power Bank",
      sku: "PB-MAG10K-WHT",
      buyingPrice: 1100,
      sellingPrice: 1990,
      currentStock: 2, // LOW STOCK ALERT
      lowStockLimit: 6,
      category: "Mobile Accessories",
    },
    {
      name: "Ergonomic Aluminium Laptop Stand",
      sku: "ACC-LPTSTND-GRY",
      buyingPrice: 750,
      sellingPrice: 1450,
      currentStock: 22,
      lowStockLimit: 5,
      category: "Office Gear",
    },
  ];

  const createdProducts = [];
  for (const prod of productData) {
    const p = await Product.create(prod);
    createdProducts.push(p);

    await StockMovement.create({
      productId: p._id,
      productName: p.name,
      sku: p.sku,
      type: "IN",
      qty: p.currentStock + 10,
      reference: "Initial Wholesale Batch",
      note: "Catalog initialization",
      date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      createdBy: "editor@shopnearfin.com",
    });
  }

  // 6. Create Realistic Orders
  console.log("Creating orders with various statuses...");
  const sampleOrders = [
    {
      orderNumber: "ORD-202611-001",
      customerName: "Mahmudul Hasan",
      phone: "01712345678",
      address: "House 24, Road 7, Dhanmondi, Dhaka",
      items: [
        {
          productId: createdProducts[0]._id,
          productName: createdProducts[0].name,
          sku: createdProducts[0].sku,
          quantity: 1,
          unitPrice: 2850,
          unitCost: 1650,
        },
      ],
      deliveryCharge: 80,
      discount: 0,
      totalAmount: 2930,
      courier: "Steadfast",
      status: "DELIVERED",
      actualReceived: 2810,
      courierFeeDeducted: 120,
      courierRemitted: true,
      reconciliationNote: "Remitted to City Bank via batch remittance",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      orderNumber: "ORD-202611-002",
      customerName: "Sadia Rahman",
      phone: "01823456789",
      address: "Flat 4B, Green Road, Farmgate, Dhaka",
      items: [
        {
          productId: createdProducts[1]._id,
          productName: createdProducts[1].name,
          sku: createdProducts[1].sku,
          quantity: 2,
          unitPrice: 1750,
          unitCost: 850,
        },
      ],
      deliveryCharge: 80,
      discount: 100,
      totalAmount: 3480,
      courier: "Pathao",
      status: "DELIVERED",
      actualReceived: 0,
      courierFeeDeducted: 0,
      courierRemitted: false, // PENDING REMITTANCE!
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      orderNumber: "ORD-202611-003",
      customerName: "Zubair Al Mamun",
      phone: "01934567890",
      address: "Holding 12, Station Road, Sylhet",
      items: [
        {
          productId: createdProducts[2]._id,
          productName: createdProducts[2].name,
          sku: createdProducts[2].sku,
          quantity: 2,
          unitPrice: 1290,
          unitCost: 620,
        },
        {
          productId: createdProducts[4]._id,
          productName: createdProducts[4].name,
          sku: createdProducts[4].sku,
          quantity: 1,
          unitPrice: 1450,
          unitCost: 750,
        },
      ],
      deliveryCharge: 150,
      discount: 0,
      totalAmount: 4180,
      courier: "Steadfast",
      status: "DELIVERED",
      actualReceived: 0,
      courierFeeDeducted: 0,
      courierRemitted: false, // PENDING REMITTANCE!
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      orderNumber: "ORD-202611-004",
      customerName: "Fahim Shahriar",
      phone: "01645678901",
      address: "Chawkbazar, Chittagong",
      items: [
        {
          productId: createdProducts[3]._id,
          productName: createdProducts[3].name,
          sku: createdProducts[3].sku,
          quantity: 1,
          unitPrice: 1990,
          unitCost: 1100,
        },
      ],
      deliveryCharge: 150,
      discount: 50,
      totalAmount: 2090,
      courier: "RedX",
      status: "SHIPPED",
      actualReceived: 0,
      courierFeeDeducted: 0,
      courierRemitted: false,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      orderNumber: "ORD-202611-005",
      customerName: "Nusrat Jahan",
      phone: "01756789012",
      address: "KDA Avenue, Khulna",
      items: [
        {
          productId: createdProducts[0]._id,
          productName: createdProducts[0].name,
          sku: createdProducts[0].sku,
          quantity: 1,
          unitPrice: 2850,
          unitCost: 1650,
        },
      ],
      deliveryCharge: 150,
      discount: 0,
      totalAmount: 3000,
      courier: "Steadfast",
      status: "PENDING",
      actualReceived: 0,
      courierFeeDeducted: 0,
      courierRemitted: false,
      createdAt: new Date(),
    },
    {
      orderNumber: "ORD-202611-006",
      customerName: "Anisur Rahman",
      phone: "01867890123",
      address: "Rajshahi Sadar, Rajshahi",
      items: [
        {
          productId: createdProducts[1]._id,
          productName: createdProducts[1].name,
          sku: createdProducts[1].sku,
          quantity: 1,
          unitPrice: 1750,
          unitCost: 850,
        },
      ],
      deliveryCharge: 150,
      discount: 0,
      totalAmount: 1900,
      courier: "Pathao",
      status: "RETURNED",
      actualReceived: 0,
      courierFeeDeducted: 0,
      courierRemitted: false,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const o of sampleOrders) {
    await Order.create({
      ...o,
      statusHistory: [
        {
          status: "PENDING",
          changedBy: "editor@shopnearfin.com",
          changedAt: o.createdAt,
          note: "Order created",
        },
        ...(o.status !== "PENDING"
          ? [
              {
                status: o.status,
                changedBy: "editor@shopnearfin.com",
                changedAt: new Date(o.createdAt.getTime() + 24 * 60 * 60 * 1000),
                note: `Marked as ${o.status}`,
              },
            ]
          : []),
      ],
      createdBy: "editor@shopnearfin.com",
    });
  }

  // 7. Create Realistic Expenses
  console.log("Creating expenses across categories...");
  const sampleExpenses = [
    {
      category: "ADS",
      amount: 18500,
      paymentMethod: "BKASH",
      note: "Facebook Meta Ad boosting campaign (November Winter Sale)",
      paidBy: "Rahim Ahmed", // Partner Reimbursement!
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      category: "PACKAGING",
      amount: 4200,
      paymentMethod: "CASH",
      note: "500 pcs custom branded poly bags & bubble wraps",
      paidBy: "Business",
      date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      category: "RETURN_LOSS",
      amount: 300,
      paymentMethod: "CASH",
      note: "Return delivery loss for Order ORD-202611-006 (Pathao round-trip)",
      paidBy: "Business",
      date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      category: "OTHER",
      amount: 3500,
      paymentMethod: "BANK",
      note: "High-speed optical fiber internet & office tea/snacks",
      paidBy: "Business",
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const exp of sampleExpenses) {
    const createdExp = await Expense.create({
      ...exp,
      createdBy: "editor@shopnearfin.com",
    });

    if (exp.paidBy === "Business") {
      const acc =
        exp.paymentMethod === "CASH"
          ? cashAccount
          : exp.paymentMethod === "BKASH"
          ? bkashAccount
          : exp.paymentMethod === "NAGAD"
          ? nagadAccount
          : bankAccount;

      await Transaction.create({
        accountId: acc._id,
        accountMethod: exp.paymentMethod,
        type: "OUT",
        amount: exp.amount,
        isDebit: true,
        refType: "EXPENSE",
        refId: createdExp._id.toString(),
        note: `Expense: ${exp.category} - ${exp.note}`,
        date: exp.date,
        createdBy: "editor@shopnearfin.com",
      });
    }
  }

  // 8. Create Initial Audit Logs
  console.log("Recording initial audit logs...");
  await AuditLog.create({
    userEmail: "superadmin@shopnearfin.com",
    action: "CREATE",
    module: "PARTNERS",
    recordId: "SEED_INIT",
    newValue: { message: "5-Partner capital ledger initialized with ৳10,00,000" },
    ip: "127.0.0.1",
    timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  });

  await AuditLog.create({
    userEmail: "superadmin@shopnearfin.com",
    action: "APPROVE_USER",
    module: "USERS",
    recordId: editorUser._id.toString(),
    newValue: { email: editorUser.email, role: "EDITOR", status: "APPROVED" },
    ip: "127.0.0.1",
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  });

  console.log("\n========================================================");
  console.log("Database successfully seeded with 5-partner demo data!");
  console.log("========================================================");
  console.log("SUPER ADMIN (ENV Based):");
  console.log("  Email:    superadmin@shopnearfin.com");
  console.log("  Password: SuperAdmin@2026");
  console.log("\nAPPROVED EDITOR:");
  console.log("  Email:    editor@shopnearfin.com");
  console.log("  Password: Editor@2026");
  console.log("\nPENDING USER (for approval testing):");
  console.log("  Email:    kamrul@shopnearfin.com");
  console.log("  Password: Viewer@2026");
  console.log("========================================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
