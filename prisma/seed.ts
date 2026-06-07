import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // Seed Sales Banners if none exist (running regardless of whether users exist)
  const bannerCount = await (prisma as any).salesBanner.count();
  if (bannerCount === 0) {
    console.log("Seeding promotional sales banners...");
    const now = new Date();
    const diwaliStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // yesterday
    const diwaliEnd = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
    
    const blackFridayStart = new Date(now.getFullYear(), 10, 24); // Nov 24
    const blackFridayEnd = new Date(now.getFullYear(), 10, 30); // Nov 30

    await (prisma as any).salesBanner.createMany({
      data: [
        {
          title: "Diwali Festive Dhamaka",
          subtitle: "Flat 20% Off on All Traditional & Premium Wear! Code: KK20",
          startDate: diwaliStart,
          endDate: diwaliEnd,
          isActive: true,
          couponCode: "KK20",
          bannerType: "FESTIVE",
          bgGradient: "from-amber-600 via-red-600 to-rose-800",
          textColor: "text-white",
        },
        {
          title: "Black Friday Mega Sale",
          subtitle: "Up to 50% Off site-wide! Code: KK50",
          startDate: blackFridayStart,
          endDate: blackFridayEnd,
          isActive: false, // Inactive by default until dates match
          couponCode: "KK50",
          bannerType: "BLACK_FRIDAY",
          bgGradient: "from-neutral-950 via-neutral-900 to-neutral-800",
          textColor: "text-white",
        },
        {
          title: "Flash Midnight Sale",
          subtitle: "Flat 100 INR Off on all products! Code: FLAT100",
          startDate: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hrs ago
          endDate: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 hrs from now
          isActive: false, // toggle active via admin dashboard
          couponCode: "FLAT100",
          bannerType: "FLASH_SALE",
          bgGradient: "from-indigo-900 via-purple-800 to-pink-700",
          textColor: "text-white",
        }
      ]
    });
    console.log("Promotional sales banners seeded successfully.");
  }

  // Seed Coupons if none exist
  const couponCount = await (prisma as any).coupon.count();
  if (couponCount === 0) {
    console.log("Seeding discount coupons...");
    const now = new Date();
    const startDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const endDate = new Date(now.getFullYear() + 2, 11, 31); // 2 years from now

    await (prisma as any).coupon.createMany({
      data: [
        {
          code: "KK10",
          type: "PERCENT",
          value: 10,
          isActive: true,
          isAdminOnly: false,
          startDate,
          endDate,
        },
        {
          code: "KK20",
          type: "PERCENT",
          value: 20,
          isActive: true,
          isAdminOnly: false,
          startDate,
          endDate,
        },
        {
          code: "KK50",
          type: "PERCENT",
          value: 50,
          isActive: true,
          isAdminOnly: false,
          startDate,
          endDate,
        },
        {
          code: "FLAT100",
          type: "FIXED",
          value: 100,
          isActive: true,
          isAdminOnly: false,
          startDate,
          endDate,
        },
        {
          code: "TRYKKBRAND5",
          type: "PERCENT",
          value: 5,
          isActive: true,
          isAdminOnly: false,
          startDate,
          endDate,
        },
        {
          code: "NEW10",
          type: "PERCENT",
          value: 10,
          isActive: true,
          isAdminOnly: false,
          startDate,
          endDate,
        },
        {
          code: "KKADMINFREE",
          type: "PERCENT",
          value: 100,
          isActive: true,
          isAdminOnly: true, // Restricted to Admin
          startDate,
          endDate,
        },
      ],
    });
    console.log("Discount coupons seeded successfully.");
  }

  // Check if products exist before seeding to prevent overwriting user data
  const productCount = await prisma.product.count();
  if (productCount > 0) {
    console.log("Products already exist in database. Skipping clear and seed to prevent data loss.");
    return;
  }

  // Force clear and seed fresh data to showcase redesigned products
  console.log("Clearing database...");

  // 1. Clear existing data
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log("Database cleared.");

  // 2. Create Admin User
  const hashedPassword = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Store Administrator",
      email: "admin@fashionstore.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin user created:", admin.email);

  // 3. Create Sample Customer User
  const customerPassword = await bcrypt.hash("User@123", 10);
  const customer = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "john@example.com",
      password: customerPassword,
      role: "USER",
    },
  });
  console.log("Sample customer created:", customer.email);

  // 4. Create Parent Categories
  const parents = [
    { name: "Men", slug: "men", description: "Premium clothing and lifestyle wear for Men." },
    { name: "Women", slug: "women", description: "Minimalist and luxury fashion for Women." },
    { name: "Kids", slug: "kids", description: "Comfortable, high-quality styles for children." }
  ];

  const parentMap: Record<string, any> = {};
  for (const p of parents) {
    parentMap[p.slug] = await prisma.category.create({
      data: p
    });
  }
  console.log("Parent categories seeded.");

  // 5. Create Child Categories
  const menChildren = [
    { name: "Shirts", slug: "mens-shirts" },
    { name: "T-Shirts", slug: "mens-t-shirts" },
    { name: "Polo T-Shirts", slug: "mens-polo-t-shirts" },
    { name: "Jeans", slug: "mens-jeans" },
    { name: "Trousers", slug: "mens-trousers" },
    { name: "Shorts", slug: "mens-shorts" },
    { name: "Hoodies", slug: "mens-hoodies" },
    { name: "Jackets", slug: "mens-jackets" },
    { name: "Blazers", slug: "mens-blazers" },
    { name: "Ethnic Wear", slug: "mens-ethnic-wear" }
  ];

  const womenChildren = [
    { name: "Dresses", slug: "womens-dresses" },
    { name: "Tops", slug: "womens-tops" },
    { name: "T-Shirts", slug: "womens-t-shirts" },
    { name: "Jeans", slug: "womens-jeans" },
    { name: "Sarees", slug: "womens-sarees" },
    { name: "Kurtis", slug: "womens-kurtis" },
    { name: "Skirts", slug: "womens-skirts" },
    { name: "Jackets", slug: "womens-jackets" },
    { name: "Handbags", slug: "womens-handbags" },
    { name: "Footwear", slug: "womens-footwear" }
  ];

  const kidsChildren = [
    { name: "Boys Clothing", slug: "kids-boys-clothing" },
    { name: "Girls Clothing", slug: "kids-girls-clothing" },
    { name: "Infant Wear", slug: "kids-infant-wear" },
    { name: "School Wear", slug: "kids-school-wear" },
    { name: "Footwear", slug: "kids-footwear" },
    { name: "Accessories", slug: "kids-accessories" }
  ];

  const categoryMap: Record<string, any> = {};

  // Seed Men Children
  for (const c of menChildren) {
    categoryMap[c.slug] = await prisma.category.create({
      data: {
        name: c.name,
        slug: c.slug,
        parentId: parentMap["men"].id,
        description: `Browse modern men's ${c.name.toLowerCase()}`,
        image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800"
      }
    });
  }

  // Seed Women Children
  for (const c of womenChildren) {
    categoryMap[c.slug] = await prisma.category.create({
      data: {
        name: c.name,
        slug: c.slug,
        parentId: parentMap["women"].id,
        description: `Browse modern women's ${c.name.toLowerCase()}`,
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800"
      }
    });
  }

  // Seed Kids Children
  for (const c of kidsChildren) {
    categoryMap[c.slug] = await prisma.category.create({
      data: {
        name: c.name,
        slug: c.slug,
        parentId: parentMap["kids"].id,
        description: `Browse durable kids' ${c.name.toLowerCase()}`,
        image: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&q=80&w=800"
      }
    });
  }

  console.log("Child categories seeded.");

  // 6. Premium Products mapped to correct child categories
  const productsData: any[] = [
    // === ZARA WOMAN "NEW IN" COLLECTION (l1180) ===
    {
      name: "ZW Collection Linen Waistcoat",
      slug: "womens-zw-collection-linen-waistcoat",
      description: "V-neck waistcoat made of a premium linen blend. Sleeveless design featuring a front button closure, front welt pockets, and a pointed hem. Elegant minimalist tailored fit.",
      price: 2990.00,
      compareAtPrice: 3990.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "womens-tops",
      images: [
        "https://images.unsplash.com/photo-1539008885759-25f0e95fbca3?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 15, L: 12, XL: 5 },
    },
    {
      name: "ZW Collection Linen Wide-Leg Trousers",
      slug: "womens-zw-collection-linen-trousers",
      description: "High-waist trousers made of linen. Front pleats, side pockets, and false welt pockets at the back. Wide-leg silhouette. Zip fly and top button closure.",
      price: 3990.00,
      compareAtPrice: 4990.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "womens-jeans",
      images: [
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 8, M: 12, L: 12, XL: 6 },
    },
    {
      name: "Contrast Knit Halter Top",
      slug: "womens-contrast-knit-halter-top",
      description: "Knit halter neck top featuring contrast piping details. Open back with adjustable tie closures. Ribbed trims. Chic resort-wear feel.",
      price: 1990.00,
      compareAtPrice: 2590.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "womens-tops",
      images: [
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 12, M: 18, L: 10 },
    },
    {
      name: "Printed Satin Effect Midi Dress",
      slug: "womens-printed-satin-midi-dress",
      description: "Midi dress featuring a V-neckline and thin straps that cross at the back. Side vents at the hem. Fluid drape satin fabric with seasonal floral print details.",
      price: 4990.00,
      compareAtPrice: 5990.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "womens-dresses",
      images: [
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 12, L: 8 },
    },
    {
      name: "Oversized Cotton Poplin Shirt",
      slug: "womens-oversized-poplin-shirt",
      description: "Oversized long sleeve shirt made of 100% organic cotton poplin. Lapel collar and a patch pocket on the chest. Front button-up closure.",
      price: 2990.00,
      compareAtPrice: 3590.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "womens-tops",
      images: [
        "https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 15, M: 20, L: 15, XL: 8 },
    },
    {
      name: "ZW Collection Slim Fit Denim Jeans",
      slug: "womens-zw-slim-fit-jeans",
      description: "Mid-rise five-pocket jeans in rigid cotton denim. Faded effect. Seamless raw-cut cropped hems. Front metal button and zip closure.",
      price: 3990.00,
      compareAtPrice: 4990.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "womens-jeans",
      images: [
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 8, M: 14, L: 12, XL: 5 },
    },
    {
      name: "Pleated Accordion Midi Skirt",
      slug: "womens-pleated-accordion-skirt",
      description: "High-waist midi skirt featuring sharp accordion pleats. Elastic waistband. Crafted from a fluid, lightweight fabric with a satin sheen finish.",
      price: 2990.00,
      compareAtPrice: 3990.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "womens-skirts",
      images: [
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 12, L: 10 },
    },
    {
      name: "Draped Tulle Midi Dress",
      slug: "womens-draped-tulle-dress",
      description: "Sleeveless midi dress with a round neckline. Featuring gather details on the shoulder and ruching down the sides for a beautiful draped fit. Inner lining.",
      price: 3990.00,
      compareAtPrice: 4990.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "womens-dresses",
      images: [
        "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 8, M: 10, L: 8 },
    },
    {
      name: "Ribbed Crop Knit Top",
      slug: "womens-ribbed-crop-knit-top",
      description: "Sleeveless top with a round neckline and cropped hem. Ribbed knit construction in a soft cotton blend. Perfect layering basic.",
      price: 1590.00,
      compareAtPrice: 1990.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: false,
      categorySlug: "womens-tops",
      images: [
        "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 15, M: 20, L: 15 },
    },
    {
      name: "Belted Cotton Poplin Jumpsuit",
      slug: "womens-belted-poplin-jumpsuit",
      description: "Short sleeve jumpsuit with a lapel collar. Featuring chest patch pockets and side pockets. Elastic waistband with a matching fabric belt and silver buckle.",
      price: 4990.00,
      compareAtPrice: 5990.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "womens-dresses",
      images: [
        "https://images.unsplash.com/photo-1608748010899-18f300247112?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 8, M: 12, L: 10 },
    },
    {
      name: "Flat Leather Strappy Sandals",
      slug: "womens-flat-leather-sandals",
      description: "Flat leather sandals with crossing thin straps on the instep. Squared toe bed. Padded leather insole for extra comfort.",
      price: 3590.00,
      compareAtPrice: 4590.00,
      isFeatured: true,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: true,
      categorySlug: "womens-footwear",
      images: [
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { "36": 5, "37": 10, "38": 12, "39": 8, "40": 4 },
    },
    {
      name: "Woven Raffia Shoulder Bag",
      slug: "womens-woven-raffia-bag",
      description: "Shoulder bag made of woven natural raffia. Adjustable leather shoulder strap. Zip-up main compartment with cotton fabric inner lining.",
      price: 2990.00,
      compareAtPrice: 3990.00,
      isFeatured: true,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: true,
      categorySlug: "womens-handbags",
      images: [
        "https://images.unsplash.com/photo-1524498250077-390f9e378db0?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { "Free Size": 20 },
    },
    {
      name: "Contrast Poplin Midi Dress",
      slug: "womens-contrast-poplin-dress",
      description: "Midi dress featuring a stretch ribbed knit bodice and a contrasting voluminous organic cotton poplin flared skirt. Modern casual design.",
      price: 4590.00,
      compareAtPrice: 5590.00,
      isFeatured: true,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "womens-dresses",
      images: [
        "https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 12, L: 8 },
    },
    {
      name: "Split Suede Crossbody Bag",
      slug: "womens-split-suede-crossbody-bag",
      description: "Crossbody bag made of premium split suede leather. Gold metal hardware and chain detail. Adjustable leather crossbody strap. Lined magnetic clasp interior.",
      price: 4990.00,
      compareAtPrice: 5990.00,
      isFeatured: false,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: true,
      categorySlug: "womens-handbags",
      images: [
        "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { "Free Size": 15 },
    },
    {
      name: "Linen Blazer with Flap Pockets",
      slug: "womens-linen-blazer-pockets",
      description: "Classic collar blazer made of 100% linen. Long sleeves with structured shoulders. Front flap pockets and chest welt pocket. Double-breasted button closure.",
      price: 5990.00,
      compareAtPrice: 7990.00,
      isFeatured: true,
      isNewArrival: false,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "womens-jackets",
      images: [
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 8, M: 12, L: 10, XL: 4 },
    },

    // === ZARA MAN "NEW IN" COLLECTION (l711) ===
    {
      name: "Linen Blend Basket Print Shirt",
      slug: "mens-linen-basket-print-shirt",
      description: "Relaxed fit shirt made of a lightweight linen blend. Camp collar and short sleeves. All-over geometric basket print. Front button-up closure.",
      price: 2990.00,
      compareAtPrice: 3590.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "mens-shirts",
      images: [
        "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 12, M: 20, L: 18, XL: 10 },
    },
    {
      name: "Relaxed Fit Linen Trousers",
      slug: "mens-relaxed-fit-linen-trousers",
      description: "Loose fit trousers made of a premium linen and cotton blend. Elastic waistband with adjustable drawstrings. Side pockets and back welt pockets.",
      price: 3990.00,
      compareAtPrice: 4990.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "mens-trousers",
      images: [
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 8, M: 15, L: 15, XL: 8 },
    },
    {
      name: "Structured Ribbed Polo Shirt",
      slug: "mens-structured-ribbed-polo",
      description: "Short sleeve polo shirt with a lapel collar and zip-free split neck. Structured ribbed knit texture in a soft organic cotton blend. Modern, clean drape.",
      price: 2590.00,
      compareAtPrice: 3290.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "mens-polo-t-shirts",
      images: [
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 18, L: 16, XL: 6 },
    },
    {
      name: "Contrast Piping Knit Shirt",
      slug: "mens-contrast-piping-knit-shirt",
      description: "Short sleeve knit shirt made of premium textured viscose yarn. Contrasting retro piping details along the collar and front button placket. Relaxed fit.",
      price: 3590.00,
      compareAtPrice: 4590.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "mens-shirts",
      images: [
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 8, M: 15, L: 12, XL: 4 },
    },
    {
      name: "ZW Origins Cargo Trousers",
      slug: "mens-zw-origins-cargo-trousers",
      description: "Loose fit cargo trousers made of structured heavy cotton twill. Multiple side cargo pockets with flap details. Adjustable strap hems at the ankles.",
      price: 4990.00,
      compareAtPrice: 5990.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "mens-trousers",
      images: [
        "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 12, L: 12, XL: 6 },
    },
    {
      name: "Loose Fit Washed Denim Jeans",
      slug: "mens-loose-washed-denim",
      description: "Five-pocket loose fit jeans made of rigid cotton denim. Medium vintage wash with fading details. Front zip and button closure.",
      price: 3990.00,
      compareAtPrice: 4990.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "mens-jeans",
      images: [
        "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 8, M: 12, L: 12, XL: 6 },
    },
    {
      name: "Linen Suit Blazer",
      slug: "mens-linen-suit-blazer",
      description: "Regular fit suit blazer made of 100% linen fabric. Notch lapels, long sleeves, buttoned cuffs, front welt pockets, and double button front closure. Partial inner lining.",
      price: 7990.00,
      compareAtPrice: 9990.00,
      isFeatured: true,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: true,
      categorySlug: "mens-blazers",
      images: [
        "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { M: 10, L: 12, XL: 8 },
    },
    {
      name: "Textured Striped T-Shirt",
      slug: "mens-textured-striped-tee",
      description: "Boxy fit short sleeve T-shirt with a ribbed crew neck. Made of organic cotton with a textured slub knit and subtle Breton stripes.",
      price: 1990.00,
      compareAtPrice: 2590.00,
      isFeatured: false,
      isNewArrival: false,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "mens-t-shirts",
      images: [
        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 15, M: 25, L: 20, XL: 10 },
    },
    {
      name: "Technical Fabric Overshirt",
      slug: "mens-technical-overshirt",
      description: "Lightweight, water-resistant technical fabric overshirt. Lapel collar, long sleeves, front snap-button closure, and chest zipper pockets. Relaxed utility look.",
      price: 4990.00,
      compareAtPrice: 5990.00,
      isFeatured: true,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "mens-jackets",
      images: [
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 12, L: 10, XL: 6 },
    },
    {
      name: "Linen Blend Bermuda Shorts",
      slug: "mens-linen-bermuda-shorts",
      description: "Bermuda shorts made of a linen and cotton blend. Elastic waistband with drawstrings. Front side pockets and back patch pockets. Relaxed, breezy fit.",
      price: 2590.00,
      compareAtPrice: 3290.00,
      isFeatured: false,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: true,
      categorySlug: "mens-shorts",
      images: [
        "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 15, L: 12, XL: 5 },
    },

    // === ZARA KIDS COLLECTION ===
    {
      name: "Zara Kids Textured Polo Shirt",
      slug: "kids-textured-polo-shirt",
      description: "Short sleeve polo shirt for kids featuring a buttoned ribbed collar. Soft, breathable textured waffle knit cotton fabric.",
      price: 1590.00,
      compareAtPrice: 1990.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "kids-boys-clothing",
      images: [
        "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { "4-5 Y": 10, "6-7 Y": 15, "8-9 Y": 12 },
    },
    {
      name: "Zara Kids Strappy Canvas Sandals",
      slug: "kids-canvas-sandals",
      description: "Comfortable kids' canvas sandals with double hook-and-loop strap fasteners. Flexible non-slip rubber soles.",
      price: 1990.00,
      compareAtPrice: 2590.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "kids-footwear",
      images: [
        "https://images.unsplash.com/photo-1514989940723-e8e5163ccbe8?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { "28": 8, "29": 10, "30": 10, "31": 5 },
    },
    {
      name: "Zara Kids Ribbed Beanie",
      slug: "kids-ribbed-beanie",
      description: "Soft ribbed knit beanie with a folded cuff. Crafted from certified organic cotton yarn. Non-itchy and warm.",
      price: 990.00,
      compareAtPrice: 1490.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "kids-accessories",
      images: [
        "https://images.unsplash.com/photo-1576871337622-98d48d4aa53e?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { "Free Size": 20 },
    }
  ];

  for (const prod of productsData) {
    const category = categoryMap[prod.categorySlug];
    if (!category) {
      console.warn(`Category slug not found: ${prod.categorySlug}. Skipping product ${prod.name}`);
      continue;
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        compareAtPrice: prod.compareAtPrice,
        isFeatured: prod.isFeatured,
        isNewArrival: prod.isNewArrival,
        isTrending: prod.isTrending,
        isBestSeller: prod.isBestSeller,
        categoryId: category.id,
      },
    });

    // Create images
    for (let i = 0; i < prod.images.length; i++) {
      await prisma.productImage.create({
        data: {
          url: prod.images[i],
          isFeatured: i === 0,
          productId: product.id,
        },
      });
    }

    // Create inventory entries
    for (const [size, stock] of Object.entries(prod.sizes)) {
      await prisma.inventory.create({
        data: {
          productId: product.id,
          size: size,
          stock: Number(stock),
        },
      });
    }
  }

  console.log("Premium products and inventory seeded successfully.");
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
