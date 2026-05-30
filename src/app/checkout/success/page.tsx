"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/lib/utils";
import { CheckCircle2, ShoppingBag, ArrowRight, Truck, Calendar } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "ORD-XXXXXX";
  const eddParam = searchParams.get("edd");
  const method = searchParams.get("method") || "COD";

  // Parse and format EDD
  let formattedEDD = "7 days from today";
  if (eddParam) {
    try {
      const date = new Date(decodeURIComponent(eddParam));
      formattedEDD = formatDateShort(date);
    } catch (e) {
      console.error("Error parsing EDD query parameter:", e);
    }
  }

  return (
    <div className="mx-auto max-w-lg text-center py-16 px-4 flex flex-col items-center">
      
      {/* Icon */}
      <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 mb-6 animate-bounce shadow-sm">
        <CheckCircle2 className="h-16 w-16" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-black uppercase tracking-wider text-foreground">
        Order <span className="text-gold-600 font-light">Confirmed</span>
      </h1>
      
      <p className="mt-3 text-sm text-muted-foreground font-semibold uppercase tracking-wider">
        Order ID: <span className="text-foreground font-extrabold">{orderNumber}</span>
      </p>

      <div className="mt-8 w-full rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        
        {/* Estimated Delivery Section */}
        <div className="flex items-start gap-4 text-left">
          <div className="rounded-full bg-gold-50 p-2 text-gold-600 mt-0.5">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimated Delivery Date</h4>
            <p className="text-base font-extrabold text-gold-700 mt-0.5">{formattedEDD}</p>
          </div>
        </div>

        {/* Info detail */}
        <div className="flex items-start gap-4 text-left border-t border-border pt-4">
          <div className="rounded-full bg-blue-50 p-2 text-blue-600 mt-0.5">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Status</h4>
            <p className="text-sm font-extrabold text-foreground mt-0.5">
              {method === "COD" ? "Pending Doorstep Collection" : "Paid Securely Online"}
            </p>
          </div>
        </div>

      </div>

      <p className="mt-6 text-sm text-neutral-500 font-medium max-w-sm">
        A confirmation email containing receipt copy and dispatch status tracker details has been dispatched.
      </p>

      {/* Buttons */}
      <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full">
        <Link href="/profile" className="flex-1">
          <Button variant="outline" className="w-full h-11 uppercase font-bold tracking-wider">
            View My Orders
          </Button>
        </Link>
        <Link href="/products" className="flex-1">
          <Button className="w-full h-11 uppercase font-bold tracking-wider flex items-center justify-center">
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-grow flex flex-col items-center justify-center">
      <Suspense fallback={
        <div className="flex-grow flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}

// Simple loader inline to support Suspense fallback
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
