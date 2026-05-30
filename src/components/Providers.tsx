"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ToastProvider } from "@/components/ui/toast";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <CartProvider>
        <ToastProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </ToastProvider>
      </CartProvider>
    </SessionProvider>
  );
}

