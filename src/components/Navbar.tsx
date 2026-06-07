"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Menu, Search, ShoppingBag, User, X, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const { data: session } = useSession();
  const { cartCount } = useCart();
  const { wishlist } = useWishlist();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const isAdmin = session?.user?.role === "ADMIN";
  const wishlistCount = wishlist.length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsOpen(false);
    }
  };

  const menuStructure = [
    {
      title: "MEN",
      slug: "men",
      categories: [
        { label: "Shirts", slug: "mens-shirts" },
        { label: "T-Shirts", slug: "mens-t-shirts" },
        { label: "Polo T-Shirts", slug: "mens-polo-t-shirts" },
        { label: "Jeans", slug: "mens-jeans" },
        { label: "Trousers", slug: "mens-trousers" },
        { label: "Shorts", slug: "mens-shorts" },
        { label: "Hoodies", slug: "mens-hoodies" },
        { label: "Jackets", slug: "mens-jackets" },
        { label: "Blazers", slug: "mens-blazers" },
        { label: "Ethnic Wear", slug: "mens-ethnic-wear" }
      ]
    },
    {
      title: "WOMEN",
      slug: "women",
      categories: [
        { label: "Dresses", slug: "womens-dresses" },
        { label: "Tops", slug: "womens-tops" },
        { label: "T-Shirts", slug: "womens-t-shirts" },
        { label: "Jeans", slug: "womens-jeans" },
        { label: "Sarees", slug: "womens-sarees" },
        { label: "Kurtis", slug: "womens-kurtis" },
        { label: "Skirts", slug: "womens-skirts" },
        { label: "Jackets", slug: "womens-jackets" },
        { label: "Handbags", slug: "womens-handbags" },
        { label: "Footwear", slug: "womens-footwear" }
      ]
    },
    {
      title: "KIDS",
      slug: "kids",
      categories: [
        { label: "Boys Clothing", slug: "kids-boys-clothing" },
        { label: "Girls Clothing", slug: "kids-girls-clothing" },
        { label: "Infant Wear", slug: "kids-infant-wear" },
        { label: "School Wear", slug: "kids-school-wear" },
        { label: "Footwear", slug: "kids-footwear" },
        { label: "Accessories", slug: "kids-accessories" }
      ]
    }
  ];

  const toggleAccordion = (title: string) => {
    if (activeAccordion === title) {
      setActiveAccordion(null);
    } else {
      setActiveAccordion(title);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Logo & Desktop Navigation */}
        <div className="flex items-center gap-6 lg:gap-10">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-none p-2 text-neutral-500 hover:bg-neutral-50 hover:text-black md:hidden shrink-0"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </button>
          
          {/* Brand Logo (Left Corner) */}
          <Link href="/" className="flex items-center group/logo shrink-0">
            <Image
              src="/kk_brand_logo.png"
              alt="KK BRAND Logo"
              width={200}
              height={60}
              className="h-12 sm:h-14 w-auto object-contain transition-transform duration-300 group-hover/logo:scale-102"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex flex-row flex-nowrap items-center space-x-4 lg:space-x-6 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-600 whitespace-nowrap">
            <div className="py-4">
              <Link href="/" className="hover:text-black transition-colors duration-200 hover:underline underline-offset-4">
                Home
              </Link>
            </div>
            <div className="py-4">
              <Link href="/products" className="hover:text-black transition-colors duration-200 hover:underline underline-offset-4">
                Shop
              </Link>
            </div>
            {menuStructure.map((group) => (
              <div key={group.title} className="relative group/nav py-4">
                <Link
                  href={`/products?category=${group.slug}`}
                  className="hover:text-black transition-colors duration-200 hover:underline underline-offset-4 flex items-center gap-1"
                >
                  {group.title}
                </Link>
                {/* Desktop dropdown category grid */}
                <div className="absolute left-0 mt-2 w-48 bg-white border border-neutral-100 shadow-lg hidden group-hover/nav:block p-2">
                  <div className="flex flex-col space-y-1.5">
                    {group.categories.slice(0, 8).map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/products?category=${cat.slug}`}
                        className="text-[10px] text-neutral-500 hover:text-black uppercase tracking-wider block p-1.5 hover:bg-neutral-50"
                      >
                        {cat.label}
                      </Link>
                    ))}
                    {group.categories.length > 8 && (
                      <Link
                        href={`/products?category=${group.slug}`}
                        className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest block p-1.5 border-t border-neutral-100 hover:text-black"
                      >
                        View All
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Actions (Right Column) */}
        <div className="flex items-center justify-end space-x-1 sm:space-x-3 shrink-0">
          
          {/* Search box (desktop) */}
          <form onSubmit={handleSearchSubmit} className="relative hidden lg:block">
            <input
              suppressHydrationWarning
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-40 rounded-none border border-neutral-200 bg-white pl-8 pr-3 text-[11px] uppercase tracking-wider focus:w-56 focus:outline-none focus:border-black transition-all duration-300"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          </form>

          {/* Wishlist Icon */}
          <Link href="/profile?tab=wishlist" className="relative p-2 text-neutral-600 hover:text-black transition-colors" title="Wishlist">
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-none bg-[#e5001c] text-[9px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Icon */}
          <Link href="/cart" className="relative p-2 text-neutral-600 hover:text-black transition-colors" title="Cart">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-none bg-[#e5001c] text-[9px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User Account Menu */}
          <div className="relative">
            {session ? (
              <>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-1 p-2 text-neutral-600 hover:text-black transition-colors"
                >
                  <User className="h-5 w-5" />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <>
                      {/* Click outside backdrop for dropdown */}
                      <div
                        onClick={() => setIsDropdownOpen(false)}
                        className="fixed inset-0 z-30"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 z-40 w-48 rounded-none border border-neutral-200 bg-white p-1 shadow-md"
                      >
                        <div className="px-3 py-2 border-b border-neutral-100 text-[10px] text-neutral-500 uppercase tracking-wider">
                          Signed in as <br />
                          <strong className="text-black truncate block mt-0.5 font-bold">{session?.user?.name}</strong>
                        </div>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setIsDropdownOpen(false)}
                            className="block rounded-none px-3 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-50"
                          >
                            Admin Dashboard
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          onClick={() => setIsDropdownOpen(false)}
                          className="block rounded-none px-3 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-50"
                        >
                          My Profile & Orders
                        </Link>
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            signOut();
                          }}
                          className="w-full text-left rounded-none px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-600 hover:bg-red-50"
                        >
                          Sign Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link href="/auth/login" className="p-2 text-neutral-600 hover:text-black transition-colors">
                <User className="h-5 w-5" />
              </Link>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation (Side Drawer) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs md:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-white p-6 shadow-2xl flex flex-col md:hidden border-r border-neutral-100 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center">
                  <Image
                    src="/kk_brand_logo.png"
                    alt="KK BRAND Logo"
                    width={130}
                    height={40}
                    className="h-8 w-auto object-contain"
                  />
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-none p-2 text-neutral-500 hover:text-black"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="relative mt-6">
                <input
                  suppressHydrationWarning
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-none border border-neutral-200 bg-white pl-10 pr-4 text-xs uppercase tracking-wider focus:outline-none focus:border-black"
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
              </form>

              {/* Accordion Categories Structure */}
              <nav className="mt-8 flex flex-col space-y-4">
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold uppercase tracking-[0.15em] text-black pb-2 border-b border-neutral-100 block"
                >
                  Home
                </Link>
                <Link
                  href="/products"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold uppercase tracking-[0.15em] text-black pb-2 border-b border-neutral-100 block"
                >
                  Shop All
                </Link>

                {menuStructure.map((group) => (
                  <div key={group.title} className="border-b border-neutral-100 pb-2">
                    <button
                      onClick={() => toggleAccordion(group.title)}
                      className="w-full flex items-center justify-between text-left text-xs font-bold uppercase tracking-[0.15em] text-black py-1"
                    >
                      <span>{group.title}</span>
                      {activeAccordion === group.title ? (
                        <ChevronUp className="h-4 w-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-neutral-500" />
                      )}
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {activeAccordion === group.title && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-4 py-2 flex flex-col space-y-2.5">
                            {group.categories.map((cat) => (
                              <Link
                                key={cat.slug}
                                href={`/products?category=${cat.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="text-[11px] font-semibold text-neutral-500 hover:text-black uppercase tracking-wider block"
                              >
                                {cat.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </nav>

              <div className="mt-auto border-t border-neutral-100 pt-6 flex flex-col space-y-4">
                <Link
                  href="/profile?tab=wishlist"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-black"
                >
                  <Heart className="h-4 w-4" />
                  <span>My Wishlist ({wishlistCount})</span>
                </Link>
                
                {session ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-black"
                    >
                      <User className="h-4 w-4" />
                      <span>{session?.user?.name}</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        signOut();
                      }}
                      className="w-full rounded-none bg-neutral-100 text-black py-2.5 text-center text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full rounded-none bg-black text-white py-3 text-center text-xs font-bold uppercase tracking-wider hover:bg-neutral-900 transition-colors"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
