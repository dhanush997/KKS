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

  // Check if database is already seeded to prevent overwriting production data
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("Database already has data. Skipping seeding.");
    return;
  }

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

  // 6. Create Premium Products mapped to correct child categories
  const productsData: any[] = [
    // Men Products
    {
      name: "Minimalist Wool Trench Coat",
      slug: "minimalist-wool-trench-coat",
      description: "Crafted from heavy double-faced wool, this trench coat features a relaxed silhouette, dropped shoulders, and a self-tie belt. A timeless piece designed to last.",
      price: 12999.00,
      compareAtPrice: 16999.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "mens-jackets",
      images: [
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 15, L: 12, XL: 5 },
    },
    {
      name: "Relaxed Linen Blend Resort Shirt",
      slug: "relaxed-linen-blend-resort-shirt",
      description: "Lightweight and breathable linen blend shirt with a camp collar, flat hem, and relaxed fit. Perfect for summer days and vacations.",
      price: 2499.00,
      compareAtPrice: 3499.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "mens-shirts",
      images: [
        "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 15, M: 25, L: 20, XL: 10 },
    },
    {
      name: "Classic Oxford Cotton Shirt",
      slug: "classic-oxford-cotton-shirt",
      description: "Woven in a robust oxford construction, this organic cotton shirt is tailored with a button-down collar, chest pocket, and single-button cuffs.",
      price: 2999.00,
      compareAtPrice: 3999.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "mens-shirts",
      images: [
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 12, M: 18, L: 18, XL: 8 },
    },
    {
      name: "Luxury Heavyweight T-Shirt",
      slug: "luxury-heavyweight-t-shirt",
      description: "Made from 300GSM long-staple organic cotton. Structured, boxy fit with a thick ribbed collar that won't lose its shape over time.",
      price: 1999.00,
      compareAtPrice: 2499.00,
      isFeatured: true,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: true,
      categorySlug: "mens-t-shirts",
      images: [
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 30, M: 45, L: 45, XL: 20 },
    },
    {
      name: "Vintage Garment-Dyed Tee",
      slug: "vintage-garment-dyed-tee",
      description: "Dyed after construction for a soft, lived-in feel and unique vintage color wash. Crafted from fine 100% slub cotton yarn.",
      price: 1499.00,
      compareAtPrice: 1999.00,
      isFeatured: false,
      isNewArrival: false,
      isTrending: false,
      isBestSeller: false,
      categorySlug: "mens-t-shirts",
      images: [
        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 20, M: 30, L: 30, XL: 15 },
    },
    {
      name: "Oversized Utility Bomber Jacket",
      slug: "oversized-utility-bomber-jacket",
      description: "Water-resistant satin nylon bomber with premium padding, ribbed cuffs, utility sleeve pocket, and silver accent zippers. Ideal for transition seasons.",
      price: 6499.00,
      compareAtPrice: 8999.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "mens-jackets",
      images: [
        "https://images.unsplash.com/photo-1525171254930-643fc658b64e?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 15, M: 20, L: 20, XL: 10 },
    },
    {
      name: "Slim Fit Selvedge Denim",
      slug: "slim-fit-selvedge-denim",
      description: "Crafted from 13.5oz raw Japanese selvedge denim. This pair features a classic button fly, custom rivets, and will break in beautifully over time.",
      price: 5999.00,
      compareAtPrice: 7999.00,
      isFeatured: true,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: true,
      categorySlug: "mens-jeans",
      images: [
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 8, M: 12, L: 12, XL: 5 },
    },
    {
      name: "Pleated Wool Trousers",
      slug: "pleated-wool-trousers",
      description: "Smart tailored trousers made from lightweight wool crepe. Designed with double front pleats, pressed creases, and adjustable side tabs.",
      price: 4999.00,
      compareAtPrice: 6499.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "mens-trousers",
      images: [
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 5, M: 10, L: 10, XL: 4 },
    },

    // Women Products
    {
      name: "Elegant Satin Slip Dress",
      slug: "elegant-satin-slip-dress",
      description: "A gorgeous luxury satin dress featuring a cowl neckline, adjustable crossover straps, and a side-slit hemline. Perfect for premium events.",
      price: 4500.00,
      compareAtPrice: 5900.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: true,
      categorySlug: "womens-dresses",
      images: [
        "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 12, L: 10 },
    },
    {
      name: "Cropped Leather Biker Jacket",
      slug: "cropped-leather-biker-jacket",
      description: "Made from supple full-grain lambskin leather, this jacket features classic motorcycle styling, silver-tone hardware, and a cropped modern cut.",
      price: 15499.00,
      compareAtPrice: 19999.00,
      isFeatured: false,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: true,
      categorySlug: "womens-jackets",
      images: [
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 5, M: 8, L: 8, XL: 2 },
    },
    {
      name: "Ribbed Knit Wrap Top",
      slug: "ribbed-knit-wrap-top",
      description: "Features a wrap-around profile with long sleeves, made from fine ribbed cotton knit. Breathable, comfortable, and premium styling.",
      price: 1890.00,
      compareAtPrice: 2490.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: false,
      categorySlug: "womens-tops",
      images: [
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 12, M: 15, L: 10 },
    },
    {
      name: "Minimalist Leather Tote Bag",
      slug: "minimalist-leather-tote-bag",
      description: "Crafted from Italian vegetable-tanned leather. A spacious, unlined tote bag with a raw suede interior, internal zippered pocket, and structured shoulder straps.",
      price: 7999.00,
      compareAtPrice: 9999.00,
      isFeatured: true,
      isNewArrival: false,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "womens-handbags",
      images: [
        "https://images.unsplash.com/photo-1524498250077-390f9e378db0?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { "Free Size": 15 },
    },
    {
      name: "Floral Summer kurti",
      slug: "floral-summer-kurti",
      description: "Elegant floral print cotton kurti, designed with an absolute straight fit and keyhole neck. Offers ultimate daily wear comfort.",
      price: 1599.00,
      compareAtPrice: 2299.00,
      isFeatured: false,
      isNewArrival: false,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "womens-kurtis",
      images: [
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 15, M: 20, L: 20 },
    },

    // Kids Products
    {
      name: "Kids Unisex Cotton Hoodie",
      slug: "kids-unisex-cotton-hoodie",
      description: "Ultra-soft cotton blend fleece hoodie with front kangaroo pocket. Breathable, warm, and perfect for active play.",
      price: 1290.00,
      compareAtPrice: 1890.00,
      isFeatured: true,
      isNewArrival: true,
      isTrending: true,
      isBestSeller: false,
      categorySlug: "kids-boys-clothing",
      images: [
        "https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 15 },
    },
    {
      name: "Kids Canvas Strap Shoes",
      slug: "kids-canvas-strap-shoes",
      description: "Flexible non-slip rubber soles with durable organic canvas upper. Easy hook-and-loop strap closure for kids.",
      price: 1999.00,
      compareAtPrice: 2999.00,
      isFeatured: false,
      isNewArrival: true,
      isTrending: false,
      isBestSeller: true,
      categorySlug: "kids-footwear",
      images: [
        "https://images.unsplash.com/photo-1514989940723-e8e5163ccbe8?auto=format&fit=crop&q=80&w=800",
      ],
      sizes: { S: 10, M: 10, L: 5 },
    },
    {
      name: "Merino Wool Beanie & Scarf Set",
      slug: "merino-wool-beanie-scarf-set",
      description: "Warm double-layered knit accessories for toddlers and children. Standard non-itch merino wool design.",
      price: 1499.00,
      compareAtPrice: 1999.00,
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
