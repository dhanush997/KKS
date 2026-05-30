"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Loader2, Image as ImageIcon } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  _count?: {
    products: number;
  };
}

export default function AdminCategoriesPage() {
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");

  const loadCategories = () => {
    setIsLoading(true);
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error("Error loading categories list:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormDesc("");
    setFormImage("");
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormDesc(cat.description || "");
    setFormImage(cat.image || "");
    setIsDialogOpen(true);
  };

  // Convert image upload to base64
  const handleImagePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName) {
      toast({
        title: "Validation Error",
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      id: editingId,
      name: formName,
      description: formDesc,
      image: formImage,
    };

    try {
      const url = "/api/categories";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save category.");
      }

      toast({
        title: editingId ? "Category Updated" : "Category Created",
        description: `${formName} has been saved successfully.`,
        variant: "success",
      });

      setIsDialogOpen(false);
      loadCategories();
    } catch (err: any) {
      console.error("Category save error:", err);
      toast({
        title: "Save Failed",
        description: err.message || "Failed to submit category details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete category "${name}"? Check that no products are linked.`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete category.");
      }

      toast({
        title: "Category Deleted",
        description: `${name} has been removed.`,
        variant: "success",
      });
      loadCategories();
    } catch (err: any) {
      console.error("Category delete error:", err);
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to remove category. Check for linked products.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Categories Catalog</h1>
          <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-wide">
            Organize garments and collections under visual divisions.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog} className="flex items-center gap-1.5 uppercase font-bold tracking-wider text-xs h-10 px-4">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Categories table list */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="text-sm font-bold text-foreground">No categories defined</h3>
          <p className="text-xs text-muted-foreground mt-1">Start adding collection headings to structure your e-commerce shop catalog.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-neutral-50 border-b border-border text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Banner</th>
                <th className="p-4">Category Name</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Linked Products</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-neutral-50/50">
                  <td className="p-4">
                    {cat.image ? (
                      <div className="relative h-10 w-16 overflow-hidden rounded border border-border bg-neutral-100">
                        <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-16 border rounded bg-neutral-100 flex items-center justify-center text-neutral-400">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-extrabold">
                    {cat.name}
                    {cat.description && (
                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5 line-clamp-1">{cat.description}</p>
                    )}
                  </td>
                  <td className="p-4 font-mono text-muted-foreground text-[10px]">{cat.slug}</td>
                  <td className="p-4 font-extrabold text-sm">{cat._count?.products || 0}</td>
                  <td className="p-4 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => handleOpenEditDialog(cat)}
                        className="p-1.5 rounded hover:bg-neutral-100 text-muted-foreground hover:text-foreground"
                        title="Edit category"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600"
                        title="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CRUD DIALOG MODAL */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingId ? `Edit Category Details` : `Add New Category`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe what garments fall under this category..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Category Banner Image</label>
            <div className="flex items-center gap-4">
              {formImage && (
                <div className="relative h-16 w-24 rounded border overflow-hidden shrink-0">
                  <img src={formImage} alt="banner preview" className="h-full w-full object-cover" />
                </div>
              )}
              <label className="flex items-center justify-center border border-dashed border-input rounded-md h-16 w-24 shrink-0 hover:bg-neutral-50 cursor-pointer text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-wider">
                Upload File
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagePicker}
                  className="hidden"
                />
              </label>
            </div>
          </div>

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
              {editingId ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
