"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  FolderTree,
  FileSpreadsheet,
  Users,
  Sparkles,
  ArrowLeft,
  Tag,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const links = [
    {
      label: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      label: "Products",
      href: "/admin/products",
      icon: ShoppingBag,
      active: pathname === "/admin/products",
    },
    {
      label: "Categories",
      href: "/admin/categories",
      icon: FolderTree,
      active: pathname === "/admin/categories",
    },
    {
      label: "Orders",
      href: "/admin/orders",
      icon: FileSpreadsheet,
      active: pathname === "/admin/orders",
    },
    {
      label: "Customers",
      href: "/admin/customers",
      icon: Users,
      active: pathname === "/admin/customers",
    },
    {
      label: "Banners",
      href: "/admin/banners",
      icon: Sparkles,
      active: pathname === "/admin/banners",
    },
    {
      label: "Coupons",
      href: "/admin/coupons",
      icon: Tag,
      active: pathname === "/admin/coupons",
    },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-card px-4 py-6 shadow-sm transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      
      {/* Brand logo */}
      <div className="mb-8 px-2 flex items-center justify-between">
        <div className="flex flex-col">
          <Link href="/" className="flex items-center">
            <span className="text-lg font-black uppercase tracking-widest text-foreground">
              KK <span className="text-gold-500 font-light">ADMIN</span>
            </span>
          </Link>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Store Management
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-black md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-semibold tracking-wide transition-all duration-200",
                link.active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom return action */}
      <div className="border-t border-border pt-4">
        <Link
          href="/"
          className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Return to Store</span>
        </Link>
      </div>

    </aside>
  );
}
