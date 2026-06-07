"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatPrice } from "@/lib/utils";
import { ArrowLeft, Printer, Download, Loader2, Mail, Check } from "lucide-react";

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
    email?: string | null;
  };
  user: {
    name: string;
    email: string;
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InvoicePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const { status: sessionStatus } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleEmailInvoice = async (quiet = false) => {
    if (!orderId) return;
    if (!quiet) setIsEmailSending(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice/email`, {
        method: "POST",
      });
      if (res.ok) {
        setIsEmailSent(true);
        if (!quiet) {
          toast({
            title: "Invoice Emailed",
            description: "A copy of the tax invoice has been sent to your email.",
            variant: "success",
          });
        }
      } else {
        throw new Error("Failed to send email");
      }
    } catch (err) {
      console.error("Error emailing invoice:", err);
      if (!quiet) {
        toast({
          title: "Email Failed",
          description: "Unable to email the invoice copy.",
          variant: "destructive",
        });
      }
    } finally {
      if (!quiet) setIsEmailSending(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === "authenticated" && orderId) {
      setIsLoading(true);
      fetch(`/api/orders/${orderId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Order not found");
          return res.json();
        })
        .then((data) => {
          setOrder(data);
          
          // Auto-trigger invoice emailing in background on initial load
          handleEmailInvoice(true);

          // Trigger print dialog after content loads
          setTimeout(() => {
            if (typeof window !== "undefined") {
              window.print();
            }
          }, 800);
        })
        .catch((err) => {
          console.error("Error loading invoice:", err);
          toast({
            title: "Error",
            description: "Unable to load invoice details.",
            variant: "destructive",
          });
          router.push("/profile");
        })
        .finally(() => setIsLoading(false));
    }
  }, [sessionStatus, orderId, router, toast]);

  if (sessionStatus === "loading" || isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[70vh] bg-white print:hidden">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-800" />
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Generating Invoice PDF...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center print:hidden">
        <h2 className="text-xl font-bold text-foreground">Invoice could not be resolved</h2>
        <Link href="/profile" className="mt-4 inline-block text-sm font-semibold text-neutral-800 hover:underline">
          Return to My Account
        </Link>
      </div>
    );
  }

  const subtotal = order.totalAmount - (order.shippingTotal || 0) + (order.discountTotal || 0);

  return (
    <div className="min-h-screen bg-neutral-50/50 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:py-0">
      
      {/* Print Actions Toolbar - Hidden during print */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/profile/orders/${order.id}`}
          className="inline-flex items-center text-xs font-black uppercase tracking-wider text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Order
        </Link>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleEmailInvoice(false)}
            disabled={isEmailSending}
            className="inline-flex items-center gap-1.5 border border-neutral-200 hover:border-black bg-white text-neutral-700 hover:text-black px-4 py-2 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {isEmailSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEmailSent ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {isEmailSending ? "Emailing..." : isEmailSent ? "Invoice Sent" : "Email Copy"}
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white px-4 py-2 text-xs font-black uppercase tracking-wider transition-all"
          >
            <Printer className="h-4 w-4" /> Print Invoice
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="max-w-3xl mx-auto bg-white border border-neutral-200 p-8 sm:p-12 shadow-xs print:shadow-none print:border-none print:p-0">
        
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-neutral-100 pb-8">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-7 w-7 text-black" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="10">
                <path d="M 42 32 L 42 88"/>
                <path d="M 42 60 L 60 35 M 42 60 L 60 85"/>
                <path d="M 78 32 L 78 88"/>
                <path d="M 78 60 L 60 35 M 78 60 L 60 85"/>
              </svg>
              <span className="text-lg font-black uppercase tracking-[0.2em] text-black">KK BRAND</span>
            </div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-2 leading-relaxed">
              KK Fashion Store Private Limited<br />
              Premium Retail Hub, Brigade Road<br />
              Bangalore, Karnataka - 560001<br />
              support@fashionstore.com
            </p>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-xl font-black uppercase tracking-widest text-black">INVOICE</h1>
            <div className="mt-3 space-y-1 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              <p className="text-black">Invoice No: <span className="font-black">{order.orderNumber}</span></p>
              <p>Date: {formatDate(order.createdAt)}</p>
              <p>Payment: {order.paymentMethod === "COD" ? "Cash on Delivery" : "Razorpay Online"}</p>
              <p>Payment Status: <span className={order.paymentStatus === "COMPLETED" ? "text-emerald-600 font-black" : "text-amber-600 font-black"}>{order.paymentStatus}</span></p>
            </div>
          </div>
        </div>

        {/* Customer Address Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-neutral-100">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Billed To</h3>
            <div className="text-[11px] text-black font-semibold leading-relaxed uppercase tracking-wider">
              <p className="font-extrabold text-black">{order.user.name}</p>
              <p className="lowercase font-normal text-neutral-500">{order.user.email}</p>
              <p className="mt-2 text-neutral-500 font-normal">
                {order.address.streetAddress}<br />
                {order.address.city}, {order.address.state} - {order.address.postalCode}<br />
                {order.address.country}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Shipped To</h3>
            <div className="text-[11px] text-black font-semibold leading-relaxed uppercase tracking-wider">
              <p className="font-extrabold text-black">{order.address.name}</p>
              <p className="text-neutral-500 font-normal">Phone: {order.address.phone}</p>
              <p className="mt-2 text-neutral-500 font-normal">
                {order.address.streetAddress}<br />
                {order.address.city}, {order.address.state} - {order.address.postalCode}<br />
                {order.address.country}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="py-8">
          <table className="w-full text-left text-[11px] font-semibold uppercase tracking-wider">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-400 pb-2 text-[10px] font-black">
                <th className="py-2.5">Item Description</th>
                <th className="py-2.5 text-center">Size</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 text-right">Unit Price</th>
                <th className="py-2.5 text-right">Discount</th>
                <th className="py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {order.orderItems.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/50">
                  <td className="py-3 font-extrabold text-black">
                    {item.name}
                  </td>
                  <td className="py-3 text-center text-neutral-500">{item.size}</td>
                  <td className="py-3 text-center text-neutral-500">{item.quantity}</td>
                  <td className="py-3 text-right text-neutral-500">{formatPrice(item.price)}</td>
                  <td className="py-3 text-right text-rose-600 font-bold">
                    {item.discount && item.discount > 0 ? `-${formatPrice(item.discount)}` : "—"}
                  </td>
                  <td className="py-3 text-right font-extrabold text-black">
                    {formatPrice((item.price * item.quantity) - (item.discount || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary Totals */}
        <div className="flex justify-end border-t border-neutral-100 pt-6">
          <div className="w-64 space-y-2 text-[11px] font-semibold uppercase tracking-wider">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {order.discountTotal && order.discountTotal > 0 ? (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Total Discounts</span>
                <span>-{formatPrice(order.discountTotal)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-neutral-500">
              <span>Shipping Fee</span>
              <span>{order.shippingTotal && order.shippingTotal > 0 ? formatPrice(order.shippingTotal) : "Free"}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-sm font-extrabold text-black">
              <span>Grand Total</span>
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Invoice Footer Details */}
        <div className="mt-16 border-t border-neutral-100 pt-8 text-center">
          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed">
            Thank you for shopping at KK BRAND.<br />
            This is a computer-generated document and does not require a physical signature.<br />
            For any return queries or support, please email support@fashionstore.com referencing your Invoice No.
          </p>
        </div>

      </div>
    </div>
  );
}
