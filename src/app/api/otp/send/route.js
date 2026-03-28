import { NextResponse } from "next/server";

import db from "@/lib/db";
import OTP from "@/models/OTP";

export async function POST(request) {
  try {
    await db();

    const { channel, email, phone, purpose } = await request.json();
    const normalizedChannel = String(channel || (email ? "email" : "phone")).trim().toLowerCase();
    const normalizedPurpose = String(purpose || "register").trim().toLowerCase();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "")
      .replace(/\D/g, "")
      .slice(-10);

    if (!["email", "phone"].includes(normalizedChannel)) {
      return NextResponse.json(
        { success: false, message: "channel must be email or phone" },
        { status: 400 }
      );
    }

    if (normalizedChannel === "phone" && !/^\d{10}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { success: false, message: "Phone must be a valid 10-digit number" },
        { status: 400 }
      );
    }

    if (normalizedChannel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({
      channel: normalizedChannel,
      purpose: normalizedPurpose,
      ...(normalizedChannel === "email" ? { email: normalizedEmail } : { phone: normalizedPhone }),
    });

    await OTP.create({
      channel: normalizedChannel,
      purpose: normalizedPurpose,
      phone: normalizedChannel === "phone" ? normalizedPhone : "",
      email: normalizedChannel === "email" ? normalizedEmail : "",
      otp,
      expiresAt,
      verified: false,
    });

    const identifier = normalizedChannel === "email" ? normalizedEmail : normalizedPhone;
    console.log(`[DEV] ${normalizedChannel.toUpperCase()} OTP for ${identifier}: ${otp}`);

    const responsePayload = {
      success: true,
      message: `${normalizedChannel === "email" ? "Email" : "Phone"} OTP sent (dev mode)`,
    };

    if (process.env.NODE_ENV !== "production") {
      responsePayload.devOtp = otp;
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to send OTP" },
      { status: 500 }
    );
  }
}
