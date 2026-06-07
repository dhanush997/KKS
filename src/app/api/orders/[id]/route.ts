import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendOrderStatusUpdateEmail } from "@/lib/email";
import { createForwardShipment } from "@/lib/shiprocket";

// Helper to check admin session
async function checkAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return false;
  }
  return true;
}

// 1. GET - Fetch detailed order specification
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        payments: true,
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Customer can only view their own order
    if (session.user.role !== "ADMIN" && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Order GET details error:", error);
    return NextResponse.json({ error: "Failed to fetch order details." }, { status: 500 });
  }
}

// 2. PUT - Update order status (Admin or Customer cancel)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id: orderId } = await params;
    const { status, trackingNo, trackingUrl } = await req.json(); // e.g. "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", tracking updates

    const isAdmin = session.user.role === "ADMIN";

    // Fetch current order state
    const currentOrder = await db.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        address: true,
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Validation: Customers can only cancel their own orders if it's still pending/processing
    if (!isAdmin) {
      if (currentOrder.userId !== session.user.id) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }
      if (status !== "CANCELLED") {
        return NextResponse.json({ error: "Customers can only request order cancellation." }, { status: 400 });
      }
      if (currentOrder.status === "SHIPPED" || currentOrder.status === "DELIVERED" || currentOrder.status === "CANCELLED") {
        return NextResponse.json({ error: "Cannot cancel order at this stage." }, { status: 400 });
      }
    }

    // If order is changing to CANCELLED and was not already cancelled, restore inventory stock
    const isCancelling = status === "CANCELLED" && currentOrder.status !== "CANCELLED";

    const updatedOrder = await db.$transaction(async (tx) => {
      // Update order status & tracking info
      const ord = await tx.order.update({
        where: { id: orderId },
        data: {
          ...(status ? { status } : {}),
          ...(trackingNo !== undefined ? { trackingNo } : {}),
          ...(trackingUrl !== undefined ? { trackingUrl } : {}),
          // If cancelled, optionally set payment status to FAILED or REFUNDED depending on method
          ...(status === "CANCELLED" && currentOrder.paymentMethod === "COD" ? { paymentStatus: "FAILED" } : {}),
        },
      });

      // Restore inventory
      if (isCancelling) {
        for (const item of currentOrder.orderItems) {
          // Find the corresponding inventory record
          const inv = await tx.inventory.findFirst({
            where: {
              productId: item.productId,
              size: item.size,
            },
          });

          if (inv) {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                stock: inv.stock + item.quantity,
              },
            });
          }
        }

        // Update payment log entry status if present
        await tx.payment.updateMany({
          where: { orderId },
          data: { status: "FAILED" },
        });
      }

      // If status is DELIVERED, set paymentStatus as COMPLETED for COD orders
      if (status === "DELIVERED" && currentOrder.paymentMethod === "COD") {
        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: "COMPLETED" },
        });

        await tx.payment.updateMany({
          where: { orderId },
          data: { status: "SUCCESS" },
        });
      }

      return ord;
    });

    // Trigger Shiprocket Carrier Order Creation when status is updated to SHIPPED
    let finalOrder = updatedOrder;
    if (status === "SHIPPED" && currentOrder.status !== "SHIPPED") {
      try {
        const shipment = await createForwardShipment(updatedOrder, currentOrder.address, currentOrder.orderItems);
        if (shipment && shipment.trackingNo) {
          finalOrder = await db.order.update({
            where: { id: orderId },
            data: {
              trackingNo: shipment.trackingNo,
              trackingUrl: shipment.trackingUrl,
            },
          });
        }
      } catch (err) {
        console.error("Failed to register order on Shiprocket:", err);
      }
    }

    // Trigger email notification for status and tracking updates
    try {
      const email = (currentOrder.address as any)?.email || currentOrder.user?.email;
      const name = currentOrder.address?.name || currentOrder.user?.name || "Customer";
      
      if (email) {
        await sendOrderStatusUpdateEmail({
          orderId: finalOrder.id,
          orderNumber: finalOrder.orderNumber,
          customerName: name,
          customerEmail: email,
          status: finalOrder.status,
          trackingNo: (finalOrder as any).trackingNo,
          trackingUrl: (finalOrder as any).trackingUrl,
          items: currentOrder.orderItems.map((item: any) => ({
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
            shippingFee: item.shippingFee,
            image: item.image,
          })),
        });
      }
    } catch (err) {
      console.error("Order status update email dispatch failed:", err);
    }

    return NextResponse.json({ success: true, order: finalOrder });
  } catch (error) {
    console.error("Order PUT status update error:", error);
    return NextResponse.json({ error: "Failed to update order status." }, { status: 500 });
  }
}
