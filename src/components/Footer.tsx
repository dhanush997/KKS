"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Facebook, Instagram, Linkedin, Globe, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setIsSubmitted(true);
      setEmail("");
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  const topCategories = [
    "T-shirts", "Shirts", "Joggers", "Shorts", "Trousers", 
    "Sweaters & Hoodies", "Sweaters", "Bags", "Accessories", "Belts", 
    "Blazers", "Boxers", "Cargo Pants", "Chinos", "Co-ords", 
    "Hoodies", "Jackets", "Jeans", "Night Suit & Pyjamas", "Overshirt", 
    "Perfumes", "Shoes", "Sunglasses"
  ];

  const popularSearches = [
    "shirts for men", "jeans for men", "trousers for men", "white shirt", 
    "black shirt", "overshirt men", "baggy jeans", "straight fit jeans", 
    "bootcut jeans", "korean pants", "gurkha pants", "cargo pants", 
    "linen shirts", "denim shirts", "formal shirts", "crochet shirts", 
    "striped shirts", "printed shirts", "formal pants for men", "concert outfits men", 
    "club wear for men", "bootcut jeans for men", "office wear shirts", "korean pants for men", 
    "sunglasses for men", "perfume for men", "polo t-shirts", "oversized t-shirts", 
    "korean trousers", "baggy pants men", "linen pants", "chinos for men"
  ];

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="w-full bg-[#f8f6f2] border-t border-neutral-200/50 text-neutral-800">
      
      {/* 1. Directory Section (Categories & Popular Searches) */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 border-b border-neutral-200">
        
        <div className="space-y-8">
          {/* Top Categories Directory */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-4">TOP CATEGORIES</h4>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              {topCategories.map((item) => (
                <Link key={item} href={`/products?search=${item.toLowerCase()}`} className="hover:text-black transition-colors">
                  {item}
                </Link>
              ))}
            </div>
          </div>

          {/* Popular Searches Directory */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-black mb-4">POPULAR SEARCHES</h4>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              {popularSearches.map((item) => (
                <Link key={item} href={`/products?search=${item.toLowerCase()}`} className="hover:text-black transition-colors">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 2. Brand Positioning Section (Landing details & values checklist) */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 border-b border-neutral-200">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Brand copy description */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-black">
              The KK BRAND Shopping Experience - Where Digital Meets Style
            </h2>
            <p className="text-[11px] text-neutral-500 font-semibold leading-relaxed uppercase tracking-wider">
              At KK BRAND, we redefine the modern shopping experience, merging seamless digital convenience with engaging interactions. Whether you're shopping online or visiting our immersive retail spaces, we ensure a smooth, stylish, and hassle-free journey that caters to today's fashion-forward men.
            </p>
            <p className="text-[11px] text-neutral-500 font-semibold leading-relaxed uppercase tracking-wider">
              Our direct-to-consumer (D2C) approach eliminates traditional retail barriers, giving you complete control over how and where you engage with our trend-driven menswear collections. From effortless online browsing to hands-on in-store exploration, KK BRAND lets you shop on your terms, at your pace.
            </p>
          </div>

          {/* Values Box cards */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-neutral-200/60 p-5 rounded-none space-y-3 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-widest text-black">Why Shop at KK BRAND?</h3>
              <ul className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider space-y-1.5 list-none pl-0">
                <li className="flex items-center gap-2">✓ CONTEMPORARY MENSWEAR THAT KEEPS UP WITH YOU</li>
                <li className="flex items-center gap-2">✓ EFFORTLESS ONLINE & IN-STORE SHOPPING EXPERIENCE</li>
                <li className="flex items-center gap-2">✓ PREMIUM FABRICS, TREND-DRIVEN DESIGNS & SMART TAILORING</li>
                <li className="flex items-center gap-2">✓ SEAMLESS OMNICHANNEL FLEXIBILITY - SHOP ANYWHERE, ANYTIME</li>
                <li className="flex items-center gap-2">✓ FASHION FOR EVERY SEASON, OCCASION & MOOD</li>
              </ul>
              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest pt-2">
                Your wardrobe should work as hard as you do. KK BRAND makes fashion easy, exciting, and accessible.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Socials, Company Info, and Copywrite Section */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        <div className="flex flex-col gap-8">
          
          {/* Company Links list */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-black uppercase tracking-widest text-black">
            <Link href="/products" className="hover:underline">About Us</Link>
            <Link href="/profile" className="hover:underline">Privacy Policy</Link>
            <Link href="/profile" className="hover:underline">Terms & Conditions</Link>
            <Link href="/profile" className="hover:underline">Return/Exchange Policy</Link>
            <Link href="/profile" className="hover:underline">Contact Us</Link>
            <Link href="/sitemap.xml" className="hover:underline">Sitemap</Link>
            <Link href="/profile" className="hover:underline">Stakeholders</Link>
          </div>

          {/* Social Icons row */}
          <div className="flex justify-center space-x-6 text-neutral-600">
            <a href="#" className="hover:text-black transition-colors">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="#" className="hover:text-black transition-colors">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" className="hover:text-black transition-colors">
              <Linkedin className="h-4 w-4" />
            </a>
            <a href="#" className="hover:text-black transition-colors">
              <Globe className="h-4 w-4" />
            </a>
          </div>

          {/* Bottom details copyright */}
          <div className="text-center text-[9px] text-neutral-400 font-black uppercase tracking-widest pt-4 border-t border-neutral-200/50">
            &copy; 2026 KK BRAND. ALL RIGHTS RESERVED. INITIATED FOR PREMIUM LIFESTYLE WEB DEVELOPMENT.
          </div>

        </div>

      </div>

    </footer>
  );
}
