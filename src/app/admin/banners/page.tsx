"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Calendar, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { formatDateShort } from "@/lib/utils";

interface SalesBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  couponCode?: string | null;
  bannerType: string;
  bgGradient: string;
  textColor: string;
}

export default function AdminBannersPage() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<SalesBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBanner, setEditingBanner] = useState<SalesBanner | null>(null);

  // Form Fields
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    startDate: "",
    endDate: "",
    isActive: true,
    couponCode: "",
    bannerType: "FESTIVE",
    bgGradient: "from-amber-600 via-red-600 to-rose-800",
  });

  const gradients = [
    { label: "Diwali Gold & Rose", value: "from-amber-600 via-red-600 to-rose-800" },
    { label: "Midnight Carbon (Black Friday)", value: "from-neutral-950 via-neutral-900 to-neutral-800" },
    { label: "Neon Midnight (Flash Sale)", value: "from-indigo-900 via-purple-800 to-pink-700" },
    { label: "Winter Ice (Seasonal)", value: "from-blue-600 via-sky-600 to-indigo-700" },
    { label: "Spring Bloom", value: "from-pink-500 via-rose-500 to-amber-400" },
  ];

  const bannerTypes = [
    { label: "Festive Holiday", value: "FESTIVE" },
    { label: "Black Friday", value: "BLACK_FRIDAY" },
    { label: "Flash Sale", value: "FLASH_SALE" },
    { label: "Seasonal Drop", value: "SEASONAL" },
  ];

  const loadBanners = () => {
    setIsLoading(true);
    fetch("/api/admin/sales-banners")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBanners(data);
      })
      .catch((err) => console.error("Error loading banners:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleToggleActive = async (bannerId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/sales-banners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bannerId, isActive: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to toggle status");

      toast({
        title: "Banner Updated",
        description: `Promo banner has been ${!currentStatus ? "activated" : "deactivated"}.`,
        variant: "success",
      });

      setBanners((prev) =>
        prev.map((b) => (b.id === bannerId ? { ...b, isActive: !currentStatus } : b))
      );
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update banner status.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!window.confirm("Are you sure you want to delete this promotional banner?")) return;

    try {
      const res = await fetch(`/api/admin/sales-banners?id=${bannerId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete banner");

      toast({
        title: "Banner Deleted",
        description: "Promotional banner was removed successfully.",
        variant: "success",
      });

      setBanners((prev) => prev.filter((b) => b.id !== bannerId));
    } catch (err: any) {
      toast({
        title: "Deletion Failed",
        description: err.message || "Failed to delete promotional banner.",
        variant: "destructive",
      });
    }
  };

  const handleOpenCreate = () => {
    const now = new Date();
    const defaultEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days later

    setEditingBanner(null);
    setForm({
      title: "",
      subtitle: "",
      startDate: now.toISOString().slice(0, 16),
      endDate: defaultEnd.toISOString().slice(0, 16),
      isActive: true,
      couponCode: "",
      bannerType: "FESTIVE",
      bgGradient: "from-amber-600 via-red-600 to-rose-800",
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (banner: SalesBanner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      startDate: new Date(banner.startDate).toISOString().slice(0, 16),
      endDate: new Date(banner.endDate).toISOString().slice(0, 16),
      isActive: banner.isActive,
      couponCode: banner.couponCode || "",
      bannerType: banner.bannerType,
      bgGradient: banner.bgGradient,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        id: editingBanner?.id,
      };

      const method = editingBanner ? "PUT" : "POST";
      const res = await fetch("/api/admin/sales-banners", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save banner");

      toast({
        title: editingBanner ? "Banner Updated" : "Banner Created",
        description: "Promotional sales banner saved successfully.",
        variant: "success",
      });

      setIsOpen(false);
      loadBanners();
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "Failed to save banner information.",
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
          <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Sales Banners</h1>
          <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-wide">
            Manage seasonal campaigns, headers, and dynamic promo counters.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="uppercase font-bold tracking-wider text-xs h-10 gap-1.5 shrink-0">
          <Plus className="h-4.5 w-4.5" /> New Campaign
        </Button>
      </div>

      {/* Grid Banners list */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="text-sm font-bold text-foreground">No promo campaigns configured</h3>
          <p className="text-xs text-muted-foreground mt-1">Configure your first holiday drop or countdown banner here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {banners.map((b) => {
            const isCurrentlyLive = b.isActive && new Date(b.startDate) <= new Date() && new Date(b.endDate) >= new Date();
            return (
              <div key={b.id} className="border border-border rounded-lg bg-card shadow-sm overflow-hidden flex flex-col">
                
                {/* Live Preview block mimicking the actual bar */}
                <div className={`w-full bg-gradient-to-r ${b.bgGradient} ${b.textColor} px-4 py-3 text-center text-xs font-bold tracking-wide flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border`}>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] uppercase">{b.bannerType}</span>
                    <span className="uppercase font-extrabold">{b.title}</span>
                    {b.subtitle && <span className="hidden md:inline font-normal opacity-90">| {b.subtitle}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-black/25 px-1.5 py-0.5 rounded text-[10px]">Countdown Live</span>
                    {b.couponCode && (
                      <span className="border border-dashed border-white/50 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest">
                        {b.couponCode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details / Actions footer */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold bg-neutral-50/50">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      Start: {formatDateShort(b.startDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      End: {formatDateShort(b.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      Status:{" "}
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                        isCurrentlyLive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : b.isActive
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {isCurrentlyLive ? "LIVE NOW" : b.isActive ? "SCHEDULED" : "PAUSED"}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 justify-end">
                    <button
                      onClick={() => handleToggleActive(b.id, b.isActive)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-border hover:bg-neutral-50 rounded text-[10px] uppercase font-bold text-foreground transition-all shadow-sm cursor-pointer"
                      title={b.isActive ? "Pause Campaign" : "Resume Campaign"}
                    >
                      {b.isActive ? (
                        <>
                          <ToggleRight className="h-4.5 w-4.5 text-emerald-600 animate-pulse" /> Live
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4.5 w-4.5 text-neutral-400" /> Paused
                        </>
                      )}
                    </button>

                    <Button variant="outline" onClick={() => handleOpenEdit(b)} className="h-8 text-[10px] px-3 font-bold uppercase tracking-wider">
                      Edit
                    </Button>
                    
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-2 border border-rose-100 hover:border-rose-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-all shadow-sm bg-white cursor-pointer"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingBanner ? "Modify Campaign Details" : "Create Promotional Campaign"}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          <Input
            label="Campaign Title"
            required
            placeholder="e.g. DIWALI MEGA SALE"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <Input
            label="Subtitle Description (Optional)"
            placeholder="e.g. FLAT 20% OFF ON ALL SHIRTS!"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />

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

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="banner-type"
              label="Campaign Category"
              value={form.bannerType}
              onChange={(e) => setForm({ ...form, bannerType: e.target.value })}
              options={bannerTypes}
            />
            <Input
              label="Target Coupon (Optional)"
              placeholder="e.g. KK20"
              value={form.couponCode}
              onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
            />
          </div>

          <Select
            id="bg-gradient"
            label="Visual Palette (Tailwind Gradient)"
            value={form.bgGradient}
            onChange={(e) => setForm({ ...form, bgGradient: e.target.value })}
            options={gradients}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              id="is-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 accent-neutral-900 rounded cursor-pointer"
            />
            <label htmlFor="is-active" className="cursor-pointer font-bold uppercase text-[10px] text-neutral-600 tracking-wider">
              Enable Campaign immediately (If schedule matches)
            </label>
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
              Save Campaign
            </Button>
          </div>

        </form>
      </Dialog>
    </div>
  );
}
