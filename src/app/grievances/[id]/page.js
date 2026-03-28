"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Building2, Calendar, MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function GrievanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const grievanceId = params?.id;

  const [loading, setLoading] = useState(true);
  const [grievance, setGrievance] = useState(null);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [citeSearch, setCiteSearch] = useState("");
  const [citeLoading, setCiteLoading] = useState(false);
  const [citeSubmittingId, setCiteSubmittingId] = useState("");
  const [citeError, setCiteError] = useState("");
  const [citeCandidates, setCiteCandidates] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!grievanceId) return;
    let isActive = true;

    async function fetchGrievance() {
      setLoading(true);
      try {
        const res = await fetch(`/api/grievances/${grievanceId}`);
        const json = await res.json().catch(() => ({}));
        if (!isActive) return;
        setGrievance(json?.grievance || json?.data || null);
      } catch {
        if (!isActive) return;
        setGrievance(null);
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    }

    fetchGrievance();
    return () => { isActive = false; };
  }, [grievanceId]);

  const statusHistory = useMemo(() => {
    if (!grievance) return [];
    if (Array.isArray(grievance.statusHistory) && grievance.statusHistory.length > 0) {
      return [...grievance.statusHistory].sort(
        (a, b) =>
          new Date(a?.updatedAt || a?.date || 0).getTime() -
          new Date(b?.updatedAt || b?.date || 0).getTime()
      );
    }
    const fallback = [{ status: "reported", date: grievance.createdAt || new Date().toISOString() }];
    if (grievance?.status && grievance.status !== "reported") {
      fallback.push({
        status: grievance.status,
        date: grievance.updatedAt || grievance.createdAt || new Date().toISOString(),
        proof: grievance.resolutionProof || grievance.proof || "",
      });
    }
    return fallback;
  }, [grievance]);

  const grievanceCreatorId = String(
    typeof grievance?.createdBy === "string"
      ? grievance?.createdBy
      : grievance?.createdBy?._id || grievance?.createdBy?.id || ""
  );
  const currentUserId = String(user?._id || user?.id || "");
  const canCitePetition = Boolean(currentUserId && grievanceCreatorId && currentUserId === grievanceCreatorId);
  const canEscalatePetition = canCitePetition;
  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

  function statusStyle(status) {
    if (status === "resolved") return { background: "#DCFCE7", color: "#16A34A" };
    if (status === "in_progress") return { background: "#EEF2FF", color: "#4A6FA9" };
    return { background: "#FEF3C7", color: "#B45309" };
  }

  function prettyStatus(s) {
    return String(s || "reported").replace("_", " ");
  }

  async function handleDeleteGrievance() {
    if (!grievanceId || deleteLoading) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/grievances/${grievanceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete grievance");
      router.push("/dashboard/citizen/my-issues");
    } catch { /* silent */ } finally {
      setDeleteLoading(false);
    }
  }

  async function fetchCiteCandidates(queryText = "") {
    setCiteLoading(true);
    setCiteError("");
    try {
      const p = new URLSearchParams();
      p.set("limit", "20");
      p.set("unlinked", "true");
      p.set("createdBy", "me");
      const q = String(queryText || "").trim();
      if (q) p.set("q", q);
      const res = await fetch(`/api/petitions?${p.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to load petitions");
      const list = Array.isArray(json?.petitions) ? json.petitions : Array.isArray(json?.data) ? json.data : [];
      setCiteCandidates(list);
    } catch (err) {
      setCiteError(err.message || "Unable to load petitions");
      setCiteCandidates([]);
    } finally {
      setCiteLoading(false);
    }
  }

  async function handleCitePetition(petitionId) {
    if (!userLoading && !user) { router.push("/login"); return; }
    if (!grievanceId || !petitionId) return;
    setCiteSubmittingId(String(petitionId));
    setCiteError("");
    try {
      const res = await fetch(`/api/grievances/${grievanceId}/cite-petition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petitionId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to cite petition");
      const updated = json?.grievance || json?.data || null;
      if (updated) setGrievance(updated);
      setShowCiteModal(false);
      setCiteSearch("");
      setCiteCandidates([]);
    } catch (err) {
      setCiteError(err.message || "Unable to cite petition");
    } finally {
      setCiteSubmittingId("");
    }
  }

  /* ── shared styles ── */
  const cardStyle = {
    background: "#FFFFFF",
    borderRadius: "14px",
    padding: "24px",
    border: "1px solid #E8E1D5",
  };

  const btnOutlineStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 600,
    border: "1.5px solid #4A6FA9",
    color: "#4A6FA9",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    textDecoration: "none",
    marginTop: "10px",
  };

  const btnDisabledStyle = {
    ...btnOutlineStyle,
    border: "1px solid #E8E1D5",
    color: "#999999",
    cursor: "not-allowed",
    background: "#F5F2ED",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#FAFAF8" }}>
        <div style={{ height: "32px", width: "32px", borderRadius: "50%", border: "2px solid #4A6FA9", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!grievance) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
        <Navbar />
        <main style={{ maxWidth: "900px", margin: "0 auto", padding: "88px 24px 64px" }}>
          <Link href="/grievances" style={{ fontSize: "14px", color: "#4A6FA9", textDecoration: "none" }}>← All Issues</Link>
          <div style={{ marginTop: "16px", ...cardStyle, textAlign: "center", padding: "48px" }}>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#171717" }}>Issue not found</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "88px 32px 64px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontSize: "13px" }}>
          <Link href={dashboardHref} style={{ color: "#4A6FA9", textDecoration: "none" }}>← Dashboard</Link>
          <span style={{ color: "#D1D5DB" }}>|</span>
          <Link href="/grievances" style={{ color: "#4A6FA9", textDecoration: "none" }}>My Grievances</Link>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "20px", alignItems: "start" }}>

          {/* ── Left: main content ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>

            {/* Main card */}
            <article style={cardStyle}>
              {/* Badges */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ borderRadius: "20px", padding: "4px 10px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", background: "#EEF2FF", color: "#4A6FA9" }}>
                  {grievance?.category || "General"}
                </span>
                <span style={{ borderRadius: "20px", padding: "4px 10px", fontSize: "11px", fontWeight: 600, ...statusStyle(grievance?.status) }}>
                  {prettyStatus(grievance?.status)}
                </span>
              </div>

              {/* Title */}
              <h1 style={{ margin: "14px 0 0", fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 700, lineHeight: 1.25, color: "#171717", fontFamily: "Fraunces, Georgia, serif" }}>
                {grievance?.title || "Untitled issue"}
              </h1>

              {/* Meta row */}
              <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "13px", color: "#666666" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <MapPin size={13} />{grievance?.location || grievance?.city || "Jalandhar"}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <Calendar size={13} />{new Date(grievance?.createdAt || Date.now()).toLocaleDateString()}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <Building2 size={13} />{grievance?.assignedAuthority?.name || grievance?.authorityName || "Not assigned"}
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "#F0EDE8", margin: "18px 0" }} />

              {/* Description */}
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>Description</p>
              <p style={{ margin: "8px 0 0", fontSize: "15px", lineHeight: 1.8, color: "#555555" }}>
                {grievance?.description || "No description available."}
              </p>

              {/* Evidence */}
              {Array.isArray(grievance?.evidence) && grievance.evidence.length > 0 && (
                <div style={{ marginTop: "18px" }}>
                  <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>Evidence</p>
                  <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {grievance.evidence.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="Evidence" style={{ height: "88px", width: "120px", borderRadius: "8px", objectFit: "cover", border: "1px solid #E8E1D5" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal context */}
              {grievance?.legalContext && (
                <div style={{ marginTop: "18px", borderRadius: "10px", padding: "14px 16px", background: "#EEF2FF", border: "1px solid #C7D2F0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#4A6FA9" }}>
                    <Sparkles size={13} />AI Legal Context
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: "13px", lineHeight: 1.7, color: "#555555" }}>
                    {grievance.legalContext}
                  </p>
                </div>
              )}
            </article>

            {/* Status History */}
            <section>
              <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 700, color: "#171717" }}>Status History</h2>
              <div style={cardStyle}>
                {statusHistory.map((entry, i) => {
                  const isLatest = i === statusHistory.length - 1;
                  return (
                    <div key={`${entry?.status}-${entry?.date}-${i}`} style={{ display: "flex", gap: "14px", paddingBottom: i < statusHistory.length - 1 ? "18px" : "0" }}>
                      {/* Timeline dot */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <span style={{ display: "block", width: "10px", height: "10px", borderRadius: "50%", background: isLatest ? "#4A6FA9" : "#D4D4D8", flexShrink: 0 }} />
                        {i < statusHistory.length - 1 && (
                          <span style={{ display: "block", width: "1px", flex: 1, minHeight: "20px", background: "#E8E1D5", marginTop: "4px" }} />
                        )}
                      </div>

                      <div>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#171717", textTransform: "capitalize" }}>
                          {prettyStatus(entry?.status)}
                        </p>
                        <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#999999" }}>
                          {new Date(entry?.updatedAt || entry?.date || Date.now()).toLocaleString()}
                        </p>
                        {entry?.status === "resolved" && (entry?.proof || grievance?.resolutionProof) && (
                          <div style={{ marginTop: "8px" }}>
                            <p style={{ margin: 0, fontSize: "11px", color: "#666666" }}>Resolution proof</p>
                            <img src={entry?.proof || grievance?.resolutionProof} alt="Resolution proof" style={{ marginTop: "4px", height: "80px", width: "110px", borderRadius: "8px", objectFit: "cover", border: "1px solid #E8E1D5" }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ── Right: sidebar ── */}
          <aside style={{ position: "sticky", top: "80px" }}>
            <div style={cardStyle}>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#171717" }}>Private Grievance</p>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666666" }}>Visible only to owner and assigned authority.</p>

              <div style={{ height: "1px", background: "#F0EDE8", margin: "14px 0" }} />

              <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>Assigned to</p>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#555555" }}>
                {grievance?.assignedAuthority?.name || grievance?.authorityName || "Not assigned"}
              </p>

              {/* Linked petition badge */}
              {grievance?.petitionId && (
                <div style={{ marginTop: "14px", borderRadius: "8px", padding: "10px 12px", background: "#EEF2FF", border: "1px solid #C7D2F0" }}>
                  <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4A6FA9" }}>Linked Petition</p>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#555555" }}>
                    {grievance?.petitionId?.title || "Cited petition"}
                  </p>
                  <Link
                    href={`/petition/${grievance?.petitionId?._id || grievance?.petitionId?.id || grievance?.petitionId}`}
                    style={{ display: "inline-block", marginTop: "4px", fontSize: "12px", color: "#4A6FA9", textDecoration: "none" }}
                  >
                    View petition →
                  </Link>
                </div>
              )}

              {/* Cite petition */}
              {grievance?.status !== "resolved" && !grievance?.petitionId && (
                <button
                  type="button"
                  onClick={() => { setShowCiteModal(true); fetchCiteCandidates(citeSearch); }}
                  disabled={!canCitePetition}
                  style={canCitePetition ? btnOutlineStyle : btnDisabledStyle}
                >
                  Cite Existing Petition
                </button>
              )}

              {/* Escalate */}
              {grievance?.status !== "resolved" && (
                <button
                  type="button"
                  onClick={() => router.push(`/petition/new?grievanceId=${grievanceId}`)}
                  disabled={!canEscalatePetition}
                  style={canEscalatePetition ? btnOutlineStyle : btnDisabledStyle}
                >
                  Escalate to Petition
                </button>
              )}

              {!canCitePetition && (
                <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#999999" }}>
                  Only the grievance creator can cite or escalate.
                </p>
              )}

              {/* Delete */}
              {canEscalatePetition && (
                <button
                  type="button"
                  onClick={handleDeleteGrievance}
                  disabled={deleteLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #FCA5A5",
                    background: "#FEE2E2",
                    color: "#B91C1C",
                    cursor: deleteLoading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    marginTop: "10px",
                  }}
                >
                  {deleteLoading ? "Deleting…" : "Delete Grievance"}
                </button>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* ── Cite petition modal ── */}
      {showCiteModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 70,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.35)", padding: "16px",
          }}
        >
          <div style={{ width: "100%", maxWidth: "640px", background: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1px solid #E8E1D5" }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "6px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#171717" }}>Cite a Petition</h3>
              <button
                type="button"
                onClick={() => setShowCiteModal(false)}
                style={{ borderRadius: "8px", padding: "5px 12px", fontSize: "13px", fontWeight: 600, background: "#F5F2ED", color: "#666666", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Close
              </button>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#666666" }}>
              Search among petitions you&#39;ve created and attach one to this grievance.
            </p>

            {/* Search */}
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={citeSearch}
                onChange={(e) => setCiteSearch(e.target.value)}
                placeholder="Search by title…"
                style={{ flex: 1, borderRadius: "8px", padding: "9px 12px", fontSize: "14px", border: "1px solid #E8E1D5", background: "#F5F2ED", color: "#171717", outline: "none", fontFamily: "inherit" }}
              />
              <button
                type="button"
                onClick={() => fetchCiteCandidates(citeSearch)}
                style={{ borderRadius: "8px", padding: "9px 16px", fontSize: "13px", fontWeight: 600, background: "#4A6FA9", color: "#FFFFFF", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Search
              </button>
            </div>

            {citeError && <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#B91C1C" }}>{citeError}</p>}

            {/* Results */}
            <div style={{ marginTop: "12px", maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {citeLoading ? (
                [1, 2].map((i) => (
                  <div key={i} style={{ height: "80px", borderRadius: "8px", background: "#F5F2ED", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))
              ) : citeCandidates.length === 0 ? (
                <div style={{ borderRadius: "8px", padding: "24px", textAlign: "center", background: "#FAFAF8", border: "1px solid #E8E1D5" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#666666" }}>No unlinked petitions found.</p>
                </div>
              ) : (
                citeCandidates.map((petition) => {
                  const pid = String(petition?._id || petition?.id || "");
                  return (
                    <article key={pid} style={{ borderRadius: "8px", padding: "12px 14px", border: "1px solid #E8E1D5", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#171717" }}>
                          {petition?.title || "Untitled petition"}
                        </p>
                        <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#666666" }}>
                          {String(petition?.description || "").slice(0, 100)}{String(petition?.description || "").length > 100 ? "…" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={citeSubmittingId === pid}
                        onClick={() => handleCitePetition(pid)}
                        style={{ flexShrink: 0, borderRadius: "8px", padding: "7px 14px", fontSize: "12px", fontWeight: 600, background: "#4A6FA9", color: "#FFFFFF", border: "none", cursor: citeSubmittingId === pid ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                      >
                        {citeSubmittingId === pid ? "Citing…" : "Cite"}
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
        @media (max-width: 768px) {
          main > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          aside[style*="sticky"] {
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}