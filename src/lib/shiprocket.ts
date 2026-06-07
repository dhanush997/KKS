/**
 * Shiprocket Carrier Integration Utility Client
 * Handles forward shipment orders when an order is created, and
 * return shipment pickups when a customer requests a return.
 * 
 * Supports a fully functional local mock fallback if API credentials are not provided.
 */

// Helper to authenticate with Shiprocket API and get JWT token
async function getShiprocketToken(): Promise<string | null> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password || email.includes("your_") || password.includes("your_")) {
    console.log("[Shiprocket] Credentials not configured in .env. Running in MOCK carrier mode.");
    return null;
  }

  try {
    const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to login to Shiprocket API.");
    }

    return data.token;
  } catch (error) {
    console.error("[Shiprocket] Auth failed, falling back to mock:", error);
    return null;
  }
}

/**
 * Creates a forward shipment order on Shiprocket when an order is created (COD) or verified (Razorpay)
 */
export async function createForwardShipment(order: any, address: any, items: any[]) {
  console.log(`[Shiprocket] Initiating Forward Shipment for Order #${order.orderNumber}...`);

  const token = await getShiprocketToken();
  const orderDate = new Date(order.createdAt || new Date());
  
  // Format date: YYYY-MM-DD HH:MM
  const formattedOrderDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getDate()).padStart(2, "0")} ${String(orderDate.getHours()).padStart(2, "0")}:${String(orderDate.getMinutes()).padStart(2, "0")}`;

  const payload = {
    order_id: order.orderNumber,
    order_date: formattedOrderDate,
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
    channel_id: "",
    comment: "Prepaid Garments Order",
    billing_customer_name: address.name.split(" ")[0] || "Customer",
    billing_last_name: address.name.split(" ").slice(1).join(" ") || "",
    billing_address: address.streetAddress,
    billing_address_2: "",
    billing_city: address.city,
    billing_pincode: address.postalCode,
    billing_state: address.state,
    billing_country: address.country || "India",
    billing_email: address.email || "customer@kkbrand.com",
    billing_phone: address.phone,
    shipping_is_billing: true,
    order_items: items.map((item) => ({
      name: item.name,
      sku: item.productId,
      units: item.quantity,
      selling_price: item.price,
      discount: item.discount || 0,
      tax: 0,
      hsn: "",
    })),
    payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
    shipping_charges: order.shippingTotal || 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: order.discountTotal || 0,
    sub_total: order.totalAmount,
    length: 15, // standard default garment dimensions (cm)
    width: 15,
    height: 10,
    weight: 0.5, // standard package weight (kg)
  };

  if (!token) {
    // Return mock tracking details
    const trackingNo = `SRFWD${Math.floor(10000000 + Math.random() * 90000000)}`;
    const trackingUrl = `https://shiprocket.co/tracking/${trackingNo}`;
    console.log("[Shiprocket Mock] Forward Order Payload Compiled:", JSON.stringify(payload, null, 2));
    console.log(`[Shiprocket Mock] Shipment created successfully. Tracking No: ${trackingNo}`);
    return { trackingNo, trackingUrl, payload, mock: true };
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || JSON.stringify(data));
    }

    const trackingNo = data.shipment_id ? String(data.shipment_id) : `SRFWD${data.order_id}`;
    const trackingUrl = `https://shiprocket.co/tracking/${trackingNo}`;
    console.log(`[Shiprocket API] Shipment created successfully. Tracking No: ${trackingNo}`);
    return { trackingNo, trackingUrl, payload, mock: false };
  } catch (error) {
    console.error("[Shiprocket API] Order creation failed, falling back to mock tracking details:", error);
    const trackingNo = `SRFWD${Math.floor(10000000 + Math.random() * 90000000)}`;
    const trackingUrl = `https://shiprocket.co/tracking/${trackingNo}`;
    return { trackingNo, trackingUrl, payload, mock: true, error: true };
  }
}

/**
 * Creates a return pickup order on Shiprocket when a customer clicks Return on a delivered order
 */
export async function createReturnShipment(order: any, address: any, items: any[]) {
  console.log(`[Shiprocket] Initiating Return Pickup for Order #${order.orderNumber}...`);

  const token = await getShiprocketToken();
  const orderDate = new Date();
  const formattedOrderDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getDate()).padStart(2, "0")} ${String(orderDate.getHours()).padStart(2, "0")}:${String(orderDate.getMinutes()).padStart(2, "0")}`;

  // For return shipments:
  // - Pickup is from the customer's shipping address
  // - Shipping destination is the KK Brand central warehouse
  const payload = {
    order_id: `${order.orderNumber}-RET`,
    order_date: formattedOrderDate,
    channel_id: "",
    pickup_customer_name: address.name.split(" ")[0] || "Customer",
    pickup_last_name: address.name.split(" ").slice(1).join(" ") || "",
    pickup_address: address.streetAddress,
    pickup_address_2: "",
    pickup_city: address.city,
    pickup_state: address.state,
    pickup_country: address.country || "India",
    pickup_pincode: address.postalCode,
    pickup_email: address.email || "customer@kkbrand.com",
    pickup_phone: address.phone,
    
    shipping_customer_name: "KK BRAND WAREHOUSE",
    shipping_last_name: "RETURNS DEP.",
    shipping_address: process.env.WAREHOUSE_ADDRESS || "456 Fashion Avenue, Industrial Focal Point",
    shipping_address_2: "",
    shipping_city: process.env.WAREHOUSE_CITY || "Mumbai",
    shipping_state: process.env.WAREHOUSE_STATE || "Maharashtra",
    shipping_country: "India",
    shipping_pincode: process.env.WAREHOUSE_PINCODE || "400001",
    shipping_email: process.env.WAREHOUSE_EMAIL || "returns@kkbrand.com",
    shipping_phone: process.env.WAREHOUSE_PHONE || "9988776655",
    
    order_items: items.map((item) => ({
      name: item.name,
      sku: item.productId,
      units: item.quantity,
      selling_price: item.price,
      discount: item.discount || 0,
      tax: 0,
      hsn: "",
    })),
    payment_method: "Prepaid",
    sub_total: order.totalAmount,
    length: 15,
    width: 15,
    height: 10,
    weight: 0.5,
  };

  if (!token) {
    const trackingNo = `SRRET${Math.floor(10000000 + Math.random() * 90000000)}`;
    const trackingUrl = `https://shiprocket.co/tracking/${trackingNo}`;
    console.log("[Shiprocket Mock] Return Order Payload Compiled:", JSON.stringify(payload, null, 2));
    console.log(`[Shiprocket Mock] Return pickup scheduled successfully. Tracking No: ${trackingNo}`);
    return { trackingNo, trackingUrl, payload, mock: true };
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/return", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || JSON.stringify(data));
    }

    const trackingNo = data.shipment_id ? String(data.shipment_id) : `SRRET${data.order_id}`;
    const trackingUrl = `https://shiprocket.co/tracking/${trackingNo}`;
    console.log(`[Shiprocket API] Return pickup scheduled successfully. Tracking No: ${trackingNo}`);
    return { trackingNo, trackingUrl, payload, mock: false };
  } catch (error) {
    console.error("[Shiprocket API] Return creation failed, falling back to mock tracking details:", error);
    const trackingNo = `SRRET${Math.floor(10000000 + Math.random() * 90000000)}`;
    const trackingUrl = `https://shiprocket.co/tracking/${trackingNo}`;
    return { trackingNo, trackingUrl, payload, mock: true, error: true };
  }
}
