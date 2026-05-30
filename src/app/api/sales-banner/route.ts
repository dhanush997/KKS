import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const banner = await (db as any).salesBanner.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: {
        endDate: "asc", // nearest ending sale first
      },
    });

    return NextResponse.json(banner || null);
  } catch (error) {
    console.error("Sales banner GET error:", error);
    return NextResponse.json({ error: "Failed to fetch sales banner." }, { status: 500 });
  }
}
