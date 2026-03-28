import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import Petition from "@/models/Petition";
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

    const petition = await Petition.findById(id);
    if (!petition) {
      return NextResponse.json(
        { success: false, message: "Petition not found" },
        { status: 404 }
      );
    }

    const userId = String(authUser._id);
    const alreadySigned = (petition.signatures || []).some(
      (signerId) => String(signerId) === userId
    );

    if (alreadySigned) {
      return NextResponse.json(
        { success: false, message: "Already signed" },
        { status: 400 }
      );
    }

    petition.signatures = Array.isArray(petition.signatures) ? petition.signatures : [];
    petition.signatures.push(authUser._id);
    await petition.save();

    return NextResponse.json(
      {
        success: true,
        signatureCount: petition.signatures.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to sign petition" },
      { status: 500 }
    );
  }
}
