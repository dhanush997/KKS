import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

// Initialize Razorpay only if key details are present
export const razorpay = 
  keyId && keySecret && keyId !== "rzp_test_your_razorpay_key_id"
    ? new Razorpay({ key_id: keyId, key_secret: keySecret })
    : null;

/**
 * Creates an order in Razorpay for checkout.
 * 
 * @param amount - Amount in INR (e.g. 1999)
 * @param receipt - Unique internal order/receipt ID
 */
export async function createRazorpayOrder(amount: number, receipt: string) {
  if (!razorpay) {
    console.warn("Razorpay credentials are not configured. Returning mock order details.");
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      amount: amount * 100, // amount in paisa
      currency: "INR",
      receipt: receipt,
      status: "created",
    };
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay accepts in paisa (1 INR = 100 Paisa)
      currency: "INR",
      receipt: receipt,
      payment_capture: true, // Automatically capture payment
    });
    return order;
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    throw new Error("Failed to initialize online payment transaction.");
  }
}

/**
 * Verifies Razorpay signature returned by the checkout widget.
 */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  if (!keySecret || keySecret === "your_razorpay_key_secret") {
    // If running in mock mode, mock orders automatically pass
    if (razorpayOrderId.startsWith("order_mock_")) {
      return true;
    }
    return false;
  }

  try {
    const payload = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    return expectedSignature === razorpaySignature;
  } catch (error) {
    console.error("Razorpay signature verification failed:", error);
    return false;
  }
}
