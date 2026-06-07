import nodemailer from "nodemailer";
import { formatDate } from "./utils";
import { db } from "./db";

// Get nodemailer transporter dynamically at runtime (crucial for Next.js/Vercel environment variables)
function getTransporter() {
  const gmailUser = process.env.GMAIL_USER || "";
  const gmailPass = process.env.GMAIL_PASS || "";

  if (!gmailUser || !gmailPass || gmailUser === "your-gmail-address@gmail.com") {
    return { transporter: null, gmailUser: "" };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Port 587 uses STARTTLS (secure: false)
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
    tls: {
      rejectUnauthorized: false,
    },
  } as any);

  return { transporter, gmailUser };
}

interface EmailOrderItem {
  name: string;
  size: string;
  quantity: number;
  price: number;
  discount?: number;
  shippingFee?: number;
  image: string;
}

interface OrderEmailData {
  orderId?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  edd: Date;
  items: EmailOrderItem[];
}

/**
 * Sends order confirmation emails to the customer and notifications to the store administrator.
 */
export async function sendOrderEmails(orderData: OrderEmailData) {
  const { transporter, gmailUser } = getTransporter();
  const {
    orderId,
    orderNumber,
    customerName,
    customerEmail,
    totalAmount,
    paymentMethod,
    shippingAddress,
    edd,
    items,
  } = orderData;

  let appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!appUrl && process.env.VERCEL_URL) {
    appUrl = `https://${process.env.VERCEL_URL}`;
  }
  if (!appUrl) {
    appUrl = "http://localhost:3000";
  }
  const logoUrl = `${appUrl}/kk_brand_logo.png`;

  // Fetch new arrivals dynamically from database
  let newArrivals: any[] = [];
  try {
    newArrivals = await db.product.findMany({
      where: { isNewArrival: true },
      take: 3,
      include: { images: { orderBy: { isFeatured: "desc" } } },
    });
  } catch (err) {
    console.error("Failed to fetch new arrivals for email template:", err);
  }

  const formattedEDD = formatDate(edd);
  const formattedTotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(totalAmount);

  // Calculate dynamic breakdowns
  const totalSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalShipping = items.reduce((sum, item) => sum + (item.shippingFee || 0), 0);
  const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);

  const formattedSubtotal = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalSubtotal);
  const formattedShipping = totalShipping > 0 
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalShipping)
    : "Free";
  const formattedDiscount = totalDiscount > 0 
    ? `-${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalDiscount)}`
    : null;

  // 1. Build Item List HTML
  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; vertical-align: middle;">
          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 12px; float: left;" />
          <div style="float: left;">
            <p style="margin: 0; font-weight: 600; color: #1f2937;">${item.name}</p>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Size: ${item.size} | Qty: ${item.quantity}</p>
            ${
              item.shippingFee && item.shippingFee > 0
                ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #e5001c;">Shipping: ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.shippingFee)}</p>`
                : ""
            }
          </div>
        </td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #1f2937; vertical-align: middle;">
          ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.price * item.quantity)}
          ${
            item.discount && item.discount > 0
              ? `<br/><span style="font-size: 11px; color: #e5001c;">Discount: -${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.discount)}</span>`
              : ""
          }
        </td>
      </tr>
    `
    )
    .join("");

  // Generate JSON-LD Schema.org Order Markup for Gmail
  const orderDateIso = new Date().toISOString();
  const schemaJson = {
    "@context": "http://schema.org",
    "@type": "Order",
    "merchant": {
      "@type": "Organization",
      "name": "KK Brand",
      "url": appUrl,
      "logo": logoUrl
    },
    "orderNumber": orderNumber,
    "priceCurrency": "INR",
    "price": String(totalAmount),
    "acceptedOffer": items.map((item) => ({
      "@type": "Offer",
      "itemOffered": {
        "@type": "Product",
        "name": item.name,
        "image": item.image.startsWith("http") ? item.image : `${appUrl}${item.image}`
      },
      "price": String(item.price),
      "priceCurrency": "INR",
      "eligibleQuantity": {
        "@type": "QuantitativeValue",
        "value": String(item.quantity)
      }
    })),
    "orderStatus": "http://schema.org/OrderProcessing",
    "orderDate": orderDateIso,
    "billingAddress": {
      "@type": "PostalAddress",
      "name": shippingAddress.name,
      "streetAddress": shippingAddress.streetAddress,
      "addressLocality": shippingAddress.city,
      "addressRegion": shippingAddress.state,
      "postalCode": shippingAddress.postalCode,
      "addressCountry": "IN"
    },
    "potentialAction": {
      "@type": "ViewAction",
      "name": "View Order",
      "target": `${appUrl}/profile/orders/${orderId || orderNumber}`
    }
  };
  const schemaScript = `<script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`;

  // 2. Customer Receipt Email Template
  const customerSubject = `Order Confirmed: ${orderNumber} - KK Brand`;
  const customerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmed</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <!-- Header Banner -->
              <tr>
                <td style="background-color: #ffffff; border-bottom: 1px solid #eaeaea; border-top: 4px solid #e5001c; padding: 32px; text-align: center;">
                  <img src="${logoUrl}" alt="KK BRAND Logo" style="height: 50px; width: auto; display: inline-block;" />
                  <p style="color: #e5001c; margin: 12px 0 0 0; font-size: 13px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Thank you for your purchase</p>
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 32px 32px;">
                  <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-top: 0;">Hi ${customerName},</h2>
                  <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Your order has been successfully placed. We're currently processing your items and will notify you as soon as they ship. Below you'll find details of your transaction.</p>
                  
                  <!-- CTA Button -->
                  ${orderId ? `
                  <div style="text-align: center; margin-bottom: 28px;">
                    <a href="${appUrl}/profile/orders/${orderId}" style="background-color: #e5001c; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; border-radius: 4px;">View Order & Invoice</a>
                  </div>
                  ` : ''}

                  <!-- Estimated Delivery Box -->
                  <div style="background-color: #fff5f5; border: 1px solid #ffe3e3; border-radius: 6px; padding: 16px 20px; margin-bottom: 28px; text-align: center;">
                    <p style="color: #c90014; margin: 0 0 4px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Estimated Delivery Date</p>
                    <h3 style="color: #e5001c; margin: 0; font-size: 18px; font-weight: 800;">${formattedEDD}</h3>
                  </div>

                  <!-- Order Summary Table -->
                  <h3 style="color: #111827; font-size: 16px; font-weight: 700; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 16px;">Order Summary (${orderNumber})</h3>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                    ${itemsHtml}
                    <tr>
                      <td style="padding: 12px 0 0 0; font-size: 14px; color: #4b5563;">Subtotal</td>
                      <td style="padding: 12px 0 0 0; font-size: 14px; color: #1f2937; text-align: right;">${formattedSubtotal}</td>
                    </tr>
                    ${
                      formattedDiscount
                        ? `<tr>
                            <td style="padding: 8px 0 0 0; font-size: 14px; color: #e5001c; font-weight: 600;">Discounts</td>
                            <td style="padding: 8px 0 0 0; font-size: 14px; color: #e5001c; font-weight: 600; text-align: right;">${formattedDiscount}</td>
                          </tr>`
                        : ""
                    }
                    <tr>
                      <td style="padding: 8px 0 0 0; font-size: 14px; color: #4b5563;">Shipping</td>
                      <td style="padding: 8px 0 0 0; font-size: 14px; color: #1f2937; text-align: right;">${formattedShipping}</td>
                    </tr>
                    <tr style="border-top: 1px solid #eaeaea;">
                      <td style="padding: 16px 0 0 0; font-size: 15px; font-weight: bold; color: #111827;">Total Amount Paid</td>
                      <td style="padding: 16px 0 0 0; font-size: 18px; font-weight: 800; color: #111827; text-align: right;">${formattedTotal}</td>
                    </tr>
                  </table>

                  <!-- Shipping details and payment info -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #f3f4f6; padding-top: 20px;">
                    <tr>
                      <td width="50%" style="vertical-align: top; padding-right: 12px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Shipping Address</h4>
                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">${shippingAddress.name}</p>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #4b5563; line-height: 1.4;">
                          ${shippingAddress.streetAddress}<br/>
                          ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.postalCode}<br/>
                          ${shippingAddress.country}<br/>
                          Phone: ${shippingAddress.phone}
                        </p>
                      </td>
                      <td width="50%" style="vertical-align: top; padding-left: 12px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Payment Details</h4>
                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">Method: ${paymentMethod === "COD" ? "Cash On Delivery (COD)" : "Online Payment (Razorpay)"}</p>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #4b5563;">Status: Pending Dispatch</p>
                      </td>
                    </tr>
                  </table>

                  <!-- Dynamic New Arrivals Section -->
                  ${newArrivals.length > 0 ? `
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #eaeaea; padding-top: 32px; margin-top: 32px; text-align: center;">
                    <tr>
                      <td colspan="3" style="padding-bottom: 20px; text-align: center;">
                        <h4 style="margin: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #111827; letter-spacing: 0.15em;">Latest New Arrivals</h4>
                        <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 500; letter-spacing: 0.05em;">Curated Premium Collection</p>
                      </td>
                    </tr>
                    <tr>
                      ${newArrivals.map((prod) => {
                        const imgUrl = prod.images[0]?.url || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800";
                        const prodLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/products/${prod.id}`;
                        const formattedPrice = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(prod.price);
                        return `
                          <td width="33%" style="vertical-align: top; padding: 0 8px; text-align: center;">
                            <a href="${prodLink}" style="text-decoration: none; display: block;">
                              <img src="${imgUrl}" alt="${prod.name}" style="width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: 4px; margin-bottom: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);" />
                              <p style="margin: 0; font-size: 11px; font-weight: 700; color: #1f2937; text-transform: uppercase; letter-spacing: 0.05em; height: 32px; overflow: hidden; line-height: 1.4;">${prod.name}</p>
                              <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 800; color: #e5001c;">${formattedPrice}</p>
                            </a>
                          </td>
                        `;
                      }).join("")}
                    </tr>
                    <tr>
                      <td colspan="3" style="padding-top: 24px; text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/products" style="background-color: #e5001c; color: #ffffff; padding: 10px 24px; text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block;">Shop All Collections</a>
                      </td>
                    </tr>
                  </table>
                  ` : ""}
                </td>
              </tr>
              <!-- Footer Details -->
              <tr>
                <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #eaeaea; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">If you have any questions, reply to this email or contact support@fashionstore.com.</p>
                  <p style="margin: 8px 0 0 0; font-size: 12px; color: #9ca3af;">&copy; 2026 KK Brand. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${schemaScript}
    </body>
    </html>
  `;

  // 3. Admin Notification Email Template
  const adminSubject = `NEW ORDER PLACED: ${orderNumber} - ${customerName}`;
  const adminHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order Received</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
      <div style="max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 1px solid #e5e7eb; border-top: 4px solid #e5001c;">
          <img src="${logoUrl}" alt="KK BRAND Logo" style="height: 44px; width: auto; display: inline-block;" />
          <h2 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #111827;">New Store Order</h2>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #6b7280; font-weight: bold;">Order number: ${orderNumber}</p>
        </div>
        <div style="padding: 24px;">
          <h3 style="margin-top: 0; color: #111827;">Customer Details</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Name:</strong> ${customerName}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${customerEmail}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Contact Phone:</strong> ${shippingAddress.phone}</p>

          <h3 style="border-top: 1px solid #f3f4f6; padding-top: 16px; color: #111827;">Order Specifications</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Delivery Target (EDD):</strong> ${formattedEDD}</p>
          
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb;">
            ${itemsHtml}
            <tr>
              <td style="padding: 12px 0; font-weight: bold; color: #111827;">Total Gross Revenue</td>
              <td style="padding: 12px 0; font-weight: 800; color: #111827; text-align: right;">${formattedTotal}</td>
            </tr>
          </table>

          <h3 style="color: #111827;">Delivery Address</h3>
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563; line-height: 1.4;">
            ${shippingAddress.name}<br/>
            ${shippingAddress.streetAddress}<br/>
            ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.postalCode}<br/>
            ${shippingAddress.country}
          </p>

          <div style="margin-top: 24px; text-align: center;">
            <a href="${appUrl}/admin/orders" style="background-color: #e5001c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Manage Order in Dashboard</a>
          </div>
        </div>
      </div>
      ${schemaScript}
    </body>
    </html>
  `;

  // 4. Send Emails
  if (!transporter) {
    console.log("================= SMTP NOT CONFIGURED =================\n");
    console.log(`[CUSTOMER EMAIL LOG] Sent to: ${customerEmail}`);
    console.log(`Subject: ${customerSubject}`);
    console.log(`Total Amount: ${formattedTotal} | EDD: ${formattedEDD}`);
    console.log(`Payment: ${paymentMethod}`);
    console.log(`Items: ${items.map((i) => `${i.name} (Size: ${i.size}, Qty: ${i.quantity})`).join(", ")}`);
    console.log("\n-----------------------------------------------------");
    console.log(`[ADMIN EMAIL LOG] Sent to: admin@fashionstore.com`);
    console.log(`Subject: ${adminSubject}`);
    console.log(`Total Amount: ${formattedTotal} | Customer: ${customerName} (${customerEmail})`);
    console.log("=======================================================\n");
    return;
  }

  try {
    // Send Customer Receipt
    await transporter.sendMail({
      from: `"KK Brand" <${gmailUser}>`,
      to: customerEmail,
      subject: customerSubject,
      html: customerHtml,
    });

    // Send Admin Notification
    await transporter.sendMail({
      from: `"KK Brand Store" <${gmailUser}>`,
      to: gmailUser,
      subject: adminSubject,
      html: adminHtml,
    });

    console.log(`Emails dispatched successfully for order ${orderNumber}`);
  } catch (error) {
    console.error("Failed to send SMTP emails, printing details to log:", error);
    // Logging fallback on error
    console.log(`[FALLBACK] Order: ${orderNumber} | Customer: ${customerEmail} | Total: ${formattedTotal}`);
  }
}

/**
 * Sends a password reset email to a customer with a secure JWT link.
 */
export async function sendPasswordResetEmail(email: string, name: string, resetLink: string) {
  const { transporter, gmailUser } = getTransporter();
  if (!transporter) {
    console.log("================= SMTP NOT CONFIGURED =================\n");
    console.log(`[PASSWORD RESET LOG] Sent to: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log("=======================================================\n");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoUrl = `${appUrl}/kk_brand_logo.png`;

  const subject = "Reset your KK Brand Account Password";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Password</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <!-- Header Banner -->
              <tr>
                <td style="background-color: #111827; padding: 30px; text-align: center;">
                  <img src="${logoUrl}" alt="KK BRAND Logo" style="height: 36px; width: auto; display: inline-block; filter: brightness(0) invert(1);" />
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 32px;">
                  <h2 style="color: #111827; font-size: 18px; font-weight: 700; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">We received a request to reset the password for your KK Brand account. Click the button below to choose a new password. This link is valid for 1 hour.</p>
                  
                  <!-- Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #e5001c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 700; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Reset Password</a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin-top: 24px;">If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
                  <p style="color: #9ca3af; font-size: 11px; margin-top: 16px; word-break: break-all;">Or copy and paste this URL into your browser:<br/><a href="${resetLink}" style="color: #e5001c;">${resetLink}</a></p>
                </td>
              </tr>
              <!-- Footer Details -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #eaeaea; text-align: center;">
                  <p style="margin: 0; font-size: 11px; color: #9ca3af;">&copy; 2026 KK Brand. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"KK Brand" <${gmailUser}>`,
      to: email,
      subject: subject,
      html: html,
    });
    console.log(`Password reset email successfully sent to ${email}`);
  } catch (error) {
    console.error("Failed to send password reset email via SMTP:", error);
    throw error;
  }
}

