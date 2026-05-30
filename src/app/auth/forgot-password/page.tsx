"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch reset link.");
      }

      setIsSubmitted(true);
      toast({
        title: "Link Dispatched",
        description: data.message || `If an account matches ${email}, we have sent reset instructions.`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Error occurred",
        description: error.message || "Unable to process request. Please try again.",
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
          <h2 className="mt-4 text-xl font-bold uppercase tracking-wider text-foreground">Reset Password</h2>
          <p className="mt-1 text-xs text-muted-foreground font-semibold">Enter your email to receive recovery instructions</p>
        </div>

        {isSubmitted ? (
          <div className="space-y-6 text-center">
            <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 inline-block shadow-sm">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed font-semibold">
              An email containing password recovery steps has been dispatched to <strong>{email}</strong>. Check your spam folders if it does not arrive within a few minutes.
            </p>
            <Link href="/auth/login" className="block">
              <Button variant="outline" className="w-full h-11 uppercase font-bold tracking-wider flex items-center justify-center">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="reset-email"
              label="Email Address"
              type="email"
              required
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button
              type="submit"
              className="w-full h-11 uppercase font-bold tracking-wider mt-6"
              isLoading={isSubmitting}
            >
              Send Reset Link
            </Button>

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
