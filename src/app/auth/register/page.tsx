"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side checks
    const currentErrors: Record<string, string> = {};
    if (password.length < 6) {
      currentErrors.password = "Password must be at least 6 characters.";
    }
    if (password !== confirmPassword) {
      currentErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      toast({
        title: "Account Created",
        description: "Your credentials have been saved. Please sign in.",
        variant: "success",
      });

      router.push("/auth/login");
    } catch (err: any) {
      console.error("Registration failed:", err);
      toast({
        title: "Registration Failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full flex-grow flex flex-col justify-center px-4 py-16">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-xl font-black uppercase tracking-[0.25em] text-black">
            KK BRAND
          </span>
          <h2 className="mt-4 text-xl font-bold uppercase tracking-wider text-foreground">Create Your Account</h2>
          <p className="mt-1 text-xs text-muted-foreground font-semibold">Ethical luxury, cataloged for you</p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="register-name"
            label="Full Name"
            required
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            id="register-email"
            label="Email Address"
            type="email"
            required
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            id="register-password"
            label="Password (min 6 chars)"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <Input
            id="register-confirm-password"
            label="Confirm Password"
            type="password"
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />

          <Button
            type="submit"
            className="w-full h-11 uppercase font-bold tracking-wider mt-6"
            isLoading={isSubmitting}
          >
            Create Account
          </Button>
        </form>

        {/* Sign In Redirect */}
        <div className="mt-8 pt-6 border-t border-border text-center text-xs font-semibold text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-gold-600 hover:underline">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}
