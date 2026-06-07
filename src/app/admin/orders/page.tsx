"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatPrice, formatDateShort } from "@/lib/utils";
import { Search, Loader2, Eye, MapPin, CreditCard, Calendar, Download } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

interface OrderItem {
  id: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  discount?: number;
  shippingFee?: number;
  couponCode?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  shippingTotal: number;
  discountTotal: number;
  estimatedDeliveryDate: string;
  trackingNo?: string | null;
  trackingUrl?: string | null;
  user: {
    name: string;
    email: string;
  };
  address: {
    name: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  orderItems: OrderItem[];
}

export default function AdminOrdersPage() {
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Details Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // Tracking State
  const [trackingNo, setTrackingNo] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [isTrackingUpdating, setIsTrackingUpdating] = useState(false);
  const [isInvoiceEmailing, setIsInvoiceEmailing] = useState(false);
  const [isInvoiceEmailed, setIsInvoiceEmailed] = useState(false);

  const handleEmailInvoiceToCustomer = async () => {
    if (!selectedOrder) return;
    setIsInvoiceEmailing(true);
    setIsInvoiceEmailed(false);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/invoice/email`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email.");
      }
      setIsInvoiceEmailed(true);
      toast({
        title: "Invoice Sent",
        description: "Tax invoice has been successfully emailed to the customer.",
        variant: "success",
      });
    } catch (err: any) {
      console.error("Error emailing invoice:", err);
      toast({
        title: "Email Dispatch Failed",
        description: err.message || "Failed to email invoice copy.",
        variant: "destructive",
      });
    } finally {
      setIsInvoiceEmailing(false);
    }
  };

  const exportAllOrdersToCSV = () => {
    if (orders.length === 0) return;
    const headers = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Date",
      "Fulfillment Status",
      "Payment Method",
      "Payment Status",
      "Total Amount (INR)",
      "Shipping Address",
      "Tracking Number"
    ];
    const rows = orders.map((ord) => [
      ord.orderNumber,
      ord.user?.name || "Guest",
      ord.user?.email || "N/A",
      new Date(ord.createdAt).toLocaleDateString(),
      ord.status,
      ord.paymentMethod,
      ord.paymentStatus,
      ord.totalAmount,
      `"${ord.address?.streetAddress || ''}, ${ord.address?.city || ''}, ${ord.address?.state || ''}"`,
      ord.trackingNo || "N/A"
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `all_store_billing_records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadOrders = (search: string = "") => {
    setIsLoading(true);
    const url = search ? `/api/orders?search=${encodeURIComponent(search)}` : "/api/orders";
    
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch((err) => console.error("Error loading admin orders:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders(searchQuery);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setIsStatusUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update order status.");
      }

      toast({
        title: "Status Updated",
        description: `Order has been marked as ${newStatus}.`,
        variant: "success",
      });

      // Update local tables
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      console.error("Error updating order status:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update status details.",
        variant: "destructive",
      });
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleOpenDetails = (ord: Order) => {
    setSelectedOrder(ord);
    setTrackingNo(ord.trackingNo || "");
    setTrackingUrl(ord.trackingUrl || "");
    setIsInvoiceEmailed(false);
    setIsDetailsOpen(true);
  };

  const handleUpdateTracking = async () => {
    if (!selectedOrder) return;
    setIsTrackingUpdating(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNo, trackingUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update tracking details.");
      }

      toast({
        title: "Tracking Updated",
        description: "Order tracking information has been saved successfully.",
        variant: "success",
      });

      // Update local tables
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id ? { ...o, trackingNo, trackingUrl } : o
        )
      );

      setSelectedOrder((prev) =>
        prev ? { ...prev, trackingNo, trackingUrl } : null
      );
    } catch (err: any) {
      console.error("Error updating tracking details:", err);
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update tracking details.",
        variant: "destructive",
      });
    } finally {
      setIsTrackingUpdating(false);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200/50",
    PROCESSING: "bg-blue-100 text-blue-800 border-blue-200/50",
    SHIPPED: "bg-indigo-100 text-indigo-800 border-indigo-200/50",
    DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200/50",
    CANCELLED: "bg-rose-100 text-rose-800 border-rose-200/50",
  };

  const statusOptions = [
    { value: "PENDING", label: "Pending" },
    { value: "PROCESSING", label: "Processing" },
    { value: "SHIPPED", label: "Shipped" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
        <div className="flex-grow">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Orders Queue</h1>
              <p className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-wide">
                Track customer deliveries, update fulfillment status, or cancel bookings.
              </p>
            </div>
            {orders.length > 0 && (
              <button
                onClick={exportAllOrdersToCSV}
                className="inline-flex items-center gap-1.5 border border-neutral-200 hover:border-black px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-neutral-600 hover:text-black transition-all bg-white"
              >
                <Download className="h-3.5 w-3.5" /> Export Sales Records (CSV)
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search Order ID / Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        </form>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <h3 className="text-sm font-bold text-foreground">No orders logged</h3>
          <p className="text-xs text-muted-foreground mt-1">Order logs will compile here as customers checkout garments.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-neutral-50 border-b border-border text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Date</th>
                <th className="p-4">Fulfillment Status</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Total</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-neutral-50/50">
                  <td className="p-4 font-extrabold">{ord.orderNumber}</td>
                  <td className="p-4">
                    {ord.user?.name}
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{ord.user?.email}</p>
                  </td>
                  <td className="p-4 text-muted-foreground font-normal">{formatDateShort(ord.createdAt)}</td>
                  <td className="p-4">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      statusColors[ord.status] || "bg-neutral-100 text-neutral-800"
                    }`}>
                      {ord.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      ord.paymentStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {ord.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4 font-extrabold">{formatPrice(ord.totalAmount)}</td>
                  <td className="p-4 text-right">
                    <div className="inline-flex gap-2">
                      {/* Status Change Selector Inline */}
                      <select
                        value={ord.status}
                        onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                        disabled={isStatusUpdating}
                        className="h-8 rounded border border-input bg-background px-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleOpenDetails(ord)}
                        className="p-1.5 rounded hover:bg-neutral-100 text-muted-foreground hover:text-foreground"
                        title="View Details"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL DIALOG */}
      <Dialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedOrder ? `Order Details: ${selectedOrder.orderNumber}` : ""}
        className="max-w-xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            
            {/* Header specs */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Placed Date</p>
                <p className="text-sm font-extrabold mt-0.5 text-foreground">{formatDateShort(selectedOrder.createdAt)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-right">EDD Guarantee</p>
                <p className="text-sm font-extrabold mt-0.5 text-gold-700 text-right">{formatDateShort(selectedOrder.estimatedDeliveryDate)}</p>
              </div>
            </div>

            {/* Packaged items */}
            <div className="space-y-2 border-t border-border pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Packaged Items</h4>
              <div className="divide-y divide-border border rounded-lg px-4 overflow-hidden bg-neutral-50/50">
                {selectedOrder.orderItems.map((item) => (
                  <div key={item.id} className="py-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-foreground">{item.name}</span>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Size: {item.size} | Qty: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-foreground">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    {(item.discount || 0) > 0 && (
                      <p className="text-[10px] text-rose-600 font-bold mt-1 text-right">
                        Discount ({item.couponCode || "Coupon"}): -{formatPrice(item.discount || 0)}
                      </p>
                    )}
                    {(item.shippingFee || 0) > 0 && (
                      <p className="text-[10px] text-neutral-500 font-bold mt-0.5 text-right">
                        Shipping: +{formatPrice(item.shippingFee || 0)}
                      </p>
                    )}
                  </div>
                ))}

                {/* Subtotal row */}
                <div className="flex justify-between items-center py-2 text-xs font-semibold text-muted-foreground border-t border-border bg-neutral-100/10 -mx-4 px-4">
                  <span>Subtotal</span>
                  <span>{formatPrice(selectedOrder.totalAmount - (selectedOrder.shippingTotal || 0) + (selectedOrder.discountTotal || 0))}</span>
                </div>

                {/* Discount Total row */}
                {(selectedOrder.discountTotal || 0) > 0 && (
                  <div className="flex justify-between items-center py-2 text-xs font-bold text-rose-600 -mx-4 px-4 bg-neutral-100/10">
                    <span>Discounts</span>
                    <span>-{formatPrice(selectedOrder.discountTotal)}</span>
                  </div>
                )}

                {/* Shipping Total row */}
                <div className="flex justify-between items-center py-2 text-xs font-semibold text-muted-foreground -mx-4 px-4 bg-neutral-100/10">
                  <span>Shipping Total</span>
                  <span>{(selectedOrder.shippingTotal || 0) > 0 ? formatPrice(selectedOrder.shippingTotal) : "Free"}</span>
                </div>

                {/* Grand Total row */}
                <div className="flex justify-between items-center py-3 text-xs font-extrabold text-foreground border-t border-border bg-neutral-100/50 -mx-4 px-4">
                  <span>Grand Total</span>
                  <span>{formatPrice(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Shipping destination */}
            <div className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground">Shipping Destination</h4>
                <p className="font-extrabold text-foreground mt-1">{selectedOrder.address.name}</p>
                <p className="text-neutral-500 font-semibold mt-0.5">
                  {selectedOrder.address.streetAddress},<br />
                  {selectedOrder.address.city}, {selectedOrder.address.state} - {selectedOrder.address.postalCode},<br />
                  Phone: {selectedOrder.address.phone}
                </p>
              </div>
            </div>

            {/* Payment status */}
            <div className="flex items-start gap-2 border-t border-border pt-4 text-xs">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold uppercase tracking-wider text-muted-foreground">Payment Specifications</h4>
                <p className="mt-1 font-semibold text-foreground">
                  Gateway: <strong>{selectedOrder.paymentMethod}</strong> | Status:{" "}
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                    selectedOrder.paymentStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </p>
              </div>
            </div>

            {/* Tracking Information */}
            <div className="space-y-3 border-t border-border pt-4 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-muted-foreground">Parcel Tracking (Fulfillment)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Tracking Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TRK123456789"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    className="h-9 w-full rounded border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Tracking Link / URL</label>
                  <input
                    type="text"
                    placeholder="e.g. https://track.provider.com/..."
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    className="h-9 w-full rounded border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleUpdateTracking}
                  isLoading={isTrackingUpdating}
                  className="uppercase tracking-wider font-bold text-[10px] h-8 px-4"
                >
                  Save Tracking Info
                </Button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <Button
                onClick={handleEmailInvoiceToCustomer}
                isLoading={isInvoiceEmailing}
                className="uppercase tracking-wider font-bold text-xs h-10 px-6 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200"
              >
                {isInvoiceEmailed ? "Invoice Sent ✓" : "Email Invoice to Customer"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDetailsOpen(false)}
                className="uppercase tracking-wider font-bold text-xs h-10 px-6"
              >
                Close details
              </Button>
            </div>

          </div>
        )}
      </Dialog>

    </div>
  );
}
