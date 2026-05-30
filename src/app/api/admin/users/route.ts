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

    // Fetch users with their orders count and total purchase amounts
    const users = await db.user.findMany({
      where: {
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        orders: {
          select: {
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format details
    const formattedUsers = users.map((u) => {
      const orderCount = u.orders.length;
      // Lifetime spending excludes cancelled orders
      const lifetimeSpent = u.orders
        .filter((o) => o.status !== "CANCELLED")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        orderCount,
        lifetimeSpent,
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Admin customers GET error:", error);
    return NextResponse.json({ error: "Failed to load customers database." }, { status: 500 });
  }
}
