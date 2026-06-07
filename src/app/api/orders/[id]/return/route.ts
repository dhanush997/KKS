import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createReturnShipment } from "@/lib/shiprocket";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Load order details including items and address
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        address: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order details not found." }, { status: 404 });
    }

    // Verify customer ownership or administrator status
    const isOwner = order.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    // Assert that return is only requested if status is DELIVERED
    if (order.status !== "DELIVERED") {
      return NextResponse.json({ error: "Only delivered orders can be requested for return." }, { status: 400 });
    }

    // Update order status to RETURN_REQUESTED
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status: "RETURN_REQUESTED",
      },
    });

    // Request Shiprocket Return Pickup
    let trackingNo = null;
    let trackingUrl = null;
    try {
      const shipment = await createReturnShipment(order, order.address, order.orderItems);
      if (shipment && shipment.trackingNo) {
        trackingNo = shipment.trackingNo;
        trackingUrl = shipment.trackingUrl;

        // Save return tracking details
        await db.order.update({
          where: { id: orderId },
          data: {
            trackingNo: shipment.trackingNo,
            trackingUrl: shipment.trackingUrl,
          },
        });
      }
    } catch (err) {
      console.error("Shiprocket return shipment scheduling failed:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Return shipment pickup initiated.",
      order: {
        ...updatedOrder,
        trackingNo,
        trackingUrl,
      },
    });
  } catch (error: any) {
    console.error("Order return error:", error);
    return NextResponse.json({ error: error.message || "Failed to process return shipment." }, { status: 500 });
  }
}
