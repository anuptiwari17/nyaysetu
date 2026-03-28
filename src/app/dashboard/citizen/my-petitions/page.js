"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CitizenSidebar from "@/components/CitizenSidebar";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function MyPetitionsPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [activeFilter, setActiveFilter] = useState("created");
  const [petitionsLoading, setPetitionsLoading] = useState(true);
  const [petitions, setPetitions] = useState([]);
  const [signingId, setSigningId] = useState("");
  const [manageLoadingId, setManageLoadingId] = useState("");
  const [manageError, setManageError] = useState("");

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "citizen")) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "citizen") return;
    let isActive = true;

    async function fetchPetitions() {
      setPetitionsLoading(true);
      try {
        const endpoint = activeFilter === "created" ? "/api/petitions?createdBy=me" : "/api/petitions?signedBy=me";
        const res = await fetch(endpoint);
        const json = await res.json().catch(() => ({}));
        if (!isActive) return;
        const list = Array.isArray(json?.petitions) ? json.petitions : Array.isArray(json?.data) ? json.data : [];
        setPetitions(list);
      } catch {
        if (!isActive) return;
        setPetitions([]);
      } finally {
        if (!isActive) return;
        setPetitionsLoading(false);
      }
    }

    fetchPetitions();
    return () => { isActive = false; };
  }, [activeFilter, user]);

  const normalizedPetitions = useMemo(() => {
    const userId = String(user?._id || user?.id || "");
    return petitions.map((petition) => {
      const signatures = Array.isArray(petition?.signatures) ? petition.signatures : [];
      const signerEntries = Array.isArray(petition?.signerEntries) ? petition.signerEntries : [];
      const signatureCount = Number.isFinite(Number(petition?.signatureCount))
        ? Number(petition.signatureCount)
        : signerEntries.length > 0 ? signerEntries.length : signatures.length;
      const isSigned =
        signatures.some((s) => String(typeof s === "string" ? s : s?._id || s?.id || "") === userId) ||
        signerEntries.some((e) => String(e?.user || "") === userId);
      const progress = Math.max(0, Math.min(100, Math.round((signatureCount / 100) * 100)));
      return {
        ...petition,
        signatureCount,
        isSigned: petition?.isSigned === true || isSigned,
        progress,
        linkedIssueTitle: petition?.issueTitle || petition?.grievanceTitle || petition?.issueId?.title || null,
      };
    });
  }, [petitions, user?._id, user?.id]);

  async function handleSign(petitionId) {
    if (!user) { router.push("/login"); return; }
    const id = String(petitionId || "");
    if (!id) return;
    setSigningId(id);
    try {
      const res = await fetch(`/api/petitions/${id}/sign`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to sign petition");
      const userId = String(user?._id || user?.id || "");
      setPetitions((prev) =>
        prev.map((item) => {
          if (String(item?._id || item?.id || "") !== id) return item;
          const sigs = Array.isArray(item?.signatures) ? [...item.signatures] : [];
          if (userId && !sigs.some((s) => String(s) === userId)) sigs.push(userId);
          return { ...item, signatures: sigs, signatureCount: Number.isFinite(Number(item?.signatureCount)) ? Number(item.signatureCount) + 1 : sigs.length, isSigned: true };
        })
      );
    } catch { /* silent */ } finally {
      setSigningId("");
    }
  }

  async function handleDeclareVictory(petitionId) {
    const id = String(petitionId || "");
    if (!id || manageLoadingId) return;
    setManageLoadingId(id);
    setManageError("");
    try {
      const res = await fetch(`/api/petitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "declare_victory" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to declare victory");
      setPetitions((prev) =>
        prev.map((item) => String(item?._id || item?.id || "") !== id ? item : { ...item, status: "victory_declared", victoryDeclaredAt: new Date().toISOString() })
      );
    } catch (err) {
      setManageError(err.message || "Unable to declare victory");
    } finally {
      setManageLoadingId("");
    }
  }

  async function handleDeletePetition(petitionId) {
    const id = String(petitionId || "");
    if (!id || manageLoadingId) return;
    if (!window.confirm("Delete this petition permanently?")) return;
    setManageLoadingId(id);
    setManageError("");
    try {
      const res = await fetch(`/api/petitions/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to delete petition");
      setPetitions((prev) => prev.filter((item) => String(item?._id || item?.id || "") !== id));
    } catch (err) {
      setManageError(err.message || "Unable to delete petition");
    } finally {
      setManageLoadingId("");
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

  if (!user || user.role !== "citizen") return null;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      <div style={{ display: "flex", maxWidth: "1380px", margin: "0 auto", paddingTop: "64px" }}>
        <CitizenSidebar user={user} />

        {/* Main content */}
        <section style={{ flex: 1, minWidth: 0, padding: "32px 36px 64px" }}>
          <div style={{ maxWidth: "760px" }}>

            {/* Header */}
            <div style={{ marginBottom: "20px" }}>
              <h1 style={{ margin: 0, fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, lineHeight: 1.1, color: "#171717", fontFamily: "Fraunces, Georgia, serif" }}>
                My Petitions
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#666666" }}>
                Petitions you&#39;ve created or signed.
              </p>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", background: "#F5F2ED", borderRadius: "12px", padding: "4px", width: "fit-content" }}>
              {[{ key: "created", label: "Created by me" }, { key: "signed", label: "Signed by me" }].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  style={{
                    borderRadius: "9px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 0.15s, color 0.15s",
                    background: activeFilter === key ? "#FFFFFF" : "transparent",
                    color: activeFilter === key ? "#171717" : "#666666",
                    boxShadow: activeFilter === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Petition list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {petitionsLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} style={{ height: "160px", borderRadius: "14px", background: "#F5F2ED", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))
              ) : normalizedPetitions.length === 0 ? (
                <div style={{ background: "#FFFFFF", borderRadius: "14px", padding: "40px 24px", textAlign: "center", border: "1px solid #E8E1D5" }}>
                  <p style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#171717" }}>No petitions found</p>
                  <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#666666" }}>Petitions you create or sign will appear here.</p>
                  <Link href="/petition/new" style={{ display: "inline-block", marginTop: "14px", borderRadius: "10px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, background: "#4A6FA9", color: "#FFFFFF", textDecoration: "none" }}>
                    Start a Petition
                  </Link>
                </div>
              ) : (
                normalizedPetitions.map((petition) => {
                  const id = String(petition?._id || petition?.id || "");
                  const isManageLoading = manageLoadingId === id;
                  const isVictory = petition?.status === "victory_declared";

                  return (
                    <article
                      key={id || petition?.title}
                      style={{ background: "#FFFFFF", borderRadius: "14px", padding: "18px 20px", border: "1px solid #E8E1D5" }}
                    >
                      {/* Title row */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                        <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, lineHeight: 1.3, color: "#171717", flex: 1, minWidth: 0 }}>
                          {petition?.title || "Untitled petition"}
                        </h2>
                        <Link
                          href={`/petition/${id}`}
                          style={{ flexShrink: 0, fontSize: "13px", fontWeight: 600, color: "#4A6FA9", textDecoration: "none", whiteSpace: "nowrap" }}
                        >
                          View →
                        </Link>
                      </div>

                      {/* Badges row */}
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                        {activeFilter === "created" && (
                          <span style={{ borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", ...(isVictory ? { background: "#DCFCE7", color: "#16A34A" } : { background: "#FEF3C7", color: "#B45309" }) }}>
                            {isVictory ? "Victory Declared" : "Active"}
                          </span>
                        )}
                        {petition?.linkedIssueTitle && (
                          <span style={{ borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, background: "#EEF2FF", color: "#4A6FA9" }}>
                            {petition.linkedIssueTitle}
                          </span>
                        )}
                        {petition.isSigned && activeFilter === "signed" && (
                          <span style={{ borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, background: "#ECFDF3", color: "#16A34A" }}>
                            ✓ Signed
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                          <span style={{ fontSize: "13px", color: "#666666" }}>{petition.signatureCount} signatures</span>
                          <span style={{ fontSize: "12px", color: "#999999" }}>{petition.progress}% of 100</span>
                        </div>
                        <div style={{ height: "6px", borderRadius: "3px", background: "#F0EDE8", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: "3px", background: "#4A6FA9", width: `${petition.progress}%`, transition: "width 0.3s ease" }} />
                        </div>
                      </div>

                      {/* Action row */}
                      <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                        {/* Sign button (for signed tab or unsigned created petitions) */}
                        {!petition.isSigned && !isVictory && (
                          <button
                            type="button"
                            onClick={() => handleSign(id)}
                            disabled={signingId === id}
                            style={{ borderRadius: "8px", padding: "7px 14px", fontSize: "13px", fontWeight: 600, border: "1.5px solid #4A6FA9", color: "#4A6FA9", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            {signingId === id ? "Signing…" : "Sign"}
                          </button>
                        )}

                        {/* Creator controls */}
                        {activeFilter === "created" && (
                          <>
                            {!isVictory && (
                              <button
                                type="button"
                                onClick={() => handleDeclareVictory(id)}
                                disabled={isManageLoading}
                                style={{ borderRadius: "8px", padding: "7px 14px", fontSize: "13px", fontWeight: 600, background: "#EEF2FF", color: "#4A6FA9", border: "1px solid #C7D2F0", cursor: isManageLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                              >
                                {isManageLoading ? "Saving…" : "Declare Victory"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeletePetition(id)}
                              disabled={isManageLoading}
                              style={{ borderRadius: "8px", padding: "7px 14px", fontSize: "13px", fontWeight: 600, background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", cursor: isManageLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                            >
                              {isManageLoading ? "Deleting…" : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })
              )}

              {manageError && (
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#B91C1C" }}>{manageError}</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
      `}</style>
    </div>
  );
}