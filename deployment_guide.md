# Step-by-Step Production Deployment Guide

This guide details the end-to-end steps required to build, configure, deploy, and launch this premium fashion e-commerce storefront in a live production environment.

---

## 1. GitHub Setup

Initialize a Git repository, commit files, and push them to a private GitHub repository:

```bash
# 1. Initialize git inside project root
git init

# 2. Add all files to staging (Prisma configuration handles node_modules and .env ignores)
git add .

# 3. Commit files
git commit -m "feat: initial commit of production ready fashion storefront"

# 4. Create repository on GitHub, then link remote origin
git remote add origin https://github.com/your-username/kk-fashion-store.git

# 5. Push to main branch
git branch -M main
git push -u origin main
```

---

## 2. Database Setup: Neon PostgreSQL

1. Go to [Neon Console](https://console.neon.tech/) and register an account.
2. Click **Create Project**, name it (e.g. `kk-fashion-store`), select the latest **PostgreSQL** version, and click Create.
3. In the dashboard connection string selector, copy the **Connection URI**. It looks like:
   `postgresql://owner:password@ep-host.region.neon.tech/neondb?sslmode=require`
4. Copy this string and assign it to the `DATABASE_URL` key inside your `.env` configuration file.

---

## 3. Storage Setup: Cloudinary

We use Cloudinary to host product images.

1. Go to [Cloudinary Sign Up](https://cloudinary.com/signup) and create a free account.
2. In the Cloudinary Dashboard Console, locate your **Cloud Name**, **API Key**, and **API Secret**.
3. Copy these credentials and update your `.env` file:
   ```env
   CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"
   ```

---

## 4. Payment Gateway Setup: Razorpay

We use Razorpay to accept credit/debit cards, net banking, UPI, and wallets.

1. Create a business account at [Razorpay Console](https://dashboard.razorpay.com/).
2. In the Sidebar, navigate to **Account & Settings** -> **API Keys** -> click **Generate Key** (select **Test Mode** first for verification, then **Live Mode** when going production-ready).
3. Copy the **Key ID** and **Key Secret**.
4. Update your `.env` variables:
   ```env
   # Public key is loaded on checkout pages
   NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_your_key_id"
   RAZORPAY_KEY_SECRET="your_key_secret"
   ```

---

## 5. Email Notification Setup: Gmail SMTP

We use Gmail SMTP and Nodemailer to send transactional emails to customers and administrators.

1. Sign in to your Google Account.
2. Go to **My Account** -> **Security** -> Enable **2-Step Verification** (required by Google to generate App Passwords).
3. Under 2-Step Verification options, scroll to the bottom and click **App Passwords**.
4. Select **App**: *Mail*, **Device**: *Other (Custom Name)* (type: `KK Brand Store`). Click Generate.
5. Google will display a 16-character passcode (e.g., `abcd efgh ijkl mnop`). Copy this code (without spaces).
6. Update your `.env` variables:
   ```env
   GMAIL_USER="your-email@gmail.com"
   GMAIL_PASS="your16charapppassword"
   ```

---

## 6. Hosting Setup: Vercel

1. Log in or sign up at [Vercel](https://vercel.com).
2. Click **Add New** -> **Project** -> Import your GitHub repository `kk-fashion-store`.
3. In the **Environment Variables** panel, expand it and paste the keys from your `.env` file:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET` (generate a unique random string, e.g. run `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (set to your Vercel deployment URL, e.g. `https://kk-fashion-store.vercel.app`)
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `GMAIL_USER`
   - `GMAIL_PASS`
   - `NEXT_PUBLIC_APP_URL` (set to your production URL, e.g. `https://kk-fashion-store.vercel.app`)
4. In **Build & Development Settings**, keep the default settings:
   - Build Command: `npm run build` (This automatically runs `prisma db push`, `prisma db seed`, and `next build` in order)
   - Install Command: `npm install`
5. Click **Deploy**. Vercel will install dependencies, generate the Prisma client (`postinstall: prisma generate`), apply database schema changes (`prisma db push`), seed the database if it is empty (`prisma db seed`), and compile the Next.js production build (`next build`).
6. Because we have configured the seed script to be safe and idempotent, it will populate your Neon database on the first build and automatically skip seeding on subsequent redeployments to avoid overwriting real user accounts or order data. No manual CLI commands are needed!

---

## 7. Custom Domain Configuration: `www.myfashionstore.com`

To link your custom domain name to your Vercel deployment:

### 1. Vercel Domain Mapping
1. Go to your Vercel Project Dashboard -> **Settings** -> **Domains**.
2. Type `www.myfashionstore.com` in the input field and click **Add**.
3. Vercel will ask if you also want to redirect `myfashionstore.com` to `www.myfashionstore.com`. Click **Yes (recommended)**.

### 2. DNS Settings at Domain Registrar
Log in to your domain host (GoDaddy, Namecheap, Google Domains) and navigate to the **DNS Settings** page. Add the following records:

| Type | Name | Value | TTL | Note |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (or empty) | `76.76.21.21` | `3600` (1 Hour) | Point root domain to Vercel IP |
| **CNAME** | `www` | `cname.vercel-dns.com.` | `3600` (1 Hour) | Point www subdomain to Vercel DNS |

*Ensure you delete any previous conflicting CNAME or A records pointing to old hosts.*

### 3. SSL Certificate Provisioning
Vercel automatically provisions, registers, and renews a free **Let's Encrypt SSL certificate** for your domain as soon as the DNS changes propagate (usually within 5 to 30 minutes). No manual actions are required. Once SSL is active, visiting `https://www.myfashionstore.com` will show a secure lock icon.
