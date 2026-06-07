"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Loader2, ShieldAlert, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/admin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Security check: Role must be ADMIN
  if (status === "authenticated" && session?.user?.role !== "ADMIN") {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="rounded-full bg-rose-50 p-4 text-rose-600 mb-4 border border-rose-100 shadow-sm animate-pulse-slow">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm font-semibold">
          Your account is not authorized to access this administration panel. This event has been logged.
        </p>
        <Button
          onClick={() => router.push("/")}
          className="mt-6 uppercase font-bold tracking-wider text-xs h-10"
        >
          Return to Storefront
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 w-full relative flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-45 flex h-16 w-full items-center justify-between border-b border-neutral-100 bg-white px-4 shadow-sm md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-50 hover:text-black"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm font-black uppercase tracking-widest text-foreground">
            KK <span className="font-light text-red-600">ADMIN</span>
          </span>
        </div>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Admin Sidebar Navigation */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full md:pl-64">
        <div className="mx-auto max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
