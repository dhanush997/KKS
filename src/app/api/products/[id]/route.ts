import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getCache, setCache, invalidateCache } from "@/lib/redis";

// Helper to check admin session
async function checkAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return false;
  }
  return true;
}

// 1. GET - Fetch a single product by ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Check cache
    const cacheKey = `products:detail:${id}`;
    const cachedProduct = await getCache(cacheKey);
    if (cachedProduct) {
      return NextResponse.json(JSON.parse(cachedProduct));
    }

    const product = await db.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { isFeatured: "desc" },
        },
        category: true,
        inventory: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Set cache (10 min TTL)
    await setCache(cacheKey, JSON.stringify(product), 600);

    return NextResponse.json(product);
  } catch (error) {
    console.error("Single product GET error:", error);
    return NextResponse.json({ error: "Failed to fetch product details." }, { status: 500 });
  }
}

// 2. PUT - Edit an existing product (Admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const { id: productId } = await params;
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
      images, // Base64 strings or existing URLs
      inventory, // Array of { size: string, stock: number }
    } = await req.json();

    if (!name || !description || !price || !categoryId) {
      return NextResponse.json({ error: "Required fields are missing." }, { status: 400 });
    }

    const slug = slugify(name);

    // Verify slug uniqueness (excluding current product)
    const conflicting = await db.product.findFirst({
      where: {
        slug,
        id: { not: productId },
      },
    });

    if (conflicting) {
      return NextResponse.json({ error: "Product name already in use by another item." }, { status: 400 });
    }

    // Process images
    let imageUrls: string[] = [];
    if (images && images.length > 0) {
      for (const img of images) {
        if (img.startsWith("http")) {
          // Already uploaded URL
          imageUrls.push(img);
        } else {
          // Base64 file string, needs upload
          const url = await uploadToCloudinary(img, "products");
          imageUrls.push(url);
        }
      }
    }

    // Run updates in a Prisma Transaction
    const updatedProduct = await db.$transaction(async (tx) => {
      // 1. Update product detail core
      const prod = await tx.product.update({
        where: { id: productId },
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

      // 2. Manage images if provided
      if (imageUrls.length > 0) {
        // Clear previous images
        await tx.productImage.deleteMany({ where: { productId } });

        // Add new images
        for (let i = 0; i < imageUrls.length; i++) {
          await tx.productImage.create({
            data: {
              url: imageUrls[i],
              isFeatured: i === 0,
              productId: productId,
            },
          });
        }
      }

      // 3. Manage inventory
      if (inventory && Array.isArray(inventory)) {
        // Clear previous inventory records
        await tx.inventory.deleteMany({ where: { productId } });

        // Add new inventory records
        for (const item of inventory) {
          if (!item.size) continue;
          await tx.inventory.create({
            data: {
              size: item.size,
              stock: Number(item.stock) || 0,
              productId: productId,
            },
          });
        }
      }

      return prod;
    });

    // Fetch the updated product with relations
    const finalProduct = await db.product.findUnique({
      where: { id: updatedProduct.id },
      include: {
        images: true,
        inventory: true,
      },
    });

    // Invalidate caches
    await invalidateCache(`products:detail:${productId}`);
    await invalidateCache("products:list:*");
    await invalidateCache("homepage:*");

    return NextResponse.json(finalProduct);
  } catch (error) {
    console.error("Product PUT error:", error);
    return NextResponse.json({ error: "Failed to update product details." }, { status: 500 });
  }
}

// 3. DELETE - Delete a product (Admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const { id } = await params;

    // Delete product (Prisma schema has Cascade delete for images and inventory)
    await db.product.delete({
      where: { id },
    });

    // Invalidate caches
    await invalidateCache(`products:detail:${id}`);
    await invalidateCache("products:list:*");
    await invalidateCache("homepage:*");

    return NextResponse.json({ message: "Product deleted successfully." });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete product." }, { status: 500 });
  }
}
