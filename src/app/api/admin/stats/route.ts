import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to check admin session
async function checkAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    if (!(await checkAdminSession())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 403 });
    }

    // 1. Calculate Total Orders Count
    const totalOrders = await db.order.count();

    // 2. Sum Total Revenue (Exclude CANCELLED orders)
    const revenueSum = await db.order.aggregate({
      where: {
        status: { not: "CANCELLED" },
      },
      _sum: {
        totalAmount: true,
      },
    });
    const totalRevenue = revenueSum._sum.totalAmount || 0;

    // 3. Count Total Products
    const totalProducts = await db.product.count();

    // 4. Count Total Customers (Users with role USER)
    const totalCustomers = await db.user.count({
      where: {
        role: "USER",
      },
    });

    // 5. Fetch 5 Recent Orders
    const recentOrders = await db.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // 6. Fetch 5 Best Selling Products (or mock/calculate)
    const bestSellers = await db.product.findMany({
      where: { isBestSeller: true },
      take: 5,
      include: {
        images: {
          take: 1,
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalOrders,
        totalRevenue,
        totalProducts,
        totalCustomers,
      },
      recentOrders,
      bestSellers,
    });
  } catch (error) {
    console.error("Admin stats GET error:", error);
    return NextResponse.json({ error: "Failed to load dashboard metrics." }, { status: 500 });
  }
}
