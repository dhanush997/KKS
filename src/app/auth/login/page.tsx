"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";

function LoginForm() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if session is already active
  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  // Show NextAuth error redirects
  useEffect(() => {
    if (errorParam) {
      toast({
        title: "Sign In Failed",
        description: "Incorrect password or no user details matches our records.",
        variant: "destructive",
      });
    }
  }, [errorParam, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (!res) {
        throw new Error("No response received from login provider.");
      }

      if (res.error) {
        toast({
          title: "Access Denied",
          description: res.error || "Credentials verification failed.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome Back",
          description: "Successfully signed in.",
          variant: "success",
        });
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      console.error("Login trigger error:", err);
      toast({
        title: "Checkout Error",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] w-full flex-grow grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden bg-white">
      {/* Background Image for Mobile/Tablet only (behind form) */}
      <div className="lg:hidden absolute inset-0 z-0">
        <Image
          src="/flagship_store_bg.png"
          alt="Flagship Store"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
      </div>

      {/* Visual Left Column - 7 Columns on Large Screens */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-16 text-white overflow-hidden bg-neutral-900">
        <Image
          src="/flagship_store_bg.png"
          alt="Flagship Store Background"
          fill
          className="object-cover opacity-80"
          priority
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60 z-10" />
        
        {/* Slogan & Logo */}
        <div className="relative z-20 flex items-center gap-3">
          <Image
            src="/kk_brand_logo.png"
            alt="KK BRAND Logo"
            width={120}
            height={40}
            className="h-10 w-auto brightness-0 invert"
          />
        </div>
        
        <div className="relative z-20 max-w-lg mt-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">
            KK Brand Campaign 2026
          </p>
          <h1 className="mt-4 text-4xl lg:text-5xl font-black uppercase tracking-tight leading-none font-serif">
            ELEVATING THE <br />
            <span className="font-light italic text-red-500">ESSENTIALS</span>
          </h1>
          <p className="mt-6 text-xs text-neutral-300 font-semibold uppercase tracking-wider leading-relaxed">
            Modern, premium silhouettes designed for the contemporary lifestyle. Inspired by architectural simplicity and high-end aesthetics.
          </p>
        </div>
        
        <div className="relative z-20 text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-6">
          &copy; 2026 KK BRAND. ALL RIGHTS RESERVED.
        </div>
      </div>

      {/* Form Right Column - 5 Columns on Large Screens */}
      <div className="lg:col-span-5 flex flex-col justify-center items-center px-6 py-12 sm:px-12 md:px-16 z-10 relative">
        <div className="w-full max-w-md bg-white/95 lg:bg-white border border-neutral-200/50 lg:border-none p-8 lg:p-0 shadow-xl lg:shadow-none backdrop-blur-md lg:backdrop-blur-none rounded-none">
          
          {/* Brand Logo & Header */}
          <div className="text-center mb-8 flex flex-col items-center">
            <Image
              src="/kk_brand_logo.png"
              alt="KK BRAND Logo"
              width={160}
              height={50}
              className="h-12 w-auto object-contain mb-6"
            />
            <h2 className="text-xl font-bold uppercase tracking-wider text-black">Sign In to Your Account</h2>
            <p className="mt-1.5 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Welcome back. Enter your credentials below</p>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="email-input"
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@fashionstore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-neutral-200 focus:border-black rounded-none h-11"
            />

            <div className="relative">
              <Input
                id="password-input"
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-neutral-200 focus:border-black rounded-none h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-9.5 text-neutral-400 hover:text-black"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider pt-1">
              <span />
              <Link
                href="/auth/forgot-password"
                className="text-red-600 hover:underline animate-pulse-slow"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 uppercase font-black tracking-widest mt-4 bg-black text-white hover:bg-neutral-800 border border-black rounded-none transition-colors text-xs"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          {/* Social Sign-in Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200/50" />
            </div>
            <span className="relative bg-white lg:bg-white px-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">
              OR
            </span>
          </div>

          <Button
            type="button"
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await signIn("google", { callbackUrl });
              } catch (err) {
                console.error("Google sign in failure:", err);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="w-full h-12 uppercase font-black tracking-widest border border-neutral-200 text-black hover:border-black bg-white hover:bg-neutral-50 rounded-none transition-colors text-xs flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Sign In with Google
          </Button>

          {/* Guest checkout option if redirected from checkout */}
          {callbackUrl.includes("/checkout") && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <Link href="/checkout?guest=true" className="block w-full">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full h-12 uppercase font-black tracking-widest border border-neutral-200 text-black hover:border-black rounded-none transition-colors text-xs"
                >
                  Continue as Guest
                </Button>
              </Link>
            </div>
          )}

          {/* Register Redirect */}
          <div className="mt-8 pt-6 border-t border-neutral-100 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            New to KK Brand?{" "}
            <Link href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-red-600 hover:underline font-extrabold">
              Create an account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
