import { NextResponse } from "next/server";

import db from "@/lib/db";
import Petition from "@/models/Petition";

export async function GET(_request, { params }) {
  try {
    await db();
    const { id } = await Promise.resolve(params);

    const petition = await Petition.findById(id).populate({ path: "issueId", select: "title" });

    if (!petition) {
      return NextResponse.json(
        { success: false, message: "Petition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, petition }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch petition" },
      { status: 500 }
    );
  }
}