interface OrderUpdateEmailData {
  orderId?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  trackingNo?: string | null;
  trackingUrl?: string | null;
  items: EmailOrderItem[];
}

/**
 * Sends an email notification to the customer when their order status or tracking details are updated.
 */
export async function sendOrderStatusUpdateEmail(data: OrderUpdateEmailData) {
  const { transporter, gmailUser } = getTransporter();
  const { orderId, orderNumber, customerName, customerEmail, status, trackingNo, trackingUrl, items } = data;

  const subject = `Order Update: ${orderNumber} - Status changed to ${status} - KK Brand`;

  let appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!appUrl && process.env.VERCEL_URL) {
    appUrl = `https://${process.env.VERCEL_URL}`;
  }
  if (!appUrl) {
    appUrl = "http://localhost:3000";
  }
  const logoUrl = `${appUrl}/kk_brand_logo.png`;

  // Calculate dynamic breakdowns
  const totalSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalShipping = items.reduce((sum, item) => sum + (item.shippingFee || 0), 0);
  const totalDiscount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
  const grandTotal = totalSubtotal + totalShipping - totalDiscount;

  const formattedSubtotal = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalSubtotal);
  const formattedShipping = totalShipping > 0 
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalShipping)
    : "Free";
  const formattedDiscount = totalDiscount > 0 
    ? `-${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalDiscount)}`
    : null;
  const formattedTotal = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(grandTotal);

  // Define some nice descriptive text for each status
  let statusText = `Your order status has been updated to ${status}.`;
  if (status === "PROCESSING") {
    statusText = "Your order is now being processed by our team and is being prepared for packaging.";
  } else if (status === "SHIPPED") {
    statusText = "Exciting news! Your order has been shipped and is on its way to you.";
  } else if (status === "DELIVERED") {
    statusText = "Your order has been marked as delivered. We hope you love your new purchase!";
  } else if (status === "CANCELLED") {
    statusText = "Your order has been cancelled. If you did not request this cancellation, please reach out to our customer support team immediately.";
  }

  // Tracking HTML block if available
  let trackingHtml = "";
  if (trackingNo) {
    const trackingUrlFinal = trackingUrl || `https://shiprocket.co/tracking/${trackingNo}`;
    trackingHtml = `
      <div style="background-color: #fff5f5; border: 1px solid #ffe3e3; border-radius: 6px; padding: 18px; margin: 24px 0; text-align: center;">
        <p style="color: #c90014; margin: 0 0 6px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Shipment Tracking Details</p>
        <p style="color: #111827; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Tracking Number: <span style="font-weight: 800; font-family: monospace;">${trackingNo}</span></p>
        <a href="${trackingUrlFinal}" target="_blank" style="background-color: #e5001c; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 700; display: inline-block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Track Shipment</a>
      </div>
    `;
  }

  // Items table
  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; vertical-align: middle;">
          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 12px; float: left;" />
          <div style="float: left;">
            <p style="margin: 0; font-weight: 600; color: #1f2937;">${item.name}</p>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Size: ${item.size} | Qty: ${item.quantity}</p>
            ${
              item.shippingFee && item.shippingFee > 0
                ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #e5001c;">Shipping: ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.shippingFee)}</p>`
                : ""
            }
          </div>
        </td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #1f2937; vertical-align: middle;">
          ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.price * item.quantity)}
          ${
            item.discount && item.discount > 0
              ? `<br/><span style="font-size: 11px; color: #e5001c;">Discount: -${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.discount)}</span>`
              : ""
          }
        </td>
      </tr>
    `
    )
    .join("");

  // Generate JSON-LD Schema.org Order Update Markup for Gmail
  let schemaScript = "";
  let schemaStatus = "http://schema.org/OrderProcessing";
  if (status === "SHIPPED") schemaStatus = "http://schema.org/OrderShipped";
  if (status === "DELIVERED") schemaStatus = "http://schema.org/OrderDelivered";
  if (status === "CANCELLED") schemaStatus = "http://schema.org/OrderCancelled";

  if (trackingNo) {
    const trackingUrlFinal = trackingUrl || `https://shiprocket.co/tracking/${trackingNo}`;
    const schemaJson = {
      "@context": "http://schema.org",
      "@type": "ParcelDelivery",
      "deliveryAddress": {
        "@type": "PostalAddress",
        "name": customerName,
        "addressCountry": "IN"
      },
      "carrier": {
        "@type": "Organization",
        "name": "Shiprocket"
      },
      "trackingNumber": trackingNo,
      "trackingUrl": trackingUrlFinal,
      "partOfOrder": {
        "@type": "Order",
        "orderNumber": orderNumber,
        "merchant": {
          "@type": "Organization",
          "name": "KK Brand",
          "url": appUrl,
          "logo": logoUrl
        },
        "orderStatus": schemaStatus
      },
      "potentialAction": {
        "@type": "TrackAction",
        "target": trackingUrlFinal
      }
    };
    schemaScript = `<script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`;
  } else {
    const schemaJson = {
      "@context": "http://schema.org",
      "@type": "Order",
      "merchant": {
        "@type": "Organization",
        "name": "KK Brand",
        "url": appUrl,
        "logo": logoUrl
      },
      "orderNumber": orderNumber,
      "orderStatus": schemaStatus,
      "potentialAction": {
        "@type": "ViewAction",
        "name": "View Order",
        "target": `${appUrl}/profile/orders/${orderId || orderNumber}`
      }
    };
    schemaScript = `<script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Status Update</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <!-- Header Banner -->
              <tr>
                <td style="background-color: #ffffff; border-bottom: 1px solid #eaeaea; border-top: 4px solid #e5001c; padding: 32px 24px; text-align: center;">
                  <img src="${logoUrl}" alt="KK BRAND Logo" style="height: 42px; width: auto; display: inline-block;" />
                  <p style="color: #e5001c; margin: 10px 0 0 0; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">Order Status Update</p>
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 32px;">
                  <h2 style="color: #111827; font-size: 18px; font-weight: 700; margin-top: 0;">Hello ${customerName},</h2>
                  <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">We're writing to let you know that your order <strong>${orderNumber}</strong> has been updated.</p>
                  
                  <div style="border-left: 4px solid #e5001c; padding-left: 16px; margin: 20px 0;">
                    <p style="color: #111827; font-size: 15px; font-weight: 700; margin: 0 0 4px 0;">New Status: <span style="color: #e5001c; text-transform: uppercase;">${status}</span></p>
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0;">${statusText}</p>
                  </div>

                  ${trackingHtml}

                  ${orderId ? `
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${appUrl}/profile/orders/${orderId}" style="background-color: #e5001c; color: #ffffff; padding: 10px 24px; text-decoration: none; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; border-radius: 4px;">View Order Details</a>
                  </div>
                  ` : ''}

                  <!-- Order Summary Table -->
                  <h3 style="color: #111827; font-size: 15px; font-weight: 700; border-bottom: 2px solid #111827; padding-bottom: 6px; margin: 32px 0 12px 0;">Order Summary</h3>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                    ${itemsHtml}
                    <tr>
                      <td style="padding: 12px 0 0 0; font-size: 13px; color: #4b5563;">Subtotal</td>
                      <td style="padding: 12px 0 0 0; font-size: 13px; color: #1f2937; text-align: right;">${formattedSubtotal}</td>
                    </tr>
                    ${
                      formattedDiscount
                        ? `<tr>
                            <td style="padding: 6px 0 0 0; font-size: 13px; color: #e5001c; font-weight: 600;">Discounts</td>
                            <td style="padding: 6px 0 0 0; font-size: 13px; color: #e5001c; font-weight: 600; text-align: right;">${formattedDiscount}</td>
                          </tr>`
                        : ""
                    }
                    <tr>
                      <td style="padding: 6px 0 0 0; font-size: 13px; color: #4b5563;">Shipping</td>
                      <td style="padding: 6px 0 0 0; font-size: 13px; color: #1f2937; text-align: right;">${formattedShipping}</td>
                    </tr>
                    <tr style="border-top: 1px solid #eaeaea;">
                      <td style="padding: 12px 0 0 0; font-size: 14px; font-weight: bold; color: #111827;">Total Amount Paid</td>
                      <td style="padding: 12px 0 0 0; font-size: 15px; font-weight: 800; color: #111827; text-align: right;">${formattedTotal}</td>
                    </tr>
                  </table>

                  <p style="color: #4b5563; font-size: 13px; line-height: 1.5; margin-top: 24px;">Thank you for shopping with KK BRAND. We appreciate your patience as we fulfill your order.</p>
                </td>
              </tr>
              <!-- Footer Details -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #eaeaea; text-align: center;">
                  <p style="margin: 0; font-size: 11px; color: #9ca3af;">If you have any questions, reply to this email or contact support@fashionstore.com.</p>
                  <p style="margin: 6px 0 0 0; font-size: 11px; color: #9ca3af;">&copy; 2026 KK Brand. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${schemaScript}
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("================= SMTP NOT CONFIGURED =================\n");
    console.log(`[STATUS UPDATE EMAIL LOG] Sent to: ${customerEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Status: ${status} | Tracking: ${trackingNo} | URL: ${trackingUrl}`);
    console.log("=======================================================\n");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"KK Brand" <${gmailUser}>`,
      to: customerEmail,
      subject: subject,
      html: html,
    });
    console.log(`Status update email successfully sent to ${customerEmail} for order ${orderNumber}`);
  } catch (error) {
    console.error("Failed to send status update email via SMTP:", error);
  }
}

