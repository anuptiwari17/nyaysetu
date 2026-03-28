"use client";

/* eslint-disable @next/next/no-img-element */

import { Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

const CATEGORIES = [
  "Water Supply",
  "Roads & Footpaths",
  "Electricity",
  "Sanitation & Garbage",
  "Parks & Green Areas",
  "Street Lighting",
  "Other",
];

export default function NewGrievancePage() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Water Supply");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  async function handleEnhance() {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "AI enhancement unavailable");
      const result = json?.result || json?.data || json;
      setAiResult({
        suggestedCategory: result?.suggestedCategory || result?.category || "",
        assignedAuthority: result?.assignedAuthority || result?.authority || "",
        legalContext: result?.legalContext || "",
        structuredDescription: result?.structuredDescription || result?.description || "",
      });
    } catch {
      setAiError("AI enhancement unavailable. You can still submit your issue.");
      setAiResult(null);
    } finally {
      setAiLoading(false);
    }
  }

  function handleApplySuggestions() {
    if (!aiResult) return;
    if (aiResult.suggestedCategory) setCategory(aiResult.suggestedCategory);
    if (aiResult.structuredDescription) {
      setDescription(aiResult.structuredDescription);
    } else if (aiResult.legalContext) {
      setDescription((prev) => prev.trim() ? `${prev}\n\n${aiResult.legalContext}` : aiResult.legalContext);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          city: user?.city || "Jalandhar",
          location,
          description,
          anonymous,
          evidence: files.map((f) => f.name),
          suggestedCategory: aiResult?.suggestedCategory || "",
          assignedAuthority: aiResult?.assignedAuthority || "",
          legalContext: aiResult?.legalContext || "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to submit issue");

      const newId = json?.grievance?._id || json?.grievance?.id || json?.id || json?.data?._id || json?.data?.id;
      toast.success("Issue reported successfully!");
      setTimeout(() => {
        router.push(newId ? `/grievances/${newId}` : "/grievances");
      }, 500);
    } catch (err) {
      toast.error(err.message || "Unable to submit issue");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#FAFAF8" }}>
        <div style={{ height: "32px", width: "32px", borderRadius: "50%", border: "2px solid #4A6FA9", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  /* ── shared field style ── */
  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "15px",
    border: "1px solid #E8E1D5",
    background: "#F5F2ED",
    color: "#171717",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#555555",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />
      <Toaster position="top-center" />

      <main style={{ maxWidth: "720px", margin: "0 auto", padding: "88px 24px 64px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 700, lineHeight: 1.1, color: "#171717", fontFamily: "Fraunces, Georgia, serif" }}>
            Report a Civic Issue
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "15px", color: "#666666" }}>
            Your complaint will be structured by AI and routed to the right authority.
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#999999" }}>
            Reporting city: {user?.city || "Jalandhar"}, {user?.state || "Punjab"}
          </p>
        </div>

        {/* ── Form card ── */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            padding: "28px",
            border: "1px solid #E8E1D5",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Title */}
          <div>
            <label htmlFor="title" style={labelStyle}>Issue Title</label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. No water supply in Model Town for 3 days"
              style={fieldStyle}
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" style={labelStyle}>Category</label>
            <select
              id="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...fieldStyle, cursor: "pointer" }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" style={labelStyle}>
              Location in {user?.city || "Jalandhar"}
              <span style={{ fontWeight: 400, color: "#999999", marginLeft: "6px" }}>(optional)</span>
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Model Town, Phase 2"
              style={fieldStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" style={labelStyle}>Describe the Issue</label>
            <textarea
              id="description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How long has this been happening, who is affected, what have you tried…"
              style={{ ...fieldStyle, minHeight: "180px", resize: "vertical", lineHeight: 1.65 }}
            />
          </div>

          {/* Anonymous */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              style={{ marginTop: "3px", accentColor: "#4A6FA9", width: "15px", height: "15px", flexShrink: 0 }}
            />
            <span>
              <span style={{ fontSize: "14px", color: "#555555" }}>Submit anonymously</span>
              <span style={{ fontSize: "13px", color: "#999999", marginLeft: "6px" }}>(your name won&#39;t be shown publicly)</span>
            </span>
          </label>

          {/* File upload */}
          <div>
            <p style={{ ...labelStyle, marginBottom: "8px" }}>
              Upload Evidence
              <span style={{ fontWeight: 400, color: "#999999", marginLeft: "6px" }}>(optional)</span>
            </p>
            <label
              htmlFor="evidence-upload"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                borderRadius: "10px",
                padding: "24px",
                border: "1.5px dashed #D1D5DB",
                background: "#FAFAF8",
                color: "#999999",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <Upload size={18} />
              <span style={{ fontSize: "14px" }}>Click to upload photos</span>
              <input
                id="evidence-upload"
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>

            {previewUrls.length > 0 && (
              <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {previewUrls.map((url, i) => (
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt="Evidence preview"
                    style={{ height: "80px", width: "80px", borderRadius: "8px", objectFit: "cover", border: "1px solid #E8E1D5" }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── AI enhance panel ── */}
          <div style={{ borderRadius: "12px", padding: "18px", background: "#EEF2FF", border: "1px solid #C7D2F0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={14} color="#4A6FA9" />
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#4A6FA9" }}>Enhance with AI</span>
                <span style={{ borderRadius: "20px", padding: "2px 8px", fontSize: "10px", fontWeight: 600, background: "#DBEAFE", color: "#4A6FA9" }}>
                  Beta
                </span>
              </div>
              <button
                type="button"
                onClick={handleEnhance}
                disabled={aiLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#FFFFFF",
                  background: aiLoading ? "#93A8D0" : "#4A6FA9",
                  border: "none",
                  cursor: aiLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {aiLoading ? (
                  <>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    Enhancing…
                  </>
                ) : "Enhance"}
              </button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#4B5563" }}>
              AI will structure your complaint and add relevant legal context.
            </p>

            {aiError && (
              <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#666666" }}>{aiError}</p>
            )}

            {aiResult && (
              <div style={{ marginTop: "12px", borderRadius: "8px", background: "#FFFFFF", padding: "14px", border: "1px solid #C7D2F0", display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { label: "Suggested Category", value: aiResult.suggestedCategory },
                  { label: "Assigned Authority", value: aiResult.assignedAuthority },
                  { label: "Legal Context", value: aiResult.legalContext },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4A6FA9" }}>{label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#555555" }}>{value || "N/A"}</p>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleApplySuggestions}
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1.5px solid #4A6FA9",
                    color: "#4A6FA9",
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Apply suggestions
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              borderRadius: "10px",
              padding: "14px",
              fontSize: "16px",
              fontWeight: 700,
              color: "#FFFFFF",
              background: submitting ? "#93A8D0" : "#4A6FA9",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            {submitting ? (
              <>
                <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                Submitting…
              </>
            ) : "Submit Issue"}
          </button>
        </form>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}