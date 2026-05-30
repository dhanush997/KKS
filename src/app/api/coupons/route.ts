import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const coupons = await (db as any).coupon.findMany({
      where: {
        isActive: true,
        isAdminOnly: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        code: true,
        type: true,
        value: true,
      },
    });
    return NextResponse.json(coupons);
  } catch (error) {
    console.error("Public coupons GET error:", error);
    return NextResponse.json({ error: "Failed to fetch coupons." }, { status: 500 });
  }
}
