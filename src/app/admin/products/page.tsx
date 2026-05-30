"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon, X } from "lucide-react";

interface ProductImage {
  id: string;
  url: string;
  isFeatured: boolean;
}

interface Inventory {
  size: string;
  stock: number;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  categoryId: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  images: ProductImage[];
  inventory: Inventory[];
  category: {
    name: string;
  };
}

export default function AdminProductsPage() {
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formComparePrice, setFormComparePrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formFeatured, setFormFeatured] = useState(false);
  const [formNewArrival, setFormNewArrival] = useState(false);
  const [formTrending, setFormTrending] = useState(false);
  const [formBestSeller, setFormBestSeller] = useState(false);
  
  // Images (holds base64 strings or existing URLs)
  const [formImages, setFormImages] = useState<string[]>([]);
  
  // Size stocks
  const [formStocks, setFormStocks] = useState<Record<string, number>>({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    "Free Size": 0,
  });

  // Load products and categories
  const loadData = () => {
    setIsLoading(true);
    
    Promise.all([
      fetch("/api/products").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
    ])
      .then(([productsData, categoriesData]) => {
        if (Array.isArray(productsData)) setProducts(productsData);
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData);
          if (categoriesData.length > 0) setFormCategory(categoriesData[0].id);
        }
      })
      .catch((err) => console.error("Error loading panel lists:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormDesc("");
    setFormPrice("");
    setFormComparePrice("");
    if (categories.length > 0) setFormCategory(categories[0].id);
    setFormFeatured(false);
    setFormNewArrival(false);
    setFormTrending(false);
    setFormBestSeller(false);
    setFormImages([]);
    setFormStocks({
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      "Free Size": 0,
    });
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (prod: Product) => {
    setEditingId(prod.id);
    setFormName(prod.name);
    setFormDesc(prod.description);
    setFormPrice(prod.price.toString());
    setFormComparePrice(prod.compareAtPrice?.toString() || "");
    setFormCategory(prod.categoryId);
    setFormFeatured(prod.isFeatured);
    setFormNewArrival(prod.isNewArrival);
    setFormTrending(prod.isTrending);
    setFormBestSeller(prod.isBestSeller);
    setFormImages(prod.images.map((img) => img.url));
    
    const stocks: Record<string, number> = { S: 0, M: 0, L: 0, XL: 0, "Free Size": 0 };
    prod.inventory.forEach((inv) => {
      stocks[inv.size] = inv.stock;
    });
    setFormStocks(stocks);
    
    setIsDialogOpen(true);
  };

  // Convert image picks to base64
  const handleImagePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStockChange = (size: string, val: string) => {
    const stockCount = parseInt(val) || 0;
    setFormStocks((prev) => ({ ...prev, [size]: Math.max(0, stockCount) }));
  };

  // Handle Form submit (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName || !formDesc || !formPrice || !formCategory || formImages.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill out all details and select at least 1 image.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Structure size inventory
    const inventory = Object.entries(formStocks)
      .filter(([_, stock]) => stock > 0)
      .map(([size, stock]) => ({ size, stock }));

    // Fallback if all sizes are set to 0, support Free Size default
    if (inventory.length === 0) {
      inventory.push({ size: "Free Size", stock: 10 });
    }

    const payload = {
      name: formName,
      description: formDesc,
      price: parseFloat(formPrice),
      compareAtPrice: formComparePrice ? parseFloat(formComparePrice) : null,
      categoryId: formCategory,
      isFeatured: formFeatured,
      isNewArrival: formNewArrival,
      isTrending: formTrending,
      isBestSeller: formBestSeller,
      images: formImages,
      inventory,
    };

    try {
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save product.");
      }

      toast({
        title: editingId ? "Product Updated" : "Product Created",
        description: `${formName} has been cataloged successfully.`,
        variant: "success",
      });

      setIsDialogOpen(false);
      loadData();
    } catch (err: any) {
      console.error("Product save error:", err);
      toast({
        title: "Action Failed",
        description: err.message || "Failed to submit product details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete product
  const handleDelete = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"? This action is permanent.`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete product.");
      }

      toast({
        title: "Product Deleted",
        description: `${name} has been removed from catalog.`,
        variant: "success",
      });
      loadData();
    } catch (err: any) {
      console.error("Product delete error:", err);
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to remove product from catalog.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Products Catalog</h1>
          <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-wide">
            Add garments, update stock sizes, or delete products.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog} className="flex items-center gap-1.5 uppercase font-bold tracking-wider text-xs h-10 px-4">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Catalog Table list */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="text-sm font-bold text-foreground">Catalog is empty</h3>
          <p className="text-xs text-muted-foreground mt-1">Start adding premium garments using the Add Product button.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-neutral-50 border-b border-border text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Image</th>
                <th className="p-4">Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock Breakdown</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {products.map((prod) => {
                const totalStock = prod.inventory.reduce((sum, item) => sum + item.stock, 0);
                const firstImg = prod.images.find((i) => i.isFeatured)?.url || prod.images[0]?.url;
                
                return (
                  <tr key={prod.id} className="hover:bg-neutral-50/50">
                    <td className="p-4">
                      {firstImg ? (
                        <div className="relative h-12 w-9 overflow-hidden rounded border border-border bg-neutral-100">
                          <img src={firstImg} alt={prod.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-9 border rounded bg-neutral-100 flex items-center justify-center text-neutral-400">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-extrabold">{prod.name}</td>
                    <td className="p-4 font-normal text-muted-foreground">{prod.category?.name}</td>
                    <td className="p-4 font-extrabold">{formatPrice(prod.price)}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          totalStock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {totalStock > 0 ? `In Stock (${totalStock})` : "Out of Stock"}
                        </span>
                        <p className="text-[10px] text-muted-foreground font-normal">
                          {prod.inventory.map((i) => `${i.size}:${i.stock}`).join(" | ")}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleOpenEditDialog(prod)}
                          className="p-1.5 rounded hover:bg-neutral-100 text-muted-foreground hover:text-foreground"
                          title="Edit details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prod.id, prod.name)}
                          className="p-1.5 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CRUD DIALOG MODAL */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingId ? `Edit Product Details` : `Add New Product`}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Name & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Name"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <Input
              label="Selling Price (INR)"
              required
              type="number"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
            />
          </div>

          {/* Row 2: Category & Compare price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categories.length > 0 && (
              <Select
                label="Product Category"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              />
            )}
            <Input
              label="Compare At Original Price (Optional)"
              type="number"
              value={formComparePrice}
              onChange={(e) => setFormComparePrice(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Description</label>
            <textarea
              required
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe styling fit and fabric blends..."
            />
          </div>

          {/* Flags Checkboxes */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Visibility Flags</label>
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={formFeatured} onChange={() => setFormFeatured(!formFeatured)} className="accent-gold-600 h-4 w-4" />
                Featured Collection
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={formNewArrival} onChange={() => setFormNewArrival(!formNewArrival)} className="accent-gold-600 h-4 w-4" />
                New Arrival
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={formTrending} onChange={() => setFormTrending(!formTrending)} className="accent-gold-600 h-4 w-4" />
                Trending Item
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={formBestSeller} onChange={() => setFormBestSeller(!formBestSeller)} className="accent-gold-600 h-4 w-4" />
                Best Seller
              </label>
            </div>
          </div>

          {/* Inventory stocks */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Size Inventory Stocks</label>
            <div className="grid grid-cols-5 gap-3">
              {Object.keys(formStocks).map((size) => (
                <Input
                  key={size}
                  label={size}
                  type="number"
                  value={formStocks[size]}
                  onChange={(e) => handleStockChange(size, e.target.value)}
                  className="text-center"
                />
              ))}
            </div>
          </div>

          {/* File Image Uploads (Base64 picker) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Images Upload</label>
            
            <div className="flex items-center gap-4 flex-wrap">
              {/* Box Image Picker button */}
              <label className="flex flex-col items-center justify-center border border-dashed border-input rounded-md h-24 w-18 shrink-0 hover:bg-neutral-50 cursor-pointer transition-colors text-muted-foreground hover:text-foreground">
                <Plus className="h-5 w-5" />
                <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Select</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImagePicker}
                  className="hidden"
                />
              </label>

              {/* Thumbnails preview */}
              {formImages.map((img, idx) => (
                <div key={idx} className="relative h-24 w-18 rounded border overflow-hidden shrink-0 group">
                  <img src={img} alt="preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-0.5 hover:bg-rose-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="uppercase tracking-wider font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="uppercase tracking-wider font-bold text-xs"
            >
              {editingId ? "Save Changes" : "Create Item"}
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
