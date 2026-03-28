import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import OTP from "@/models/OTP";
import User from "@/models/User";

export async function POST(request) {
  try {
    await db();

    const { name, email, password, city, phone, phoneVerified } = await request.json();

    if (!name || !email || !password || !city || !phone) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (!phoneVerified) {
      return NextResponse.json(
        { success: false, message: "Phone verification is required" },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(String(phone).trim())) {
      return NextResponse.json(
        { success: false, message: "Phone must be a valid 10-digit number" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();

    const verifiedOtp = await OTP.findOne({
      phone: normalizedPhone,
      verified: true,
      expiresAt: { $gt: new Date() },
    });

    if (!verifiedOtp) {
      return NextResponse.json(
        { success: false, message: "Phone is not verified or OTP has expired" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email is already registered" },
        { status: 409 }
      );
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, message: "JWT_SECRET is not configured" },
        { status: 500 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      city: String(city).trim(),
      phone: normalizedPhone,
      isPhoneVerified: true,
      role: "citizen",
    });

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
          role: user.role,
        },
      },
      { status: 201 }
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
      { success: false, message: error.message || "Registration failed" },
      { status: 500 }
    );
  }
}
