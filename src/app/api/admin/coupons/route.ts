import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

// 1. GET - Retrieve all coupons (Admin only)
export async function GET(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const coupons = await (db as any).coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(coupons);
  } catch (error) {
    console.error("Admin coupons GET error:", error);
    return NextResponse.json({ error: "Failed to fetch coupons." }, { status: 500 });
  }
}

// 2. POST - Create a new coupon (Admin only)
export async function POST(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { code, type, value, isActive, isAdminOnly, startDate, endDate } = body;

    if (!code || !type || value === undefined || !startDate || !endDate) {
      return NextResponse.json({ error: "Code, type, value, start date, and end date are required." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check if code is already used
    const existing = await (db as any).coupon.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `A coupon with code "${cleanCode}" already exists.` }, { status: 400 });
    }

    const coupon = await (db as any).coupon.create({
      data: {
        code: cleanCode,
        type,
        value: Number(value),
        isActive: isActive ?? true,
        isAdminOnly: isAdminOnly ?? false,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error("Admin coupon POST error:", error);
    return NextResponse.json({ error: "Failed to create coupon." }, { status: 500 });
  }
}

// 3. PUT - Update a coupon (Admin only)
export async function PUT(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { id, code, type, value, isActive, isAdminOnly, startDate, endDate } = body;

    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required." }, { status: 400 });
    }

    const updateData: any = {};
    if (code) updateData.code = code.trim().toUpperCase();
    if (type) updateData.type = type;
    if (value !== undefined) updateData.value = Number(value);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isAdminOnly !== undefined) updateData.isAdminOnly = isAdminOnly;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    const coupon = await (db as any).coupon.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(coupon);
  } catch (error) {
    console.error("Admin coupon PUT error:", error);
    return NextResponse.json({ error: "Failed to update coupon." }, { status: 500 });
  }
}

// 4. DELETE - Delete a coupon (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required." }, { status: 400 });
    }

    await (db as any).coupon.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin coupon DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete coupon." }, { status: 500 });
  }
}
