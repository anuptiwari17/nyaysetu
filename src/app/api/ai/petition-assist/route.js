import { NextResponse } from "next/server";

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

function normalizeText(value) {
  return String(value || "").replace(/\u0000/g, "").trim();
}

function isLikelyJsonPayload(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return true;
  }

  return /"(title|description|keyPoints|confidenceNote)"\s*:/i.test(trimmed);
}

function stripCodeFences(text) {
  const trimmed = normalizeText(text);
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

function buildStructuredFallbackDescription(intent) {
  const safeIntent = normalizeText(intent) || "the civic issue described by the citizen";

  return [
    "Introduction:",
    `Residents raise concern regarding ${safeIntent}. The issue is materially affecting daily life and requires timely municipal intervention.`,
    "",
    "Detailed Explanation:",
    "This matter has persisted long enough to impact safety, mobility, health, and public confidence in local services. Citizens are experiencing avoidable inconvenience and potential risk due to delayed corrective action.",
    "The concern appears to involve recurring operational gaps, indicating a need for structured planning and implementation rather than one-time fixes. A coordinated response by the relevant department is necessary to prevent further escalation.",
    "",
    "Call to Action:",
    "The competent authority is requested to acknowledge this petition, conduct an on-ground assessment, and publish an action plan with clear milestones, responsible officers, and completion timelines.",
    "Periodic public updates may be issued to ensure transparency and accountability until resolution is completed.",
  ].join("\n");
}

function normalizeKeyPoints(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean).slice(0, 7);
  }

  const text = normalizeText(value);
  if (!text) return [];

  return text
    .split(/\r?\n|\.|;/)
    .map((part) => part.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 7);
}

function sanitizeResult(parsed, fallbackIntent) {
  const safeTitle = normalizeText(parsed?.title);
  const safeDescription = normalizeText(parsed?.description);

  return {
    title: safeTitle && !isLikelyJsonPayload(safeTitle) ? safeTitle : "Community Civic Petition",
    description:
      safeDescription && !isLikelyJsonPayload(safeDescription)
        ? safeDescription
        : buildStructuredFallbackDescription(fallbackIntent),
    keyPoints: normalizeKeyPoints(parsed?.keyPoints),
    confidenceNote: normalizeText(parsed?.confidenceNote) || "Generated in structured mode",
  };
}

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
    "Formatting requirements:",
    "- title must be concise (8-14 words), formal, and specific",
    "- description must be structured with the following section headings:",
    "  1) Introduction",
    "  2) Detailed Explanation",
    "  3) Call to Action",
    "- description should be detailed and formal, around 6-9 short paragraphs total",
    "- include concrete civic ask, expected impact, and accountability expectations",
    "- avoid legal claims unless certain; if uncertain, use neutral wording",
    "- keyPoints must be an array of 5-7 practical action bullets",
    "- do not output markdown code fences",
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
    "give proper text like how a fromal petition is writtten, dont include like intorduction : and then text, but directly as text as like a article"
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
              "You are a civic petition writing assistant. Write structured, detailed, and formal petitions. Always return valid JSON only, with no markdown or explanation.",
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

    const normalizedContent = stripCodeFences(content);

    const parsed = extractJsonObject(normalizedContent);
    if (!parsed) {
      const safeDescription = isLikelyJsonPayload(normalizedContent)
        ? buildStructuredFallbackDescription(assistantPrompt)
        : normalizeText(normalizedContent) || buildStructuredFallbackDescription(assistantPrompt);

      return NextResponse.json(
        {
          success: true,
          result: {
            title: "Community Civic Petition",
            description: safeDescription,
            keyPoints: [
              "Conduct an official on-ground assessment",
              "Publish a clear action plan with timelines",
              "Assign responsible department officers",
              "Provide periodic progress updates to citizens",
              "Complete implementation within the committed timeline",
            ],
            confidenceNote: "Generated in structured fallback mode",
          },
        },
        { status: 200 }
      );
    }

    const safeResult = sanitizeResult(parsed, assistantPrompt);

    return NextResponse.json(
      {
        success: true,
        result: safeResult,
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
