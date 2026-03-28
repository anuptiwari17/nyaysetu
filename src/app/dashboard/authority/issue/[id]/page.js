"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Clock, MapPin, ThumbsUp, Upload, CheckCircle, AlertCircle, Loader, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Navbar from "@/components/Navbar";
import { assertValidImageFile, uploadImageToFirebase } from "@/lib/firebase/storage";
import { useUser } from "@/lib/useUser";

export default function AuthorityIssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const issueId = params?.id;

  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("in_progress");
  const [resolutionNote, setResolutionNote] = useState("");
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    if (!userLoading && (!user || user.role !== "authority")) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!issueId) return;

    let isActive = true;

    async function fetchIssue() {
      setLoading(true);
      try {
        const response = await fetch(`/api/grievances/${issueId}`);
        const json = await response.json().catch(() => ({}));

        if (!isActive) return;

        const issue = json?.grievance || json?.data || null;
        setGrievance(issue);
        setSelectedStatus(issue?.status || "reported");
      } catch (_error) {
        if (!isActive) return;
        setGrievance(null);
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    }

    fetchIssue();
    return () => { isActive = false; };
  }, [issueId]);

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
    if (grievance.status && grievance.status !== "reported") {
      fallback.push({
        status: grievance.status,
        date: grievance.updatedAt || grievance.createdAt || new Date().toISOString(),
      });
    }
    return fallback;
  }, [grievance]);

  function statusBadgeStyle(status) {
    if (status === "resolved") return { bg: "#DCFCE7", color: "#16A34A" };
    if (status === "in_progress") return { bg: "#DBEAFE", color: "#1D4ED8" };
    return { bg: "#FEF3C7", color: "#B45309" };
  }

  function prettyStatus(status) {
    return String(status || "reported").replace("_", " ");
  }

  function handleProofFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;
    if (!selectedFile) {
      setProofFile(null);
      return;
    }

    try {
      assertValidImageFile(selectedFile, "Proof image");
      setProofFile(selectedFile);
    } catch (fileError) {
      toast.error(fileError.message || "Invalid proof image");
      setProofFile(null);
      event.target.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!issueId || !selectedStatus) return;

    setSubmitLoading(true);
    try {
      let proofUrl = "";
      if (selectedStatus === "resolved" && proofFile) {
        assertValidImageFile(proofFile, "Proof image");
        proofUrl = await uploadImageToFirebase(proofFile, "grievances/resolution-proof");
      }

      const response = await fetch(`/api/grievances/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          resolutionNote,
          proof: proofUrl,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || "Unable to update status");

      toast.success("Status updated successfully", {
        style: { border: "0.5px solid #BBEF63", background: "#DCFCE7", color: "#16A34A" },
      });

      setTimeout(() => { router.push("/dashboard/authority"); }, 600);
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (userLoading || loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#F8F7F4" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid #F5C842", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user || user.role !== "authority") return null;

  const badge = statusBadgeStyle(grievance?.status);
  const reporterName = grievance?.isAnonymous || grievance?.anonymous
    ? "Anonymous citizen"
    : grievance?.createdBy?.name || "Unknown citizen";

  const statusOptions = [
    { key: "in_progress", label: "In Progress", desc: "Actively being worked on", accentColor: "#B45309", tint: "#FEF3C7", icon: <Loader size={15} color="#B45309" /> },
    { key: "resolved", label: "Resolved", desc: "Issue has been fixed", accentColor: "#16A34A", tint: "#DCFCE7", icon: <CheckCircle size={15} color="#16A34A" /> },
    { key: "reported", label: "Reopen / Reported", desc: "Reset to reported state", accentColor: "#6B7280", tint: "#F1F5F9", icon: <AlertCircle size={15} color="#6B7280" /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar />
      <Toaster position="top-center" />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 24px 64px" }}>

        {/* Back link */}
        <Link
          href="/dashboard/authority"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: "#78716C",
            textDecoration: "none",
            padding: "7px 14px",
            borderRadius: 50,
            background: "#FFFFFF",
            border: "1px solid #EDE8DF",
            marginBottom: 24,
          }}
        >
          ← Back to Dashboard
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

          {/* ── Left: Issue detail ── */}
          <section>
            <article style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #EDE8DF", padding: "28px 30px" }}>
              {/* Category + status */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                <span style={{ padding: "4px 12px", borderRadius: 50, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", background: "#EEF2FF", color: "#4A6FA9" }}>
                  {grievance?.category || "General"}
                </span>
                <span style={{ padding: "4px 12px", borderRadius: 50, fontSize: 12, fontWeight: 600, textTransform: "capitalize", background: badge.bg, color: badge.color }}>
                  {prettyStatus(grievance?.status)}
                </span>
              </div>

              {/* Title */}
              <h1 style={{ margin: "0 0 12px", fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, color: "#0D1B2A", lineHeight: 1.2 }}>
                {grievance?.title || "Untitled Issue"}
              </h1>

              {/* Meta */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "#A8A29E", marginBottom: 20 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={14} />
                  {grievance?.location || grievance?.city || "Jalandhar"}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <User size={14} />
                  Reported by {reporterName}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Clock size={14} />
                  {new Date(grievance?.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#4A6FA9", fontWeight: 600 }}>
                  <ThumbsUp size={14} />
                  {grievance?.supportCount || 0} supporters
                </span>
              </div>

              <div style={{ height: 1, background: "#EDE8DF", marginBottom: 20 }} />

              {/* Description */}
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#A8A29E" }}>
                Description
              </p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: "#44403C" }}>
                {grievance?.description || "No description provided."}
              </p>

              {/* Evidence */}
              {Array.isArray(grievance?.evidence) && grievance.evidence.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#A8A29E" }}>
                    Evidence
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {grievance.evidence.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt="Evidence"
                          style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 10, border: "1px solid #EDE8DF", cursor: "pointer" }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal context */}
              {grievance?.legalContext && (
                <div style={{ marginTop: 24 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#A8A29E" }}>
                    Legal Context
                  </p>
                  <div style={{ borderRadius: 12, padding: "14px 16px", background: "#EEF2FF", border: "1px solid #C7D2FE", fontSize: 13, lineHeight: 1.7, color: "#4A6FA9" }}>
                    {grievance.legalContext}
                  </div>
                </div>
              )}

              {/* Status timeline */}
              <div style={{ marginTop: 28 }}>
                <p style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0D1B2A" }}>
                  Status Timeline
                </p>
                <div style={{ position: "relative", paddingLeft: 20 }}>
                  {/* Vertical line */}
                  <div style={{ position: "absolute", left: 5, top: 10, bottom: 10, width: 1, background: "#EDE8DF" }} />

                  {statusHistory.map((entry, index) => {
                    const isLatest = index === statusHistory.length - 1;
                    const sBadge = statusBadgeStyle(entry?.status);
                    return (
                      <div
                        key={`${entry?.status}-${entry?.date}-${index}`}
                        style={{ position: "relative", display: "flex", gap: 14, paddingBottom: index < statusHistory.length - 1 ? 20 : 0 }}
                      >
                        {/* Dot */}
                        <div style={{
                          position: "absolute",
                          left: -18,
                          top: 3,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: isLatest ? "#F5C842" : "#D6D3D1",
                          border: isLatest ? "2px solid #0D1B2A" : "2px solid #E7E5E4",
                          flexShrink: 0,
                        }} />

                        <div>
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, textTransform: "capitalize", background: sBadge.bg, color: sBadge.color, marginBottom: 2 }}>
                            {prettyStatus(entry?.status)}
                          </span>
                          <p style={{ margin: 0, fontSize: 12, color: "#A8A29E" }}>
                            {new Date(entry?.updatedAt || entry?.date || Date.now()).toLocaleString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                          {entry?.note && (
                            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78716C" }}>{entry.note}</p>
                          )}
                          {entry?.status === "resolved" && (entry?.proof || grievance?.resolutionProof) && (
                            <div style={{ marginTop: 8 }}>
                              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#A8A29E" }}>
                                Resolution proof
                              </p>
                              <a
                                href={entry?.proof || grievance?.resolutionProof}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={entry?.proof || grievance?.resolutionProof}
                                  alt="Resolution proof"
                                  style={{
                                    width: 100,
                                    height: 100,
                                    objectFit: "cover",
                                    borderRadius: 10,
                                    border: "1px solid #EDE8DF",
                                    cursor: "pointer",
                                  }}
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          </section>

          {/* ── Right: Update status form ── */}
          <aside>
            <form
              onSubmit={handleSubmit}
              style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #EDE8DF", padding: "24px 22px", position: "sticky", top: 88 }}
            >
              <h2 style={{ margin: "0 0 18px", fontFamily: "Fraunces, Georgia, serif", fontSize: 20, fontWeight: 800, color: "#0D1B2A" }}>
                Update Status
              </h2>

              {/* Status options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {statusOptions.map(({ key, label, desc, accentColor, tint, icon }) => {
                  const isSelected = selectedStatus === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedStatus(key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: `1.5px solid ${isSelected ? accentColor : "#EDE8DF"}`,
                        background: isSelected ? tint : "#FDFCF9",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                        borderLeft: `4px solid ${accentColor}`,
                      }}
                    >
                      {icon}
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0D1B2A" }}>{label}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#A8A29E" }}>{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Resolution note + proof (only when resolved) */}
              {selectedStatus === "resolved" && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label
                      htmlFor="resolution-note"
                      style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#78716C", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}
                    >
                      Resolution Note
                    </label>
                    <textarea
                      id="resolution-note"
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Describe how this issue was resolved..."
                      style={{
                        width: "100%",
                        minHeight: 100,
                        borderRadius: 10,
                        padding: "10px 12px",
                        fontSize: 14,
                        lineHeight: 1.6,
                        border: "1px solid #EDE8DF",
                        background: "#FAFAF8",
                        color: "#0D1B2A",
                        resize: "vertical",
                        boxSizing: "border-box",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#78716C", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      Upload Proof <span style={{ fontWeight: 400, color: "#A8A29E" }}>(optional)</span>
                    </p>
                    <label
                      htmlFor="proof-upload"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        padding: "20px 16px",
                        borderRadius: 10,
                        border: "1.5px dashed #D6D3D1",
                        background: "#FAFAF8",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "border-color 0.15s",
                      }}
                    >
                      <Upload size={18} color="#A8A29E" />
                      <span style={{ fontSize: 13, color: "#78716C", fontWeight: 500 }}>
                        {proofFile ? proofFile.name : "Click to upload image"}
                      </span>
                      {!proofFile && (
                        <span style={{ fontSize: 11, color: "#A8A29E" }}>PNG, JPG, WEBP up to 10MB</span>
                      )}
                      <input
                        id="proof-upload"
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleProofFileChange}
                      />
                    </label>
                  </div>
                </>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 50,
                  border: "none",
                  background: submitLoading ? "#D6D3D1" : "#F5C842",
                  color: submitLoading ? "#FFFFFF" : "#0D1B2A",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: submitLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (!submitLoading) e.currentTarget.style.background = "#EAB800"; }}
                onMouseLeave={(e) => { if (!submitLoading) e.currentTarget.style.background = "#F5C842"; }}
              >
                {submitLoading ? (
                  <>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #FFFFFF", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                    Updating…
                  </>
                ) : "Save Status Update"}
              </button>
            </form>
          </aside>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 340px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}