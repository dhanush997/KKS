"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldCheck } from "lucide-react";

function ResetPasswordForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      toast({
        title: "Error",
        description: "Reset token is missing from the link.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setIsSubmitted(true);
      toast({
        title: "Password Updated",
        description: "Your password has been reset successfully.",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "An error occurred. Please try again.",
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
          <h2 className="mt-4 text-xl font-bold uppercase tracking-wider text-foreground">New Password</h2>
          <p className="mt-1 text-xs text-muted-foreground font-semibold">Enter and confirm your new password below</p>
        </div>

        {isSubmitted ? (
          <div className="space-y-6 text-center">
            <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 inline-block shadow-sm">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed font-semibold">
              Your password has been successfully updated. You can now log in using your new credentials.
            </p>
            <Link href="/auth/login" className="block">
              <Button className="w-full h-11 uppercase font-bold tracking-wider flex items-center justify-center">
                Go to Login <ArrowLeft className="ml-1.5 h-4 w-4 rotate-180" />
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="new-password"
              label="New Password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              id="confirm-password"
              label="Confirm New Password"
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button
              type="submit"
              className="w-full h-11 uppercase font-bold tracking-wider mt-6"
              isLoading={isSubmitting}
              disabled={!token}
            >
              Reset Password
            </Button>

            {!token && (
              <p className="text-xs text-red-500 font-semibold text-center mt-2">
                Invalid or missing reset token. Please request a new link.
              </p>
            )}

            <Link href="/auth/login" className="block text-center mt-4">
              <Button variant="ghost" className="text-xs font-bold uppercase tracking-wider">
                Cancel
              </Button>
            </Link>
          </form>
        )}

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
