import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import Grievance from "@/models/Grievance";
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

    const { petitionId } = await request.json();
    if (!petitionId) {
      return NextResponse.json(
        { success: false, message: "petitionId is required" },
        { status: 400 }
      );
    }

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return NextResponse.json(
        { success: false, message: "Grievance not found" },
        { status: 404 }
      );
    }

    if (String(grievance.createdBy) !== String(authUser._id)) {
      return NextResponse.json(
        { success: false, message: "Only the grievance creator can cite a petition" },
        { status: 403 }
      );
    }

    if (grievance.petitionId) {
      return NextResponse.json(
        { success: false, message: "This grievance already has a linked petition" },
        { status: 409 }
      );
    }

    const petition = await Petition.findById(petitionId);
    if (!petition) {
      return NextResponse.json(
        { success: false, message: "Petition not found" },
        { status: 404 }
      );
    }

    if (String(petition.createdBy) !== String(authUser._id)) {
      return NextResponse.json(
        { success: false, message: "You can cite only petitions created by you" },
        { status: 403 }
      );
    }

    if (petition.issueId && String(petition.issueId) !== String(grievance._id)) {
      return NextResponse.json(
        { success: false, message: "Petition is already linked to another grievance" },
        { status: 409 }
      );
    }

    petition.issueId = grievance._id;
    petition.type = "linked";
    await petition.save();

    grievance.petitionId = petition._id;
    await grievance.save();

    const updated = await Grievance.findById(grievance._id)
      .populate({ path: "createdBy", select: "name" })
      .populate({ path: "assignedAuthority", select: "name city" })
      .populate({ path: "petitionId", select: "title signatures createdAt" });

    return NextResponse.json({ success: true, grievance: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cite petition" },
      { status: 500 }
    );
  }
}
