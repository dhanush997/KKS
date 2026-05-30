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
  ArrowLeft,
} from "lucide-react";

export function AdminSidebar() {
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
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex h-full w-64 flex-col border-r border-border bg-card px-4 py-6 shadow-sm">
      
      {/* Brand logo */}
      <div className="mb-8 px-2">
        <Link href="/" className="flex items-center">
          <span className="text-lg font-black uppercase tracking-widest text-foreground">
            KK <span className="text-gold-500 font-light">ADMIN</span>
          </span>
        </Link>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Store Management
        </p>
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
