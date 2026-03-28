import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import User from "@/models/User";

export async function GET(request) {
  try {
    await db();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, message: "JWT_SECRET is not configured" },
        { status: 500 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      { success: false, message: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
