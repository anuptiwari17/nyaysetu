import { NextResponse } from "next/server";

import db from "@/lib/db";
import OTP from "@/models/OTP";

export async function POST(request) {
  try {
    await db();

    const { channel, email, phone, otp, purpose } = await request.json();
    const normalizedChannel = String(channel || (email ? "email" : "phone")).trim().toLowerCase();
    const normalizedPurpose = String(purpose || "register").trim().toLowerCase();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "")
      .replace(/\D/g, "")
      .slice(-10);
    const normalizedOtp = String(otp || "").trim();

    if (!["email", "phone"].includes(normalizedChannel)) {
      return NextResponse.json(
        { success: false, message: "channel must be email or phone" },
        { status: 400 }
      );
    }

    const otpDoc = await OTP.findOne({
      channel: normalizedChannel,
      purpose: normalizedPurpose,
      ...(normalizedChannel === "email" ? { email: normalizedEmail } : { phone: normalizedPhone }),
      expiresAt: { $gt: new Date() },
      verified: false,
    });

    if (!otpDoc) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    if (otpDoc.otp !== normalizedOtp) {
      return NextResponse.json({ success: false, message: "Wrong OTP" }, { status: 400 });
    }

    otpDoc.verified = true;
    await otpDoc.save();

    return NextResponse.json(
      { success: true, verified: true, channel: normalizedChannel },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "OTP verification failed" },
      { status: 500 }
    );
  }
}
