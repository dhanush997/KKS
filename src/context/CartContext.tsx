"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string; // generated as productId-size
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
  stock: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "id" | "quantity">, quantity: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem("kk_fashion_cart");
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Error loading cart from storage:", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("kk_fashion_cart", JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  const addToCart = (product: Omit<CartItem, "id" | "quantity">, quantity: number) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (item) => item.productId === product.productId && item.size === product.size
      );

      if (existingItemIndex > -1) {
        // Item already exists, update its quantity within stock limits
        const newCart = [...prevCart];
        const newQty = newCart[existingItemIndex].quantity + quantity;
        newCart[existingItemIndex].quantity = Math.min(newQty, product.stock);
        return newCart;
      } else {
        // Add new item
        return [
          ...prevCart,
          {
            ...product,
            id: `${product.productId}-${product.size}`,
            quantity: Math.min(quantity, product.stock),
          },
        ];
      }
    });
  };

  const removeFromCart = (productId: string, size: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => !(item.productId === productId && item.size === size))
    );
  };

  const updateQuantity = (productId: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.productId === productId && item.size === size) {
          return {
            ...item,
            quantity: Math.min(quantity, item.stock),
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  // Avoid hydration mismatch by waiting for client-side load
  return (
    <CartContext.Provider
      value={{
        cart: isHydrated ? cart : [],
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount: isHydrated ? cartCount : 0,
        cartTotal: isHydrated ? cartTotal : 0,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
