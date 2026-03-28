import { NextResponse } from "next/server";

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

function extractJsonObject(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (_error) {
    // fall through
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const maybeJson = text.slice(start, end + 1);
  try {
    return JSON.parse(maybeJson);
  } catch (_error) {
    return null;
  }
}

function buildUserPrompt({ mode, assistantPrompt, currentTitle, currentDescription, linkedIssueTitle, linkedIssueDescription }) {
  const safeMode = mode === "improve" ? "improve" : "generate";

  return [
    `Task mode: ${safeMode}`,
    "You are helping a citizen write a clear civic petition for an Indian city context.",
    "Return strict JSON with keys: title, description, keyPoints, confidenceNote.",
    "Rules:",
    "- title must be concise (8-14 words)",
    "- description should be 2-4 short paragraphs",
    "- include concrete civic ask and impact",
    "- avoid legal claims unless certain",
    "- keyPoints must be an array of 3-5 bullets",
    "Citizen intent:",
    String(assistantPrompt || "").trim(),
    "Current draft title:",
    String(currentTitle || "").trim() || "(none)",
    "Current draft description:",
    String(currentDescription || "").trim() || "(none)",
    "Linked grievance title:",
    String(linkedIssueTitle || "").trim() || "(none)",
    "Linked grievance description:",
    String(linkedIssueDescription || "").trim() || "(none)",
  ].join("\n");
}

export async function POST(request) {
  try {
    const groqApiKey = String(process.env.GROQ_API_KEY || "").trim();
    if (!groqApiKey) {
      return NextResponse.json(
        { success: false, message: "GROQ_API_KEY is missing in .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const assistantPrompt = String(body?.assistantPrompt || "").trim();
    const mode = String(body?.mode || "generate").trim().toLowerCase();

    if (!assistantPrompt) {
      return NextResponse.json(
        { success: false, message: "Please describe what your petition is about." },
        { status: 400 }
      );
    }

    const userPrompt = buildUserPrompt({
      mode,
      assistantPrompt,
      currentTitle: body?.currentTitle,
      currentDescription: body?.currentDescription,
      linkedIssueTitle: body?.linkedIssueTitle,
      linkedIssueDescription: body?.linkedIssueDescription,
    });

    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are a civic petition writing assistant. Always return valid JSON only, with no markdown or explanation.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
      cache: "no-store",
    });

    const upstreamJson = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            String(upstreamJson?.error?.message || "").trim() || "Groq request failed. Please try again.",
        },
        { status: upstream.status || 502 }
      );
    }

    const content =
      upstreamJson?.choices?.[0]?.message?.content ||
      upstreamJson?.choices?.[0]?.text ||
      "";

    const parsed = extractJsonObject(String(content || ""));
    if (!parsed) {
      return NextResponse.json(
        {
          success: true,
          result: {
            title: "Community Civic Petition",
            description: String(content || "").trim(),
            keyPoints: [],
            confidenceNote: "Generated in text mode",
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        result: {
          title: String(parsed?.title || "").trim(),
          description: String(parsed?.description || "").trim(),
          keyPoints: Array.isArray(parsed?.keyPoints)
            ? parsed.keyPoints.map((item) => String(item || "").trim()).filter(Boolean)
            : [],
          confidenceNote: String(parsed?.confidenceNote || "").trim(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to generate petition draft." },
      { status: 500 }
    );
  }
}
