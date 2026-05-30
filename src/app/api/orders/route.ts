import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateEDD, generateOrderNumber } from "@/lib/utils";
import { createRazorpayOrder } from "@/lib/razorpay";
import { sendOrderEmails } from "@/lib/email";

// 1. GET - Retrieve orders (Customers see theirs; Admins see all)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const isAdmin = session.user.role === "ADMIN";

    const where: any = {};
    if (!isAdmin) {
      where.userId = session.user.id;
    }

    if (search && isAdmin) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        orderItems: true,
        address: true,
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}

// 2. POST - Place a new order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const {
      cartItems, // Array of { productId, name, size, quantity, price, image }
      paymentMethod, // "COD" or "RAZORPAY"
      shippingAddress, // { name, phone, streetAddress, city, state, postalCode, country }
      addressId, // Optional, if using pre-saved address
    } = await req.json();

    if (!cartItems || cartItems.length === 0 || !paymentMethod) {
      return NextResponse.json({ error: "Cart is empty or payment method not selected." }, { status: 400 });
    }

    if (!addressId && (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.streetAddress)) {
      return NextResponse.json({ error: "Shipping address details are required." }, { status: 400 });
    }

    // 1. Process Address (save new address or retrieve existing)
    let selectedAddress;
    if (addressId) {
      selectedAddress = await db.address.findUnique({
        where: { id: addressId },
      });
      if (!selectedAddress) {
        return NextResponse.json({ error: "Selected address not found." }, { status: 404 });
      }
    } else {
      selectedAddress = await db.address.create({
        data: {
          userId: session.user.id,
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          streetAddress: shippingAddress.streetAddress,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country || "India",
          isDefault: false,
        },
      });
    }

    // 5. Enforce delivery only inside India
    const countryLower = selectedAddress.country ? selectedAddress.country.trim().toLowerCase() : "";
    if (countryLower !== "india") {
      return NextResponse.json({ error: "Invalid shipping destination. KK BRAND only delivers within India at this time." }, { status: 400 });
    }

    // 2. Calculate Total & Validate Inventory Stocks
    let totalAmount = 0;
    const inventoryUpdates: { inventoryId: string; newStock: number }[] = [];

    for (const item of cartItems) {
      // Find inventory entry for specific product & size
      const inv = await db.inventory.findFirst({
        where: {
          productId: item.productId,
          size: item.size,
        },
      });

      if (!inv) {
        return NextResponse.json({ error: `Size ${item.size} not found for product ${item.name}.` }, { status: 400 });
      }

      if (inv.stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${item.name} (Size: ${item.size}). Available: ${inv.stock}` }, { status: 400 });
      }

      totalAmount += item.price * item.quantity;
      inventoryUpdates.push({
        inventoryId: inv.id,
        newStock: inv.stock - item.quantity,
      });
    }

    // 3. Setup Order Core Details
    const orderNumber = generateOrderNumber();
    const edd = calculateEDD(); // Date + 7 days

    // 4. Handle based on payment method
    if (paymentMethod === "COD") {
      // Cash On Delivery Flow (Instant placement)
      const order = await db.$transaction(async (tx: any) => {
        // Create Order
        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            userId: session.user.id,
            addressId: selectedAddress.id,
            totalAmount,
            status: "PROCESSING", // COD starts processing directly
            paymentMethod,
            paymentStatus: "PENDING",
            estimatedDeliveryDate: edd,
          },
        });

        // Create Order Items
        for (const item of cartItems) {
          await tx.orderItem.create({
            data: {
              orderId: createdOrder.id,
              productId: item.productId,
              name: item.name,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
            },
          });
        }

        // Reduce inventory
        for (const update of inventoryUpdates) {
          await tx.inventory.update({
            where: { id: update.inventoryId },
            data: { stock: update.newStock },
          });
        }

        // Save initial payment record
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            paymentMethod,
            amount: totalAmount,
            status: "PENDING",
          },
        });

        return createdOrder;
      });

      // Trigger email notifications
      try {
        await sendOrderEmails({
          orderNumber: order.orderNumber,
          customerName: session.user.name || "Customer",
          customerEmail: session.user.email || "",
          totalAmount,
          paymentMethod,
          shippingAddress: selectedAddress,
          edd,
          items: cartItems,
        });
      } catch (err) {
        console.error("Order placed but email dispatch failed:", err);
      }

      return NextResponse.json({ success: true, order }, { status: 201 });
    } else {
      // Online Payment Flow (Razorpay)
      // We create the order in database with state "PENDING" and paymentStatus "PENDING".
      // We generate the Razorpay Order.
      const rzOrder = (await createRazorpayOrder(totalAmount, orderNumber)) as any;

      const order = await db.$transaction(async (tx: any) => {
        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            userId: session.user.id,
            addressId: selectedAddress.id,
            totalAmount,
            status: "PENDING", // Stays pending until payment is verified
            paymentMethod,
            paymentStatus: "PENDING",
            estimatedDeliveryDate: edd,
          },
        });

        // Create Order Items
        for (const item of cartItems) {
          await tx.orderItem.create({
            data: {
              orderId: createdOrder.id,
              productId: item.productId,
              name: item.name,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
            },
          });
        }

        // Save initial payment record linking Razorpay order ID as transaction ID
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            paymentMethod,
            transactionId: rzOrder.id, // Save RZ Order ID
            amount: totalAmount,
            status: "PENDING",
          },
        });

        return createdOrder;
      });

      // Note: We do NOT reduce inventory or send email yet for Razorpay!
      // This is completed in `/api/orders/verify` once signature is confirmed.
      return NextResponse.json(
        {
          success: true,
          gatewayOrder: rzOrder,
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Order creation POST error:", error);
    return NextResponse.json({ error: "Failed to place order." }, { status: 500 });
  }
}
