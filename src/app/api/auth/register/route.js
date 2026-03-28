import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import User from "@/models/User";

function normalizePhone(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

export async function POST(request) {
  try {
    await db();

    const {
      name,
      email,
      password,
      city,
      state,
      phone,
      emailVerified,
      phoneVerified,
      firebaseEmailToken,
      firebasePhoneToken,
    } = await request.json();

    if (!name || !email || !password || !city || !state || !phone) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (!emailVerified || !phoneVerified) {
      return NextResponse.json(
        { success: false, message: "Email and phone verification are required" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { success: false, message: "Phone must be a valid 10-digit number" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!firebaseEmailToken) {
      return NextResponse.json(
        { success: false, message: "Email verification token is missing" },
        { status: 400 }
      );
    }

    let decodedEmailToken;
    try {
      decodedEmailToken = await verifyFirebaseIdToken(firebaseEmailToken);
    } catch (_error) {
      return NextResponse.json(
        { success: false, message: "Invalid email verification token" },
        { status: 400 }
      );
    }

    const verifiedEmail = String(decodedEmailToken?.email || "").trim().toLowerCase();
    const isEmailTokenVerified = Boolean(decodedEmailToken?.email_verified);

    if (!verifiedEmail || verifiedEmail !== normalizedEmail || !isEmailTokenVerified) {
      return NextResponse.json(
        { success: false, message: "Email is not verified. Please verify using email link." },
        { status: 400 }
      );
    }

    if (!firebasePhoneToken) {
      return NextResponse.json(
        { success: false, message: "Phone verification token is missing" },
        { status: 400 }
      );
    }

    let decodedPhoneToken;
    try {
      decodedPhoneToken = await verifyFirebaseIdToken(firebasePhoneToken);
    } catch (_error) {
      return NextResponse.json(
        { success: false, message: "Invalid phone verification token" },
        { status: 400 }
      );
    }

    const firebasePhone = normalizePhone(decodedPhoneToken?.phone_number);
    if (!firebasePhone || firebasePhone !== normalizedPhone) {
      return NextResponse.json(
        { success: false, message: "Phone does not match verified Firebase number" },
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
      state: String(state).trim(),
      phone: normalizedPhone,
      isEmailVerified: true,
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
          state: user.state,
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
