"use client";

import React, { useState, useEffect } from "react";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { Search, Loader2, Users, ShoppingBag, DollarSign } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  lifetimeSpent: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCustomers(data);
          setFilteredCustomers(data);
        }
      })
      .catch((err) => console.error("Error loading customers data:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // Filter list on search input
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Customers Ledger</h1>
          <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-wide">
            View registered user profiles, order logs frequency, and gross brand spend stats.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search Name / Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Shoppers</p>
            <h3 className="text-lg font-black text-foreground mt-0.5">{customers.length}</h3>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg p-2.5 bg-amber-50 border border-amber-100 text-amber-600">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Accumulated Orders</p>
            <h3 className="text-lg font-black text-foreground mt-0.5 border-b-0">
              {customers.reduce((sum, c) => sum + c.orderCount, 0)}
            </h3>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Lifetime Gross Spent</p>
            <h3 className="text-lg font-black text-foreground mt-0.5">
              {formatPrice(customers.reduce((sum, c) => sum + c.lifetimeSpent, 0))}
            </h3>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="text-sm font-bold text-foreground">No matching customers</h3>
          <p className="text-xs text-muted-foreground mt-1">Try resetting search filters or checking spelling.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-neutral-50 border-b border-border text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Registration Date</th>
                <th className="p-4">Orders Count</th>
                <th className="p-4 text-right">Lifetime Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/50">
                  <td className="p-4 font-extrabold">{c.name}</td>
                  <td className="p-4 text-muted-foreground font-normal">{c.email}</td>
                  <td className="p-4 font-normal text-muted-foreground">{formatDateShort(c.createdAt)}</td>
                  <td className="p-4 font-extrabold">{c.orderCount}</td>
                  <td className="p-4 font-extrabold text-right">{formatPrice(c.lifetimeSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
