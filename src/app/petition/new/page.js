"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function NewPetitionPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [grievanceId, setGrievanceId] = useState("");

  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkedIssue, setLinkedIssue] = useState(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [ownerError, setOwnerError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setGrievanceId(params.get("grievanceId") || "");
  }, []);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!grievanceId) { setLinkedIssue(null); return; }
    let isActive = true;

    async function fetchLinkedIssue() {
      setIssueLoading(true);
      try {
        const res = await fetch(`/api/grievances/${grievanceId}`);
        const json = await res.json().catch(() => ({}));
        if (!isActive) return;
        setLinkedIssue(json?.grievance || json?.data || null);
      } catch {
        if (!isActive) return;
        setLinkedIssue(null);
      } finally {
        if (!isActive) return;
        setIssueLoading(false);
      }
    }

    fetchLinkedIssue();
    return () => { isActive = false; };
  }, [grievanceId]);

  const linkedIssueCreatorId = String(
    typeof linkedIssue?.createdBy === "string"
      ? linkedIssue?.createdBy
      : linkedIssue?.createdBy?._id || linkedIssue?.createdBy?.id || ""
  );
  const currentUserId = String(user?._id || user?.id || "");
  const canEscalateThisIssue = !grievanceId || !linkedIssue || (linkedIssueCreatorId && currentUserId === linkedIssueCreatorId);

  useEffect(() => {
    if (!grievanceId) { setOwnerError(""); return; }
    if (issueLoading) return;
    if (linkedIssue && !canEscalateThisIssue) {
      setOwnerError("Only the grievance creator can escalate it to a petition.");
      return;
    }
    setOwnerError("");
  }, [grievanceId, linkedIssue, issueLoading, canEscalateThisIssue]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canEscalateThisIssue) { setOwnerError("Only the grievance creator can escalate it to a petition."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/petitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          issueId: grievanceId || null,
          type: grievanceId ? "linked" : "independent",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to create petition");
      const newId = json?.petition?._id || json?.petition?.id || json?.id || json?.data?._id || json?.data?.id;
      router.push(newId ? `/petition/${newId}` : "/petition");
    } catch {
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

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "72px 24px 64px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px", fontSize: "13px" }}>
          <Link href={dashboardHref} style={{ color: "#4A6FA9", textDecoration: "none" }}>← Dashboard</Link>
          <span style={{ color: "#D1D5DB" }}>|</span>
          <Link href="/petition" style={{ color: "#4A6FA9", textDecoration: "none" }}>All Petitions</Link>
        </div>

        {/* Header */}
        <h1 style={{ margin: "0 0 6px", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 700, lineHeight: 1.1, color: "#171717", fontFamily: "Fraunces, Georgia, serif" }}>
          Start a Petition
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: "15px", color: "#666666" }}>
          Write clearly, add context, and gather civic support faster.
        </p>

        {/* Linked issue banner */}
        {grievanceId && (
          <div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "14px 16px", border: "1px solid #E8E1D5", marginBottom: "16px" }}>
            <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>
              Linked Issue
            </p>
            {issueLoading ? (
              <div style={{ height: "36px", borderRadius: "8px", background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
            ) : (
              <div style={{ borderRadius: "8px", background: "#FAFAF8", padding: "10px 12px", border: "1px solid #E8E1D5" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#555555" }}>
                  {linkedIssue?.title || "Linked grievance"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Owner error */}
        {ownerError && (
          <div style={{ borderRadius: "8px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FCA5A5", marginBottom: "16px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#B91C1C" }}>{ownerError}</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #E8E1D5",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {/* Title */}
          <div>
            <label htmlFor="petition-title" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#555555" }}>
              Title
            </label>
            <input
              id="petition-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fix broken street lights in Model Town"
              style={fieldStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="petition-description" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#555555" }}>
              Description
            </label>
            <textarea
              id="petition-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain why this matters, who is affected, and what change you want to see…"
              style={{ ...fieldStyle, minHeight: "200px", resize: "vertical", lineHeight: 1.65 }}
            />
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#999999" }}>
              Be specific and factual. A clear petition gathers more support.
            </p>
          </div>

          {/* Type indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "8px", background: "#F5F2ED", border: "1px solid #E8E1D5" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999" }}>Type:</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: grievanceId ? "#4A6FA9" : "#555555" }}>
              {grievanceId ? "Linked to a grievance" : "Independent petition"}
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !canEscalateThisIssue}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              borderRadius: "10px",
              padding: "13px",
              fontSize: "15px",
              fontWeight: 700,
              color: "#FFFFFF",
              background: submitting || !canEscalateThisIssue ? "#9CA3AF" : "#4A6FA9",
              border: "none",
              cursor: submitting || !canEscalateThisIssue ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
          >
            {submitting ? (
              <>
                <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                Creating…
              </>
            ) : "Create Petition"}
          </button>
        </form>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
      `}</style>
    </div>
  );
}