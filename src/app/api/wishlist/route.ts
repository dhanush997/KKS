import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// 1. GET - Fetch user's wishlist
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const wishlistItems = await db.wishlist.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: { isFeatured: "desc" },
            },
            category: {
              select: { name: true, slug: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const products = wishlistItems.map((item) => item.product);
    return NextResponse.json(products);
  } catch (error) {
    console.error("Wishlist GET error:", error);
    return NextResponse.json({ error: "Failed to fetch wishlist." }, { status: 500 });
  }
}

// 2. POST - Toggle item in wishlist
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Check if already wishlisted
    const existing = await db.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    });

    if (existing) {
      // Toggle off - remove from wishlist
      await db.wishlist.delete({
        where: {
          userId_productId: {
            userId: session.user.id,
            productId,
          },
        },
      });
      return NextResponse.json({ wishlisted: false, message: "Removed from wishlist." });
    } else {
      // Toggle on - add to wishlist
      await db.wishlist.create({
        data: {
          userId: session.user.id,
          productId,
        },
      });
      return NextResponse.json({ wishlisted: true, message: "Added to wishlist." });
    }
  } catch (error) {
    console.error("Wishlist POST error:", error);
    return NextResponse.json({ error: "Failed to update wishlist." }, { status: 500 });
  }
}

// 3. DELETE - Remove single item from wishlist
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required." }, { status: 400 });
    }

    await db.wishlist.delete({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    });

    return NextResponse.json({ wishlisted: false, message: "Removed from wishlist." });
  } catch (error) {
    console.error("Wishlist DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove item from wishlist." }, { status: 500 });
  }
}
