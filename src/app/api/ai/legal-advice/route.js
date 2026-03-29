import { NextResponse } from "next/server";

function getServiceBaseUrl() {
  return (
    process.env.LEGAL_RAG_BASE_URL ||
    process.env.LEGAL_ADVICE_API_URL ||
    process.env.LEGAL_AGENT_URL ||
    ""
  );
}

function normalizeResult(payload) {
  const legalAdvice = String(payload?.legal_advice || "").trim();
  const kanoonDocuments = Array.isArray(payload?.kanoon_documents?.docs)
    ? payload.kanoon_documents.docs
    : [];
  const vectorMatches = Array.isArray(payload?.vector_matches) ? payload.vector_matches : [];

  return {
    legalAdvice,
    kanoonDocuments,
    vectorMatches,
  };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = String(body?.query || "").trim();

    if (!query) {
      return NextResponse.json(
        { success: false, message: "Query is required." },
        { status: 400 }
      );
    }

    const baseUrl = getServiceBaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Legal assistant service URL is missing. Set LEGAL_RAG_BASE_URL in .env.local.",
        },
        { status: 500 }
      );
    }

    const endpoint = `${baseUrl.replace(/\/+$/, "")}/kanoon`;
    const enhancedQuery = [
      query,
      "",
      "Please include relevant Indian legal citations (sections, articles, act names, and case references where applicable) while keeping the practical guidance complete.",
      "Do not omit steps, remedies, or process details.",
    ].join("\n");

    const upstreamResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: enhancedQuery }),
      cache: "no-store",
    });

    const upstreamJson = await upstreamResponse.json().catch(() => ({}));
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            String(upstreamJson?.message || "").trim() ||
            "Legal assistant service is currently unavailable.",
        },
        { status: upstreamResponse.status || 502 }
      );
    }

    const normalized = normalizeResult(upstreamJson);

    return NextResponse.json({
      success: true,
      ...normalized,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch legal advice.",
      },
      { status: 500 }
    );
  }
}
