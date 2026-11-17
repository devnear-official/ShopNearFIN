"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  XCircle,
  Phone,
  MapPin,
  FileCheck,
  ChevronRight,
  RotateCw,
  Coins,
  Trash2,
  Calendar,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetDrawer } from "@/components/ui/sheet-drawer";
import { Input } from "@/components/ui/input";
import { FAB } from "@/components/ui/fab";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { canMutateData } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/utils";

const STATUS_FILTERS = ["ALL", "PENDING", "SHIPPED", "DELIVERED", "RETURNED", "CANCELLED"] as const;
const COURIER_OPTIONS = ["Steadfast", "Pathao", "RedX", "Paperfly", "Other"];

export default function OrdersPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courierFilter, setCourierFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Create Order Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [deliveryCharge, setDeliveryCharge] = useState(120);
  const [discount, setDiscount] = useState(0);
  const [courier, setCourier] = useState("Steadfast");
  const [trackingId, setTrackingId] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Order Details / Status Transition Modal
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [statusTransitionNote, setStatusTransitionNote] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Courier Reconcile Modal State
  const [reconcileOrder, setReconcileOrder] = useState<any>(null);
  const [actualReceived, setActualReceived] = useState<number>(0);
  const [courierFeeDeducted, setCourierFeeDeducted] = useState<number>(0);
  const [reconcileMethod, setReconcileMethod] = useState("BANK");
  const [reconcileNote, setReconcileNote] = useState("");
  const [reconcileSubmitting, setReconcileSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (courierFilter !== "ALL") params.set("courier", courierFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.orders);
      }
    } catch {
      toast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsForDropdown = async () => {
    try {
      const res = await fetch("/api/products?limit=100");
      const json = await res.json();
      if (json.success && json.data.products.length > 0) {
        setAvailableProducts(json.data.products);
        setSelectedProductId(json.data.products[0]._id);
      }
    } catch {}
  };

  useEffect(() => {
    fetchOrders();
    fetchProductsForDropdown();
  }, [statusFilter, courierFilter]);

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete order "${orderNumber}"?`)) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to delete order", "error");
        return;
      }
      toast(`Order "${orderNumber}" deleted successfully`, "success");
      setActiveOrder(null);
      fetchOrders();
    } catch {
      toast("Error deleting order", "error");
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderSubmitting(true);

    const product = availableProducts.find((p) => p._id === selectedProductId);
    if (!product) {
      toast("Please select a valid product", "error");
      setOrderSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          items: [
            {
              productId: product._id,
              productName: product.name,
              sku: product.sku,
              quantity: Number(orderQuantity),
              unitPrice: Number(product.sellingPrice),
              unitCost: Number(product.buyingPrice),
            },
          ],
          deliveryCharge: Number(deliveryCharge),
          discount: Number(discount),
          courier,
          trackingId: trackingId.trim(),
          date: orderDate ? new Date(orderDate) : new Date(),
          notes: notes.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to create order", "error");
        return;
      }

      toast(`Order ${json.data.orderNumber} created!`, "success");
      setCreateModalOpen(false);
      setCustomerName("");
      setPhone("");
      setAddress("");
      setNotes("");
      fetchOrders();
    } catch {
      toast("Error creating order", "error");
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleStatusChange = async (targetStatus: string) => {
    if (!activeOrder) return;
    setStatusSubmitting(true);

    try {
      const res = await fetch(`/api/orders/${activeOrder._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          note: statusTransitionNote.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Status change failed", "error");
        return;
      }

      toast(`Order status changed to ${targetStatus}`, "success");
      setActiveOrder(json.data);
      setStatusTransitionNote("");
      fetchOrders();
    } catch {
      toast("Error changing status", "error");
    } finally {
      setStatusSubmitting(false);
    }
  };

  const openReconcileModal = (order: any) => {
    setReconcileOrder(order);
    // Estimated courier fee (default delivery charge 120 or 1% COD fee)
    const estCourierCharge = order.deliveryCharge || 120;
    const estReceived = Math.max(0, order.totalAmount - estCourierCharge);
    setActualReceived(estReceived);
    setCourierFeeDeducted(estCourierCharge);
    setReconcileNote(`COD settlement from ${order.courier}`);
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileOrder) return;
    setReconcileSubmitting(true);

    try {
      const res = await fetch(`/api/orders/${reconcileOrder._id}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualReceived: Number(actualReceived),
          courierFeeDeducted: Number(courierFeeDeducted),
          paymentMethod: reconcileMethod,
          note: reconcileNote,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to reconcile", "error");
        return;
      }

      toast("Courier COD payment reconciled & deposited to account ledger!", "success");
      setReconcileOrder(null);
      if (activeOrder?._id === reconcileOrder._id) {
        setActiveOrder(json.data);
      }
      fetchOrders();
    } catch {
      toast("Reconciliation error", "error");
    } finally {
      setReconcileSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Top Header & New Order Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-teal-600" />
            {t("orders")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Track order statuses, inventory stock-out rules, and courier cash settlements"
              : "অর্ডার ট্র্যাকিং, মজুদ ছাড়করণ এবং কুরিয়ার ক্যাশ মিলকরণ"}
          </p>
        </div>

        {canMutateData(user) && (
          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5 hidden sm:flex"
          >
            <Plus className="w-4 h-4" />
            <span>{t("newOrder")}</span>
          </Button>
        )}
      </div>

      {/* Status Chips Filter (Horizontal scrollable chips for mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full max-w-full">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              statusFilter === s
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {s === "ALL" ? t("all") : s}
          </button>
        ))}
      </div>

      {/* Search and Courier Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by customer name, BD phone (01X...), order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={courierFilter}
            onChange={(e) => setCourierFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-card text-xs font-semibold text-foreground outline-none"
          >
            <option value="ALL">All Couriers</option>
            {COURIER_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={fetchOrders}
            className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors"
            title="Refresh list"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Orders List / Cards */}
      {loading && orders.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description="Create your first customer order with Bangladeshi phone number validation."
          actionLabel={canMutateData(user) ? "+ Create First Order" : undefined}
          onAction={canMutateData(user) ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {/* Mobile Stacked Cards (< 768px) with Tap-to-Expand */}
          <div className="md:hidden space-y-3">
            {orders.map((o) => (
              <Card
                key={o._id}
                onClick={() => setActiveOrder(o)}
                className="rounded-2xl p-4 shadow-sm border hover:border-teal-400 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {o.orderNumber}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                    <h4 className="font-bold text-sm text-foreground mt-1">{o.customerName}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {o.phone}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-foreground block">
                      <Money amount={o.totalAmount} />
                    </span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold block">
                      {o.courier}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-2.5 border-t border-border/80">
                  <span className="truncate max-w-[200px]">
                    {o.items?.map((it: any) => `${it.quantity}x ${it.productName}`).join(", ")}
                  </span>
                  <div className="flex items-center gap-1 text-teal-700 font-semibold shrink-0">
                    <span>{canMutateData(user) ? "Manage" : "View"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* COD Remittance pill if delivered */}
                {o.status === "DELIVERED" && (
                  <div className="mt-2.5 pt-2 border-t border-dashed flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Courier COD:</span>
                    {o.courierRemitted ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Remitted (৳{o.actualReceived})
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending Remittance
                      </span>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Desktop Table (>= 768px) */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3.5 pl-4">Order ID & Date</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Items</th>
                  <th className="p-3.5">Courier</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 text-center">COD Remitted</th>
                  <th className="p-3.5 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-muted/30">
                    <td className="p-3.5 pl-4">
                      <span className="font-mono font-bold text-foreground block">{o.orderNumber}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(o.createdAt)}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-foreground block">{o.customerName}</span>
                      <span className="text-xs text-muted-foreground">{o.phone}</span>
                    </td>
                    <td className="p-3.5 text-xs text-muted-foreground max-w-xs truncate">
                      {o.items?.map((it: any) => `${it.quantity}x ${it.productName}`).join(", ")}
                    </td>
                    <td className="p-3.5 font-medium text-foreground">{o.courier}</td>
                    <td className="p-3.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="p-3.5 text-right font-black text-foreground">
                      <Money amount={o.totalAmount} />
                    </td>
                    <td className="p-3.5 text-center">
                      {o.status === "DELIVERED" ? (
                        o.courierRemitted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> ৳{o.actualReceived}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3.5 pr-4 text-right space-x-1.5 whitespace-nowrap">
                      <Button
                        onClick={() => setActiveOrder(o)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-xs"
                      >
                        Details
                      </Button>
                      {canMutateData(user) && (
                        <Button
                          onClick={() => handleDeleteOrder(o._id, o.orderNumber)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAB on Mobile */}
      {canMutateData(user) && (
        <FAB onClick={() => setCreateModalOpen(true)} label="New Order" />
      )}

      {/* Modal / Sheet: Create Order */}
      <SheetDrawer
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Customer Order"
        description="Fill customer details, BD phone number, items, and courier service."
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Customer Full Name *
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Arif Hossain"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Phone Number (BD Format 01XXXXXXXXX) *
              </label>
              <Input
                type="tel"
                required
                placeholder="01712345678"
                pattern="01[3-9][0-9]{8}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">11 digits starting with 01X</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Courier Service *
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Delivery Address *
            </label>
            <Input
              type="text"
              required
              placeholder="House #, Road #, Area, District"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Product Item *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
              >
                {availableProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (৳{p.sellingPrice} | Stock: {p.currentStock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Qty *
              </label>
              <Input
                type="number"
                min="1"
                required
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Delivery Charge (৳)
              </label>
              <Input
                type="number"
                min="0"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                className="h-11"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Discount (৳)
              </label>
              <Input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Order Date
              </label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="h-11 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tracking ID (Optional)
              </label>
              <Input
                type="text"
                placeholder="Courier tracking reference"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={orderSubmitting}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {orderSubmitting ? "Creating Order..." : "Confirm & Create Order"}
            </Button>
          </div>
        </form>
      </SheetDrawer>

      {/* Modal / Sheet: Order Details & Status Workflow */}
      <SheetDrawer
        isOpen={!!activeOrder}
        onClose={() => setActiveOrder(null)}
        title={`Order Details: ${activeOrder?.orderNumber}`}
        description={`Created on ${formatDate(activeOrder?.createdAt)} by ${activeOrder?.createdBy}`}
      >
        {activeOrder && (
          <div className="space-y-4">
            {/* Status & Highlights */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Current Status</span>
                <div className="mt-0.5"><StatusBadge status={activeOrder.status} /></div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Amount</span>
                <span className="text-lg font-black text-foreground">
                  <Money amount={activeOrder.totalAmount} />
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 rounded-2xl border border-border/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-bold text-foreground">{activeOrder.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-mono font-semibold">{activeOrder.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Courier:</span>
                <span className="font-semibold text-teal-700 dark:text-teal-400">{activeOrder.courier}</span>
              </div>
              <div className="pt-1 text-muted-foreground">
                <span className="block text-[10px] uppercase font-bold">Address:</span>
                <p className="text-foreground mt-0.5">{activeOrder.address}</p>
              </div>
            </div>

            {/* Order Items Snapshot */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">Ordered Items</h4>
              <div className="border border-border rounded-xl divide-y text-xs">
                {activeOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground block">{item.productName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.quantity} pcs @ ৳{item.unitPrice} (Cost snapshot: ৳{item.unitCost})
                      </span>
                    </div>
                    <span className="font-bold text-foreground"><Money amount={item.quantity * item.unitPrice} /></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Transitions Workflow Buttons */}
            {canMutateData(user) && (
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-xs font-bold text-foreground">Update Order Status</h4>
                
                {/* Note input */}
                <Input
                  type="text"
                  placeholder="Optional transition note..."
                  value={statusTransitionNote}
                  onChange={(e) => setStatusTransitionNote(e.target.value)}
                  className="h-10 text-xs mb-2"
                />

                {activeOrder.status === "PENDING" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleStatusChange("SHIPPED")}
                      disabled={statusSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1" /> Mark Shipped (Stock Out)
                    </Button>
                    <Button
                      onClick={() => handleStatusChange("CANCELLED")}
                      disabled={statusSubmitting}
                      variant="destructive"
                      className="text-xs h-10"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel Order
                    </Button>
                  </div>
                )}

                {activeOrder.status === "SHIPPED" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleStatusChange("DELIVERED")}
                      disabled={statusSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Delivered
                    </Button>
                    <Button
                      onClick={() => handleStatusChange("RETURNED")}
                      disabled={statusSubmitting}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-10"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Mark Returned (Loss Auto)
                    </Button>
                  </div>
                )}

                {activeOrder.status === "DELIVERED" && !activeOrder.courierRemitted && (
                  <Button
                    onClick={() => openReconcileModal(activeOrder)}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-11 font-bold mt-2"
                  >
                    <Coins className="w-4 h-4 mr-1.5" /> Reconcile Courier COD Payment
                  </Button>
                )}

                {/* Delete Order Button */}
                <div className="pt-2 border-t mt-3">
                  <Button
                    onClick={() => handleDeleteOrder(activeOrder._id, activeOrder.orderNumber)}
                    variant="outline"
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 text-xs h-10 font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete This Order
                  </Button>
                </div>
              </div>
            )}

            {/* Status History Timeline */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-xs font-bold text-foreground">{t("statusTimeline")}</h4>
              <div className="space-y-2">
                {activeOrder.statusHistory?.map((hist: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{hist.status}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(hist.changedAt)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">By: {hist.changedBy}</p>
                      {hist.note && <p className="text-xs text-foreground italic mt-0.5">"{hist.note}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SheetDrawer>

      {/* Modal / Sheet: Reconcile Courier COD */}
      <SheetDrawer
        isOpen={!!reconcileOrder}
        onClose={() => setReconcileOrder(null)}
        title="Reconcile Courier COD Payment"
        description={`Order #${reconcileOrder?.orderNumber} | Expected COD: ৳${reconcileOrder?.totalAmount}`}
      >
        <form onSubmit={handleReconcileSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Actual Received Amount (৳) *
            </label>
            <Input
              type="number"
              min="0"
              required
              value={actualReceived}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setActualReceived(val);
                setCourierFeeDeducted(Math.max(0, (reconcileOrder?.totalAmount || 0) - val));
              }}
              className="h-11 text-base font-bold text-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Courier Fee / COD Deducted (৳)
            </label>
            <Input
              type="number"
              min="0"
              required
              value={courierFeeDeducted}
              onChange={(e) => setCourierFeeDeducted(parseFloat(e.target.value) || 0)}
              className="h-11"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Diff between expected ৳{reconcileOrder?.totalAmount} and actual received
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Deposit Into Business Account *
            </label>
            <select
              value={reconcileMethod}
              onChange={(e) => setReconcileMethod(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
            >
              <option value="BANK">Bank Account</option>
              <option value="BKASH">bKash Merchant/Personal</option>
              <option value="NAGAD">Nagad</option>
              <option value="CASH">Cash in Hand</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Reconciliation Reason / Note
            </label>
            <Input
              type="text"
              value={reconcileNote}
              onChange={(e) => setReconcileNote(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={reconcileSubmitting}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {reconcileSubmitting ? "Reconciling..." : "Confirm & Deposit into Ledger"}
            </Button>
          </div>
        </form>
      </SheetDrawer>
    </DashboardLayout>
  );
}
