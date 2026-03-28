import { NextResponse } from "next/server";

import db from "@/lib/db";
import OTP from "@/models/OTP";

export async function POST(request) {
  try {
    await db();

    const { phone } = await request.json();
    const normalizedPhone = String(phone || "").trim();

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { success: false, message: "Phone must be a valid 10-digit number" },
        { status: 400 }
      );
    }

    const otp = "241240";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({ phone: normalizedPhone });
    await OTP.create({ phone: normalizedPhone, otp, expiresAt, verified: false });

    // DEV MODE: Fast2SMS integration is temporarily disabled.
    // const fast2smsKey = String(process.env.FAST2SMS_KEY || "").trim();
    // const params = new URLSearchParams({
    //   authorization: fast2smsKey,
    //   route: "q",
    //   message: `Your NagarSeva OTP is ${otp}. Valid for 10 minutes.`,
    //   numbers: normalizedPhone,
    //   schedule_time: "",
    //   flash: "0",
    // });
    // await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
    //   method: "GET",
    //   headers: {
    //     accept: "application/json",
    //     authorization: fast2smsKey,
    //   },
    //   cache: "no-store",
    // });

    console.log(`[DEV] OTP for ${normalizedPhone}: ${otp}`);

    return NextResponse.json({ success: true, message: "OTP sent (dev mode)" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to send OTP" },
      { status: 500 }
    );
  }
}
