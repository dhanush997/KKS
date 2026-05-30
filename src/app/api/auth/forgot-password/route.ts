import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Find user by lowercase email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user) {
      // Create a secure token valid for 1 hour
      const token = jwt.sign(
        { email: user.email },
        process.env.NEXTAUTH_SECRET || "fallback-secret",
        { expiresIn: "1h" }
      );

      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;

      // Send reset email
      await sendPasswordResetEmail(user.email, user.name, resetLink);
    }

    // Return generic success to prevent email enumeration/scraping
    return NextResponse.json({
      message: "If an account matches this email, reset instructions have been dispatched.",
    });
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during password reset." },
      { status: 500 }
    );
  }
}
