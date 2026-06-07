"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useToast } from "@/components/ui/toast";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { formatDateShort, formatPrice } from "@/lib/utils";
import { ShoppingBag, MapPin, User, ChevronRight, Loader2, Package, Calendar, Heart, Download } from "lucide-react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const { wishlist, toggleWishlist, isLoading: isWishlistLoading } = useWishlist();
  const { addToCart } = useCart();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "settings" | "wishlist">("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const exportBillingCSV = () => {
    if (orders.length === 0) return;
    const headers = ["Order Number", "Date", "Status", "Payment Method", "Payment Status", "Total Amount (INR)"];
    const rows = orders.map((ord) => [
      ord.orderNumber,
      new Date(ord.createdAt).toLocaleDateString(),
      ord.status,
      ord.paymentMethod,
      ord.paymentStatus,
      ord.totalAmount,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `billing_records_${session?.user?.email}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Read search params to set default tab (e.g. from header wishlist link)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "wishlist") {
        setActiveTab("wishlist");
      }
    }
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      toast({
        title: "Session Expired",
        description: "Please sign in to view your profile.",
        variant: "info",
      });
      router.push("/auth/login");
    }
  }, [status, router, toast]);

  // Load orders and addresses
  useEffect(() => {
    if (status === "authenticated") {
      setIsLoading(true);
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setOrders(data);
            
            // Extract unique addresses
            const uniqAddrs: any[] = [];
            const ids = new Set();
            data.forEach((ord: any) => {
              if (ord.address && !ids.has(ord.address.id)) {
                ids.add(ord.address.id);
                uniqAddrs.push(ord.address);
              }
            });
            setAddresses(uniqAddrs);
          }
        })
        .catch((err) => console.error("Error loading profile metrics:", err))
        .finally(() => setIsLoading(false));
    }
  }, [status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const orderStatusColors: Record<string, string> = {
    PENDING: "bg-neutral-100 text-neutral-800 border-neutral-200/50",
    PROCESSING: "bg-neutral-100 text-neutral-800 border-neutral-200/50",
    SHIPPED: "bg-neutral-900 text-white border-neutral-900",
    DELIVERED: "bg-neutral-900 text-white border-neutral-900",
    CANCELLED: "bg-red-100 text-red-800 border-red-200/50",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-grow flex flex-col">
      <h1 className="text-2xl font-black uppercase tracking-widest text-foreground border-b border-neutral-100 pb-6">
        Customer <span className="font-light">Account</span>
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-12 flex-grow">
        
        {/* Navigation Sidebar Tabs (3 Columns) */}
        <div className="lg:col-span-3">
          <nav className="flex flex-row lg:flex-col gap-1.5 border-b lg:border-b-0 pb-4 lg:pb-0 overflow-x-auto lg:overflow-x-visible scrollbar-none">
            
            {/* Orders Tab Button */}
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center space-x-3 w-full rounded-none px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 lg:border-b-0 lg:border-l-2 transition-all shrink-0 ${
                activeTab === "orders"
                  ? "border-black bg-neutral-100/70 text-foreground font-black"
                  : "border-transparent text-neutral-500 hover:bg-neutral-100/50 hover:text-foreground"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>My Orders</span>
            </button>

            {/* Wishlist Tab Button */}
            <button
              onClick={() => setActiveTab("wishlist")}
              className={`flex items-center space-x-3 w-full rounded-none px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 lg:border-b-0 lg:border-l-2 transition-all shrink-0 ${
                activeTab === "wishlist"
                  ? "border-black bg-neutral-100/70 text-foreground font-black"
                  : "border-transparent text-neutral-500 hover:bg-neutral-100/50 hover:text-foreground"
              }`}
            >
              <Heart className="h-4 w-4" />
              <span>Saved Items ({wishlist.length})</span>
            </button>

            {/* Addresses Tab Button */}
            <button
              onClick={() => setActiveTab("addresses")}
              className={`flex items-center space-x-3 w-full rounded-none px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 lg:border-b-0 lg:border-l-2 transition-all shrink-0 ${
                activeTab === "addresses"
                  ? "border-black bg-neutral-100/70 text-foreground font-black"
                  : "border-transparent text-neutral-500 hover:bg-neutral-100/50 hover:text-foreground"
              }`}
            >
              <MapPin className="h-4.5 w-4.5" />
              <span>Saved Addresses</span>
            </button>

            {/* Settings Tab Button */}
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center space-x-3 w-full rounded-none px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 lg:border-b-0 lg:border-l-2 transition-all shrink-0 ${
                activeTab === "settings"
                  ? "border-black bg-neutral-100/70 text-foreground font-black"
                  : "border-transparent text-neutral-500 hover:bg-neutral-100/50 hover:text-foreground"
              }`}
            >
              <User className="h-4.5 w-4.5" />
              <span>Profile Settings</span>
            </button>

            {/* Logout Trigger */}
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-3 w-full rounded-none px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 lg:border-b-0 lg:border-l-2 border-transparent text-red-600 hover:bg-red-50 transition-all shrink-0"
            >
              <span>Sign Out</span>
            </button>

          </nav>
        </div>

        {/* Tab Detail Views (9 Columns) */}
        <div className="lg:col-span-9 bg-white rounded-none border border-neutral-100 p-6 min-h-[50vh] flex flex-col">
          
          {isLoading && activeTab !== "wishlist" ? (
            <div className="flex-grow flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : (
            <>
              {/* ORDERS TAB VIEW */}
              {activeTab === "orders" && (
                <div className="flex-grow flex flex-col">
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-3 mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
                      Purchase History
                    </h2>
                    {orders.length > 0 && (
                      <button
                        onClick={exportBillingCSV}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-500 hover:text-black transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" /> Export Billing Records (CSV)
                      </button>
                    )}
                  </div>
                  
                  {orders.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center py-12">
                      <Package className="h-12 w-12 text-neutral-400 mb-4" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">No purchases made yet</h3>
                      <p className="text-[11px] text-neutral-500 mt-1 max-w-xs font-semibold uppercase tracking-wider">
                        Once you order garments, details will show up here to track shipping status and EDDs.
                      </p>
                      <Link href="/products" className="mt-6">
                        <Button variant="outline" size="sm" className="uppercase tracking-widest font-bold rounded-none text-xs">
                          Start Shopping
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between border border-neutral-200 rounded-none p-5 hover:border-black transition-colors"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-bold text-foreground uppercase tracking-wider">{ord.orderNumber}</span>
                              <span className={`rounded-none border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                orderStatusColors[ord.status] || "bg-neutral-100 text-neutral-800"
                              }`}>
                                {ord.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">
                              Ordered: {formatDateShort(ord.createdAt)} | Total: <strong className="text-foreground">{formatPrice(ord.totalAmount)}</strong>
                            </p>
                            <p className="text-[11px] text-black font-bold uppercase tracking-wider flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> Estimated Delivery: {formatDateShort(ord.estimatedDeliveryDate)}
                            </p>
                          </div>

                          <div className="mt-4 sm:mt-0">
                            <Link href={`/profile/orders/${ord.id}`}>
                              <Button variant="outline" size="sm" className="w-full sm:w-auto uppercase font-bold tracking-widest text-[10px] rounded-none">
                                View Details <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* WISHLIST TAB VIEW */}
              {activeTab === "wishlist" && (
                <div className="flex-grow flex flex-col">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-foreground border-b border-neutral-100 pb-3 mb-6">
                    Saved Items
                  </h2>

                  {isWishlistLoading ? (
                    <div className="flex-grow flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                    </div>
                  ) : wishlist.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center py-12">
                      <Heart className="h-12 w-12 text-neutral-400 mb-4" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Your wishlist is empty</h3>
                      <p className="text-[11px] text-neutral-500 mt-1 max-w-xs font-semibold uppercase tracking-wider">
                        Tap the heart icon on product cards to save items you love here.
                      </p>
                      <Link href="/products" className="mt-6">
                        <Button variant="outline" size="sm" className="uppercase tracking-widest font-bold rounded-none text-xs">
                          Start Exploring
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {wishlist.map((prod) => {
                        const featuredImg = prod.images?.find((i: any) => i.isFeatured)?.url || prod.images?.[0]?.url;
                        const isAvailable = prod.inventory?.some((inv: any) => inv.stock > 0);
                        const firstAvailableSize = prod.inventory?.find((inv: any) => inv.stock > 0)?.size || "M";
                        const firstAvailableStock = prod.inventory?.find((inv: any) => inv.stock > 0)?.stock || 0;

                        return (
                          <div key={prod.id} className="group border border-neutral-100 flex flex-col bg-white">
                            <Link href={`/products/${prod.id}`} prefetch={false} className="aspect-[3/4] relative w-full overflow-hidden bg-neutral-50 block">
                              <img
                                src={featuredImg}
                                alt={prod.name}
                                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                              />
                            </Link>
                            
                            <div className="p-4 flex-grow flex flex-col justify-between">
                              <div className="space-y-1">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 line-clamp-1">
                                  <Link href={`/products/${prod.id}`} prefetch={false}>{prod.name}</Link>
                                </h3>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs font-extrabold text-black">
                                    {formatPrice(prod.price)}
                                  </span>
                                  {prod.compareAtPrice && prod.compareAtPrice > prod.price && (
                                    <span className="text-[10px] text-neutral-400 line-through">
                                      {formatPrice(prod.compareAtPrice)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 space-y-2">
                                {isAvailable ? (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      addToCart({
                                        productId: prod.id,
                                        name: prod.name,
                                        price: prod.price,
                                        image: featuredImg,
                                        size: firstAvailableSize,
                                        stock: firstAvailableStock
                                      }, 1);
                                      toast({
                                        title: "Added to Bag",
                                        description: `Moved "${prod.name}" (Size ${firstAvailableSize}) to your bag.`,
                                      });
                                    }}
                                    className="w-full text-[10px] font-bold uppercase tracking-widest rounded-none bg-black text-white hover:bg-neutral-800"
                                  >
                                    Move to Bag
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    disabled
                                    className="w-full text-[10px] font-bold uppercase tracking-widest rounded-none bg-neutral-200 text-neutral-400 cursor-not-allowed"
                                  >
                                    Sold Out
                                  </Button>
                                )}
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleWishlist(prod.id)}
                                  className="w-full text-[10px] font-bold uppercase tracking-widest rounded-none border-neutral-200 text-neutral-500 hover:border-black hover:text-black transition-colors"
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ADDRESSES TAB VIEW */}
              {activeTab === "addresses" && (
                <div className="flex-grow flex flex-col">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-foreground border-b border-neutral-100 pb-3 mb-6">
                    Shipping Addresses
                  </h2>

                  {addresses.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center py-12">
                      <MapPin className="h-12 w-12 text-neutral-400 mb-4" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">No saved addresses</h3>
                      <p className="text-[11px] text-neutral-500 mt-1 max-w-xs font-semibold uppercase tracking-wider">
                        Delivery addresses are automatically saved to your profile when you check out items.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addresses.map((a) => (
                        <div key={a.id} className="border border-neutral-200 rounded-none p-5 relative bg-neutral-50/50">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">{a.name}</h4>
                          <p className="text-[10px] text-neutral-500 mt-1 font-semibold uppercase tracking-wider">Phone: {a.phone}</p>
                          <p className="text-[11px] text-neutral-600 mt-3 leading-relaxed font-semibold uppercase tracking-wider">
                            {a.streetAddress},<br />
                            {a.city}, {a.state} - {a.postalCode}<br />
                            {a.country}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS TAB VIEW */}
              {activeTab === "settings" && (
                <div className="flex-grow flex flex-col">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-foreground border-b border-neutral-100 pb-3 mb-6">
                    Profile Settings
                  </h2>

                  <div className="max-w-md space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Full Name</h3>
                      <p className="text-xs font-extrabold text-foreground mt-1 uppercase tracking-wider">{session?.user?.name}</p>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Email Address</h3>
                      <p className="text-xs font-extrabold text-foreground mt-1">{session?.user?.email}</p>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Account Role</h3>
                      <span className="inline-flex rounded-none bg-neutral-900 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white mt-1">
                        {session?.user?.role === "ADMIN" ? "Administrator" : "Customer"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
}
