import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id: orderId } = await params;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        address: true,
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Customer can only email their own invoice, Admin can email any invoice
    if (session.user.role !== "ADMIN" && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const email = order.address?.email || order.user?.email;
    const name = order.address?.name || order.user?.name || "Customer";

    if (!email) {
      return NextResponse.json({ error: "Customer email address not found." }, { status: 400 });
    }

    await sendInvoiceEmail({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: name,
      customerEmail: email,
      totalAmount: order.totalAmount,
      shippingTotal: order.shippingTotal,
      discountTotal: order.discountTotal,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      shippingAddress: {
        name: order.address.name,
        phone: order.address.phone,
        streetAddress: order.address.streetAddress,
        city: order.address.city,
        state: order.address.state,
        postalCode: order.address.postalCode,
        country: order.address.country,
      },
      items: order.orderItems.map((item: any) => ({
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        shippingFee: item.shippingFee,
        image: item.image,
      })),
    });

    return NextResponse.json({ success: true, message: "Invoice emailed successfully." });
  } catch (error) {
    console.error("Invoice email dispatch API error:", error);
    return NextResponse.json({ error: "Failed to dispatch invoice email." }, { status: 500 });
  }
}
