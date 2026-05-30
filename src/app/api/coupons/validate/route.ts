import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { code, isAdmin } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const now = new Date();
    const coupon = await (db as any).coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code." }, { status: 404 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: "This coupon is currently inactive." }, { status: 400 });
    }

    if (now < new Date(coupon.startDate)) {
      return NextResponse.json({ error: "This coupon is not yet active." }, { status: 400 });
    }

    if (now > new Date(coupon.endDate)) {
      return NextResponse.json({ error: "This coupon has expired." }, { status: 400 });
    }

    if (coupon.isAdminOnly && !isAdmin) {
      return NextResponse.json({ error: "Restricted to Admin accounts only." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        isAdminOnly: coupon.isAdminOnly,
      },
    });
  } catch (error) {
    console.error("Coupon validation API error:", error);
    return NextResponse.json({ error: "Failed to validate coupon." }, { status: 500 });
  }
}
