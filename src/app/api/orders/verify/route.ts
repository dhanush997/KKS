import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { sendOrderEmails } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // Session check is optional; the cryptographic signature verification is the primary security guarantee.

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return NextResponse.json({ error: "Missing required signature tokens." }, { status: 400 });
    }

    // 1. Verify cryptographic signature
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      // Mark payment log as failed
      await db.payment.updateMany({
        where: { orderId: orderId },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ error: "Invalid payment signature verification failed." }, { status: 400 });
    }

    // 2. Load order and items details for inventory updates & email dispatch
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
      return NextResponse.json({ error: "Order details not found in database." }, { status: 404 });
    }

    // Double check if order is already processed to prevent duplicate inventory deduction
    if (order.paymentStatus === "COMPLETED") {
      return NextResponse.json({ success: true, message: "Order already verified and processed." });
    }

    // 3. Process inventory deductions & update order status in database Transaction
    const updatedOrder = await db.$transaction(async (tx) => {
      // Update Order Status
      const ord = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "PROCESSING",
          paymentStatus: "COMPLETED",
        },
      });

      // Update payment record details
      await tx.payment.updateMany({
        where: { orderId: orderId },
        data: {
          transactionId: razorpay_payment_id,
          status: "SUCCESS",
          amount: order.totalAmount,
        },
      });

      // Deduct stock for each item
      for (const item of order.orderItems) {
        const inv = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            size: item.size,
          },
        });

        if (!inv || inv.stock < item.quantity) {
          throw new Error(`Insufficient stock for item ${item.name} (${item.size})`);
        }

        await tx.inventory.update({
          where: { id: inv.id },
          data: {
            stock: inv.stock - item.quantity,
          },
        });
      }

      return ord;
    });

    // 4. Trigger email notifications
    try {
      const emailItems = order.orderItems.map((item: any) => ({
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        shippingFee: item.shippingFee,
        image: item.image,
      }));

      await sendOrderEmails({
        orderNumber: order.orderNumber,
        customerName: order.address?.name || order.user?.name || "Customer",
        customerEmail: (order.address as any)?.email || order.user?.email || "",
        totalAmount: order.totalAmount,
        paymentMethod: "RAZORPAY",
        shippingAddress: order.address,
        edd: order.estimatedDeliveryDate,
        items: emailItems,
      });
    } catch (err) {
      console.error("Payment verified but order confirmation email dispatch failed:", err);
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("Razorpay verification API error:", error);
    return NextResponse.json({ error: error.message || "Failed to verify transaction signature." }, { status: 500 });
  }
}
