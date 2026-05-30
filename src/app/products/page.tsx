import React from "react";
import { db } from "@/lib/db";
import { ProductCatalogClient } from "./ProductCatalogClient";

export const revalidate = 0; // Dynamic catalog page, do not cache

interface PageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    size?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    featured?: string;
    newArrival?: string;
    trending?: string;
    bestSeller?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  // Await searchParams as required by Next.js 15
  const resolvedParams = await searchParams;
  const search = resolvedParams.search || "";
  const activeCategory = resolvedParams.category || "";
  const activeSize = resolvedParams.size || "";
  const sort = resolvedParams.sort || "";
  const minPrice = resolvedParams.minPrice || "";
  const maxPrice = resolvedParams.maxPrice || "";

  // 1. Fetch categories
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
  });

  // 2. Compile Prisma Query Filters
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (activeCategory) {
    where.OR = [
      { category: { slug: activeCategory } },
      { category: { parent: { slug: activeCategory } } }
    ];
  }

  if (activeSize) {
    where.inventory = {
      some: {
        size: activeSize,
        stock: { gt: 0 },
      },
    };
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  if (resolvedParams.featured === "true") where.isFeatured = true;
  if (resolvedParams.newArrival === "true") where.isNewArrival = true;
  if (resolvedParams.trending === "true") where.isTrending = true;
  if (resolvedParams.bestSeller === "true") where.isBestSeller = true;

  // Sorting
  let orderBy: any = { createdAt: "desc" };
  if (sort === "price_asc") {
    orderBy = { price: "asc" };
  } else if (sort === "price_desc") {
    orderBy = { price: "desc" };
  } else if (sort === "newest") {
    orderBy = { createdAt: "desc" };
  }

  // Execute database query
  const products = await db.product.findMany({
    where,
    orderBy,
    include: {
      images: { orderBy: { isFeatured: "desc" } },
      category: true,
      inventory: true,
    },
  });

  return (
    <ProductCatalogClient initialProducts={products} categories={categories} />
  );
}
