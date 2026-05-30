import React from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRight, ShieldCheck, Truck, RefreshCw, Sparkles } from "lucide-react";

export const revalidate = 60; // Revalidate page every 60 seconds

export default async function HomePage() {
  // Fetch products from database
  const featuredProducts = await db.product.findMany({
    where: { isFeatured: true },
    include: { images: { orderBy: { isFeatured: "desc" } } },
    take: 4,
  });

  const newArrivals = await db.product.findMany({
    where: { isNewArrival: true },
    include: { images: { orderBy: { isFeatured: "desc" } } },
    take: 4,
  });

  const trendingProducts = await db.product.findMany({
    where: { isTrending: true },
    include: { images: { orderBy: { isFeatured: "desc" } } },
    take: 4,
  });

  const bestSellers = await db.product.findMany({
    where: { isBestSeller: true },
    include: { images: { orderBy: { isFeatured: "desc" } } },
    take: 4,
  });

  const categories = [
    {
      name: "Outerwear",
      slug: "outerwear",
      image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800",
    },
    {
      name: "Knitwear",
      slug: "knitwear",
      image: "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&q=80&w=800",
    },
    {
      name: "Shirts & Tees",
      slug: "t-shirts-shirts",
      image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=800",
    },
    {
      name: "Bottoms & Pants",
      slug: "bottoms-pants",
      image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800",
    },
    {
      name: "Accessories",
      slug: "accessories",
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800",
    },
  ];

  return (
    <div className="flex flex-col w-full pb-16">
      
      {/* 1. HERO BANNER */}
      <section className="relative h-[85vh] w-full overflow-hidden bg-neutral-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2000"
            alt="Premium Autumn Winter Collection banner"
            fill
            className="object-cover opacity-60"
            priority
          />
        </div>
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-300">
            Autumn / Winter Collection 2026
          </p>
          <h1 className="mt-4 text-5xl font-black uppercase tracking-tight sm:text-7xl max-w-2xl leading-none">
            TIMELESS DESIGNS. <br />
            <span className="font-light text-neutral-200">PREMIUM FABRICS.</span>
          </h1>
          <p className="mt-6 text-sm text-neutral-300 max-w-md font-medium leading-relaxed">
            Discover a curated collection of clothing made with double-faced wool, cashmere blends, and long-staple organic cotton.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-none bg-white px-8 py-3.5 text-xs font-black uppercase tracking-widest text-black border border-white hover:bg-transparent hover:text-white transition-all duration-300 active:scale-[0.98]"
            >
              EXPLORE COLLECTION
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITIONS */}
      <section className="bg-white border-y border-neutral-100 text-black py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Truck className="h-8 w-8 text-black shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-black">Free Shipping</h4>
                <p className="text-xs text-neutral-500 mt-1">Complimentary standard delivery on all domestic orders.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <RefreshCw className="h-8 w-8 text-black shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-black">7-Day Easy Returns</h4>
                <p className="text-xs text-neutral-500 mt-1">Hassle-free size swaps and returns within 7 days of arrival.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <ShieldCheck className="h-8 w-8 text-black shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-black">Secure Payments</h4>
                <p className="text-xs text-neutral-500 mt-1">SSL-secured transactions via UPI, cards, net banking, or COD.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORIES SECTION */}
      <section className="mx-auto max-w-7xl py-16 px-4 sm:px-6 lg:px-8 overflow-hidden w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-[0.15em] text-black">
            SHOP BY CATEGORY
          </h2>
        </div>

        {/* Horizontal scroll container on mobile, centered grid on desktop */}
        <div className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory py-4 justify-start md:justify-center w-full px-4 md:px-0">
          {categories.map((cat) => (
            <Link
              href={`/products?category=${cat.slug}`}
              key={cat.name}
              className="snap-start shrink-0 w-[85px] xs:w-[95px] sm:w-[110px] md:w-[125px] aspect-[1/4.2] relative rounded-[24px] overflow-hidden group bg-neutral-100 shadow-md transition-all duration-500 hover:shadow-xl active:scale-[0.99]"
            >
              {/* Card Image */}
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              
              {/* Smooth Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70 group-hover:from-black/30 group-hover:via-black/50 group-hover:to-black/80 transition-colors duration-300" />
              
              {/* Content Wrapper */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-6 px-2">
                {/* Empty top slot to push text down */}
                <div />

                {/* Vertically Stacked Category Name (As per user's screenshot) */}
                <div className="flex flex-col items-center justify-center font-black text-white text-[10px] xs:text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.25em] leading-[1.3] space-y-0.5 sm:space-y-1 my-auto">
                  {cat.name.toUpperCase().split("").map((char, idx) => (
                    <span 
                      key={idx} 
                      className={char === " " ? "h-3" : "h-auto flex items-center justify-center"}
                    >
                      {char === " " ? "\u00A0" : char}
                    </span>
                  ))}
                </div>

                {/* Bottom Call to Action (SHOP NOW stacked vertically) */}
                <div className="flex flex-col items-center justify-center text-center text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-neutral-300 group-hover:text-white transition-colors duration-300">
                  <span>SHOP</span>
                  <span className="flex items-center gap-1 mt-0.5">
                    NOW <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. FEATURED PRODUCTS */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-black uppercase tracking-[0.15em] text-black">
              FEATURED COLLECTION
            </h2>
            <Link
              href="/products?featured=true"
              className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-600 hover:text-black hover:underline underline-offset-4 flex items-center transition-colors"
            >
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
            {featuredProducts.map((prod: any) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {/* 5. NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-black uppercase tracking-[0.15em] text-black">
              NEW ARRIVALS
            </h2>
            <Link
              href="/products?newArrival=true"
              className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-600 hover:text-black hover:underline underline-offset-4 flex items-center transition-colors"
            >
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
            {newArrivals.map((prod: any) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {/* 6. TRENDING ITEMS */}
      {trendingProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-black uppercase tracking-[0.15em] text-black">
              TRENDING NOW
            </h2>
            <Link
              href="/products?trending=true"
              className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-600 hover:text-black hover:underline underline-offset-4 flex items-center transition-colors"
            >
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
            {trendingProducts.map((prod: any) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {/* 7. BEST SELLERS */}
      {bestSellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-black uppercase tracking-[0.15em] text-black">
              BEST SELLERS
            </h2>
            <Link
              href="/products?bestSeller=true"
              className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-600 hover:text-black hover:underline underline-offset-4 flex items-center transition-colors"
            >
              View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
            {bestSellers.map((prod: any) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </section>
      )}

      {/* 8. TESTIMONIALS SECTION */}
      <section className="bg-white border-y border-neutral-100 py-16 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-[0.15em] text-black">
              CUSTOMER TESTIMONIALS
            </h2>
            <p className="text-[10px] text-neutral-500 mt-2 font-bold uppercase tracking-widest">What our patrons have to say</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="bg-white p-8 rounded-none border border-neutral-100 flex flex-col justify-between shadow-xs">
              <p className="text-xs font-semibold leading-relaxed italic text-neutral-700">
                "The double-faced wool trench coat is spectacular. The stitching is flawless, the fit is elegantly relaxed, and the warmth is exactly what I expected. Will definitely shop again!"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-9 w-9 rounded-none bg-neutral-100 flex items-center justify-center font-black text-black text-xs uppercase tracking-wider">
                  AR
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Aravind R.</h4>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Mumbai, India</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-none border border-neutral-100 flex flex-col justify-between shadow-xs">
              <p className="text-xs font-semibold leading-relaxed italic text-neutral-700">
                "Finding high quality heavyweight organic cotton t-shirts that maintain their neck shape after multiple washes is hard. KK brand nailed it. Exceptional quality!"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-9 w-9 rounded-none bg-neutral-100 flex items-center justify-center font-black text-black text-xs uppercase tracking-wider">
                  MD
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Meera D.</h4>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Bangalore, India</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-none border border-neutral-100 flex flex-col justify-between shadow-xs">
              <p className="text-xs font-semibold leading-relaxed italic text-neutral-700">
                "I ordered the cashmere sweater. Delivery was precisely within 7 days as calculated on the page. The packaging was beautiful and the wool is incredibly soft."
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-9 w-9 rounded-none bg-neutral-100 flex items-center justify-center font-black text-black text-xs uppercase tracking-wider">
                  SM
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Siddharth M.</h4>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">New Delhi, India</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
