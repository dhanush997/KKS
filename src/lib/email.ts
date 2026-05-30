import nodemailer from "nodemailer";
import { formatDate } from "./utils";

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
  image: string;
}

interface OrderEmailData {
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
    orderNumber,
    customerName,
    customerEmail,
    totalAmount,
    paymentMethod,
    shippingAddress,
    edd,
    items,
  } = orderData;

  const formattedEDD = formatDate(edd);
  const formattedTotal = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(totalAmount);

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
          </div>
        </td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #1f2937; vertical-align: middle;">
          ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.price * item.quantity)}
        </td>
      </tr>
    `
    )
    .join("");

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
                <td style="background-color: #111827; padding: 40px 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">KK BRAND</h1>
                  <p style="color: #c49e6d; margin: 8px 0 0 0; font-size: 14px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;">Thank you for your purchase</p>
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 32px 32px;">
                  <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-top: 0;">Hi ${customerName},</h2>
                  <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Your order has been successfully placed. We're currently processing your items and will notify you as soon as they ship. Below you'll find details of your transaction.</p>
                  
                  <!-- Estimated Delivery Box -->
                  <div style="background-color: #fdfbf7; border: 1px solid #f5ebdb; border-radius: 6px; padding: 16px 20px; margin-bottom: 28px; text-align: center;">
                    <p style="color: #765337; margin: 0 0 4px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Estimated Delivery Date</p>
                    <h3 style="color: #b28555; margin: 0; font-size: 18px; font-weight: 800;">${formattedEDD}</h3>
                  </div>

                  <!-- Order Summary Table -->
                  <h3 style="color: #111827; font-size: 16px; font-weight: 700; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 16px;">Order Summary (${orderNumber})</h3>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                    ${itemsHtml}
                    <tr>
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
        <div style="background-color: #b28555; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">New Store Order</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px;">Order number: ${orderNumber}</p>
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
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/orders" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block; font-size: 14px;">Manage Order in Dashboard</a>
          </div>
        </div>
      </div>
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">KK BRAND</h1>
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 32px;">
                  <h2 style="color: #111827; font-size: 18px; font-weight: 700; margin-top: 0;">Hello ${name},</h2>
                  <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">We received a request to reset the password for your KK Brand account. Click the button below to choose a new password. This link is valid for 1 hour.</p>
                  
                  <!-- Button -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 700; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Reset Password</a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin-top: 24px;">If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
                  <p style="color: #9ca3af; font-size: 11px; margin-top: 16px; word-break: break-all;">Or copy and paste this URL into your browser:<br/><a href="${resetLink}" style="color: #b28555;">${resetLink}</a></p>
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
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  trackingNo?: string | null;
  trackingUrl?: string | null;
  items: { name: string; size: string; quantity: number; price: number; image: string }[];
}

/**
 * Sends an email notification to the customer when their order status or tracking details are updated.
 */
export async function sendOrderStatusUpdateEmail(data: OrderUpdateEmailData) {
  const { transporter, gmailUser } = getTransporter();
  const { orderNumber, customerName, customerEmail, status, trackingNo, trackingUrl, items } = data;

  const subject = `Order Update: ${orderNumber} - Status changed to ${status} - KK Brand`;

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
    trackingHtml = `
      <div style="background-color: #fdfbf7; border: 1px solid #f5ebdb; border-radius: 6px; padding: 18px; margin: 24px 0; text-align: center;">
        <p style="color: #765337; margin: 0 0 6px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Shipment Tracking Details</p>
        <p style="color: #111827; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Tracking Number: <span style="font-weight: 800; font-family: monospace;">${trackingNo}</span></p>
        ${trackingUrl
        ? `<a href="${trackingUrl}" target="_blank" style="background-color: #111827; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 700; display: inline-block; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Track Shipment</a>`
        : ""
      }
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
          </div>
        </td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #1f2937; vertical-align: middle;">
          ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.price * item.quantity)}
        </td>
      </tr>
    `
    )
    .join("");

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
                <td style="background-color: #111827; padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">KK BRAND</h1>
                  <p style="color: #c49e6d; margin: 6px 0 0 0; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;">Order Status Update</p>
                </td>
              </tr>
              <!-- Body Content -->
              <tr>
                <td style="padding: 32px;">
                  <h2 style="color: #111827; font-size: 18px; font-weight: 700; margin-top: 0;">Hello ${customerName},</h2>
                  <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">We're writing to let you know that your order <strong>${orderNumber}</strong> has been updated.</p>
                  
                  <div style="border-left: 4px solid #111827; padding-left: 16px; margin: 20px 0;">
                    <p style="color: #111827; font-size: 15px; font-weight: 700; margin: 0 0 4px 0;">New Status: <span style="color: #b28555; text-transform: uppercase;">${status}</span></p>
                    <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0;">${statusText}</p>
                  </div>

                  ${trackingHtml}

                  <!-- Order Summary Table -->
                  <h3 style="color: #111827; font-size: 15px; font-weight: 700; border-bottom: 2px solid #111827; padding-bottom: 6px; margin: 32px 0 12px 0;">Order Summary</h3>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                    ${itemsHtml}
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
