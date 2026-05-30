"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Search, Plus, Minus, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  images: { url: string; isFeatured: boolean }[];
  category: { id: string; name: string; slug: string; parentId: string | null };
  inventory: { size: string; stock: number }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface ProductCatalogClientProps {
  initialProducts: Product[];
  categories: Category[];
}

export function ProductCatalogClient({ initialProducts, categories }: ProductCatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active accordion tabs
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    category: true,
    size: true,
    price: true,
  });

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category"));
  const [selectedSize, setSelectedSize] = useState<string | null>(searchParams.get("size"));
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({
    min: Number(searchParams.get("minPrice")) || 0,
    max: Number(searchParams.get("maxPrice")) || 20000,
  });
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");
  const [sortOption, setSortOption] = useState<string>(searchParams.get("sort") || "newest");

  // Sync URL query params with local states when URL changes (e.g. back/forward navigation or header links)
  useEffect(() => {
    setSelectedCategory(searchParams.get("category"));
    setSelectedSize(searchParams.get("size"));
    setPriceRange({
      min: Number(searchParams.get("minPrice")) || 0,
      max: Number(searchParams.get("maxPrice")) || 20000,
    });
    setSearchQuery(searchParams.get("search") || "");
    setSortOption(searchParams.get("sort") || "newest");
  }, [searchParams]);

  // Helper to dynamically push updates to the URL query string
  const handleFilterChange = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/products?${params.toString()}`);
  };

  // Debounced search input update in URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get("search") || "";
      if (searchQuery.trim() !== currentSearch.trim()) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        } else {
          params.delete("search");
        }
        router.push(`/products?${params.toString()}`);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery, router, searchParams]);

  const toggleAccordion = (tab: string) => {
    setOpenAccordions((prev) => ({ ...prev, [tab]: !prev[tab] }));
  };

  // Get parent categories for list
  const parentCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  // Get children subcategories for active parent (or all subcategories if none active)
  const childCategories = useMemo(() => {
    if (!selectedCategory) return categories.filter((c) => c.parentId);
    const activeCatObj = categories.find((c) => c.slug === selectedCategory);
    if (!activeCatObj) return categories.filter((c) => c.parentId);
    
    // If it's a parent category, get its children
    if (!activeCatObj.parentId) {
      return categories.filter((c) => c.parentId === activeCatObj.id);
    }
    // If it's a child category, get its sibling categories
    return categories.filter((c) => c.parentId === activeCatObj.parentId);
  }, [categories, selectedCategory]);

  // Reset/Clear filters trigger
  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedSize(null);
    setPriceRange({ min: 0, max: 20000 });
    setSearchQuery("");
    setSortOption("newest");
    router.push("/products");
  };

  // Local filtering & sorting for instantaneous feedback
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (selectedCategory) {
      const categoryObj = categories.find((c) => c.slug === selectedCategory);
      if (categoryObj) {
        if (!categoryObj.parentId) {
          // Parent category (e.g. Men) -> return all products under Men's subcategories
          result = result.filter(
            (p) => p.category.parentId === categoryObj.id || p.category.id === categoryObj.id
          );
        } else {
          // Child category
          result = result.filter((p) => p.category.slug === selectedCategory);
        }
      }
    }

    // Filter by size
    if (selectedSize) {
      result = result.filter((p) =>
        p.inventory.some((inv) => inv.size === selectedSize && inv.stock > 0)
      );
    }

    // Filter by price range
    result = result.filter((p) => p.price >= priceRange.min && p.price <= priceRange.max);

    // Sort products
    if (sortOption === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else {
      // Default: Newest arrivals
      result.sort((a, b) => a.isNewArrival === b.isNewArrival ? 0 : a.isNewArrival ? -1 : 1);
    }

    return result;
  }, [initialProducts, categories, searchQuery, selectedCategory, selectedSize, priceRange, sortOption]);

  const sizesList = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

  return (
    <div className="w-full min-h-screen bg-white">
      {/* 308 New styles top banner */}
      <div className="bg-neutral-900 text-white text-center py-2 text-[10px] font-black uppercase tracking-[0.25em]">
        308 NEW STYLES LAUNCHED THIS WEEK
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-6 gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-black flex items-center gap-2">
              NEW ARRIVALS
            </h1>
            <p className="text-[10px] text-neutral-400 mt-1 font-bold uppercase tracking-wider">
              {filteredProducts.length} ARTICLES FOUND
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="SEARCH GARMENTS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-none border border-neutral-200 bg-white pl-10 pr-4 text-xs uppercase tracking-wider focus:outline-none focus:border-black"
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-neutral-400 hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Category Horizontal Navigation Bar */}
        <div className="mt-6 flex overflow-x-auto gap-2 pb-3 scrollbar-none snap-x -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => handleFilterChange("category", null)}
            className={`snap-start shrink-0 rounded-none px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
              !selectedCategory
                ? "bg-black text-white border-black"
                : "bg-white text-neutral-500 border-neutral-200 hover:text-black hover:border-black"
            }`}
          >
            ALL
          </button>
          
          {/* Render Parent Categories */}
          {parentCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleFilterChange("category", cat.slug)}
              className={`snap-start shrink-0 rounded-none px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
                selectedCategory === cat.slug
                  ? "bg-black text-white border-black"
                  : "bg-white text-neutral-500 border-neutral-200 hover:text-black hover:border-black"
              }`}
            >
              {cat.name}
            </button>
          ))}

          {/* Render child categories dynamically */}
          {childCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleFilterChange("category", cat.slug)}
              className={`snap-start shrink-0 rounded-none px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
                selectedCategory === cat.slug
                  ? "bg-black text-white border-black"
                  : "bg-white text-neutral-500 border-neutral-200 hover:text-black hover:border-black"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="mt-8 flex flex-col md:flex-row gap-8 flex-grow">
          {/* Expandable Sidebar Accordions */}
          <aside className="w-full md:w-60 flex-shrink-0 space-y-4">
            
            {/* Category Accordion */}
            <div className="border-b border-neutral-100 pb-3">
              <button
                onClick={() => toggleAccordion("category")}
                className="w-full flex items-center justify-between py-2 text-[10px] font-black uppercase tracking-widest text-black text-left"
              >
                <span>Category</span>
                {openAccordions.category ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </button>
              
              {openAccordions.category && (
                <div className="mt-2 pl-1 flex flex-col space-y-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {parentCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleFilterChange("category", cat.slug)}
                      className={`text-left hover:text-black transition-colors ${
                        selectedCategory === cat.slug ? "text-black underline underline-offset-4 font-black" : ""
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Size Accordion */}
            <div className="border-b border-neutral-100 pb-3">
              <button
                onClick={() => toggleAccordion("size")}
                className="w-full flex items-center justify-between py-2 text-[10px] font-black uppercase tracking-widest text-black text-left"
              >
                <span>Size</span>
                {openAccordions.size ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </button>

              {openAccordions.size && (
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {sizesList.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => handleFilterChange("size", selectedSize === sz ? null : sz)}
                      className={`h-8 text-[10px] font-bold uppercase tracking-wider border flex items-center justify-center transition-colors ${
                        selectedSize === sz
                          ? "bg-black text-white border-black"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-black"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price Accordion */}
            <div className="border-b border-neutral-100 pb-3">
              <button
                onClick={() => toggleAccordion("price")}
                className="w-full flex items-center justify-between py-2 text-[10px] font-black uppercase tracking-widest text-black text-left"
              >
                <span>Price</span>
                {openAccordions.price ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </button>

              {openAccordions.price && (
                <div className="mt-2 pl-1 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    <span>{formatPrice(priceRange.min)}</span>
                    <span>{formatPrice(priceRange.max)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    step="500"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange((prev) => ({ ...prev, max: Number(e.target.value) }))}
                    onMouseUp={(e) => handleFilterChange("maxPrice", (e.target as HTMLInputElement).value)}
                    onTouchEnd={(e) => handleFilterChange("maxPrice", (e.target as HTMLInputElement).value)}
                    className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
              )}
            </div>

            {/* Sort Accordion */}
            <div className="border-b border-neutral-100 pb-3">
              <div className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-black">
                Sort Option
              </div>
              <select
                value={sortOption}
                onChange={(e) => handleFilterChange("sort", e.target.value)}
                className="mt-1 w-full bg-white border border-neutral-200 h-10 px-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-black rounded-none"
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="pt-4">
              <button
                onClick={handleClearFilters}
                className="w-full border border-neutral-200 py-3 text-[10px] font-black uppercase tracking-widest hover:border-black transition-colors rounded-none"
              >
                RESET ALL FILTERS
              </button>
            </div>

          </aside>

          {/* Catalog products list Grid */}
          <div className="flex-grow">
            {filteredProducts.length === 0 ? (
              <div className="flex h-96 flex-col items-center justify-center text-center border border-dashed border-neutral-200 p-12 bg-neutral-50 rounded-none">
                <h3 className="text-xs font-bold uppercase tracking-wider text-black">No garments found</h3>
                <p className="mt-2 text-xs text-neutral-400 max-w-xs font-semibold uppercase tracking-wide">
                  Try clearing your filters or adjustment options.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-none bg-black text-white px-6 text-xs font-bold uppercase tracking-widest hover:bg-neutral-900"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-3">
                {filteredProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod as any} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
