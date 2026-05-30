"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Calendar, ToggleLeft, ToggleRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { formatDateShort } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  isActive: boolean;
  isAdminOnly: boolean;
  startDate: string;
  endDate: string;
}

export default function AdminCouponsPage() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form Fields
  const [form, setForm] = useState({
    code: "",
    type: "PERCENT",
    value: "",
    isActive: true,
    isAdminOnly: false,
    startDate: "",
    endDate: "",
  });

  const couponTypes = [
    { label: "Percentage Off (%)", value: "PERCENT" },
    { label: "Fixed Cash Off (INR)", value: "FIXED" },
  ];

  const loadCoupons = () => {
    setIsLoading(true);
    fetch("/api/admin/coupons")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCoupons(data);
      })
      .catch((err) => console.error("Error loading coupons:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleToggleActive = async (couponId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: couponId, isActive: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to toggle status");

      toast({
        title: "Coupon Updated",
        description: `Promo coupon has been ${!currentStatus ? "activated" : "deactivated"}.`,
        variant: "success",
      });

      setCoupons((prev) =>
        prev.map((c) => (c.id === couponId ? { ...c, isActive: !currentStatus } : c))
      );
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update coupon status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!window.confirm("Are you sure you want to delete this coupon? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/admin/coupons?id=${couponId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete coupon");

      toast({
        title: "Coupon Deleted",
        description: "Promotional coupon was removed successfully.",
        variant: "success",
      });

      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete coupon.",
        variant: "destructive",
      });
    }
  };

  const handleOpenCreate = () => {
    const now = new Date();
    const defaultEnd = new Date(now.getFullYear() + 1, 11, 31); // End of next year

    setEditingCoupon(null);
    setForm({
      code: "",
      type: "PERCENT",
      value: "",
      isActive: true,
      isAdminOnly: false,
      startDate: now.toISOString().slice(0, 16),
      endDate: defaultEnd.toISOString().slice(0, 16),
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      isActive: coupon.isActive,
      isAdminOnly: coupon.isAdminOnly,
      startDate: new Date(coupon.startDate).toISOString().slice(0, 16),
      endDate: new Date(coupon.endDate).toISOString().slice(0, 16),
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        value: Number(form.value),
        id: editingCoupon?.id,
      };

      const method = editingCoupon ? "PUT" : "POST";
      const res = await fetch("/api/admin/coupons", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save coupon");

      toast({
        title: editingCoupon ? "Coupon Updated" : "Coupon Created",
        description: "Promotional coupon saved successfully.",
        variant: "success",
      });

      setIsOpen(false);
      loadCoupons();
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to save coupon information.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Discount Coupons</h1>
          <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-wide">
            Manage promotional codes, discount values, expirations, and access rules.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="uppercase font-bold tracking-wider text-xs h-10 gap-1.5 shrink-0">
          <Plus className="h-4.5 w-4.5" /> New Coupon
        </Button>
      </div>

      {/* Coupons Table */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="text-sm font-bold text-foreground">No coupons configured</h3>
          <p className="text-xs text-muted-foreground mt-1">Configure your first checkout discount code here.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-neutral-50 border-b border-border text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Coupon Code</th>
                <th className="p-4">Type</th>
                <th className="p-4">Value</th>
                <th className="p-4">Authorization</th>
                <th className="p-4">Expiration</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {coupons.map((c) => {
                const isCurrentlyLive = c.isActive && new Date(c.startDate) <= new Date() && new Date(c.endDate) >= new Date();
                return (
                  <tr key={c.id} className="hover:bg-neutral-50/50">
                    <td className="p-4 font-extrabold uppercase tracking-widest text-black">{c.code}</td>
                    <td className="p-4 text-muted-foreground font-normal">{c.type === "PERCENT" ? "Percentage Off" : "Fixed Cash Off"}</td>
                    <td className="p-4 font-bold">{c.type === "PERCENT" ? `${c.value}%` : `₹${c.value}`}</td>
                    <td className="p-4">
                      {c.isAdminOnly ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50 font-bold uppercase tracking-wider">
                          <ShieldAlert className="h-3 w-3" /> Admin Only
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border font-bold uppercase tracking-wider">
                          <ShieldCheck className="h-3 w-3 text-neutral-400" /> Public
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-neutral-500 font-normal">
                      Ends: {formatDateShort(c.endDate)}
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isCurrentlyLive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : c.isActive
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {isCurrentlyLive ? "ACTIVE" : c.isActive ? "SCHEDULED" : "PAUSED"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3 font-bold">
                        <button
                          onClick={() => handleToggleActive(c.id, c.isActive)}
                          className="p-1 rounded hover:bg-neutral-100 text-muted-foreground hover:text-foreground cursor-pointer"
                          title={c.isActive ? "Pause Coupon" : "Activate Coupon"}
                        >
                          {c.isActive ? (
                            <ToggleRight className="h-5 w-5 text-emerald-600 animate-pulse" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-neutral-400" />
                          )}
                        </button>
                        <Button variant="outline" onClick={() => handleOpenEdit(c)} className="h-7 text-[10px] px-2.5 font-bold uppercase tracking-wider">
                          Edit
                        </Button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded hover:bg-rose-50 text-neutral-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Coupon"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
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

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingCoupon ? "Modify Coupon Code" : "Create Coupon Code"}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          <Input
            label="Coupon Code (Unique)"
            required
            placeholder="e.g. KK30"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            disabled={!!editingCoupon}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="coupon-type"
              label="Discount Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={couponTypes}
            />
            <Input
              label={form.type === "PERCENT" ? "Discount Value (%)" : "Discount Value (INR)"}
              required
              type="number"
              placeholder={form.type === "PERCENT" ? "e.g. 30" : "e.g. 200"}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5">Start Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="h-9 w-full rounded border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5">End Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="h-9 w-full rounded border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring font-bold"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center gap-2">
              <input
                id="is-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 accent-neutral-900 rounded cursor-pointer"
              />
              <label htmlFor="is-active" className="cursor-pointer font-bold uppercase text-[10px] text-neutral-600 tracking-wider">
                Enable Coupon immediately (If schedule matches)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is-admin-only"
                type="checkbox"
                checked={form.isAdminOnly}
                onChange={(e) => setForm({ ...form, isAdminOnly: e.target.checked })}
                className="h-4 w-4 accent-neutral-900 rounded cursor-pointer"
              />
              <label htmlFor="is-admin-only" className="cursor-pointer font-bold uppercase text-[10px] text-amber-700 tracking-wider flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Restrict application to Admin roles only
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="uppercase tracking-wider font-bold h-10 px-5 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="uppercase tracking-wider font-bold h-10 px-6 text-xs"
            >
              Save Coupon
            </Button>
          </div>

        </form>
      </Dialog>
    </div>
  );
}
