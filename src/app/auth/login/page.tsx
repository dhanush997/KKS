"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
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
    <div className="mx-auto max-w-md w-full flex-grow flex flex-col justify-center px-4 py-16">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        
        {/* Brand Sign In */}
        <div className="text-center mb-8">
          <span className="text-xl font-black uppercase tracking-[0.25em] text-black">
            KK BRAND
          </span>
          <h2 className="mt-4 text-xl font-bold uppercase tracking-wider text-foreground">Sign In to Your Account</h2>
          <p className="mt-1 text-xs text-muted-foreground font-semibold">Welcome back, enter your keys below</p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email-input"
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            placeholder="admin@fashionstore.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-8.5 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span />
            <Link
              href="/auth/forgot-password"
              className="font-bold text-gold-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-11 uppercase font-bold tracking-wider mt-4"
            isLoading={isSubmitting}
          >
            Sign In
          </Button>
        </form>

        {/* Guest checkout option if redirected from checkout */}
        {callbackUrl.includes("/checkout") && (
          <div className="mt-4 pt-4 border-t border-border">
            <Link href="/checkout?guest=true" className="block w-full">
              <Button
                variant="outline"
                type="button"
                className="w-full h-11 uppercase font-bold tracking-wider"
              >
                Continue as Guest
              </Button>
            </Link>
          </div>
        )}

        {/* Register Redirect */}
        <div className="mt-8 pt-6 border-t border-border text-center text-xs font-semibold text-muted-foreground">
          New to KK Brand?{" "}
          <Link href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-gold-600 hover:underline">
            Create an account
          </Link>
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
