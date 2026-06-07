"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { formatPrice, calculateEDD, formatDate } from "@/lib/utils";
import { Trash2, ShoppingBag, ArrowRight, Calendar, ArrowLeft } from "lucide-react";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();

  const edd = calculateEDD();
  const formattedEDD = formatDate(edd);

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 w-full flex-grow flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-neutral-100 p-6 mb-6">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Your bag is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm font-medium">
          Looks like you haven't added any garments to your bag yet. Explore our premium collections to start.
        </p>
        <Link href="/products" className="mt-8">
          <Button className="h-11 px-8 uppercase font-bold tracking-wider">
            Explore Collections
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-grow flex flex-col">
      <h1 className="text-3xl font-black uppercase tracking-wider text-foreground border-b border-border pb-6">
        Shopping <span className="text-gold-600 font-light">Bag</span>
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-12 flex-grow">
        
        {/* Cart Item List (Left 8 columns) */}
        <div className="lg:col-span-8 space-y-6">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 py-6 border-b border-border last:border-b-0"
            >
              {/* Product Image */}
              <div className="relative aspect-[3/4] w-24 overflow-hidden rounded-md border border-border bg-neutral-100 shrink-0">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  unoptimized={item.image.startsWith("data:")}
                />
              </div>

              {/* Item Information */}
              <div className="flex-grow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground hover:text-gold-600 transition-colors">
                    <Link href={`/products/${item.productId}`} prefetch={false}>{item.name}</Link>
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    Size: {item.size} {item.color && `| Color: ${item.color}`}
                  </p>
                  <p className="text-sm font-extrabold text-foreground mt-1">
                    {formatPrice(item.price)}
                  </p>
                </div>

                {/* Actions: Quantity & Delete */}
                <div className="flex items-center justify-between sm:justify-end gap-6">
                  {/* Quantity selector */}
                  <div className="flex items-center rounded-md border border-input h-9 bg-background">
                    <button
                      onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1, item.color)}
                      className="px-2.5 text-muted-foreground hover:text-foreground h-full font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1, item.color)}
                      className="px-2.5 text-muted-foreground hover:text-foreground h-full font-bold text-sm"
                      disabled={item.quantity >= item.stock}
                    >
                      +
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.productId, item.size, item.color)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-neutral-100"
                    title="Remove item"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4">
            <Link
              href="/products"
              className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order Summary (Right 4 columns) */}
        <div className="lg:col-span-4">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm sticky top-24">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-4">
              Order Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm font-semibold">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal ({cartCount} items)</span>
                <span className="text-foreground">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-emerald-600 uppercase font-bold">Free</span>
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-foreground pt-2">
                <span>Total Gross</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
            </div>

            {/* Estimated Delivery Box */}
            <div className="mt-6 rounded-lg border border-gold-200/50 bg-gold-50/30 p-4 flex items-start gap-2.5">
              <Calendar className="h-5 w-5 text-gold-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold-800">Estimated Delivery Date</p>
                <p className="text-xs font-extrabold text-gold-700 mt-0.5">{formattedEDD}</p>
              </div>
            </div>

            {/* Checkout CTA */}
            <Link href="/checkout" className="mt-6 block w-full">
              <Button className="w-full h-11 uppercase font-bold tracking-wider flex items-center justify-center">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <p className="mt-4 text-[10px] text-center text-muted-foreground font-semibold">
              Tax calculation and final payment details completed at Checkout.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
