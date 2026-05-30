"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

interface WishlistContextType {
  wishlist: any[];
  wishlistIds: Set<string>;
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  isLoading: boolean;
  fetchWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [wishlist, setWishlist] = useState<any[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const fetchWishlist = async () => {
    if (status !== "authenticated") return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        setWishlist(data);
        setWishlistIds(new Set(data.map((item: any) => item.id)));
      }
    } catch (err) {
      console.error("Error fetching wishlist:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch wishlist when authenticated
  useEffect(() => {
    if (status === "authenticated") {
      fetchWishlist();
    } else if (status === "unauthenticated") {
      setWishlist([]);
      setWishlistIds(new Set());
    }
  }, [status]);

  const toggleWishlist = async (productId: string) => {
    if (status !== "authenticated") {
      toast({
        title: "Sign in Required",
        description: "Please sign in to add items to your wishlist.",
        variant: "info",
      });
      router.push("/auth/login");
      return;
    }

    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Optimistically or directly update local state
        if (data.wishlisted) {
          // Added
          setWishlistIds((prev) => {
            const next = new Set(prev);
            next.add(productId);
            return next;
          });
          toast({
            title: "Added to Wishlist",
            description: "Garment successfully saved to your account.",
            variant: "default",
          });
        } else {
          // Removed
          setWishlistIds((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
          toast({
            title: "Removed from Wishlist",
            description: "Item removed from your saved list.",
            variant: "default",
          });
        }
        // Refresh full list
        fetchWishlist();
      } else {
        toast({
          title: "Error",
          description: "Failed to update wishlist. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error toggling wishlist:", err);
      toast({
        title: "Connection Error",
        description: "Could not sync wishlist with server.",
        variant: "destructive",
      });
    }
  };

  const isInWishlist = (productId: string) => wishlistIds.has(productId);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistIds,
        toggleWishlist,
        isInWishlist,
        isLoading,
        fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
