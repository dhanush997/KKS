"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";
import { ArrowLeft, Loader2, Calendar, MapPin, CreditCard, ShoppingBag, AlertTriangle, Printer, Mail, Check } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  discount?: number;
  shippingFee?: number;
  couponCode?: string | null;
  image: string;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  shippingTotal?: number;
  discountTotal?: number;
  estimatedDeliveryDate: string;
  trackingNo?: string | null;
  trackingUrl?: string | null;
  orderItems: OrderItem[];
  address: {
    name: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const { status: sessionStatus } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleEmailInvoice = async () => {
    if (!order) return;
    setIsEmailing(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/invoice/email`, {
        method: "POST",
      });
      if (res.ok) {
        setIsEmailSent(true);
        toast({
          title: "Invoice Emailed",
          description: "A tax invoice copy has been sent to your email address.",
          variant: "success",
        });
      } else {
        throw new Error("Failed to send email");
      }
    } catch (err) {
      console.error("Error sending invoice email:", err);
      toast({
        title: "Dispatch Failed",
        description: "Unable to email the invoice at this time.",
        variant: "destructive",
      });
    } finally {
      setIsEmailing(false);
    }
  };

  // Load Order Details
  useEffect(() => {
    if (sessionStatus === "authenticated" && orderId) {
      setIsLoading(true);
      fetch(`/api/orders/${orderId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Order not found or access denied.");
          return res.json();
        })
        .then((data) => setOrder(data))
        .catch((err) => {
          console.error("Error fetching order details:", err);
          toast({
            title: "Access Denied",
            description: "Unable to retrieve order details.",
            variant: "destructive",
          });
          router.push("/profile");
        })
        .finally(() => setIsLoading(false));
    }
  }, [sessionStatus, orderId, router, toast]);

  const handleCancelOrder = async () => {
    if (!order) return;

    const confirmCancel = window.confirm("Are you sure you want to cancel this order? This will restore stocks immediately.");
    if (!confirmCancel) return;

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel order.");
      }

      toast({
        title: "Order Cancelled",
        description: "Your order has been successfully cancelled and stock restored.",
        variant: "success",
      });

      // Update local state
      setOrder((prev) => prev ? { ...prev, status: "CANCELLED", paymentStatus: "FAILED" } : null);
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      toast({
        title: "Cancellation Failed",
        description: err.message || "Failed to cancel order.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReturnOrder = async () => {
    if (!order) return;

    const confirmReturn = window.confirm("Are you sure you want to request a return? This will automatically initiate a carrier pickup at your address.");
    if (!confirmReturn) return;

    setIsReturning(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process return.");
      }

      toast({
        title: "Return Initiated",
        description: "Your return has been requested and pickup scheduled.",
        variant: "success",
      });

      // Update local state
      setOrder((prev) => prev ? { 
        ...prev, 
        status: "RETURN_REQUESTED", 
        trackingNo: data.order.trackingNo, 
        trackingUrl: data.order.trackingUrl 
      } : null);
    } catch (err: any) {
      console.error("Error returning order:", err);
      toast({
        title: "Return Request Failed",
        description: err.message || "Failed to initiate return.",
        variant: "destructive",
      });
    } finally {
      setIsReturning(false);
    }
  };

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 w-full flex-grow flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-foreground">Order details could not be resolved</h2>
        <Link href="/profile" className="mt-4 text-sm font-semibold text-gold-600 hover:underline">
          Return to My Account
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200/50",
    PROCESSING: "bg-blue-100 text-blue-800 border-blue-200/50",
    SHIPPED: "bg-indigo-100 text-indigo-800 border-indigo-200/50",
    DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-200/50",
    CANCELLED: "bg-rose-100 text-rose-800 border-rose-200/50",
    RETURN_REQUESTED: "bg-purple-100 text-purple-800 border-purple-200/50",
    RETURNED: "bg-neutral-100 text-neutral-800 border-neutral-200/50",
  };

  // Check if order can be cancelled (only PENDING or PROCESSING)
  const canCancel = order.status === "PENDING" || order.status === "PROCESSING";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-grow flex flex-col">
      {/* Return link */}
      <div className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Account
        </Link>
      </div>

      {/* Main Container */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-8">
        
        {/* Header: Order metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-foreground">
              Order <span className="text-gold-600 font-light">{order.orderNumber}</span>
            </h1>
            <p className="text-xs text-muted-foreground font-semibold mt-1">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEmailInvoice}
              disabled={isEmailing}
              className="inline-flex items-center gap-1.5 border border-neutral-200 hover:border-black px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black transition-colors rounded-none bg-white disabled:opacity-50"
            >
              {isEmailing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEmailSent ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {isEmailing ? "Emailing..." : isEmailSent ? "Invoice Emailed" : "Email Invoice"}
            </button>
            <Link
              href={`/profile/orders/${order.id}/invoice`}
              className="inline-flex items-center gap-1.5 border border-neutral-200 hover:border-black px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black transition-colors rounded-none bg-white"
            >
              <Printer className="h-4 w-4" /> Print Invoice
            </Link>
            <span className={`rounded-none border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              statusColors[order.status] || "bg-neutral-100 text-neutral-800"
            }`}>
              {order.status}
            </span>
          </div>
        </div>

        {/* Highlight Banner: Estimated Delivery */}
        {order.status !== "CANCELLED" && (
          <div className="rounded-lg border border-gold-200/50 bg-gold-50/20 p-5 flex items-start gap-4">
            <Calendar className="h-6 w-6 text-gold-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gold-800">Estimated Delivery Date</p>
              <h3 className="text-lg font-black text-gold-700 mt-1">{formatDate(order.estimatedDeliveryDate)}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">Order Date + 7 Days Delivery Guarantee.</p>
            </div>
          </div>
        )}

        {/* Highlight Banner: Tracking Info */}
        {order.trackingNo && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-5 flex items-start gap-4 shadow-sm">
            <ShoppingBag className="h-6 w-6 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-800">Shipment Tracking</p>
              <h3 className="text-sm font-bold text-foreground mt-1.5">
                Tracking Number:{" "}
                {order.trackingUrl ? (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline font-extrabold"
                  >
                    {order.trackingNo}
                  </a>
                ) : (
                  <span className="font-extrabold text-foreground">{order.trackingNo}</span>
                )}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">Click your tracking number to track your package delivery progress.</p>
            </div>
          </div>
        )}

        {/* Item list */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <ShoppingBag className="h-4.5 w-4.5 text-muted-foreground" /> Packaged Items
          </h2>
          
          <div className="divide-y divide-border border-t border-b border-border">
            {order.orderItems.map((item) => (
              <div key={item.id} className="py-4 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="relative aspect-[3/4] w-16 overflow-hidden rounded border border-border bg-neutral-50 shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-grow flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground line-clamp-1">{item.name}</h4>
                      <p className="text-xs text-muted-foreground font-semibold">Size: {item.size} | Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-extrabold text-foreground">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
                {(item.discount || 0) > 0 && (
                  <p className="text-[10px] text-rose-600 font-bold text-right">
                    Discount ({item.couponCode || "Coupon"}): -{formatPrice(item.discount || 0)}
                  </p>
                )}
                {(item.shippingFee || 0) > 0 && (
                  <p className="text-[10px] text-neutral-500 font-bold text-right">
                    Shipping: +{formatPrice(item.shippingFee || 0)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 text-sm font-semibold">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">
                  {formatPrice(order.totalAmount - (order.shippingTotal || 0) + (order.discountTotal || 0))}
                </span>
              </div>
              {(order.discountTotal || 0) > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Discounts</span>
                  <span>-{formatPrice(order.discountTotal || 0)}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-foreground">Shipping</span>
                <span className={(order.shippingTotal || 0) > 0 ? "text-foreground font-bold" : "text-emerald-600 uppercase font-bold"}>
                  {(order.shippingTotal || 0) > 0 ? formatPrice(order.shippingTotal || 0) : "Free"}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-foreground pt-1">
                <span>Total Amount Paid</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Address and payment info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border pt-6">
          {/* Destination */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <MapPin className="h-4.5 w-4.5 text-muted-foreground" /> Shipping Address
            </h3>
            <div className="text-xs text-neutral-600 leading-relaxed font-semibold">
              <p className="font-extrabold text-foreground">{order.address.name}</p>
              <p className="mt-1">Phone: {order.address.phone}</p>
              <p className="mt-2 text-neutral-500">
                {order.address.streetAddress},<br />
                {order.address.city}, {order.address.state} - {order.address.postalCode},<br />
                {order.address.country}
              </p>
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <CreditCard className="h-4.5 w-4.5 text-muted-foreground" /> Payment Details
            </h3>
            <div className="text-xs text-neutral-600 leading-relaxed font-semibold">
              <p>Method: <strong>{order.paymentMethod === "COD" ? "Cash On Delivery (COD)" : "Online Card/UPI"}</strong></p>
              <p className="mt-1.5 flex items-center gap-1">
                Status:{" "}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                  order.paymentStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {order.paymentStatus}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Cancel Order Action */}
        {canCancel && (
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" /> Need to make changes? You can cancel this order while it is still processing.
            </p>
            <Button
              onClick={handleCancelOrder}
              isLoading={isCancelling}
              variant="danger"
              className="w-full sm:w-auto uppercase font-bold tracking-wider text-xs h-10 px-6"
            >
              Cancel Order
            </Button>
          </div>
        )}

        {/* Return Order Actions */}
        {order.status === "DELIVERED" && (
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-emerald-500" /> Unsatisfied with your garment? You can request a doorstep return and pickup.
            </p>
            <Button
              onClick={handleReturnOrder}
              isLoading={isReturning}
              variant="outline"
              className="w-full sm:w-auto uppercase font-bold tracking-wider text-xs h-10 px-6 border-red-600 text-red-600 hover:bg-red-50"
            >
              Request Return
            </Button>
          </div>
        )}

        {order.status === "RETURN_REQUESTED" && (
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-indigo-500" /> Return pickup is scheduled at your address. Track using the link above.
            </p>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
              Return In Progress
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
