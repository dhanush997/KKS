"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { DollarSign, ShoppingBag, Folder, Users, Loader2, ArrowUpRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load metrics.");
        return res.json();
      })
      .then((data) => {
        setStats(data.stats);
        setRecentOrders(data.recentOrders || []);
      })
      .catch((err) => console.error("Error loading dashboard data:", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cards = [
    {
      title: "Total Revenue",
      value: formatPrice(stats?.totalRevenue || 0),
      description: "Gross revenue generated (excluding cancelled orders)",
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      description: "Total order placements logged in DB",
      icon: ShoppingBag,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      title: "Active Catalog",
      value: stats?.totalProducts || 0,
      description: "Garments and items currently cataloged",
      icon: Folder,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Total Patrons",
      value: stats?.totalCustomers || 0,
      description: "Registered shopper customer profiles",
      icon: Users,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
  ];

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200/50",
    PROCESSING: "bg-blue-100 text-blue-800 border-blue-200/50",
    SHIPPED: "bg-indigo-100 text-indigo-800 border-indigo-200/50",
    DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200/50",
    CANCELLED: "bg-rose-100 text-rose-800 border-rose-200/50",
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-wide">
          Overview of store performance metrics and order queues
        </p>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{card.title}</span>
                <div className={`rounded-lg p-2 border ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-foreground">{card.value}</h3>
                <p className="text-[10px] text-muted-foreground mt-1 font-semibold leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Recent Orders List (8 Columns) */}
        <div className="lg:col-span-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Recent Order Placements</h2>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm" className="text-xs font-bold uppercase tracking-wider text-gold-600">
                View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center font-semibold">No orders logged in database yet.</p>
          ) : (
            <div className="divide-y divide-border overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="text-muted-foreground uppercase tracking-wider border-b border-border pb-3">
                    <th className="pb-3">Order</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-neutral-50/50">
                      <td className="py-3.5 font-extrabold">{ord.orderNumber}</td>
                      <td className="py-3.5">{ord.user?.name || "Customer"}</td>
                      <td className="py-3.5 font-extrabold">{formatPrice(ord.totalAmount)}</td>
                      <td className="py-3.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          statusColors[ord.status] || "bg-neutral-100 text-neutral-800"
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-muted-foreground">{formatDateShort(ord.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Business Tips / Insights (4 Columns) */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="pb-4 border-b border-border">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Store Insights</h2>
          </div>
          
          <div className="mt-6 flex-grow space-y-4 text-xs font-semibold leading-relaxed">
            <div className="rounded-lg bg-gold-50/20 p-4 border border-gold-200/50 text-gold-800">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <TrendingUp className="h-4.5 w-4.5 text-gold-600" /> Catalog Control
              </div>
              <p className="mt-1.5 text-gold-700">
                You have {stats?.totalProducts || 0} products active. Keep inventory stocks updated for key sizes (S, M, L) to ensure smooth sales.
              </p>
            </div>
            
            <div className="text-muted-foreground p-3 border border-border rounded-lg bg-neutral-50/30">
              <h4 className="text-foreground font-bold mb-1">Razorpay Sandbox</h4>
              Make sure to switch Razorpay credentials in your production .env before accepting live customer cards.
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-6">
            <Link href="/admin/products" className="block w-full">
              <Button variant="outline" className="w-full text-xs font-bold uppercase tracking-wider h-10">
                Manage Catalog Items
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
