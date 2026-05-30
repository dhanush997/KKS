import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { getCache, setCache, invalidateCache } from "@/lib/redis";

// 1. GET - Fetch all categories
export async function GET() {
  try {
    const cacheKey = "categories:all";
    const cachedCategories = await getCache(cacheKey);
    if (cachedCategories) {
      return NextResponse.json(JSON.parse(cachedCategories));
    }

    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        children: {
          orderBy: { name: "asc" },
        },
        parent: true,
        _count: {
          select: { products: true },
        },
      },
    });

    await setCache(cacheKey, JSON.stringify(categories), 600);

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ error: "Failed to fetch categories." }, { status: 500 });
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

// 2. POST - Add a new category (Admin only)
export async function POST(req: NextRequest) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const { name, description, image } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Category name is required." }, { status: 400 });
    }

    const slug = slugify(name);

    // Check if category with this slug already exists
    const existing = await db.category.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json({ error: "Category name already exists." }, { status: 400 });
    }

    const category = await db.category.create({
      data: {
        name,
        slug,
        description,
        image: image || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800",
      },
    });

    // Invalidate caches
    await invalidateCache("categories:all");
    await invalidateCache("products:list:*");
    await invalidateCache("homepage:*");

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Categories POST error:", error);
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}

// 3. PUT - Edit an existing category (Admin only)
export async function PUT(req: NextRequest) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const { id, name, description, image } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: "Category ID and name are required." }, { status: 400 });
    }

    const slug = slugify(name);

    // Check if category name conflicts with another category slug
    const conflicting = await db.category.findFirst({
      where: {
        slug,
        id: { not: id },
      },
    });

    if (conflicting) {
      return NextResponse.json({ error: "Category name already in use by another category." }, { status: 400 });
    }

    const updatedCategory = await db.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        image,
      },
    });

    // Invalidate caches
    await invalidateCache("categories:all");
    await invalidateCache("products:list:*");
    await invalidateCache("homepage:*");

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Categories PUT error:", error);
    return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
  }
}

// 4. DELETE - Delete a category (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Category ID is required for deletion." }, { status: 400 });
    }

    await db.category.delete({
      where: { id },
    });

    // Invalidate caches
    await invalidateCache("categories:all");
    await invalidateCache("products:list:*");
    await invalidateCache("homepage:*");

    return NextResponse.json({ message: "Category deleted successfully." });
  } catch (error) {
    console.error("Categories DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete category. Ensure no products are linked." }, { status: 500 });
  }
}
