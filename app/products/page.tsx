"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  History,
  TrendingDown,
  TrendingUp,
  RotateCw,
  SlidersHorizontal,
  ChevronRight,
  Trash2,
  Edit3,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Badge } from "@/components/ui/badge";
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

export default function ProductsPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // New Product Modal
  const [newProductModal, setNewProductModal] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [buyingPrice, setBuyingPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [lowStockLimit, setLowStockLimit] = useState<number>(5);
  const [category, setCategory] = useState("General");
  const [savingProduct, setSavingProduct] = useState(false);

  // Stock In Modal
  const [stockInProduct, setStockInProduct] = useState<any>(null);
  const [stockInQty, setStockInQty] = useState(10);
  const [stockInBuyingPrice, setStockInBuyingPrice] = useState(0);
  const [stockInPaymentMethod, setStockInPaymentMethod] = useState("CASH");
  const [stockInLoading, setStockInLoading] = useState(false);

  // Edit Product Modal
  const [editProductModal, setEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editBuyingPrice, setEditBuyingPrice] = useState<number>(0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  const [editCurrentStock, setEditCurrentStock] = useState<number>(0);
  const [editLowStockLimit, setEditLowStockLimit] = useState<number>(5);
  const [editCategory, setEditCategory] = useState("General");
  const [editSaving, setEditSaving] = useState(false);

  // Product History Drawer
  const [historyProduct, setHistoryProduct] = useState<any>(null);
  const [movementHistory, setMovementHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = `/api/products?search=${encodeURIComponent(search)}&lowStock=${lowStockOnly}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data.products);
      }
    } catch {
      toast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [lowStockOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          buyingPrice: Number(buyingPrice),
          sellingPrice: Number(sellingPrice),
          currentStock: Number(initialStock),
          lowStockLimit: Number(lowStockLimit),
          category: category.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to create product", "error");
        return;
      }

      toast("Product added to catalog successfully", "success");
      setNewProductModal(false);
      setName("");
      setSku("");
      setBuyingPrice(0);
      setSellingPrice(0);
      setInitialStock(0);
      fetchProducts();
    } catch {
      toast("Error creating product", "error");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInProduct) return;
    setStockInLoading(true);

    try {
      const res = await fetch(`/api/products/${stockInProduct._id}/stock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qty: Number(stockInQty),
          buyingPrice: Number(stockInBuyingPrice),
          paymentMethod: stockInPaymentMethod,
          paidBy: "Business",
          note: `Wholesale purchase restock`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to restock product", "error");
        return;
      }

      toast(`Successfully added ${stockInQty} units to stock!`, "success");
      setStockInProduct(null);
      fetchProducts();
    } catch {
      toast("Error stocking in", "error");
    } finally {
      setStockInLoading(false);
    }
  };

  const openEditProduct = (p: any) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditSku(p.sku);
    setEditBuyingPrice(p.buyingPrice || 0);
    setEditSellingPrice(p.sellingPrice || 0);
    setEditCurrentStock(p.currentStock || 0);
    setEditLowStockLimit(p.lowStockLimit || 5);
    setEditCategory(p.category || "General");
    setEditProductModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditSaving(true);

    try {
      const res = await fetch(`/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          sku: editSku.trim().toUpperCase(),
          buyingPrice: Number(editBuyingPrice),
          sellingPrice: Number(editSellingPrice),
          currentStock: Number(editCurrentStock),
          lowStockLimit: Number(editLowStockLimit),
          category: editCategory.trim() || "General",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to update product", "error");
        return;
      }

      toast(
        language === "bn"
          ? `পণ্য "${editName}" সফলভাবে আপডেট করা হয়েছে!`
          : `Product "${editName}" updated successfully!`,
        "success"
      );
      setEditProductModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch {
      toast("Error updating product", "error");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) return;

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast(json.message || "Failed to delete product", "error");
        return;
      }
      toast(`Product "${productName}" deleted successfully`, "success");
      fetchProducts();
    } catch {
      toast("Error deleting product", "error");
    }
  };

  const openHistory = async (product: any) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/products/${product._id}`);
      const json = await res.json();
      if (json.success) {
        setMovementHistory(json.data.movements || []);
      }
    } catch {
      toast("Failed to load stock history", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-teal-600" />
            {t("products")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en"
              ? "Catalog, current stock levels, automatic order stock-out & movement history"
              : "পণ্য তালিকা, চলতি মজুদ এবং ক্রয়-বিক্রয়জনিত মুভমেন্ট ইতিহাস"}
          </p>
        </div>

        {canMutateData(user) && (
          <Button
            onClick={() => setNewProductModal(true)}
            size="sm"
            className="h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5 hidden sm:flex"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl text-xs"
          />
        </form>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              lowStockOnly
                ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200"
                : "bg-card text-muted-foreground border-input hover:bg-muted"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Low Stock Alert</span>
          </button>

          <button
            onClick={fetchProducts}
            className="p-2.5 rounded-xl border border-input bg-card hover:bg-muted text-foreground transition-colors"
            title="Refresh list"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Product List */}
      {loading && products.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No Products Found"
          description="Create your first catalog item or adjust your search filter."
          actionLabel={canMutateData(user) ? "+ Add First Product" : undefined}
          onAction={canMutateData(user) ? () => setNewProductModal(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {/* Mobile Card Layout (< 768px) with Tap-to-Expand */}
          <div className="md:hidden space-y-3">
            {products.map((p) => {
              const isLowStock = p.currentStock <= p.lowStockLimit;
              return (
                <Card key={p._id} className="rounded-2xl p-4 shadow-sm border hover:border-teal-400/60 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">{p.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {p.sku}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">{p.category}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 ${
                        isLowStock
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                      }`}
                    >
                      {p.currentStock} in stock
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/70 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Wholesale Buy:</span>
                      <span className="font-semibold text-foreground"><Money amount={p.buyingPrice} /></span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Retail Sell:</span>
                      <span className="font-bold text-teal-700 dark:text-teal-400"><Money amount={p.sellingPrice} /></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2">
                    {canMutateData(user) && (
                      <Button
                        onClick={() => {
                          setStockInProduct(p);
                          setStockInBuyingPrice(p.buyingPrice);
                          setStockInQty(10);
                        }}
                        size="sm"
                        className="flex-1 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Stock In
                      </Button>
                    )}
                    <Button
                      onClick={() => openHistory(p)}
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-xl text-xs gap-1"
                    >
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>History</span>
                    </Button>
                    {canMutateData(user) && (
                      <Button
                        onClick={() => openEditProduct(p)}
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 rounded-xl text-xs text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 border-teal-600/30"
                        title={language === "bn" ? "পণ্য এডিট করুন" : "Edit Product"}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                      </Button>
                    )}
                    {canMutateData(user) && (
                      <Button
                        onClick={() => handleDeleteProduct(p._id, p.name)}
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 rounded-xl text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table Layout (>= 768px) */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3.5 pl-4">Product Name</th>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-right">Buying Price</th>
                  <th className="p-3.5 text-right">Selling Price</th>
                  <th className="p-3.5 text-center">Stock Level</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((p) => {
                  const isLowStock = p.currentStock <= p.lowStockLimit;
                  return (
                    <tr key={p._id} className="hover:bg-muted/30">
                      <td className="p-3.5 pl-4 font-bold text-foreground">{p.name}</td>
                      <td className="p-3.5 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="p-3.5 text-xs text-muted-foreground">{p.category || "General"}</td>
                      <td className="p-3.5 text-right font-medium text-foreground">
                        <Money amount={p.buyingPrice} />
                      </td>
                      <td className="p-3.5 text-right font-bold text-teal-700 dark:text-teal-400">
                        <Money amount={p.sellingPrice} />
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isLowStock
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                          }`}
                        >
                          {p.currentStock} {isLowStock ? "(Low)" : "pcs"}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-right space-x-2">
                        {canMutateData(user) && (
                          <Button
                            onClick={() => {
                              setStockInProduct(p);
                              setStockInBuyingPrice(p.buyingPrice);
                              setStockInQty(10);
                            }}
                            size="sm"
                            className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Stock In
                          </Button>
                        )}
                        <Button
                          onClick={() => openHistory(p)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 rounded-lg text-xs"
                          title="Movement History"
                        >
                          <History className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        {canMutateData(user) && (
                          <Button
                            onClick={() => openEditProduct(p)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 rounded-lg text-xs text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 border-teal-600/30"
                            title={language === "bn" ? "পণ্য এডিট করুন" : "Edit Product"}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                          </Button>
                        )}
                        {canMutateData(user) && (
                          <Button
                            onClick={() => handleDeleteProduct(p._id, p.name)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAB on Mobile */}
      {canMutateData(user) && (
        <FAB onClick={() => setNewProductModal(true)} label="New Product" />
      )}

      {/* Modal / Sheet: Add New Product */}
      <SheetDrawer
        isOpen={newProductModal}
        onClose={() => setNewProductModal(false)}
        title="Add New Product"
        description="Create product item with unique SKU and cost/retail prices."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Product Name *
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Wireless Noise Canceling Headphones"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                SKU (Unique) *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. WH-1000XM4"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="h-11 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Category
              </label>
              <Input
                type="text"
                placeholder="Electronics / Fashion"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Buying Price (৳) *
              </label>
              <Input
                type="number"
                min="0"
                required
                placeholder="800"
                value={buyingPrice || ""}
                onChange={(e) => setBuyingPrice(parseFloat(e.target.value) || 0)}
                className="h-11"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Selling Price (৳) *
              </label>
              <Input
                type="number"
                min="0"
                required
                placeholder="1450"
                value={sellingPrice || ""}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="h-11 font-bold text-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Initial Stock Qty
              </label>
              <Input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                className="h-11"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Low Stock Limit
              </label>
              <Input
                type="number"
                min="1"
                value={lowStockLimit}
                onChange={(e) => setLowStockLimit(parseInt(e.target.value) || 5)}
                className="h-11"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={savingProduct}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {savingProduct ? "Creating Product..." : "Create Product"}
            </Button>
          </div>
        </form>
      </SheetDrawer>

      {/* Modal / Sheet: Edit Product */}
      <SheetDrawer
        isOpen={editProductModal}
        onClose={() => {
          setEditProductModal(false);
          setEditingProduct(null);
        }}
        title={
          language === "bn"
            ? `পণ্য সম্পাদনা: ${editingProduct?.name}`
            : `Edit Product: ${editingProduct?.name}`
        }
        description={
          language === "bn"
            ? "পণ্যের নাম, SKU, ক্রয় ও বিক্রয় মূল্য এবং বর্তমান স্টক পরিবর্তন করুন"
            : "Update product details, pricing, SKU, and inventory thresholds"
        }
      >
        <form onSubmit={handleUpdateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {language === "bn" ? "পণ্যের নাম *" : "Product Name *"}
            </label>
            <Input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                SKU (Unique) *
              </label>
              <Input
                type="text"
                required
                value={editSku}
                onChange={(e) => setEditSku(e.target.value.toUpperCase())}
                className="h-11 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {language === "bn" ? "ক্যাটাগরি" : "Category"}
              </label>
              <Input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {language === "bn" ? "ক্রয় মূল্য (Buying Price ৳) *" : "Buying Price (৳) *"}
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                required
                value={editBuyingPrice || ""}
                onChange={(e) => setEditBuyingPrice(parseFloat(e.target.value) || 0)}
                className="h-11"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {language === "bn" ? "বিক্রয় মূল্য (Selling Price ৳) *" : "Selling Price (৳) *"}
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                required
                value={editSellingPrice || ""}
                onChange={(e) => setEditSellingPrice(parseFloat(e.target.value) || 0)}
                className="h-11 font-bold text-teal-700 dark:text-teal-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {language === "bn" ? "বর্তমান স্টক (Current Stock)" : "Current Stock (Units)"}
              </label>
              <Input
                type="number"
                min="0"
                value={editCurrentStock}
                onChange={(e) => setEditCurrentStock(parseInt(e.target.value) || 0)}
                className="h-11 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                {language === "bn" ? "লো স্টক সতর্কতা সীমা" : "Low Stock Limit"}
              </label>
              <Input
                type="number"
                min="1"
                value={editLowStockLimit}
                onChange={(e) => setEditLowStockLimit(parseInt(e.target.value) || 5)}
                className="h-11"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={editSaving}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {editSaving
                ? language === "bn" ? "সংরক্ষণ হচ্ছে..." : "Updating..."
                : language === "bn" ? "পরিবর্তন সংরক্ষণ করুন" : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetDrawer>

      {/* Modal / Sheet: Stock In */}
      <SheetDrawer
        isOpen={!!stockInProduct}
        onClose={() => setStockInProduct(null)}
        title={`Stock In: ${stockInProduct?.name}`}
        description={`Add new inventory units. Automatically creates a PURCHASE expense.`}
      >
        <form onSubmit={handleStockInSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Quantity to Add (Pcs) *
            </label>
            <Input
              type="number"
              min="1"
              required
              value={stockInQty}
              onChange={(e) => setStockInQty(parseInt(e.target.value) || 0)}
              className="h-11 text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Wholesale Buying Price per Unit (৳)
            </label>
            <Input
              type="number"
              min="0"
              required
              value={stockInBuyingPrice}
              onChange={(e) => setStockInBuyingPrice(parseFloat(e.target.value) || 0)}
              className="h-11"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Total Purchase Expense: <Money amount={stockInQty * stockInBuyingPrice} />
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Paid From Account
            </label>
            <select
              value={stockInPaymentMethod}
              onChange={(e) => setStockInPaymentMethod(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium"
            >
              <option value="CASH">CASH</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="BANK">Bank Account</option>
            </select>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={stockInLoading}
              className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              {stockInLoading ? "Adding..." : "Confirm Stock In"}
            </Button>
          </div>
        </form>
      </SheetDrawer>

      {/* Sheet Drawer: Product Movement History */}
      <SheetDrawer
        isOpen={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
        title={`Stock Movements: ${historyProduct?.name}`}
        description={`SKU: ${historyProduct?.sku} | Current Stock: ${historyProduct?.currentStock} units`}
      >
        {historyLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : movementHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No movement logs recorded yet.</p>
        ) : (
          <div className="space-y-2 py-2">
            {movementHistory.map((m: any) => (
              <div key={m._id} className="p-3 rounded-2xl border border-border/80 bg-muted/20 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.type === "IN"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : m.type === "OUT"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {m.type === "IN" ? "+ IN" : m.type === "OUT" ? "- OUT" : "↺ RETURN"}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{m.reference}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDateTime(m.date)} {m.note && `• ${m.note}`}
                  </p>
                </div>
                <span className="text-sm font-black text-foreground">
                  {m.type === "IN" || m.type === "RETURN" ? `+${m.qty}` : `-${m.qty}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </SheetDrawer>
    </DashboardLayout>
  );
}
