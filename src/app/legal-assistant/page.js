"use client";

import { Scale, Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useMemo, useState } from "react";

import Navbar from "@/components/Navbar";

const SUGGESTED_PROMPTS = [
  "My employer has not paid salary for 2 months. What can I do?",
  "My landlord is refusing to return security deposit after moving out.",
  "A builder delayed possession of my flat beyond promised date.",
  "Police are not registering my complaint. What are legal options?",
];

function extractCitationLines(text) {
  const input = String(text || "");
  if (!input.trim()) return [];

  const citationRegex = /(section\s+\d+|article\s+\d+|\bipc\b|\bcrpc\b|\bcpc\b|constitution|act\b|\bv\.?\b|\bvs\.?\b|supreme court|high court)/i;
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*\d.)\s]+/, ""))
    .filter(Boolean)
    .filter((line) => citationRegex.test(line));

  return [...new Set(lines)].slice(0, 8);
}

function stringifyDocReference(doc) {
  if (typeof doc === "string") return doc;
  if (!doc || typeof doc !== "object") return "";

  const pieces = [
    doc.title,
    doc.case_name,
    doc.citation,
    doc.section,
    doc.act,
    doc.url,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  if (pieces.length > 0) return pieces.join(" | ");
  return JSON.stringify(doc);
}

function getVectorSource(match) {
  const source = String(match?.metadata?.source || "").trim();
  if (source) return source;
  return "Unknown legal source";
}

export default function LegalAssistantPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState([]);

  const hasResults = sessions.length > 0;

  const latestSession = useMemo(() => {
    if (!hasResults) return null;
    return sessions[0];
  }, [hasResults, sessions]);

  async function askLegalAssistant(nextQuery) {
    const input = String(nextQuery || query).trim();
    if (!input || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/legal-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Unable to fetch legal advice right now.");
      }

      const next = {
        id: `${Date.now()}`,
        query: input,
        legalAdvice: String(json?.legalAdvice || "").trim(),
        kanoonDocuments: Array.isArray(json?.kanoonDocuments) ? json.kanoonDocuments : [],
        vectorMatches: Array.isArray(json?.vectorMatches) ? json.vectorMatches : [],
      };

      setSessions((prev) => [next, ...prev]);
      setQuery("");
    } catch (err) {
      setError(err?.message || "Unable to fetch legal advice right now.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    askLegalAssistant();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "88px 24px 64px" }}>

        {/* ── Back button ── */}
        <div style={{ marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
                return;
              }
              router.push("/dashboard/citizen");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              border: "1px solid #D1D5DB",
              background: "#FFFFFF",
              color: "#4A5568",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* ── Page header ── */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280" }}>
            AI Legal Assistant
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, lineHeight: 1.08, color: "#111827", fontFamily: "Fraunces, Georgia, serif" }}>
            Ask a legal question
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: "16px", lineHeight: 1.7, color: "#4B5563", maxWidth: "640px" }}>
            Get AI-generated legal guidance grounded in Indian law. Describe your situation in detail for the best advice.
          </p>
        </div>

        {/* ── Query form ── */}
        <section style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1px solid #E5E7EB", marginBottom: "24px" }}>
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="legal-query"
              style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 600, color: "#374151" }}
            >
              Your legal query
            </label>

            <textarea
              id="legal-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe your issue in detail. Mention timeline, parties involved, and key facts."
              style={{
                width: "100%",
                minHeight: "130px",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "15px",
                lineHeight: 1.7,
                border: "1px solid #D1D5DB",
                background: "#FAFAF8",
                color: "#111827",
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "inherit",
              }}
            />

            {/* Suggested prompts */}
            <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => askLegalAssistant(prompt)}
                  disabled={loading}
                  style={{
                    borderRadius: "999px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 500,
                    border: "1px solid #D1D5DB",
                    background: "#FFFFFF",
                    color: "#4B5563",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <p style={{ marginTop: "10px", fontSize: "13px", color: "#B91C1C" }}>{error}</p>
            )}

            {/* Actions */}
            <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  padding: "11px 22px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#FFFFFF",
                  background: loading || !query.trim() ? "#9CA3AF" : "#111827",
                  border: "none",
                  cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
              >
                <Search size={15} />
                {loading ? "Getting advice…" : "Get Legal Advice"}
              </button>

              {hasResults && (
                <button
                  type="button"
                  onClick={() => setSessions([])}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    borderRadius: "10px",
                    padding: "11px 18px",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: "1px solid #D1D5DB",
                    background: "#FFFFFF",
                    color: "#374151",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <X size={14} />
                  Clear
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ── Results ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {!hasResults && (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "16px",
                padding: "28px 24px",
                border: "1px solid #E5E7EB",
              }}
            >
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                <Sparkles size={15} />
                Waiting for your first query
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#6B7280" }}>
                Your legal advice will appear here. Try one of the suggested prompts above or write your own.
              </p>
            </div>
          )}

          {sessions.map((item, index) => (
            <article
              key={item.id}
              style={{
                background: "#FFFFFF",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid #E5E7EB",
              }}
            >
              {(() => {
                const extracted = extractCitationLines(item.legalAdvice);
                const docs = item.kanoonDocuments.map(stringifyDocReference).filter(Boolean).slice(0, 5);
                const matchSources = item.vectorMatches.map(getVectorSource).filter(Boolean).slice(0, 5);
                const citationCount = extracted.length + docs.length + matchSources.length;

                return citationCount > 0 ? (
                  <section
                    style={{
                      marginBottom: "14px",
                      borderRadius: "12px",
                      border: "1px solid #DCCB95",
                      background: "#FFFBEB",
                      padding: "12px 14px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#854D0E" }}>
                      Citation Spotlight
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#78350F", lineHeight: 1.6 }}>
                      Referenced laws/cases are highlighted below for quick legal grounding.
                    </p>

                    {extracted.length > 0 && (
                      <ul style={{ margin: "8px 0 0", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {extracted.map((line, i) => (
                          <li key={`${item.id}-cit-${i}`} style={{ fontSize: "13px", color: "#78350F", lineHeight: 1.6 }}>
                            {line}
                          </li>
                        ))}
                      </ul>
                    )}

                    {docs.length > 0 && (
                      <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {docs.map((docText, i) => (
                          <span
                            key={`${item.id}-doc-chip-${i}`}
                            style={{
                              borderRadius: "999px",
                              border: "1px solid #E7D29A",
                              background: "#FFFFFF",
                              color: "#7C2D12",
                              fontSize: "12px",
                              padding: "5px 10px",
                            }}
                          >
                            {docText}
                          </span>
                        ))}
                      </div>
                    )}

                    {matchSources.length > 0 && (
                      <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#92400E", lineHeight: 1.6 }}>
                        Sources: {matchSources.join(" · ")}
                      </p>
                    )}
                  </section>
                ) : null;
              })()}

              {/* Query label */}
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>
                Query
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "16px", lineHeight: 1.65, color: "#111827" }}>
                {item.query}
              </p>

              {/* Divider */}
              <div style={{ height: "1px", background: "#E5E7EB", margin: "18px 0" }} />

              {/* Legal advice header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>
                <Scale size={14} />
                Legal Advice
              </div>

              {/* Markdown answer */}
              <div style={{ marginTop: "12px", fontSize: "15px", lineHeight: 1.8, color: "#374151" }}>
                <ReactMarkdown
                  components={{
                    h1: ({ ...props }) => (
                      <h2 style={{ marginTop: "18px", marginBottom: "4px", fontSize: "22px", fontWeight: 700, color: "#111827" }} {...props} />
                    ),
                    h2: ({ ...props }) => (
                      <h3 style={{ marginTop: "16px", marginBottom: "4px", fontSize: "19px", fontWeight: 700, color: "#111827" }} {...props} />
                    ),
                    h3: ({ ...props }) => (
                      <h4 style={{ marginTop: "14px", marginBottom: "4px", fontSize: "16px", fontWeight: 700, color: "#111827" }} {...props} />
                    ),
                    p: ({ ...props }) => (
                      <p style={{ margin: "8px 0 0", fontSize: "15px", lineHeight: 1.85, color: "#374151" }} {...props} />
                    ),
                    ul: ({ ...props }) => (
                      <ul style={{ margin: "8px 0 0", paddingLeft: "20px" }} {...props} />
                    ),
                    ol: ({ ...props }) => (
                      <ol style={{ margin: "8px 0 0", paddingLeft: "20px" }} {...props} />
                    ),
                    li: ({ ...props }) => (
                      <li style={{ fontSize: "15px", lineHeight: 1.8, color: "#374151", marginBottom: "4px" }} {...props} />
                    ),
                    strong: ({ ...props }) => (
                      <strong style={{ fontWeight: 700, color: "#111827" }} {...props} />
                    ),
                  }}
                >
                  {item.legalAdvice || "No legal advice returned by the service."}
                </ReactMarkdown>
              </div>

              {/* Retrieval context (collapsible) */}
              <details
                style={{
                  marginTop: "18px",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                }}
              >
                <summary style={{ cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#374151" }}>
                  Optional retrieval context
                </summary>

                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Kanoon docs */}
                  <div>
                    <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>
                      Kanoon docs
                    </p>
                    {item.kanoonDocuments.length === 0 ? (
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6B7280" }}>No docs returned.</p>
                    ) : (
                      <ul style={{ margin: "6px 0 0", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {item.kanoonDocuments.map((doc, i) => (
                          <li key={`${item.id}-doc-${i}`} style={{ fontSize: "13px", color: "#374151" }}>
                            {typeof doc === "string" ? doc : JSON.stringify(doc)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Vector matches */}
                  <div>
                    <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>
                      Vector matches
                    </p>
                    {item.vectorMatches.length === 0 ? (
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6B7280" }}>No vector matches returned.</p>
                    ) : (
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {item.vectorMatches.map((match, i) => (
                          <div
                            key={`${item.id}-vec-${i}`}
                            style={{ borderRadius: "8px", background: "#FFFFFF", padding: "12px", border: "1px solid #E5E7EB" }}
                          >
                            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.7, color: "#374151" }}>
                              {String(match?.content || "").slice(0, 320)}
                              {String(match?.content || "").length > 320 ? "…" : ""}
                            </p>
                            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#6B7280" }}>
                              Source: {match?.metadata?.source || "Unknown"}
                              {Number.isFinite(Number(match?.score)) ? ` · Score: ${Number(match.score).toFixed(3)}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </details>

              {index > 0 && (
                <p style={{ marginTop: "14px", fontSize: "11px", color: "#9CA3AF" }}>Previous query</p>
              )}
            </article>
          ))}
        </div>

        {/* Disclaimer */}
        {latestSession && (
          <p style={{ marginTop: "20px", fontSize: "12px", lineHeight: 1.6, color: "#9CA3AF" }}>
            Disclaimer: This output is AI-generated legal information and not professional legal advice. Consult a qualified lawyer for your specific situation.
          </p>
        )}
      </main>
    </div>
  );
}