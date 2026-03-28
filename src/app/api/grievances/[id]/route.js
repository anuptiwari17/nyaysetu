import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import Grievance from "@/models/Grievance";
import Petition from "@/models/Petition";
import User from "@/models/User";

function isAllowedFirebaseImageUrl(value) {
  if (!value) return true;

  try {
    const parsed = new URL(String(value || "").trim());
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    return (
      host === "firebasestorage.googleapis.com" ||
      host.endsWith(".firebasestorage.app") ||
      host === "storage.googleapis.com"
    );
  } catch (_error) {
    return false;
  }
}

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

export async function GET(_request, { params }) {
  try {
    await db();
    const { id } = await Promise.resolve(params);

    const authUser = await getAuthUserFromRequest(_request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const grievance = await Grievance.findById(id)
      .populate({ path: "createdBy", select: "name" })
      .populate({ path: "assignedAuthority", select: "name city" })
      .populate({ path: "petitionId", select: "title signatures createdAt" });

    if (!grievance) {
      return NextResponse.json(
        { success: false, message: "Grievance not found" },
        { status: 404 }
      );
    }

    const isOwner = String(grievance.createdBy?._id || grievance.createdBy) === String(authUser._id);
    const isAssignedAuthority =
      authUser.role === "authority" &&
      authUser.authorityId &&
      String(grievance.assignedAuthority?._id || grievance.assignedAuthority) === String(authUser.authorityId);

    if (!isOwner && !isAssignedAuthority) {
      return NextResponse.json(
        { success: false, message: "Grievance not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, grievance }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch grievance" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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

    if (authUser.role !== "authority") {
      return NextResponse.json(
        { success: false, message: "Only authority users can update status" },
        { status: 403 }
      );
    }

    const { status: newStatus, resolutionNote, proof } = await request.json();

    if (!newStatus) {
      return NextResponse.json(
        { success: false, message: "status is required" },
        { status: 400 }
      );
    }

    if (!isAllowedFirebaseImageUrl(proof)) {
      return NextResponse.json(
        { success: false, message: "Invalid proof URL" },
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

    if (
      !authUser.authorityId ||
      String(grievance.assignedAuthority || "") !== String(authUser.authorityId)
    ) {
      return NextResponse.json(
        { success: false, message: "Only the assigned authority can update this grievance" },
        { status: 403 }
      );
    }

    const userId = authUser._id;

    grievance.status = newStatus;
    grievance.resolutionNote = String(resolutionNote || grievance.resolutionNote || "").trim();
    grievance.resolutionProof = String(proof || grievance.resolutionProof || "").trim();
    grievance.statusHistory = Array.isArray(grievance.statusHistory) ? grievance.statusHistory : [];
    grievance.statusHistory.push({
      status: newStatus,
      note: String(resolutionNote || "").trim(),
      proof: String(proof || "").trim(),
      updatedAt: new Date(),
      updatedBy: userId,
    });

    await grievance.save();

    const updated = await Grievance.findById(grievance._id)
      .populate({ path: "createdBy", select: "name" })
      .populate({ path: "assignedAuthority", select: "name city" })
      .populate({ path: "petitionId", select: "title signatures createdAt" });

    return NextResponse.json({ success: true, grievance: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update grievance" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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

    if (String(grievance.createdBy || "") !== String(authUser._id)) {
      return NextResponse.json(
        { success: false, message: "Only the grievance creator can delete this grievance" },
        { status: 403 }
      );
    }

    if (grievance.petitionId) {
      const petition = await Petition.findById(grievance.petitionId);
      if (petition) {
        petition.issueId = null;
        petition.type = "independent";
        await petition.save();
      }
    }

    await Grievance.deleteOne({ _id: grievance._id });

    return NextResponse.json(
      { success: true, message: "Grievance deleted" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete grievance" },
      { status: 500 }
    );
  }
}
