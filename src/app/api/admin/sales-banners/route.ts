import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

// 1. GET - Fetch all banners (Admin only)
export async function GET(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const banners = await (db as any).salesBanner.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(banners);
  } catch (error) {
    console.error("Admin banners GET error:", error);
    return NextResponse.json({ error: "Failed to fetch banners." }, { status: 500 });
  }
}

// 2. POST - Create new banner (Admin only)
export async function POST(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { title, subtitle, startDate, endDate, isActive, couponCode, bannerType, bgGradient, textColor } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: "Title, start date, and end date are required." }, { status: 400 });
    }

    const banner = await (db as any).salesBanner.create({
      data: {
        title,
        subtitle,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive ?? true,
        couponCode,
        bannerType: bannerType || "FESTIVE",
        bgGradient: bgGradient || "from-amber-500 to-rose-600",
        textColor: textColor || "text-white",
      },
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error("Admin banner POST error:", error);
    return NextResponse.json({ error: "Failed to create banner." }, { status: 500 });
  }
}

// 3. PUT - Update banner (Admin only)
export async function PUT(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, subtitle, startDate, endDate, isActive, couponCode, bannerType, bgGradient, textColor } = body;

    if (!id) {
      return NextResponse.json({ error: "Banner ID is required." }, { status: 400 });
    }

    const banner = await (db as any).salesBanner.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        ...(subtitle !== undefined ? { subtitle } : {}),
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(couponCode !== undefined ? { couponCode } : {}),
        ...(bannerType ? { bannerType } : {}),
        ...(bgGradient ? { bgGradient } : {}),
        ...(textColor ? { textColor } : {}),
      },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error("Admin banner PUT error:", error);
    return NextResponse.json({ error: "Failed to update banner." }, { status: 500 });
  }
}

// 4. DELETE - Delete banner (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Banner ID is required." }, { status: 400 });
    }

    await (db as any).salesBanner.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin banner DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete banner." }, { status: 500 });
  }
}
