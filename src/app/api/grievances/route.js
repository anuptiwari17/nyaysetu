import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import Authority from "@/models/Authority";
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

export async function GET(request) {
  try {
    await db();

    const authUser = await getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = request.nextUrl.searchParams;
    const city = params.get("city");
    const category = params.get("category");
    const status = params.get("status");

    const query = {};

    if (authUser.role === "citizen") {
      query.createdBy = authUser._id;
    } else if (authUser.role === "authority") {
      if (!authUser.authorityId) {
        return NextResponse.json(
          {
            success: true,
            grievances: [],
            total: 0,
          },
          { status: 200 }
        );
      }
      query.assignedAuthority = authUser.authorityId;
    } else {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (city) {
      query.city = city;
    }

    if (category && category !== "All" && category !== "All Categories") {
      query.category = category;
    }

    if (status && status !== "all" && status !== "All") {
      if (status === "pending") {
        query.status = "reported";
      } else {
        query.status = status;
      }
    }

    const grievances = await Grievance.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: "createdBy", select: "name email city role authorityName" })
      .populate({ path: "assignedAuthority", select: "name city" });

    return NextResponse.json(
      {
        success: true,
        grievances,
        total: grievances.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch grievances" },
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

    const body = await request.json();
    const {
      title,
      description,
      category,
      city,
      location,
      evidence,
      anonymous,
      assignedAuthority,
      petitionId,
      legalContext,
      suggestedCategory,
    } = body;

    if (!title || !description || !category || !city) {
      return NextResponse.json(
        { success: false, message: "title, description, category and city are required" },
        { status: 400 }
      );
    }

    let assignedAuthorityId = assignedAuthority || null;

    if (!assignedAuthorityId) {
      const authority = await Authority.findOne({
        city,
        categoriesHandled: { $in: [category] },
      });

      if (authority) {
        assignedAuthorityId = authority._id;
      }
    }

    const grievance = await Grievance.create({
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      city: String(city).trim(),
      location: String(location || "").trim(),
      evidence: Array.isArray(evidence) ? evidence : [],
      createdBy: authUser._id,
      supportCount: 0,
      supporters: [],
      assignedAuthority: assignedAuthorityId,
      status: "reported",
      petitionId: petitionId || null,
      legalContext: String(legalContext || "").trim(),
      suggestedCategory: String(suggestedCategory || "").trim(),
      anonymous: Boolean(anonymous),
      statusHistory: [
        {
          status: "reported",
          note: "Issue reported",
          updatedAt: new Date(),
          updatedBy: authUser._id,
        },
      ],
    });

    const populated = await Grievance.findById(grievance._id)
      .populate({ path: "createdBy", select: "name email city role authorityName" })
      .populate({ path: "assignedAuthority", select: "name city" });

    return NextResponse.json(
      {
        success: true,
        grievance: populated,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create grievance" },
      { status: 500 }
    );
  }
}
