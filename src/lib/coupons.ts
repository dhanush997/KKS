/**
 * Calculates the shipping fee for a single item subtotal.
 * Rule: If subtotal (price * qty) is less than 500 INR, shipping fee is 50 INR.
 * Otherwise, shipping fee is 0 INR (Free).
 */
export function calculateItemShippingFee(subtotal: number): number {
  return subtotal < 500 ? 50 : 0;
}

interface CouponDetails {
  type: string; // "PERCENT" or "FIXED"
  value: number;
  code?: string | null;
}

/**
 * Performs full financial calculation for an order item using database-fetched coupon details.
 */
export function calculateItemFinancials(
  price: number,
  quantity: number,
  coupon?: CouponDetails | null
) {
  const subtotal = price * quantity;
  let discount = 0;

  if (coupon) {
    if (coupon.type === "PERCENT") {
      discount = Math.round((subtotal * coupon.value) / 100);
    } else if (coupon.type === "FIXED") {
      // Discount cannot exceed the subtotal itself
      discount = Math.min(coupon.value, subtotal);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);
  
  // If the admin coupon KKADMINFREE is applied or discount value is 100%, shipping is free (0 INR)
  const isAdminFree = coupon?.code?.trim().toUpperCase() === "KKADMINFREE" || (coupon && coupon.type === "PERCENT" && coupon.value === 100);
  const shippingFee = isAdminFree ? 0 : calculateItemShippingFee(discountedSubtotal);
  const total = discountedSubtotal + shippingFee;

  return {
    subtotal,
    discount,
    shippingFee,
    total,
  };
}
