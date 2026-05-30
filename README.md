# KK Brand | Premium Fashion E-Commerce Platform

KK Brand is a premium, production-ready, mobile-responsive fashion e-commerce storefront built with Next.js 15, TypeScript, Tailwind CSS, Prisma ORM, NextAuth, Cloudinary, and Razorpay.

## Technical Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes (Serverless Route Handlers)
- **Database**: PostgreSQL (Neon Serverless PostgreSQL recommended)
- **ORM**: Prisma ORM
- **Authentication**: NextAuth (Credentials Provider with JWT session tokens)
- **Storage**: Cloudinary (Image uploads)
- **Payment Gateway**: Razorpay (Cards, UPI, Netbanking, Wallets) & Cash On Delivery (COD)
- **Email Notifications**: Nodemailer (Gmail SMTP integration)

---

## Directory Layout

```
KK e-comm/
├── prisma/
│   ├── schema.prisma         # PostgreSQL Prisma schemas
│   └── seed.ts               # Admin user, customer, and 20 sample products seed script
├── src/
│   ├── app/
│   │   ├── admin/            # Admin Overview, Product, Category, and Order screens
│   │   ├── api/              # Route Handlers for registration, payments, and CRUDs
│   │   ├── auth/             # Login, Registration, and Forgot Password layouts
│   │   ├── cart/             # Shopping Cart UI with quantity selectors
│   │   ├── checkout/         # Secure checkout, address forms, and payments verify
│   │   ├── products/         # Listing, searching, sorting, and detail views
│   │   ├── profile/          # Customer profile settings and purchase history
│   │   ├── layout.tsx        # Global layouts, headers, and footer components
│   │   └── page.tsx          # Homepage with collection showcases & testimonials
│   ├── components/
│   │   ├── ui/               # Standard UI widgets (Buttons, Inputs, Dialogs, Toasts)
│   │   ├── Navbar.tsx        # Responsive navigation with slide drawer menu
│   │   └── ProductCard.tsx   # Product cards with image hover transformations
│   ├── context/
│   │   └── CartContext.tsx   # React cart state management with localStorage sync
│   ├── lib/
│   │   ├── db.ts             # Prisma Client singleton
│   │   ├── auth.ts           # NextAuth credentials settings
│   │   ├── cloudinary.ts     # REST signed image upload helper
│   │   ├── email.ts          # Nodemailer HTML template dispatchers
│   │   ├── razorpay.ts       # Razorpay orders and webhook signature verifier
│   │   └── utils.ts          # Date format, EDD formula (+7 days), order serials
│   └── types/
│       └── next-auth.d.ts    # NextAuth User/Session typings extension
├── .env.example              # Env template configurations
├── next.config.ts            # Next.js 15 rules & image hosts definitions
├── package.json              # Main project scripts and dependencies
├── tailwind.config.ts        # Design theme, animations, and color palettes
└── tsconfig.json             # TypeScript parameters
```

---

## Setup & Local Development

### 1. Extract and Install Dependencies
Clone the repository contents, navigate into the directory, and install:
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` into a new `.env` file:
```bash
cp .env.example .env
```
Fill out the variables with your own credentials (see `.env.example` or `deployment_guide.md` for steps to procure these tokens).

### 3. Push Database Schema to PostgreSQL
Run Prisma to establish the relational tables in your Neon PostgreSQL database:
```bash
npx prisma db push
```

### 4. Seed Initial Data
Seed the database with 5 categories, 20 high-quality fashion products, and user accounts:
```bash
npx prisma db seed
```
This inserts the following default accounts:
- **Administrator Email**: `admin@fashionstore.com` | **Password**: `Admin@123`
- **Customer Email**: `john@example.com` | **Password**: `User@123`

### 5. Spin Up Dev Server
Launch the Next.js local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser to browse the storefront.

---

## Important Business Logic Features

1. **Estimated Delivery Date (EDD)**:
   - Evaluated as `Order Date + 7 Days`.
   - Displayed reactively on the product page, cart summary, checkout reviews, success screens, and order confirmation email dispatches.
2. **Inventory Stock Checks**:
   - Stock quantities are size-dependent (S, M, L, XL).
   - If stock for a size is greater than 0, the UI displays "In Stock (X available)".
   - If stock equals 0, the page displays "Out Of Stock", disabling the Add to Cart and Buy Now buttons.
   - Placing orders decrements stock levels. Cancelling orders (via customer profile or admin dashboard) immediately restores those stocks.
3. **Razorpay Signature Checks**:
   - Orders placed with Razorpay initialize client-side checkouts, but inventory is **not** decremented and transaction emails are **not** sent until the payment is cryptographically verified on the backend via HMAC SHA-256 signatures in the `/api/orders/verify` route, avoiding unpaid orders.
