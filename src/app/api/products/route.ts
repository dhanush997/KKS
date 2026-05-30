import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getCache, setCache, invalidateCache } from "@/lib/redis";

// 1. GET - Fetch products with search, filtering, and sorting
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const size = searchParams.get("size");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort"); // "price_asc", "price_desc", "newest"
    const featured = searchParams.get("featured"); // "true"
    const newArrival = searchParams.get("newArrival"); // "true"
    const trending = searchParams.get("trending"); // "true"
    const bestSeller = searchParams.get("bestSeller"); // "true"

    // Construct a cache key based on query filters
    const cacheKey = `products:list:${search || ""}:${category || ""}:${size || ""}:${minPrice || ""}:${maxPrice || ""}:${sort || ""}:${featured || ""}:${newArrival || ""}:${trending || ""}:${bestSeller || ""}`;
    
    const cachedProducts = await getCache(cacheKey);
    if (cachedProducts) {
      return NextResponse.json(JSON.parse(cachedProducts));
    }

    const where: any = {};

    // Search query (case-insensitive name or description match)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (category) {
      // Support parent-child matching: match either child slug or parent slug
      where.OR = [
        { category: { slug: category } },
        { category: { parent: { slug: category } } }
      ];
    }

    // Size filter (checks if inventory list contains size with stock > 0)
    if (size) {
      where.inventory = {
        some: {
          size: size,
          stock: { gt: 0 },
        },
      };
    }

    // Price range filters
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Spec flags
    if (featured === "true") where.isFeatured = true;
    if (newArrival === "true") where.isNewArrival = true;
    if (trending === "true") where.isTrending = true;
    if (bestSeller === "true") where.isBestSeller = true;

    // Sorting configs
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") {
      orderBy = { price: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { price: "desc" };
    } else if (sort === "newest") {
      orderBy = { createdAt: "desc" };
    }

    const products = await db.product.findMany({
      where,
      orderBy,
      include: {
        images: {
          orderBy: { isFeatured: "desc" },
        },
        category: {
          select: { name: true, slug: true, parentId: true },
        },
        inventory: true,
      },
    });

    // Save list to Redis (10 minutes TTL)
    await setCache(cacheKey, JSON.stringify(products), 600);

    return NextResponse.json(products);
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Failed to fetch products." }, { status: 500 });
  }
}


// Helper to check admin session
async function checkAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return false;
  }
  return true;
}

// 2. POST - Create new product (Admin only)
export async function POST(req: NextRequest) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const {
      name,
      description,
      price,
      compareAtPrice,
      categoryId,
      isFeatured,
      isNewArrival,
      isTrending,
      isBestSeller,
      images, // Array of base64 strings or image URLs
      inventory, // Array of { size: string, stock: number }
    } = await req.json();

    if (!name || !description || !price || !categoryId || !images || images.length === 0) {
      return NextResponse.json({ error: "Required fields are missing." }, { status: 400 });
    }

    const slug = slugify(name);

    // Verify unique slug
    const existing = await db.product.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json({ error: "Product name already exists." }, { status: 400 });
    }

    // Upload images to Cloudinary (or fallback if empty)
    const uploadedImageUrls: string[] = [];
    for (const img of images) {
      const url = await uploadToCloudinary(img, "products");
      uploadedImageUrls.push(url);
    }

    // Create the product in db
    const product = await db.product.create({
      data: {
        name,
        slug,
        description,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        categoryId,
        isFeatured: !!isFeatured,
        isNewArrival: !!isNewArrival,
        isTrending: !!isTrending,
        isBestSeller: !!isBestSeller,
      },
    });

    // Create image entries
    for (let i = 0; i < uploadedImageUrls.length; i++) {
      await db.productImage.create({
        data: {
          url: uploadedImageUrls[i],
          isFeatured: i === 0, // Mark first image as featured
          productId: product.id,
        },
      });
    }

    // Create inventory entries
    if (inventory && Array.isArray(inventory)) {
      for (const item of inventory) {
        if (!item.size) continue;
        await db.inventory.create({
          data: {
            size: item.size,
            stock: Number(item.stock) || 0,
            productId: product.id,
          },
        });
      }
    }

    // Fetch the final created product with relationships
    const fullProduct = await db.product.findUnique({
      where: { id: product.id },
      include: {
        images: true,
        inventory: true,
      },
    });

    // Invalidate product caches on creation
    await invalidateCache("products:list:*");
    await invalidateCache("homepage:*");

    return NextResponse.json(fullProduct, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
