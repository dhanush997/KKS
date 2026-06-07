"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatDateShort, formatPrice } from "@/lib/utils";
import { CheckCircle2, ArrowRight, Truck, Calendar, Printer, Package, MapPin, CreditCard } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  discount?: number;
  shippingFee?: number;
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

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "ORD-XXXXXX";
  const orderId = searchParams.get("orderId");
  const eddParam = searchParams.get("edd");
  const method = searchParams.get("method") || "COD";

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      setIsLoading(true);
      fetch(`/api/orders/${orderId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Order not found");
          return res.json();
        })
        .then((data) => setOrder(data))
        .catch((err) => console.error("Error loading success page order details:", err))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [orderId]);

  // Parse and format EDD
  let formattedEDD = "7 days from today";
  if (eddParam) {
    try {
      const date = new Date(decodeURIComponent(eddParam));
      formattedEDD = formatDateShort(date);
    } catch (e) {
      console.error("Error parsing EDD query parameter:", e);
    }
  } else if (order) {
    formattedEDD = formatDateShort(new Date(order.estimatedDeliveryDate));
  }

  return (
    <div className="mx-auto max-w-2xl text-center py-10 px-4 flex flex-col items-center">
      
      {/* Icon */}
      <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 mb-6 animate-bounce shadow-xs">
        <CheckCircle2 className="h-16 w-16" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">
        Order <span className="text-gold-600 font-light">Confirmed</span>
      </h1>
      
      <p className="mt-3 text-xs text-muted-foreground font-black uppercase tracking-wider">
        Thank you! Your order <span className="text-foreground font-extrabold">{orderNumber}</span> has been received.
      </p>

      {isLoading ? (
        <div className="mt-12 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Retrieving order details...</p>
        </div>
      ) : (
        <div className="mt-8 w-full space-y-6 text-left">
          
          {/* Summary Row Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Delivery Info */}
            <div className="rounded-none border border-neutral-100 bg-neutral-50/50 p-5 flex items-start gap-3.5">
              <div className="rounded-none bg-gold-50 p-2 text-gold-700 shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Delivery Guarantee</h4>
                <p className="text-sm font-extrabold text-gold-700 mt-1">{formattedEDD}</p>
                <p className="text-[9px] text-neutral-400 mt-0.5 uppercase font-bold tracking-wider">Standard Hub Dispatch</p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="rounded-none border border-neutral-100 bg-neutral-50/50 p-5 flex items-start gap-3.5">
              <div className="rounded-none bg-neutral-100 p-2 text-neutral-800 shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Payment Status</h4>
                <p className="text-sm font-extrabold text-neutral-800 mt-1">
                  {method === "COD" ? "Cash On Delivery (COD)" : "Paid Securely Online"}
                </p>
                <p className="text-[9px] text-emerald-600 mt-0.5 uppercase font-bold tracking-wider">
                  {method === "COD" ? "Collect at doorstep" : "Transaction Verified"}
                </p>
              </div>
            </div>
          </div>

          {order && (
            <>
              {/* Order Items Summary Card */}
              <div className="rounded-none border border-neutral-200 bg-white p-6 shadow-2xs space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-black flex items-center gap-1.5 border-b border-neutral-100 pb-3">
                  <Package className="h-4.5 w-4.5 text-neutral-400" /> Ordered Items ({order.orderItems.length})
                </h3>
                
                <div className="divide-y divide-neutral-100 max-h-[30vh] overflow-y-auto pr-1">
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="py-3 flex justify-between items-center gap-4 text-xs font-semibold">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-9 border border-neutral-100 bg-neutral-50 shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div>
                          <p className="text-black font-extrabold line-clamp-1 uppercase tracking-wide">{item.name}</p>
                          <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Size: {item.size} | Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="text-black font-extrabold">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-200 pt-3 flex justify-between items-center text-sm font-extrabold text-black">
                  <span>Grand Total</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>

              {/* Delivery Destination Address */}
              <div className="rounded-none border border-neutral-200 bg-white p-6 shadow-2xs flex items-start gap-4">
                <MapPin className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold uppercase tracking-wider">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Shipping Destination</h4>
                  <p className="font-extrabold text-black">{order.address.name}</p>
                  <p className="text-[10px] text-neutral-500 font-normal mt-0.5">Phone: {order.address.phone}</p>
                  <p className="text-[10px] text-neutral-400 mt-2 font-normal leading-relaxed">
                    {order.address.streetAddress}, {order.address.city}, {order.address.state} - {order.address.postalCode}
                  </p>
                </div>
              </div>

              {/* Invoice Generation Trigger */}
              <div className="bg-neutral-900 text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Need a Billing Receipt?</h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5 font-bold uppercase tracking-wider">Download and print your official purchase invoice record.</p>
                </div>
                <Link
                  href={`/profile/orders/${order.id}/invoice`}
                  className="w-full sm:w-auto text-center bg-white hover:bg-neutral-100 text-black px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Printer className="h-4 w-4" /> Print Invoice
                </Link>
              </div>
            </>
          )}

        </div>
      )}

      <p className="mt-8 text-[11px] text-neutral-400 font-bold uppercase tracking-wider max-w-sm">
        A confirmation email containing receipt copy and dispatch status tracker details has been dispatched.
      </p>

      {/* Navigation Buttons */}
      <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full">
        <Link href="/profile" className="flex-1">
          <Button variant="outline" className="w-full h-11 uppercase font-bold tracking-wider rounded-none">
            View My Orders
          </Button>
        </Link>
        <Link href="/products" className="flex-1">
          <Button className="w-full h-11 uppercase font-bold tracking-wider flex items-center justify-center rounded-none">
            Shop More
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>

    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-grow flex flex-col items-center justify-center bg-white">
      <Suspense fallback={
        <div className="flex-grow flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}
