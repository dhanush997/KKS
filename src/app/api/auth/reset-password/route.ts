import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and new password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || "fallback-secret");
    } catch (err) {
      return NextResponse.json(
        { error: "Password reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const email = decoded.email;
    if (!email) {
      return NextResponse.json(
        { error: "Invalid token payload." },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User no longer exists in our system." },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password in database
    await db.user.update({
      where: { email: user.email },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: "Password has been successfully updated.",
    });
  } catch (error: any) {
    console.error("Reset password API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during password reset confirmation." },
      { status: 500 }
    );
  }
}
