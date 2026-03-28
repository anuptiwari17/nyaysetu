import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import Grievance from "@/models/Grievance";
import User from "@/models/User";

async function getAuthUserFromRequest(request) {
  const token = request.cookies.get("token")?.value;

  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    return user || null;
  } catch (_error) {
    return null;
  }
}

export async function POST(request, { params }) {
  try {
    await db();
    const { id } = await Promise.resolve(params);

    const authUser = await getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return NextResponse.json(
        { success: false, message: "Grievance not found" },
        { status: 404 }
      );
    }

    const userId = String(authUser._id);
    const alreadySupported = (grievance.supporters || []).some(
      (supporterId) => String(supporterId) === userId
    );

    if (alreadySupported) {
      return NextResponse.json(
        { success: false, message: "Already supported" },
        { status: 400 }
      );
    }

    grievance.supporters = Array.isArray(grievance.supporters) ? grievance.supporters : [];
    grievance.supporters.push(authUser._id);
    grievance.supportCount = Number(grievance.supportCount || 0) + 1;
    await grievance.save();

    return NextResponse.json(
      {
        success: true,
        supportCount: grievance.supportCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to support grievance" },
      { status: 500 }
    );
  }
}
