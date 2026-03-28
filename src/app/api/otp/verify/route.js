import { NextResponse } from "next/server";

import db from "@/lib/db";
import OTP from "@/models/OTP";

export async function POST(request) {
  try {
    await db();

    const { phone, otp } = await request.json();
    const normalizedPhone = String(phone || "").trim();
    const normalizedOtp = String(otp || "").trim();

    const otpDoc = await OTP.findOne({
      phone: normalizedPhone,
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

    return NextResponse.json({ success: true, verified: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "OTP verification failed" },
      { status: 500 }
    );
  }
}
