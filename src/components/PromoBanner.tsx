"use client";

import React, { useState, useEffect } from "react";
import { Clock, Tag, X, Copy, Check } from "lucide-react";
import { usePathname } from "next/navigation";

interface BannerData {
  id: string;
  title: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  couponCode?: string | null;
  bannerType: string;
  bgGradient: string;
  textColor: string;
}

export function PromoBanner() {
  const pathname = usePathname();
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem("promo-banner-dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
      return;
    }

    fetch("/api/sales-banner")
      .then((res) => res.json())
      .then((data) => {
        if (data) setBanner(data);
      })
      .catch((err) => console.error("Error loading promo banner:", err));
  }, []);

  useEffect(() => {
    if (!banner) return;

    const calculateTime = () => {
      const difference = +new Date(banner.endDate) - +new Date();
      if (difference <= 0) {
        setBanner(null);
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [banner]);

  const handleCopyCode = () => {
    if (!banner?.couponCode) return;
    navigator.clipboard.writeText(banner.couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("promo-banner-dismissed", "true");
  };

  if (pathname?.startsWith("/admin") || isDismissed || !banner) return null;

  return (
    <div className={`relative w-full bg-gradient-to-r ${banner.bgGradient} ${banner.textColor} px-4 py-2 text-center text-xs font-semibold tracking-wide shadow-sm flex flex-col md:flex-row md:items-center md:justify-center gap-2 md:gap-6 min-h-[38px] transition-all`}>
      {/* Sale info */}
      <div className="flex items-center justify-center gap-2">
        <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {banner.bannerType.replace("_", " ")}
        </span>
        <span className="font-extrabold uppercase">{banner.title}</span>
        {banner.subtitle && <span className="hidden lg:inline text-white/80 font-normal">| {banner.subtitle}</span>}
      </div>

      {/* Countdown and coupon code */}
      <div className="flex items-center justify-center gap-4 text-[11px] font-bold">
        {timeLeft && (
          <div className="flex items-center gap-1 text-white/90">
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            <span>ENDS IN:</span>
            <span className="font-mono bg-black/25 px-1.5 py-0.5 rounded font-extrabold">
              {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
              {String(timeLeft.hours).padStart(2, "0")}h:
              {String(timeLeft.minutes).padStart(2, "0")}m:
              {String(timeLeft.seconds).padStart(2, "0")}s
            </span>
          </div>
        )}

        {banner.couponCode && (
          <button
            onClick={handleCopyCode}
            className="group flex items-center gap-1.5 rounded-full border border-dashed border-white/50 bg-white/10 px-2.5 py-0.5 hover:bg-white hover:text-black transition-all cursor-pointer"
            title="Click to copy coupon code"
          >
            <Tag className="h-3 w-3" />
            <span className="font-extrabold tracking-widest uppercase">{banner.couponCode}</span>
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 text-white/60 group-hover:text-black/60 transition-colors" />
            )}
          </button>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
        title="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
