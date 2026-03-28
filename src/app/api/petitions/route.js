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

export async function GET(request) {
  try {
    await db();

    const params = request.nextUrl.searchParams;
    const createdBy = params.get("createdBy");
    const signedBy = params.get("signedBy");
    const queryText = String(params.get("q") || "").trim();
    const linkedTo = String(params.get("linkedTo") || "").trim();
    const unlinkedOnly = params.get("unlinked") === "true";
    const limit = Math.max(1, Math.min(100, Number(params.get("limit") || 50)));

    const query = {};

    if (createdBy === "me" || signedBy === "me") {
      const authUser = await getAuthUserFromRequest(request);
      if (!authUser) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }

      if (createdBy === "me") {
        query.createdBy = authUser._id;
      }

      if (signedBy === "me") {
        query.signatures = { $in: [authUser._id] };
      }
    } else {
      if (createdBy) {
        query.createdBy = createdBy;
      }

      if (signedBy) {
        query.signatures = { $in: [signedBy] };
      }
    }

    if (queryText) {
      const escaped = queryText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    if (linkedTo) {
      query.issueId = linkedTo;
    }

    if (unlinkedOnly) {
      query.issueId = null;
    }

    const petitions = await Petition.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: "issueId", select: "title" });

    return NextResponse.json(
      {
        success: true,
        petitions,
        total: petitions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch petitions" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await db();

    const authUser = await getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { title, description, issueId, type } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { success: false, message: "title and description are required" },
        { status: 400 }
      );
    }

    let linkedGrievance = null;
    if (issueId) {
      linkedGrievance = await Grievance.findById(issueId);

      if (!linkedGrievance) {
        return NextResponse.json(
          { success: false, message: "Linked grievance not found" },
          { status: 404 }
        );
      }

      if (String(linkedGrievance.createdBy) !== String(authUser._id)) {
        return NextResponse.json(
          { success: false, message: "Only the grievance creator can escalate it to a petition" },
          { status: 403 }
        );
      }

      if (linkedGrievance.petitionId) {
        return NextResponse.json(
          { success: false, message: "This grievance already has a linked petition" },
          { status: 409 }
        );
      }
    }

    const petition = await Petition.create({
      title: String(title).trim(),
      description: String(description).trim(),
      createdBy: authUser._id,
      issueId: issueId || null,
      signatures: [],
      type: type || (issueId ? "linked" : "independent"),
    });

    if (linkedGrievance) {
      linkedGrievance.petitionId = petition._id;
      await linkedGrievance.save();
    }

    const populated = await Petition.findById(petition._id).populate({ path: "issueId", select: "title" });

    return NextResponse.json(
      {
        success: true,
        petition: populated,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create petition" },
      { status: 500 }
    );
  }
}
