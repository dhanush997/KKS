"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatPrice, calculateEDD, formatDate } from "@/lib/utils";
import { ShieldCheck, Calendar, CreditCard, Truck, Loader2, ShieldAlert } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

// Helper to load external scripts (Razorpay SDK)
function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function CheckoutForm() {
  const { data: session, status } = useSession();
  const { cart, cartTotal, clearCart } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGuest = searchParams.get("guest") === "true";

  // Form State
  const [address, setAddress] = useState({
    name: "",
    email: "",
    phone: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "RAZORPAY">("COD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  // Sandbox testing simulation modal
  const [sandboxOrderData, setSandboxOrderData] = useState<any>(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  // Redirect if not logged in and not continuing as guest
  useEffect(() => {
    if (status === "unauthenticated" && !isGuest) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to complete your checkout.",
        variant: "info",
      });
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [status, router, toast, isGuest]);

  // Load saved addresses on mount
  useEffect(() => {
    if (status === "authenticated") {
      // Pre-fill user name and email
      setAddress((prev) => ({
        ...prev,
        name: session?.user?.name || "",
        email: session?.user?.email || "",
      }));

      fetch("/api/orders") // Re-use order endpoints or address list if exists
        .then((res) => res.json())
        .then((data) => {
          // Extract unique addresses from previous orders to save time
          if (Array.isArray(data) && data.length > 0) {
            const addrs: any[] = [];
            const ids = new Set();
            data.forEach((ord: any) => {
              if (ord.address && !ids.has(ord.address.id)) {
                ids.add(ord.address.id);
                addrs.push(ord.address);
              }
            });
            setSavedAddresses(addrs);
            if (addrs.length > 0) {
              setSelectedAddressId(addrs[0].id);
            }
          }
        })
        .catch((err) => console.error("Error loading address templates:", err));
    }
  }, [status, session]);

  // Handle Saved Address Selection
  useEffect(() => {
    if (selectedAddressId && selectedAddressId !== "new") {
      const selected = savedAddresses.find((a) => a.id === selectedAddressId);
      if (selected) {
        setAddress({
          name: selected.name,
          email: selected.email || session?.user?.email || "",
          phone: selected.phone,
          streetAddress: selected.streetAddress,
          city: selected.city,
          state: selected.state,
          postalCode: selected.postalCode,
          country: selected.country,
        });
      }
    } else if (selectedAddressId === "new") {
      setAddress({
        name: session?.user?.name || "",
        email: session?.user?.email || "",
        phone: "",
        streetAddress: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      });
    }
  }, [selectedAddressId, savedAddresses, session]);

  // Calculate EDD
  const edd = calculateEDD();
  const formattedEDD = formatDate(edd);

  const handleSimulatePaymentSuccess = async () => {
    if (!sandboxOrderData) return;
    setIsSandboxOpen(false);
    setIsSubmitting(true);
    try {
      const mockResponse = {
        razorpay_order_id: sandboxOrderData.gatewayOrder.id,
        razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        razorpay_signature: "mock_signature_approved",
      };

      const verifyRes = await fetch("/api/orders/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: mockResponse.razorpay_order_id,
          razorpay_payment_id: mockResponse.razorpay_payment_id,
          razorpay_signature: mockResponse.razorpay_signature,
          orderId: sandboxOrderData.orderId,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Signature verification failed.");
      }

      toast({
        title: "Payment Verified (Sandbox)",
        description: `Order ${sandboxOrderData.orderNumber} confirmed. Receipt sent.`,
        variant: "success",
      });

      clearCart();
      router.push(`/checkout/success?orderNumber=${sandboxOrderData.orderNumber}&edd=${encodeURIComponent(edd.toISOString())}&method=RAZORPAY`);
    } catch (verifyErr: any) {
      console.error("Verification processing failed:", verifyErr);
      toast({
        title: "Verification Error",
        description: verifyErr.message || "Payment verified but database update failed. Contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatePaymentCancel = () => {
    setIsSandboxOpen(false);
    toast({
      title: "Checkout Cancelled (Sandbox)",
      description: "You closed the sandbox payment portal.",
      variant: "info",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast({
        title: "Empty Bag",
        description: "Your shopping bag is empty.",
        variant: "destructive",
      });
      return;
    }

    if (!address.name || !address.email || !address.phone || !address.streetAddress || !address.city || !address.state || !address.postalCode) {
      toast({
        title: "Missing Details",
        description: "Please fill out all shipping details, including email address.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(address.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address for delivery updates.",
        variant: "destructive",
      });
      return;
    }

    if (address.country && address.country.trim().toLowerCase() !== "india") {
      toast({
        title: "Shipping Restricted",
        description: "KK BRAND only delivers within India at this time.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Post order request to server
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
          paymentMethod,
          shippingAddress: selectedAddressId === "new" || !selectedAddressId ? address : null,
          addressId: selectedAddressId !== "new" && selectedAddressId ? selectedAddressId : null,
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to process order.");
      }

      // 2. COD Flow
      if (paymentMethod === "COD") {
        toast({
          title: "Order Placed Successfully",
          description: `Your order ${orderData.order.orderNumber} has been placed.`,
          variant: "success",
        });
        clearCart();
        router.push(`/checkout/success?orderNumber=${orderData.order.orderNumber}&edd=${encodeURIComponent(orderData.order.estimatedDeliveryDate)}&method=COD`);
        return;
      }

      // 3. Online Payment (Razorpay) Flow
      // Check if it's a mock order (sandbox mode due to placeholder credentials)
      if (orderData.gatewayOrder.id.startsWith("order_mock_")) {
        setSandboxOrderData(orderData);
        setIsSandboxOpen(true);
        setIsSubmitting(false);
        return;
      }

      const isScriptLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!isScriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Check your internet connection.");
      }

      const options = {
        key: orderData.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_your_razorpay_key_id",
        amount: orderData.gatewayOrder.amount, // in Paisa
        currency: orderData.gatewayOrder.currency,
        name: "KK Brand",
        description: `Payment for Order ${orderData.orderNumber}`,
        order_id: orderData.gatewayOrder.id,
        handler: async function (response: any) {
          try {
            setIsSubmitting(true);
            
            // Post signatures to verify endpoint
            const verifyRes = await fetch("/api/orders/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderData.orderId,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Signature verification failed.");
            }

            toast({
              title: "Payment Received",
              description: `Order ${orderData.orderNumber} confirmed. Receipt sent.`,
              variant: "success",
            });

            clearCart();
            router.push(`/checkout/success?orderNumber=${orderData.orderNumber}&edd=${encodeURIComponent(edd.toISOString())}&method=RAZORPAY`);
          } catch (verifyErr: any) {
            console.error("Verification processing failed:", verifyErr);
            toast({
              title: "Verification Error",
              description: verifyErr.message || "Payment verified but database update failed. Contact support.",
              variant: "destructive",
            });
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: address.name,
          contact: address.phone,
          email: address.email || session?.user?.email || "",
        },
        theme: {
          color: "#111827", // Rich charcoal brand color
        },
        modal: {
          ondismiss: function () {
            toast({
              title: "Checkout Cancelled",
              description: "You closed the payment portal before completion.",
              variant: "info",
            });
            setIsSubmitting(false);
          },
        },
      };

      const razorpayWidget = new (window as any).Razorpay(options);
      razorpayWidget.open();
      setIsSubmitting(false);

    } catch (error: any) {
      console.error("Order processing failure:", error);
      toast({
        title: "Checkout Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || (status === "unauthenticated" && !isGuest)) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-grow flex flex-col">
      <h1 className="text-3xl font-black uppercase tracking-wider text-foreground border-b border-border pb-6">
        Secure <span className="text-gold-600 font-light">Checkout</span>
      </h1>

      <form onSubmit={handlePlaceOrder} className="mt-8 grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-12 flex-grow">
        
        {/* Left Side: Shipping Address & Payment selector (8 Columns) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Address Templates Toggle (if user has previous orders) */}
          {savedAddresses.length > 0 && (
            <div className="bg-neutral-100/50 p-4 rounded-lg border border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
                Saved Delivery Addresses
              </h3>
              <Select
                id="saved-address"
                options={[
                  ...savedAddresses.map((a) => ({
                    value: a.id,
                    label: `${a.name} - ${a.streetAddress}, ${a.city}`,
                  })),
                  { value: "new", label: "+ Use another address" },
                ]}
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
              />
            </div>
          )}

          {/* Shipping Form Fields */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-2">
              Shipping Destination
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Full Name"
                name="name"
                required
                value={address.name}
                onChange={handleInputChange}
                disabled={selectedAddressId !== "new" && selectedAddressId !== ""}
              />
              <Input
                label="Email Address"
                name="email"
                required
                type="email"
                placeholder="email@example.com"
                value={address.email}
                onChange={handleInputChange}
                disabled={selectedAddressId !== "new" && selectedAddressId !== ""}
              />
              <Input
                label="Contact Phone"
                name="phone"
                required
                type="tel"
                value={address.phone}
                onChange={handleInputChange}
                disabled={selectedAddressId !== "new" && selectedAddressId !== ""}
              />
            </div>

            <Input
              label="Street Address"
              name="streetAddress"
              required
              value={address.streetAddress}
              onChange={handleInputChange}
              disabled={selectedAddressId !== "new" && selectedAddressId !== ""}
            />

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Input
                label="City"
                name="city"
                required
                value={address.city}
                onChange={handleInputChange}
                disabled={selectedAddressId !== "new" && selectedAddressId !== ""}
              />
              <Input
                label="State / Province"
                name="state"
                required
                value={address.state}
                onChange={handleInputChange}
                disabled={selectedAddressId !== "new" && selectedAddressId !== ""}
              />
              <Input
                label="Postal / ZIP Code"
                name="postalCode"
                required
                value={address.postalCode}
                onChange={handleInputChange}
                disabled={selectedAddressId !== "new" && selectedAddressId !== ""}
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-2">
              Payment Method
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* COD Option */}
              <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all duration-200 ${
                paymentMethod === "COD" ? "border-gold-600 bg-gold-50/10" : "border-border hover:bg-neutral-100/50"
              }`}>
                <input
                  type="radio"
                  name="payment"
                  className="mt-1 h-4 w-4 accent-gold-600"
                  checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")}
                />
                <div>
                  <span className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                    <Truck className="h-4.5 w-4.5 text-gold-600" /> Cash On Delivery (COD)
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1 font-semibold">
                    Pay with cash at your doorstep. Zero extra charges.
                  </span>
                </div>
              </label>

              {/* Razorpay Option */}
              <label className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all duration-200 ${
                paymentMethod === "RAZORPAY" ? "border-gold-600 bg-gold-50/10" : "border-border hover:bg-neutral-100/50"
              }`}>
                <input
                  type="radio"
                  name="payment"
                  className="mt-1 h-4 w-4 accent-gold-600"
                  checked={paymentMethod === "RAZORPAY"}
                  onChange={() => setPaymentMethod("RAZORPAY")}
                />
                <div>
                  <span className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                    <CreditCard className="h-4.5 w-4.5 text-gold-600" /> Online Payment
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1 font-semibold">
                    Pay securely using UPI, cards, net banking, or wallets via Razorpay.
                  </span>
                </div>
              </label>
            </div>
          </div>

        </div>

        {/* Right Side: Order Summary & Checkout CTA (4 Columns) */}
        <div className="lg:col-span-4">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm sticky top-24">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-4">
              Your Order Items
            </h2>

            {/* Scrollable list of items */}
            <div className="mt-4 max-h-[30vh] overflow-y-auto divide-y divide-border pr-2">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 py-3 text-xs font-semibold">
                  <div className="relative h-12 w-9 rounded overflow-hidden shrink-0 border border-border bg-neutral-100">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="text-foreground font-bold line-clamp-1">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">Qty: {item.quantity} | Size: {item.size}</p>
                  </div>
                  <span className="text-foreground font-bold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Financial aggregations */}
            <div className="mt-6 border-t border-border pt-4 space-y-3.5 text-sm font-semibold">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-border pb-3">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-emerald-600 uppercase font-bold">Free</span>
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-foreground pt-1">
                <span>Total Amount</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
            </div>

            {/* EDD Indicator Box */}
            <div className="mt-6 rounded-lg border border-gold-200/50 bg-gold-50/30 p-4 flex items-start gap-2.5">
              <Calendar className="h-5 w-5 text-gold-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold-800">Estimated Delivery</p>
                <p className="text-xs font-extrabold text-gold-700 mt-0.5">{formattedEDD}</p>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              type="submit"
              className="mt-6 w-full h-11 uppercase font-bold tracking-wider"
              isLoading={isSubmitting}
            >
              {paymentMethod === "COD" ? "Place Order (COD)" : "Pay and Confirm"}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Secure 256-bit SSL transaction
            </div>
          </div>
        </div>

      </form>

      {/* RAZORPAY SANDBOX SIMULATOR MODAL */}
      <Dialog
        isOpen={isSandboxOpen}
        onClose={handleSimulatePaymentCancel}
        title="Razorpay Sandbox Testing"
        className="max-w-md"
      >
        {sandboxOrderData && (
          <div className="space-y-6 text-xs font-semibold">
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 uppercase tracking-wide">Developer Sandbox Mode</h4>
                <p className="text-amber-700 font-medium mt-1 leading-relaxed">
                  Real Razorpay credentials are not configured in your `.env`. You are in **Sandbox Mode** using a mock gateway.
                </p>
              </div>
            </div>

            <div className="divide-y divide-border border rounded-lg px-4 bg-neutral-50/50">
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Order Number</span>
                <span className="text-foreground font-extrabold">{sandboxOrderData.orderNumber}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-muted-foreground">Gateway ID</span>
                <span className="text-foreground font-extrabold text-[10px]">{sandboxOrderData.gatewayOrder.id}</span>
              </div>
              <div className="flex justify-between py-3 font-extrabold text-foreground bg-neutral-100/50 -mx-4 px-4">
                <span>Grand Total</span>
                <span>{formatPrice(sandboxOrderData.gatewayOrder.amount / 100)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={handleSimulatePaymentSuccess}
                className="w-full h-11 uppercase font-bold tracking-wider"
              >
                Simulate Successful Payment
              </Button>
              <Button
                variant="outline"
                onClick={handleSimulatePaymentCancel}
                className="w-full h-11 uppercase font-bold tracking-wider"
              >
                Cancel / Decline Payment
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  );
}
