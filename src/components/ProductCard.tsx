"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    isFeatured: boolean;
    isNewArrival: boolean;
    isTrending: boolean;
    isBestSeller: boolean;
    images: {
      url: string;
      isFeatured: boolean;
    }[];
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isWishlisted = isInWishlist(product.id);

  // Find featured image and alternate hover image
  const featuredImage = product.images.find((img) => img.isFeatured)?.url || product.images[0]?.url;
  const hoverImage = product.images.find((img) => !img.isFeatured)?.url || featuredImage;

  // Calculate discount percentage
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="group flex flex-col relative w-full overflow-hidden bg-transparent rounded-none border-none shadow-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Area */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-50 rounded-none">
        
        {/* Badges Overlay */}
        <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1">
          {discountPercent && (
            <span className="rounded-none bg-red-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              -{discountPercent}%
            </span>
          )}
          {product.isNewArrival && (
            <span className="rounded-none bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              NEW
            </span>
          )}
          {product.isBestSeller && (
            <span className="rounded-none bg-neutral-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              BEST SELLER
            </span>
          )}
        </div>

        {/* Wishlist Button Overlay */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className="absolute right-2.5 top-2.5 z-10 p-1.5 bg-white/95 rounded-none border border-neutral-100 text-neutral-600 hover:text-black transition-colors"
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`h-3.5 w-3.5 ${isWishlisted ? "fill-black text-black" : "text-neutral-500"}`} />
        </button>

        {/* Dynamic Image Hover transition */}
        <Link href={`/products/${product.id}`} className="relative h-full w-full block">
          <Image
            src={featuredImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition-all duration-550 group-hover:scale-105"
            priority={false}
          />
          {hoverImage && hoverImage !== featuredImage && (
            <motion.div
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 h-full w-full"
            >
              <Image
                src={hoverImage}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover scale-105 group-hover:scale-100 transition-transform duration-550"
              />
            </motion.div>
          )}
        </Link>
      </div>

      {/* Product Details Area */}
      <div className="flex flex-col pt-3 bg-transparent pb-1">
        <h3 className="text-xs font-semibold text-neutral-800 group-hover:text-black transition-colors line-clamp-1 uppercase tracking-wider">
          <Link href={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xs font-bold text-black">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-[10px] text-neutral-400 line-through font-normal">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
