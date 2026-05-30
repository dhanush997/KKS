# Production Readiness Checklist

Before publicizing and accepting real consumer orders, review and check off the following items to verify system integrity and security.

---

## 1. Environment & Configuration Checks
- [ ] Verify `NEXTAUTH_SECRET` is a random 32+ character key generated using cryptography (`openssl rand -base64 32`).
- [ ] Confirm `NEXTAUTH_URL` matches your active storefront URL (e.g. `https://www.myfashionstore.com`).
- [ ] Ensure `NEXT_PUBLIC_APP_URL` is set to the production domain.
- [ ] Confirm `NODE_ENV` is automatically set to `production` by Vercel.

## 2. Database & Schema Checks
- [ ] Confirm Neon PostgreSQL connection string `DATABASE_URL` is active.
- [ ] Run `npx prisma migrate deploy` to deploy versioned tables.
- [ ] Verify the admin user `admin@fashionstore.com` exists and password is changed from the default `Admin@123` value.
- [ ] Verify size-based inventory levels are loaded for all 20 clothing products.

## 3. Storage & Assets Checks
- [ ] Confirm Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are set to production.
- [ ] Verify `next.config.ts` includes the correct Remote Pattern hostnames (`res.cloudinary.com` and `images.unsplash.com`).
- [ ] Upload a test garment from `/admin/products` to verify the Cloudinary base64 signed API uploads function correctly.

## 4. Payment Gateway Checks (Razorpay)
- [ ] Transition Razorpay from **Test Mode** (Key IDs start with `rzp_test_`) to **Live Mode** (Key IDs start with `rzp_live_`) in the Razorpay dashboard.
- [ ] Update Vercel environment variables with the live key pair.
- [ ] Verify that bank account details, settlement schedules, and KYC compliance are approved on the Razorpay dashboard to receive actual money payouts.
- [ ] Place a live test order for a nominal amount (e.g. ₹1) online to verify card/UPI processing.

## 5. SMTP & Email Notification Checks
- [ ] Verify Gmail account App Password is created, active, and credentials match `GMAIL_USER` / `GMAIL_PASS` in your env.
- [ ] Confirm order receipts are correctly sent on checkout.
- [ ] Verify admin notifications are sent to `admin@fashionstore.com` containing shipping destination specs.
- [ ] Ensure HTML tables format correctly on major email clients (Gmail app, Outlook, Apple Mail).

## 6. Security & Performance Checks
- [ ] Ensure SSL certificate is generated and page urls begin with `https://`.
- [ ] Verify that page titles, meta descriptions, and semantic headers (`<h1>` tags) load correctly for search crawlers.
- [ ] Check cart items local storage persistence across browser window closures.
- [ ] Test order cancellations (restoring size stocks) and inventory updates in the dashboard.
