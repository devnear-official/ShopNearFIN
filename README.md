# 5-Partner E-commerce Finance System

A production-ready, fintech-grade web application built for a Bangladeshi online business run by 5 partners. Designed mobile-first to look and feel like a native mobile app on phones (iOS notch and home indicator safe, bottom navigation bar, bottom sheets, FAB, stacked cards with tap-to-expand) and a responsive dashboard on desktop and tablet screens.

---

## 🌟 Key Features

1. **Mobile-First UX & Design System**:
   - Fixed mobile bottom navigation with quick access to Dashboard, Orders, Products, Expenses, and a "More" drawer.
   - Bottom sheets (drawers) for forms and status updates on mobile; centered modals on desktop.
   - Floating Action Buttons (FAB) for rapid additions on mobile.
   - Deep teal fintech branding (`#0F766E` / `hsl(175, 77%, 26%)`), clean card layouts (`rounded-2xl` / `rounded-3xl`), soft shadows.
   - Bilingual support: **English** and **বাংলা (Bangla)** instant toggle (saved in cookie).
   - Light and Dark mode with system default detection.
   - Bangladeshi numbering format for all currency figures (`৳ 12,34,567.89`) with monospaced tabular numbers.
   - PWA support with `manifest.json` and service worker (`sw.js`).

2. **Roles & Approval Flow**:
   - **SUPER ADMIN**: Credentials come **ONLY from environment variables** (`SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`). Has full privileges and access to the User Management approval portal.
   - **EDITOR**: Can view reports and create/edit orders, stock, expenses, and partner ledgers.
   - **VIEWER (Default for new signups)**: Read-only access to dashboard, reports, and audit logs.
   - **Pending Approval Gate**: Newly registered accounts start as `PENDING`. They cannot log in until approved by the Super Admin in the User Management console.

3. **5-Partner Equity & Auto Profit Split**:
   - **Equity % Calculation**: `(Partner Total Investment / Total Capital) × 100`.
   - **Reimbursement**: When a partner spends personal money for business expenses (e.g. ad boosting), it is automatically credited to that partner's *Payable Balance*.
   - **Drawings/Withdrawals**: Records capital or profit withdrawals and debits the account.
   - **Automated Profit Split Table**: Live calculation of Net Profit and each partner's share for any chosen month or period.

4. **Product Inventory & Stock-Out Rules**:
   - Inventory tracking with SKU, buying price, selling price, current stock, and low stock threshold alerts.
   - **Stock In**: Adds inventory and automatically creates a `PURCHASE` expense and cashflow debit.
   - **Automatic Stock-Out**: Deducts stock automatically when an order is marked `SHIPPED` (or `DELIVERED`, configurable in Settings).
   - **Return to Stock**: Restocks items automatically upon marking an order `RETURNED`.
   - **Stock Movement History**: Full history of movements per product.

5. **Orders & Courier COD Reconciliation**:
   - Bangladeshi phone number validation (`013-019XXXXXXXX`, 11 digits).
   - Snapshot of item cost at order creation time for accurate historical COGS calculations.
   - Status transition flow: `PENDING → SHIPPED → DELIVERED / RETURNED / CANCELLED`.
   - **Return Loss Calculation**: Automatically records round-trip delivery charges as a `RETURN_LOSS` expense when an order is returned.
   - **Courier Reconciliation**: When courier remits funds, records actual received amount, deducts courier/COD charges, marks parcel as remitted, and deposits into the chosen ledger account.

6. **Accounts & Strict Cashflow Ledger**:
   - 4 Accounts: `CASH`, `BKASH`, `NAGAD`, `BANK`.
   - Balances are computed directly from ledger transactions (`Opening + In − Out ± Transfers`), never directly edited.
   - Inter-account fund transfers.

7. **Reports & Exports**:
   - Profit & Loss (P&L) statement for any custom date range.
   - Export to **PDF** (via jsPDF) and **CSV**.
   - Print-friendly layout (`@media print`).

8. **Immutable Audit Trail**:
   - Append-only audit logs capturing every creation, status change, reconciliation, and user approval with old/new state diffs and IP addresses. No edit or delete routes exist.

