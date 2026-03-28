import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import { getFirebaseAdminAuth } from "@/lib/firebaseAdmin";
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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function verifyPhoneToken(phoneIdToken, normalizedPhone) {
  const decodedToken = await getFirebaseAdminAuth().verifyIdToken(String(phoneIdToken || ""));
  const tokenPhone = normalizePhone(decodedToken.phone_number || "");

  if (!tokenPhone || tokenPhone !== normalizedPhone) {
    throw new Error("Phone OTP verification does not match the provided mobile number");
  }

  return true;
}

async function verifyEmailToken(emailIdToken, normalizedEmail) {
  const decodedToken = await getFirebaseAdminAuth().verifyIdToken(String(emailIdToken || ""));
  const tokenEmail = String(decodedToken.email || "").trim().toLowerCase();

  if (!tokenEmail || tokenEmail !== normalizedEmail || !decodedToken.email_verified) {
    throw new Error("Email OTP verification failed for the provided email address");
  }

  return true;
}

export async function POST(request) {
  try {
    await db();

    const { name, email, password, confirmPassword, city, state, phone, phoneIdToken, emailIdToken } =
      await request.json();

    if (!name || !email || !password || !confirmPassword || !city || !state || !phone) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, message: "Phone must be a valid 10-digit number" },
        { status: 400 }
      );
    }

    if (!phoneIdToken || !emailIdToken) {
      return NextResponse.json(
        { success: false, message: "Both phone OTP and email OTP must be verified" },
        { status: 400 }
      );
    }

    try {
      await verifyPhoneToken(phoneIdToken, normalizedPhone);
      await verifyEmailToken(emailIdToken, normalizedEmail);
    } catch (verifyError) {
      const errorMsg = verifyError.message || "Token verification failed";
      if (errorMsg.includes("Firebase admin credentials")) {
        return NextResponse.json(
          {
            success: false,
            message: "Server configuration error. Please try again later.",
            debug: process.env.NODE_ENV === "development" ? errorMsg : undefined,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: false, message: errorMsg },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (existingUser) {
      const duplicateMessage =
        existingUser.email === normalizedEmail
          ? "Email is already registered"
          : "Phone number is already registered";

      return NextResponse.json(
        { success: false, message: duplicateMessage },
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
      isPhoneVerified: true,
      isEmailVerified: true,
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
