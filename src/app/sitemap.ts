import { db } from "@/lib/db";

export default async function sitemap(): Promise<any[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Static core routes
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic product routes
  const productRoutes: any[] = [];
  try {
    const products = await db.product.findMany({
      select: { id: true, updatedAt: true },
    });
    products.forEach((prod: any) => {
      productRoutes.push({
        url: `${baseUrl}/products/${prod.id}`,
        lastModified: prod.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    });
  } catch (err) {
    console.error("Error querying products for sitemap:", err);
  }

  // Dynamic category queries
  const categoryRoutes: any[] = [];
  try {
    const categories = await db.category.findMany({
      select: { slug: true, updatedAt: true },
    });
    categories.forEach((cat: any) => {
      categoryRoutes.push({
        url: `${baseUrl}/products?category=${cat.slug}`,
        lastModified: cat.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    });
  } catch (err) {
    console.error("Error querying categories for sitemap:", err);
  }

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}