---

## 📐 Core Business Formulas

- **Cost of Goods Sold (COGS)**:
  $$\text{COGS} = \sum (\text{unit\_cost} \times \text{quantity})\quad \text{for DELIVERED orders only}$$
- **Gross Profit**:
  $$\text{Gross Profit} = \text{Total Delivered Sales} - \text{COGS}$$
- **Net Profit**:
  $$\text{Net Profit} = \text{Gross Profit} - (\text{Ads} + \text{Packaging} + \text{Return Delivery Loss} + \text{Other Operating Expenses})$$
- **Partner Equity %**:
  $$\text{Partner Equity \%} = \frac{\text{Partner Total Investment}}{\text{Total All Investment}} \times 100$$
- **Partner Profit Share**:
  $$\text{Partner Profit Share} = \text{Net Profit} \times \text{Equity \%}$$
- **Courier Pending Balance**:
  $$\text{Courier Pending Balance} = \sum (\text{Expected COD})\quad \text{for DELIVERED orders where courier\_remitted} = \text{false}$$
- **Account Ledger Balance**:
  $$\text{Account Balance} = \text{Opening Balance} + \text{Total In} - \text{Total Out} \pm \text{Transfers}$$

---

## 🚀 Setup & Local Installation

### Prerequisites
- Node.js 18+ (tested on Node v24)
- Local MongoDB instance or MongoDB Atlas cluster URI

### 1. Clone & Install Dependencies
```bash
cd ShopNearFin
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and set your credentials:
```bash
cp .env.example .env.local
```
Inside `.env.local`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/shopnearfin
JWT_SECRET=super-secret-jwt-key-change-this-in-production-min-32-chars
SUPERADMIN_EMAIL=superadmin@shopnearfin.com
SUPERADMIN_PASSWORD=SuperAdmin@2026
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Demo Database Seed
Populate the database with 5 partners, realistic inventory, orders, expenses, and accounts:
```bash
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Unit tests for Bangladeshi currency formatting, lakh/crore conversion, paisa arithmetic, and all business formulas:
```bash
npm test
```

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Super Admin** | `superadmin@shopnearfin.com` | `SuperAdmin@2026` | Environment-variable based. Full control + User Approvals. |
| **Editor** | `editor@shopnearfin.com` | `Editor@2026` | Approved by Super Admin. Can create/edit orders, stock, expenses, partners. |
| **Pending User** | `kamrul@shopnearfin.com` | `Viewer@2026` | Registered user awaiting Super Admin approval. Demonstrates pending approval flow. |

---

## 📱 Responsive Layout Verification

The layout has been tailored and tested for:
- **375px (iPhone SE)**: Bottom navigation bar, compact cards, 44px touch targets, bottom sheet drawers.
- **390px (iPhone 14)**: Safe area insets for iOS home bar and notch (`pb-safe`, `pt-safe`), smooth drawer handles.
- **768px (iPad / Tablet)**: 2-column dashboard grid, collapsible navigation.
- **1280px (Desktop)**: Full sidebar, 4-column liquidity metrics, multi-column TanStack data tables, Recharts visualizations.

---

## ☁️ Deployment Guide (Vercel + MongoDB Atlas)

1. **MongoDB Atlas**:
   - Create a free or dedicated cluster on MongoDB Atlas.
   - In **Network Access**, add `0.0.0.0/0` (or Vercel IP range).
   - In **Database Access**, create a user with read/write privileges.
   - Copy the connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/shopnearfin?retryWrites=true&w=majority`.

2. **Deploying on Vercel**:
   - Push repository to GitHub or GitLab.
   - Import project in Vercel.
   - Under **Settings → Environment Variables**, add:
     - `MONGODB_URI`: Your Atlas connection string
     - `JWT_SECRET`: A secure random string (32+ chars)
     - `SUPERADMIN_EMAIL`: `superadmin@yourdomain.com`
     - `SUPERADMIN_PASSWORD`: Your secret superadmin password
   - Deploy. Run the seed script remotely or connect via MongoDB Compass.
