import React, { cache } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductDetailClient } from "./ProductDetailClient";
import { getCache, setCache } from "@/lib/redis";

export const revalidate = 0; // Dynamic detail pages, re-evaluation checked against cache helpers

interface PageProps {
  params: Promise<{ id: string }>;
}

// React cache memoizes this function per request, and getCache/setCache caches it globally
const getCachedProduct = cache(async (id: string) => {
  const cacheKey = `products:detail:${id}`;
  const cachedProduct = await getCache(cacheKey);
  if (cachedProduct) {
    try {
      return JSON.parse(cachedProduct);
    } catch (e) {
      console.error("Cache parse error in getCachedProduct:", e);
    }
  }

  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { isFeatured: "desc" },
      },
      inventory: true,
      category: true,
    },
  });

  if (product) {
    await setCache(cacheKey, JSON.stringify(product), 600); // Cache for 10 minutes
  }
  return product;
});

// Cache related products fetch
const getCachedRelatedProducts = cache(async (categoryId: string, productId: string) => {
  const cacheKey = `products:related:${categoryId}:${productId}`;
  const cachedRelated = await getCache(cacheKey);
  if (cachedRelated) {
    try {
      return JSON.parse(cachedRelated);
    } catch (e) {
      console.error("Cache parse error in getCachedRelatedProducts:", e);
    }
  }

  const relatedProducts = await db.product.findMany({
    where: {
      categoryId,
      id: { not: productId },
    },
    take: 4,
    include: {
      images: { orderBy: { isFeatured: "desc" } },
    },
  });

  await setCache(cacheKey, JSON.stringify(relatedProducts), 600); // Cache for 10 minutes
  return relatedProducts;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const product = await getCachedProduct(id);

  if (!product) {
    return {
      title: "Garment Not Found | KK BRAND",
    };
  }

  const featuredImage = product.images.find((img: any) => img.isFeatured)?.url || product.images[0]?.url;

  return {
    title: `${product.name} | KK BRAND`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: `${product.name} | KK BRAND`,
      description: product.description.slice(0, 160),
      images: featuredImage ? [{ url: featuredImage }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  // Await params as required by Next.js 15
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const product = await getCachedProduct(id);

  if (!product) {
    return notFound();
  }

  // Fetch related products using cache
  const relatedProducts = await getCachedRelatedProducts(product.categoryId, product.id);

  return (
    <ProductDetailClient product={product} relatedProducts={relatedProducts} />
  );
}
