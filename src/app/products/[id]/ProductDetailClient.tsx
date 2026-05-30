"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice, calculateEDD, formatDate } from "@/lib/utils";
import { AlertTriangle, ShieldCheck, Heart, Plus, Minus, Copy } from "lucide-react";

interface ProductImage {
  id: string;
  url: string;
  isFeatured: boolean;
}

interface Inventory {
  id: string;
  size: string;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: ProductImage[];
  inventory: Inventory[];
  category: {
    name: string;
    slug: string;
  };
}

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: any[];
}

export function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isWishlisted = isInWishlist(product.id);

  const [activeImage, setActiveImage] = useState(
    product.images.find((img) => img.isFeatured)?.url || product.images[0]?.url
  );
  
  // Choose initial size that has stock, otherwise default to first available size
  const sortedInventory = [...product.inventory].sort((a, b) => b.stock - a.stock);
  const initialSize = sortedInventory[0]?.stock > 0 ? sortedInventory[0].size : product.inventory[0]?.size || "";
  
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [quantity, setQuantity] = useState(1);
  const [dbCoupons, setDbCoupons] = useState<{ code: string; type: string; value: number }[]>([]);

  // Accordion toggle states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    details: true,
    reviews: false,
    delivery: false,
    returns: false,
  });

  const toggleAccordion = (section: string) => {
    setOpenAccordions((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Find inventory details for the selected size
  const selectedInventory = product.inventory.find((inv) => inv.size === selectedSize);
  const currentStock = selectedInventory ? selectedInventory.stock : 0;
  const isOutOfStock = currentStock === 0;

  // Reset quantity to 1 when size changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedSize]);

  // Fetch active coupons on mount
  useEffect(() => {
    fetch("/api/coupons")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDbCoupons(data);
        }
      })
      .catch((err) => console.error("Error fetching coupons:", err));
  }, []);

  // Calculate EDD
  const edd = calculateEDD();
  const formattedEDD = formatDate(edd);

  // Dynamic Coupons determination
  const candidateCoupons = [];
  if (product.price >= 10000) {
    candidateCoupons.push({ code: "KK50", desc: "Enjoy 50% off on this luxury garment." });
    candidateCoupons.push({ code: "KK20", desc: "Enjoy 20% off on this luxury garment." });
  } else if (product.price >= 4000) {
    candidateCoupons.push({ code: "KK20", desc: "Enjoy 20% off on this premium garment." });
    candidateCoupons.push({ code: "FLAT100", desc: "Enjoy flat ₹100 off on this premium garment." });
  } else if (product.category.slug.includes("shirts") || product.category.slug.includes("tops") || product.category.slug.includes("polo")) {
    candidateCoupons.push({ code: "KK10", desc: "Enjoy 10% off on selected shirts & tops." });
    candidateCoupons.push({ code: "TRYKKBRAND5", desc: "Enjoy 5% off on first web order." });
  } else {
    candidateCoupons.push({ code: "KK10", desc: "Enjoy 10% off on this garment." });
    candidateCoupons.push({ code: "FLAT100", desc: "Enjoy flat ₹100 off on this garment." });
  }

  // Filter candidate coupons by what is actually active in the database
  const coupons = candidateCoupons.filter((c) =>
    dbCoupons.some((dbC) => dbC.code.toUpperCase() === c.code.toUpperCase())
  );

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addToCart(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images.find((img) => img.isFeatured)?.url || product.images[0]?.url,
        size: selectedSize,
        stock: currentStock,
      },
      quantity
    );

    toast({
      title: "Added to Cart",
      description: `${product.name} (Size: ${selectedSize}) has been added to your shopping bag.`,
      variant: "success",
    });
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Promo Code Copied",
      description: `Code "${code}" copied to clipboard.`,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full bg-white">
      
      {/* Product Details Section */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        
        {/* Left Column: Vertically Aligned Images Gallery (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col md:flex-row gap-4">
          {/* Thumbnails Column (Desktop left vertical strip) */}
          {product.images.length > 1 && (
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 md:w-20 md:h-[450px] shrink-0 scrollbar-none snap-x">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img.url)}
                  className={`relative aspect-[3/4] w-16 md:w-full overflow-hidden border snap-start shrink-0 rounded-none transition-all ${
                    activeImage === img.url ? "border-black ring-1 ring-black" : "border-neutral-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          
          {/* Active Main Image Container */}
          <div className="relative aspect-[3/4] flex-grow overflow-hidden rounded-none border border-neutral-100 bg-neutral-50">
            <Image
              src={activeImage}
              alt={product.name}
              fill
              className="object-cover transition-all duration-300"
              priority
            />
          </div>
        </div>

        {/* Right Column: Information Panel (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col">
          {/* Category */}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
            {product.category.name}
          </span>
          
          {/* Title */}
          <h1 className="mt-2 text-xl font-black uppercase tracking-wider text-black leading-tight">
            {product.name}
          </h1>

          {/* Pricing */}
          <div className="mt-3 flex items-baseline gap-3 pb-4 border-b border-neutral-100">
            <span className="text-lg font-black text-black">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <>
                <span className="text-xs text-neutral-400 line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
                <span className="bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                  {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Promo code banners cards (Snitch Style) */}
          {coupons.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {coupons.map((cp) => (
                <div
                  key={cp.code}
                  onClick={() => copyPromoCode(cp.code)}
                  className="border border-dashed border-neutral-300 bg-neutral-50/50 p-2.5 cursor-pointer hover:bg-neutral-100 transition-colors"
                  title="Click to copy coupon code"
                >
                  <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-black">
                    <span>{cp.code}</span>
                    <Copy className="h-3 w-3 text-neutral-400" />
                  </div>
                  <p className="text-[9px] text-neutral-400 mt-1 uppercase font-bold tracking-wider">{cp.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Color Indicator Swatches */}
          <div className="mt-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-black mb-2">Colors</h3>
            <div className="flex gap-2">
              <span className="w-5.5 h-5.5 rounded-full border border-neutral-300 bg-neutral-900 cursor-pointer ring-1 ring-offset-2 ring-black" />
              <span className="w-5.5 h-5.5 rounded-full border border-neutral-300 bg-blue-900 cursor-pointer hover:opacity-85" />
              <span className="w-5.5 h-5.5 rounded-full border border-neutral-300 bg-stone-300 cursor-pointer hover:opacity-85" />
            </div>
          </div>

          {/* Sizes Selector */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-black">Sizes</h3>
              <button className="text-[10px] font-black text-neutral-500 hover:text-black uppercase tracking-widest underline underline-offset-2">
                Size Chart
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {product.inventory.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedSize(inv.size)}
                  className={`flex h-10 min-w-10 items-center justify-center rounded-none border text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    selectedSize === inv.size
                      ? "bg-black text-white border-black"
                      : inv.stock === 0
                      ? "border-dashed border-neutral-200 text-neutral-300 opacity-40 cursor-not-allowed bg-neutral-50"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-black"
                  }`}
                  disabled={inv.stock === 0}
                >
                  {inv.size}
                </button>
              ))}
            </div>
          </div>

          {/* EDD Notice Text (Snitch format) */}
          <div className="mt-4 text-[9px] font-black text-neutral-400 uppercase tracking-widest">
            FREE 1-2 DAY DELIVERY ON 5k+ PINCODES | EDD: {formattedEDD}
          </div>

          {/* In Stock status indicator */}
          <div className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            {isOutOfStock ? (
              <span className="flex items-center text-red-600 gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Out of stock
              </span>
            ) : (
              <span className="flex items-center text-neutral-600 gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-neutral-400" /> In stock ({currentStock})
              </span>
            )}
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="mt-4 flex items-center gap-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-black">Quantity</h3>
              <div className="flex items-center rounded-none border border-neutral-200 h-9 bg-white">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-2.5 text-neutral-400 hover:text-black h-full font-bold transition-colors"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-black">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                  className="px-2.5 text-neutral-400 hover:text-black h-full font-bold transition-colors"
                  disabled={quantity >= currentStock}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Action triggers */}
          <div className="mt-6 flex gap-2">
            <Button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-grow h-12 rounded-none bg-black text-white hover:bg-neutral-800 border border-black transition-colors uppercase tracking-widest text-xs font-black"
            >
              ADD TO BAG
            </Button>
            <button
              onClick={() => toggleWishlist(product.id)}
              className="h-12 w-12 flex items-center justify-center border border-neutral-200 hover:border-black transition-colors shrink-0 rounded-none bg-white text-neutral-600 hover:text-black"
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`h-5 w-5 ${isWishlisted ? "fill-black text-black" : "text-neutral-500"}`} />
            </button>
          </div>

          {/* Snitch Accordions list (DETAILS, REVIEWS, DELIVERY, RETURNS) */}
          <div className="mt-8 border-t border-neutral-100">
            {/* DETAILS Accordion */}
            <div className="border-b border-neutral-100 py-3.5">
              <button
                onClick={() => toggleAccordion("details")}
                className="w-full flex items-center justify-between text-left text-[10px] font-black uppercase tracking-widest text-black"
              >
                <span>Details</span>
                {openAccordions.details ? <Minus className="h-3.5 w-3.5 text-neutral-400" /> : <Plus className="h-3.5 w-3.5 text-neutral-400" />}
              </button>
              {openAccordions.details && (
                <div className="mt-3 text-[11px] text-neutral-500 font-bold leading-relaxed uppercase tracking-wider space-y-2">
                  <p>{product.description}</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>PREMIUM BLEND SELECTION</li>
                    <li>ETHICALLY KNIT AND SOURCED MATERIALS</li>
                    <li>CUSTOM HIGH-DURABILITY RIB TRIM</li>
                    <li>UNISEX RELAXED TAILORED FIT SIZES</li>
                  </ul>
                </div>
              )}
            </div>

            {/* REVIEWS Accordion */}
            <div className="border-b border-neutral-100 py-3.5">
              <button
                onClick={() => toggleAccordion("reviews")}
                className="w-full flex items-center justify-between text-left text-[10px] font-black uppercase tracking-widest text-black"
              >
                <span>Reviews</span>
                {openAccordions.reviews ? <Minus className="h-3.5 w-3.5 text-neutral-400" /> : <Plus className="h-3.5 w-3.5 text-neutral-400" />}
              </button>
              {openAccordions.reviews && (
                <p className="mt-3 text-[11px] text-neutral-500 font-bold leading-relaxed uppercase tracking-wider">
                  4.8 ★ | BASED ON 140 RATINGS. CUSTOMERS MENTION COMFORTABLE FABRIC AND ACCURATE SHOULDER SEAMS FIT.
                </p>
              )}
            </div>

            {/* DELIVERY Accordion */}
            <div className="border-b border-neutral-100 py-3.5">
              <button
                onClick={() => toggleAccordion("delivery")}
                className="w-full flex items-center justify-between text-left text-[10px] font-black uppercase tracking-widest text-black"
              >
                <span>Delivery</span>
                {openAccordions.delivery ? <Minus className="h-3.5 w-3.5 text-neutral-400" /> : <Plus className="h-3.5 w-3.5 text-neutral-400" />}
              </button>
              {openAccordions.delivery && (
                <p className="mt-3 text-[11px] text-neutral-500 font-bold leading-relaxed uppercase tracking-wider">
                  DISPATCHED WITHIN 24 HOURS. FREE SHIPPING ON ALL NATIONWIDE ORDERS EXCEEDING ₹999.
                </p>
              )}
            </div>

            {/* RETURNS Accordion */}
            <div className="border-b border-neutral-100 py-3.5">
              <button
                onClick={() => toggleAccordion("returns")}
                className="w-full flex items-center justify-between text-left text-[10px] font-black uppercase tracking-widest text-black"
              >
                <span>Returns</span>
                {openAccordions.returns ? <Minus className="h-3.5 w-3.5 text-neutral-400" /> : <Plus className="h-3.5 w-3.5 text-neutral-400" />}
              </button>
              {openAccordions.returns && (
                <p className="mt-3 text-[11px] text-neutral-500 font-bold leading-relaxed uppercase tracking-wider">
                  7-DAY EASY HASSLE-FREE RETOURS AND SIZE-SWAPS FROM YOUR DOORSTEP.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 border-t border-neutral-100 pt-12">
          <h2 className="text-sm font-black uppercase tracking-widest text-black mb-8 text-center sm:text-left">
            YOU MAY ALSO LIKE
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {relatedProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