interface InvoiceEmailData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  shippingTotal: number;
  discountTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: Date | string;
  shippingAddress: {
    name: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: EmailOrderItem[];
}

/**
 * Sends a highly professional, compliant tax invoice email to the customer.
 */
export async function sendInvoiceEmail(invoiceData: InvoiceEmailData) {
  const { transporter, gmailUser } = getTransporter();
  const {
    orderId,
    orderNumber,
    customerName,
    customerEmail,
    totalAmount,
    shippingTotal,
    discountTotal,
    paymentMethod,
    paymentStatus,
    createdAt,
    shippingAddress,
    items,
  } = invoiceData;

  let appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!appUrl && process.env.VERCEL_URL) {
    appUrl = `https://${process.env.VERCEL_URL}`;
  }
  if (!appUrl) {
    appUrl = "http://localhost:3000";
  }
  const logoUrl = `${appUrl}/kk_brand_logo.png`;

  const formattedDate = formatDate(new Date(createdAt));
  const formattedTotal = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalAmount);
  
  const subtotal = totalAmount - (shippingTotal || 0) + (discountTotal || 0);
  const formattedSubtotal = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(subtotal);
  const formattedShipping = shippingTotal > 0 
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(shippingTotal)
    : "Free";
  const formattedDiscount = discountTotal > 0 
    ? `-${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(discountTotal)}`
    : null;

  const itemsHtml = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 12px 0; font-size: 13px; color: #111827; font-weight: bold; text-transform: uppercase;">
          ${item.name}
          <div style="font-size: 11px; color: #6b7280; font-weight: normal; margin-top: 2px;">Size: ${item.size}</div>
        </td>
        <td style="padding: 12px 0; text-align: center; font-size: 13px; color: #4b5563;">${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right; font-size: 13px; color: #4b5563;">${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.price)}</td>
        <td style="padding: 12px 0; text-align: right; font-size: 13px; color: #e5001c; font-weight: bold;">
          ${item.discount && item.discount > 0 ? `-${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.discount)}` : "—"}
        </td>
        <td style="padding: 12px 0; text-align: right; font-size: 13px; color: #111827; font-weight: bold;">
          ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format((item.price * item.quantity) - (item.discount || 0))}
        </td>
      </tr>
    `
    )
    .join("");

  // Gmail JSON-LD order schema pointing to invoice page
  const schemaJson = {
    "@context": "http://schema.org",
    "@type": "Order",
    "merchant": {
      "@type": "Organization",
      "name": "KK Brand",
      "url": appUrl,
      "logo": logoUrl
    },
    "orderNumber": orderNumber,
    "priceCurrency": "INR",
    "price": String(totalAmount),
    "acceptedOffer": items.map((item) => ({
      "@type": "Offer",
      "itemOffered": {
        "@type": "Product",
        "name": item.name,
        "image": item.image.startsWith("http") ? item.image : `${appUrl}${item.image}`
      },
      "price": String(item.price),
      "priceCurrency": "INR",
      "eligibleQuantity": {
        "@type": "QuantitativeValue",
        "value": String(item.quantity)
      }
    })),
    "orderStatus": "http://schema.org/OrderDelivered",
    "orderDate": new Date(createdAt).toISOString(),
    "billingAddress": {
      "@type": "PostalAddress",
      "name": shippingAddress.name,
      "streetAddress": shippingAddress.streetAddress,
      "addressLocality": shippingAddress.city,
      "addressRegion": shippingAddress.state,
      "postalCode": shippingAddress.postalCode,
      "addressCountry": "IN"
    },
    "potentialAction": {
      "@type": "ViewAction",
      "name": "View Invoice",
      "target": `${appUrl}/profile/orders/${orderId}/invoice`
    }
  };
  const schemaScript = `<script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`;

  const subject = `Tax Invoice: ${orderNumber} - KK Brand`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Tax Invoice</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
              <!-- Header Banner -->
              <tr>
                <td style="background-color: #ffffff; border-bottom: 1px solid #eaeaea; border-top: 4px solid #e5001c; padding: 32px; text-align: left;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <img src="${logoUrl}" alt="KK BRAND Logo" style="height: 44px; width: auto; display: block;" />
                        <p style="margin: 8px 0 0 0; font-size: 10px; color: #9ca3af; font-weight: bold; text-transform: uppercase; tracking-wider; line-height: 1.4;">
                          KK Fashion Store Private Limited<br/>
                          Premium Retail Hub, Brigade Road<br/>
                          Bangalore, Karnataka - 560001
                        </p>
                      </td>
                      <td style="text-align: right; vertical-align: top;">
                        <h2 style="margin: 0; color: #111827; font-size: 20px; font-weight: 950; letter-spacing: 0.05em; text-transform: uppercase;">Tax Invoice</h2>
                        <p style="margin: 6px 0 0 0; font-size: 11px; color: #4b5563; font-weight: bold;">Invoice: <span style="color: #111827;">${orderNumber}</span></p>
                        <p style="margin: 2px 0 0 0; font-size: 11px; color: #4b5563;">Date: ${formattedDate}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 32px;">
                  <!-- Billed / Shipped address -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                    <tr>
                      <td width="50%" style="vertical-align: top; padding-right: 12px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Billed To</h4>
                        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #111827; text-transform: uppercase;">${customerName}</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563; line-height: 1.4; text-transform: uppercase;">
                          ${shippingAddress.streetAddress}<br/>
                          ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.postalCode}<br/>
                          ${shippingAddress.country}
                        </p>
                      </td>
                      <td width="50%" style="vertical-align: top; padding-left: 12px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Shipped To</h4>
                        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #111827; text-transform: uppercase;">${shippingAddress.name}</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563; line-height: 1.4; text-transform: uppercase;">
                          ${shippingAddress.streetAddress}<br/>
                          ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.postalCode}<br/>
                          Phone: ${shippingAddress.phone}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Billing particulars -->
                  <div style="background-color: #f9fafb; border: 1px solid #eaeaea; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 11px; color: #4b5563;"><strong>Payment Method:</strong> ${paymentMethod === "COD" ? "Cash On Delivery (COD)" : "Razorpay Online Payment"}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #4b5563;"><strong>Payment Status:</strong> <span style="text-transform: uppercase; font-weight: bold; color: ${paymentStatus === "COMPLETED" ? "#059669" : "#d97706"};">${paymentStatus}</span></p>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin-bottom: 30px;">
                    <a href="${appUrl}/profile/orders/${orderId}/invoice" style="background-color: #e5001c; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; border-radius: 4px;">Print / Download Invoice PDF</a>
                  </div>

                  <!-- Invoice items -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                    <thead>
                      <tr style="border-bottom: 2px solid #111827; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9ca3af;">
                        <th style="padding-bottom: 8px;">Item Description</th>
                        <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                        <th style="padding-bottom: 8px; text-align: right;">Unit Price</th>
                        <th style="padding-bottom: 8px; text-align: right;">Discount</th>
                        <th style="padding-bottom: 8px; text-align: right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>

                  <!-- Invoice Totals -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="60%"></td>
                      <td width="40%">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12px; font-weight: bold; text-transform: uppercase;">
                          <tr>
                            <td style="padding: 6px 0; color: #6b7280;">Subtotal</td>
                            <td style="padding: 6px 0; text-align: right; color: #111827;">${formattedSubtotal}</td>
                          </tr>
                          ${formattedDiscount ? `
                          <tr>
                            <td style="padding: 6px 0; color: #e5001c;">Total Discount</td>
                            <td style="padding: 6px 0; text-align: right; color: #e5001c;">${formattedDiscount}</td>
                          </tr>
                          ` : ''}
                          <tr>
                            <td style="padding: 6px 0; color: #6b7280;">Shipping Fee</td>
                            <td style="padding: 6px 0; text-align: right; color: #111827;">${formattedShipping}</td>
                          </tr>
                          <tr style="border-top: 1px solid #111827;">
                            <td style="padding: 12px 0 0 0; font-size: 14px; font-weight: 900; color: #111827;">Grand Total</td>
                            <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 900; text-align: right; color: #111827;">${formattedTotal}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer Details -->
              <tr>
                <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #eaeaea; text-align: center;">
                  <p style="margin: 0; font-size: 10px; color: #9ca3af; font-weight: bold; text-transform: uppercase; tracking-wider; line-height: 1.6;">
                    Thank you for shopping at KK BRAND.<br/>
                    This is a computer-generated document and does not require a physical signature.<br/>
                    For support, contact support@fashionstore.com referencing your Invoice No.
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 10px; color: #9ca3af;">&copy; 2026 KK Brand. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      ${schemaScript}
    </body>
    </html>
  `;

  if (!transporter) {
    console.log("================= SMTP NOT CONFIGURED =================\n");
    console.log(`[INVOICE EMAIL LOG] Sent to: ${customerEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Total Amount: ${formattedTotal}`);
    console.log(`Items: ${items.map((i) => `${i.name} (${i.size})`).join(", ")}`);
    console.log("=======================================================\n");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"KK Brand" <${gmailUser}>`,
      to: customerEmail,
      subject: subject,
      html: html,
    });
    console.log(`Tax Invoice successfully emailed to ${customerEmail} for order ${orderNumber}`);
  } catch (error) {
    console.error("Failed to email invoice via SMTP:", error);
    throw error;
  }
}
