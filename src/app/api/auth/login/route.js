import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import User from "@/models/User";

function normalizePhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return "";
}

function isEmailIdentifier(value) {
  return value.includes("@");
}

export async function POST(request) {
  try {
    await db();

    const { identifier, email, phone, password } = await request.json();

    // Support both old {email, password} and new {identifier, password} signatures
    const normalizedIdentifier = String(identifier || email || phone || "").trim();

    if (!normalizedIdentifier || !password) {
      return NextResponse.json(
        { success: false, message: "Email or mobile number and password are required" },
        { status: 400 }
      );
    }

    const query = isEmailIdentifier(normalizedIdentifier)
      ? { email: normalizedIdentifier.toLowerCase() }
      : { phone: normalizePhone(normalizedIdentifier) };

    if (!query.email && !query.phone) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email or mobile number" },
        { status: 400 }
      );
    }

    let user = await User.findOne(query).select('+password');
    
    if (!user && isEmailIdentifier(normalizedIdentifier)) {
      user = await User.findOne({ email: normalizedIdentifier.toLowerCase() }).select('+password');
    }
    
    if (!user && !isEmailIdentifier(normalizedIdentifier)) {
      user = await User.findOne({ phone: normalizePhone(normalizedIdentifier) }).select('+password');
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(String(password), user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, message: "JWT_SECRET is not configured" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          name: user.name,
          email: user.email,
          city: user.city,
          state: user.state || "Punjab",
          role: user.role,
        },
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Login failed" },
      { status: 500 }
    );
  }
}
