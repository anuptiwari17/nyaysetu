"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function PetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

  const petitionId = params?.id;

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [petition, setPetition] = useState(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [signersLoading, setSignersLoading] = useState(false);
  const [signersError, setSignersError] = useState("");
  const [signers, setSigners] = useState([]);

  useEffect(() => {
    if (!petitionId) return;
    let isActive = true;

    async function fetchPetition() {
      setLoading(true);
      try {
        const res = await fetch(`/api/petitions/${petitionId}`);
        const json = await res.json().catch(() => ({}));
        if (!isActive) return;

        const next = json?.petition || json?.data || null;
        setPetition(next);

        const userId = String(user?._id || user?.id || "");
        const fromFlag = next?.hasSigned === true || next?.isSigned === true;
        const fromSigs = Array.isArray(next?.signatures)
          ? next.signatures.some((item) => {
              const id = typeof item === "string" ? item : item?._id || item?.id;
              return String(id || "") === userId;
            })
          : false;
        const fromEntries = Array.isArray(next?.signerEntries)
          ? next.signerEntries.some((e) => String(e?.user || "") === userId)
          : false;
        setHasSigned(Boolean(fromFlag || fromSigs || fromEntries));
      } catch {
        if (!isActive) return;
        setPetition(null);
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    }

    fetchPetition();
    return () => { isActive = false; };
  }, [petitionId, user?._id, user?.id]);

  const signatureCount = useMemo(() => {
    if (!petition) return 0;
    if (Array.isArray(petition?.signerEntries)) return petition.signerEntries.length;
    if (Number.isFinite(Number(petition?.signatureCount))) return Number(petition.signatureCount);
    return Array.isArray(petition?.signatures) ? petition.signatures.length : 0;
  }, [petition]);

  const progressWidth = Math.max(0, Math.min(100, Math.round((signatureCount / 100) * 100)));
  const petitionStatus = String(petition?.status || "active");
  const isClosed = petitionStatus === "victory_declared";
  const petitionCreatorId = String(
    typeof petition?.createdBy === "string"
      ? petition?.createdBy
      : petition?.createdBy?._id || petition?.createdBy?.id || ""
  );
  const currentUserId = String(user?._id || user?.id || "");
  const canManagePetition = Boolean(currentUserId && petitionCreatorId && currentUserId === petitionCreatorId);

  useEffect(() => {
    if (!petitionId || !canManagePetition) { setSigners([]); return; }
    let isActive = true;

    async function fetchSigners() {
      setSignersLoading(true);
      setSignersError("");
      try {
        const res = await fetch(`/api/petitions/${petitionId}/signers`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Unable to fetch signer list");
        if (!isActive) return;
        setSigners(Array.isArray(json?.signers) ? json.signers : []);
      } catch (err) {
        if (!isActive) return;
        setSigners([]);
        setSignersError(err.message || "Unable to fetch signer list");
      } finally {
        if (!isActive) return;
        setSignersLoading(false);
      }
    }

    fetchSigners();
    return () => { isActive = false; };
  }, [petitionId, canManagePetition]);

  async function handleSign() {
    if (!userLoading && !user) { router.push("/login"); return; }
    if (!petitionId || hasSigned || isClosed) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/petitions/${petitionId}/sign`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to sign petition");
      setHasSigned(true);
      setPetition((prev) => prev ? { ...prev, signatureCount: Number(prev.signatureCount || signatureCount) + 1 } : prev);
      if (canManagePetition) {
        setSigners((prev) => {
          if (prev.some((item) => String(item?.id || "") === currentUserId)) return prev;
          return [{ id: currentUserId, name: user?.name || "You", city: user?.city || "N/A", state: user?.state || "N/A", signedAt: new Date().toISOString() }, ...prev];
        });
      }
    } catch {
      if (!user) router.push("/login");
    } finally {
      setSigning(false);
    }
  }

  async function handleDeclareVictory() {
    if (!petitionId || !canManagePetition || isClosed || actionLoading) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/petitions/${petitionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "declare_victory" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to declare victory");
      const updated = json?.petition || json?.data || null;
      if (updated) setPetition(updated);
    } catch (err) {
      setActionError(err.message || "Unable to declare victory");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeletePetition() {
    if (!petitionId || !canManagePetition || actionLoading) return;
    if (!window.confirm("Delete this petition permanently?")) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/petitions/${petitionId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Unable to delete petition");
      router.push("/petition");
    } catch (err) {
      setActionError(err.message || "Unable to delete petition");
      setActionLoading(false);
    }
  }

  function handleExportSigners() {
    if (!Array.isArray(signers) || signers.length === 0) return;
    const header = ["Name", "City", "State", "Signed On"];
    const rows = signers.map((s) => [s?.name || "", s?.city || "", s?.state || "", s?.signedAt ? new Date(s.signedAt).toLocaleString() : ""]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `petition-signers-${petitionId}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#FAFAF8" }}>
        <div style={{ height: "32px", width: "32px", borderRadius: "50%", border: "2px solid #4A6FA9", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!petition) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
        <Navbar />
        <main style={{ maxWidth: "680px", margin: "0 auto", padding: "72px 24px 64px" }}>
          <Link href="/petition" style={{ fontSize: "14px", color: "#4A6FA9", textDecoration: "none" }}>← All Petitions</Link>
          <div style={{ marginTop: "16px", background: "#FFFFFF", borderRadius: "14px", padding: "48px 24px", textAlign: "center", border: "1px solid #E8E1D5" }}>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#171717" }}>Petition not found</p>
          </div>
        </main>
      </div>
    );
  }

  const linkedIssueId =
    (typeof petition?.issueId === "object" ? petition?.issueId?._id || petition?.issueId?.id : petition?.issueId) ||
    petition?.grievanceId || "";
  const linkedIssueTitle =
    (typeof petition?.issueId === "object" ? petition?.issueId?.title : "") ||
    petition?.grievanceTitle || petition?.issueTitle || "";

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "72px 24px 64px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontSize: "13px" }}>
          <Link href={dashboardHref} style={{ color: "#4A6FA9", textDecoration: "none" }}>← Dashboard</Link>
          <span style={{ color: "#D1D5DB" }}>|</span>
          <Link href="/petition" style={{ color: "#4A6FA9", textDecoration: "none" }}>All Petitions</Link>
        </div>

        {/* Main article */}
        <article style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1px solid #E8E1D5" }}>

          {/* Status badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ borderRadius: "20px", padding: "4px 10px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", background: "#EEF2FF", color: "#4A6FA9" }}>
              Petition
            </span>
            <span style={{ borderRadius: "20px", padding: "4px 10px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", ...(isClosed ? { background: "#DCFCE7", color: "#16A34A" } : { background: "#FEF3C7", color: "#B45309" }) }}>
              {isClosed ? "Victory Declared" : "Active"}
            </span>
          </div>

          {/* Title */}
          <h1 style={{ margin: "12px 0 0", fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 700, lineHeight: 1.2, color: "#171717", fontFamily: "Fraunces, Georgia, serif" }}>
            {petition?.title || "Untitled petition"}
          </h1>

          {/* Linked issue */}
          {(linkedIssueId || linkedIssueTitle) && (
            <div style={{ marginTop: "14px" }}>
              <p style={{ margin: "0 0 5px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>Linked Issue</p>
              <div style={{ borderRadius: "8px", background: "#FAFAF8", padding: "10px 12px", border: "1px solid #E8E1D5" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#555555" }}>
                  {linkedIssueTitle || "Linked grievance"}
                </p>
                {linkedIssueId && (
                  <Link href={`/grievances/${linkedIssueId}`} style={{ display: "inline-block", marginTop: "4px", fontSize: "12px", color: "#4A6FA9", textDecoration: "none" }}>
                    View Issue →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <p style={{ margin: "14px 0 0", fontSize: "15px", lineHeight: 1.8, color: "#555555" }}>
            {petition?.description || "No description provided."}
          </p>

          {/* Divider */}
          <div style={{ height: "1px", background: "#F0EDE8", margin: "20px 0" }} />

          {/* Signature progress */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#171717" }}>
                {signatureCount} <span style={{ fontSize: "15px", fontWeight: 500, color: "#999999" }}>of 100 signatures</span>
              </p>
              <span style={{ fontSize: "13px", color: "#999999" }}>{progressWidth}%</span>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: "10px", height: "8px", borderRadius: "4px", background: "#F0EDE8", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "4px", background: "#4A6FA9", width: `${progressWidth}%`, transition: "width 0.3s ease" }} />
            </div>

            {/* Sign button */}
            <button
              type="button"
              onClick={handleSign}
              disabled={hasSigned || signing || isClosed}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                marginTop: "14px",
                borderRadius: "10px",
                padding: "13px",
                fontSize: "15px",
                fontWeight: 700,
                border: "none",
                cursor: hasSigned || isClosed ? "default" : "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s",
                ...(isClosed
                  ? { background: "#F5F2ED", color: "#999999" }
                  : hasSigned
                  ? { background: "#ECFDF3", color: "#16A34A" }
                  : { background: "#4A6FA9", color: "#FFFFFF" }),
              }}
            >
              {signing ? "Signing…" : isClosed ? "Petition closed" : hasSigned ? "✓ You've signed this" : "Sign this Petition"}
            </button>

            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#999999", textAlign: "center" }}>
              {signatureCount} {signatureCount === 1 ? "citizen has" : "citizens have"} signed
            </p>
          </div>

          {/* Creator controls */}
          {canManagePetition && (
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ height: "1px", background: "#F0EDE8" }} />
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>
                Creator Controls
              </p>

              {!isClosed && (
                <button
                  type="button"
                  onClick={handleDeclareVictory}
                  disabled={actionLoading}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "100%", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 600,
                    background: "#EEF2FF", color: "#4A6FA9", border: "1px solid #C7D2F0",
                    cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
                  }}
                >
                  {actionLoading ? "Saving…" : "Declare Victory"}
                </button>
              )}

              <button
                type="button"
                onClick={handleDeletePetition}
                disabled={actionLoading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "100%", borderRadius: "10px", padding: "11px", fontSize: "14px", fontWeight: 600,
                  background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5",
                  cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}
              >
                {actionLoading ? "Please wait…" : "Delete Petition"}
              </button>

              {actionError && (
                <p style={{ margin: 0, fontSize: "13px", color: "#B91C1C" }}>{actionError}</p>
              )}

              {/* Signers list */}
              <div style={{ borderRadius: "12px", padding: "14px", background: "#FAFAF8", border: "1px solid #E8E1D5" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#171717" }}>Signer List</p>
                  <button
                    type="button"
                    onClick={handleExportSigners}
                    disabled={signersLoading || signers.length === 0}
                    style={{
                      borderRadius: "8px", padding: "5px 12px", fontSize: "12px", fontWeight: 600,
                      background: signers.length === 0 ? "#F5F2ED" : "#EEF2FF",
                      color: signers.length === 0 ? "#999999" : "#4A6FA9",
                      border: "1px solid #C7D2F0",
                      cursor: signers.length === 0 ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Export CSV
                  </button>
                </div>

                {signersError && <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#B91C1C" }}>{signersError}</p>}

                <div style={{ maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {signersLoading ? (
                    [1, 2].map((i) => (
                      <div key={i} style={{ height: "56px", borderRadius: "8px", background: "#F5F2ED", animation: "pulse 1.5s ease-in-out infinite" }} />
                    ))
                  ) : signers.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "13px", color: "#999999" }}>No signatures yet.</p>
                  ) : (
                    signers.map((signer) => (
                      <div
                        key={`${signer.id}-${signer.signedAt}`}
                        style={{ borderRadius: "8px", padding: "10px 12px", border: "1px solid #E8E1D5", background: "#FFFFFF" }}
                      >
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#171717" }}>{signer.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#666666" }}>{signer.city}, {signer.state}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#999999" }}>
                          {signer.signedAt ? new Date(signer.signedAt).toLocaleString() : "N/A"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </article>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
      `}</style>
    </div>
  );
}