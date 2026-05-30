import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductDetailClient } from "./ProductDetailClient";

export const revalidate = 0; // Dynamic detail pages, do not cache

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: true,
    },
  });

  if (!product) {
    return {
      title: "Garment Not Found | KK BRAND",
    };
  }

  const featuredImage = product.images.find((img) => img.isFeatured)?.url || product.images[0]?.url;

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

  if (!product) {
    return notFound();
  }

  // Fetch related products from same category
  const relatedProducts = await db.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    take: 4,
    include: {
      images: { orderBy: { isFeatured: "desc" } },
    },
  });

  return (
    <ProductDetailClient product={product} relatedProducts={relatedProducts} />
  );
}

