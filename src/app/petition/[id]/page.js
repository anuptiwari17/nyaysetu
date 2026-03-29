"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, ExternalLink, PenLine, Share2, Trophy, Trash2, X } from "lucide-react";

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
  const [signError, setSignError] = useState("");
  const [signQuota, setSignQuota] = useState(null);
  const [signersLoading, setSignersLoading] = useState(false);
  const [signersError, setSignersError] = useState("");
  const [signers, setSigners] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activePlatform, setActivePlatform] = useState("x");
  const [shareToast, setShareToast] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPageUrl(window.location.href);
  }, []);

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

  const progressWidth = Math.round((signatureCount / 100) * 100);
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
    setSignError("");
    try {
      const res = await fetch(`/api/petitions/${petitionId}/sign`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.signQuota) setSignQuota(json.signQuota);
        throw new Error(json?.message || "Unable to sign petition");
      }
      setHasSigned(true);
      if (json?.signQuota) setSignQuota(json.signQuota);
      setPetition((prev) => prev ? { ...prev, signatureCount: Number(prev.signatureCount || signatureCount) + 1 } : prev);
      if (canManagePetition) {
        setSigners((prev) => {
          if (prev.some((item) => String(item?.id || "") === currentUserId)) return prev;
          return [{ id: currentUserId, name: user?.name || "You", city: user?.city || "N/A", state: user?.state || "N/A", signedAt: new Date().toISOString() }, ...prev];
        });
      }
    } catch (err) {
      if (!user) {
        router.push("/login");
        return;
      }
      setSignError(err?.message || "Unable to sign petition");
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

  function showToast(message) {
    setShareToast(message);
    window.setTimeout(() => {
      setShareToast("");
    }, 1800);
  }

  async function copyToClipboard(value, successMessage) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage);
      return true;
    } catch {
      showToast("Could not copy. Try again.");
      return false;
    }
  }

  function formatShareText(platform, url, title, locationLabel, count) {
    const safeTitle = title || "Support this public petition";
    const place = locationLabel ? ` in ${locationLabel}` : "";

    if (platform === "x") {
      return `${safeTitle}${place}. ${count} supporters so far. Join and sign: ${url} #NyaySetu #CivicAction`;
    }

    if (platform === "whatsapp") {
      return `Hi, please support this petition: ${safeTitle}${place}. Already ${count} people signed. Sign here: ${url}`;
    }

    if (platform === "linkedin") {
      return `Civic participation matters. ${safeTitle}${place} already has ${count} supporters. Please review and support: ${url}`;
    }

    return `Raise your voice for change. ${safeTitle}${place}. ${count} supporters and growing. Link in bio/story: ${url} #petition #community`;
  }

  function buildShareUrl(platform, text, url) {
    if (platform === "x") {
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    }

    if (platform === "whatsapp") {
      return `https://wa.me/?text=${encodeURIComponent(text)}`;
    }

    if (platform === "linkedin") {
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    }

    return "https://www.instagram.com/";
  }

  function downloadShareVisual(title, locationLabel, count, url) {
    const safeTitle = String(title || "Support this Petition").slice(0, 140);
    const safeLocation = String(locationLabel || "Public Civic Action").slice(0, 70);
    const safeUrl = String(url || "").slice(0, 120);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1D4ED8" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)" />
  <text x="80" y="150" fill="#BFDBFE" font-family="Arial, sans-serif" font-size="34" font-weight="700">NYAYSETU PETITION</text>
  <text x="80" y="255" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="62" font-weight="700">${safeTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
  <text x="80" y="360" fill="#DBEAFE" font-family="Arial, sans-serif" font-size="34">${safeLocation.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
  <rect x="80" y="430" width="920" height="2" fill="#60A5FA" opacity="0.4" />
  <text x="80" y="520" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="110" font-weight="700">${count}</text>
  <text x="80" y="580" fill="#DBEAFE" font-family="Arial, sans-serif" font-size="36">supporters already signed</text>
  <text x="80" y="740" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="42" font-weight="700">Sign and share this petition</text>
  <rect x="80" y="790" width="920" height="120" rx="20" fill="#1E3A8A" opacity="0.85" />
  <text x="100" y="865" fill="#BFDBFE" font-family="Arial, sans-serif" font-size="30">${safeUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
</svg>`;

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.setAttribute("download", `petition-share-${petitionId}.svg`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    showToast("Visual downloaded");
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#F8F7F4" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid #F5C842", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not found ──
  if (!petition) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "'DM Sans', sans-serif" }}>
        <Navbar />
        <main style={{ maxWidth: 680, margin: "0 auto", padding: "88px 24px 64px" }}>
          <Link href="/petition" style={{ fontSize: 13, fontWeight: 600, color: "#78716C", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 50, background: "#FFFFFF", border: "1px solid #EDE8DF" }}>
            ← All Petitions
          </Link>
          <div style={{ marginTop: 20, background: "#FFFFFF", borderRadius: 16, padding: "48px 24px", textAlign: "center", border: "1px solid #EDE8DF" }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0D1B2A" }}>Petition not found</p>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#A8A29E" }}>This petition may have been removed or the link is incorrect.</p>
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
  const tags = Array.isArray(petition?.tags) ? petition.tags : [];
  const currentPageUrl = pageUrl || `https://nyaysetu.app/petition/${petitionId}`;
  const locationLabel = [petition?.city, petition?.location].filter(Boolean).join(", ");
  const sharePlatforms = [
    { key: "x", label: "X" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "instagram", label: "Instagram" },
  ];
  const activeShareText = formatShareText(activePlatform, currentPageUrl, petition?.title, locationLabel, signatureCount);
  const activeShareUrl = buildShareUrl(activePlatform, activeShareText, currentPageUrl);

  async function handleShareNow() {
    if (activePlatform === "instagram" && navigator.share) {
      try {
        await navigator.share({ title: petition?.title || "Petition", text: activeShareText, url: currentPageUrl });
        showToast("Shared via app sheet");
      } catch {
        // ignore cancellation
      }
      return;
    }

    if (activePlatform === "instagram") {
      await copyToClipboard(activeShareText, "Caption copied for Instagram");
    }

    window.open(activeShareUrl, "_blank", "noopener,noreferrer");
  }

  async function handleCopyText() {
    await copyToClipboard(activeShareText, "Share text copied");
  }

  async function handleCopyLink() {
    await copyToClipboard(currentPageUrl, "Petition link copied");
  }

  function handleDownloadVisual() {
    downloadShareVisual(petition?.title, locationLabel, signatureCount, currentPageUrl);
  }

  const hasReachedSignLimit = Number(signQuota?.remainingToday) === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: 740, margin: "0 auto", padding: "88px 24px 64px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, fontSize: 13, fontWeight: 600 }}>
          <Link href={dashboardHref} style={{ color: "#78716C", textDecoration: "none", padding: "6px 13px", borderRadius: 50, background: "#FFFFFF", border: "1px solid #EDE8DF" }}>
            ← Dashboard
          </Link>
          <span style={{ color: "#D6D3D1" }}>/</span>
          <Link href="/petition" style={{ color: "#78716C", textDecoration: "none", padding: "6px 13px", borderRadius: 50, background: "#FFFFFF", border: "1px solid #EDE8DF" }}>
            All Petitions
          </Link>
        </div>

        {/* ── Main card ── */}
        <article style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #EDE8DF", padding: "28px 28px 24px", marginBottom: 16 }}>

          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{ padding: "3px 11px", borderRadius: 50, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", background: "#EEF2FF", color: "#4A6FA9", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <PenLine size={11} />
              Petition
            </span>
            <span style={{
              padding: "3px 11px", borderRadius: 50, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.07em",
              ...(isClosed
                ? { background: "#DCFCE7", color: "#16A34A" }
                : { background: "#FEF3C7", color: "#B45309" }),
            }}>
              {isClosed ? "Victory Declared" : "Active"}
            </span>
          </div>

          {/* Title */}
          <h1 style={{ margin: "0 0 16px", fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, lineHeight: 1.18, color: "#0D1B2A" }}>
            {petition?.title || "Untitled petition"}
          </h1>

          {petition?.thumbnailUrl && (
            <div style={{ marginBottom: 16, borderRadius: 14, overflow: "hidden", border: "1px solid #EDE8DF", background: "#F8FAFC" }}>
              <img
                src={petition.thumbnailUrl}
                alt={petition?.title || "Petition thumbnail"}
                style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
              />
            </div>
          )}

          {(tags.length > 0 || petition?.city || petition?.location) && (
            <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tags.map((tag) => (
                    <span
                      key={`${petitionId}-${tag}`}
                      style={{
                        borderRadius: "999px",
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "#EEF2FF",
                        color: "#4A6FA9",
                        border: "1px solid #D5DEFA",
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {(petition?.city || petition?.location) && (
                <p style={{ margin: 0, fontSize: 13, color: "#78716C" }}>
                  {[petition?.city, petition?.location].filter(Boolean).join(" | ")}
                </p>
              )}
            </div>
          )}

          {/* Linked issue */}
          {(linkedIssueId || linkedIssueTitle) && (
            <div style={{ marginBottom: 18, borderRadius: 12, background: "#FAFAF8", padding: "12px 14px", border: "1px solid #EDE8DF" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#A8A29E" }}>
                Linked Issue
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "#44403C", fontWeight: 500 }}>
                {linkedIssueTitle || "Linked grievance"}
              </p>
              {linkedIssueId && (
                <Link href={`/grievances/${linkedIssueId}`} style={{ display: "inline-block", marginTop: 4, fontSize: 12, fontWeight: 600, color: "#4A6FA9", textDecoration: "none" }}>
                  View Issue →
                </Link>
              )}
            </div>
          )}

          {/* Description */}
          <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.8, color: "#57534E" }}>
            {petition?.description || "No description provided."}
          </p>

          <div style={{ height: 1, background: "#EDE8DF", marginBottom: 22 }} />

          {/* ── Signature block ── */}
          <div>
            {/* Count */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 26, fontWeight: 800, color: "#0D1B2A" }}>
                {signatureCount}
                <span style={{ fontSize: 15, fontWeight: 500, color: "#A8A29E", marginLeft: 6 }}>supporters</span>
              </p>
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, borderRadius: 4, background: "#EDE8DF", overflow: "visible", marginBottom: 14 }}>
              <div style={{
                height: "100%",
                borderRadius: 4,
                background: "#4A6FA9",
                width: `${Math.min(progressWidth, 100)}%`,
                transition: "width 0.4s ease",
              }} />
              {progressWidth > 100 && (
                <div style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", marginTop: 4 }}>Goal exceeded! {signatureCount}+ supporters</div>
              )}
            </div>

            {/* Sign button */}
            <button
              type="button"
              onClick={handleSign}
              disabled={hasSigned || signing || isClosed || hasReachedSignLimit}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "13px 0",
                borderRadius: 50,
                fontSize: 15,
                fontWeight: 700,
                border: "none",
                cursor: hasSigned || isClosed || hasReachedSignLimit ? "default" : "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s, transform 0.1s",
                ...(isClosed
                  ? { background: "#F1F5F9", color: "#A8A29E" }
                  : hasReachedSignLimit
                    ? { background: "#F8FAFC", color: "#94A3B8" }
                    : hasSigned
                    ? { background: "#DCFCE7", color: "#16A34A" }
                    : { background: "#F5C842", color: "#0D1B2A" }),
              }}
              onMouseEnter={(e) => { if (!hasSigned && !isClosed && !hasReachedSignLimit) e.currentTarget.style.background = "#EAB800"; }}
              onMouseLeave={(e) => { if (!hasSigned && !isClosed && !hasReachedSignLimit) e.currentTarget.style.background = "#F5C842"; }}
            >
              {signing ? "Signing…" : isClosed ? "Petition closed" : hasReachedSignLimit ? "Daily sign limit reached" : hasSigned ? "✓ Signed" : "Sign this Petition"}
            </button>

            <div style={{ marginTop: 10, borderRadius: 10, border: "1px solid #E2E8F0", background: "#F8FAFC", padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#64748B" }}>
                Signing quota
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>
                You can sign up to 5 petitions per day.
                {signQuota
                  ? ` Today: ${Number(signQuota?.petitionsSignedTodayCount || 0)}/${Number(signQuota?.dailyLimit || 5)} · Remaining: ${Math.max(0, Number(signQuota?.remainingToday || 0))}`
                  : ""}
              </p>
            </div>

            {signError && (
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#B91C1C" }}>
                {signError}
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "11px 0",
                borderRadius: 50,
                fontSize: 14,
                fontWeight: 700,
                border: "1px solid #C7D2F0",
                cursor: "pointer",
                fontFamily: "inherit",
                background: "#EEF2FF",
                color: "#1E3A8A",
              }}
            >
              <Share2 size={15} />
              Share Petition
            </button>

            <p style={{ margin: "9px 0 0", fontSize: 13, color: "#A8A29E", textAlign: "center" }}>
              {signatureCount} {signatureCount === 1 ? "person has" : "people have"} signed this petition
            </p>
          </div>
        </article>

        {showShareModal && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 60,
              padding: "20px",
            }}
            onClick={() => setShowShareModal(false)}
          >
            <div
              style={{
                width: "min(760px, 100%)",
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#FFFFFF",
                borderRadius: 16,
                border: "1px solid #EDE8DF",
                padding: "18px",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0D1B2A" }}>Share Petition</p>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: "#78716C" }}>Choose platform and share in one click.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  style={{
                    border: "1px solid #E5E7EB",
                    background: "#FFFFFF",
                    color: "#64748B",
                    borderRadius: 999,
                    width: 34,
                    height: 34,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {sharePlatforms.map((platform) => (
                  <button
                    key={platform.key}
                    type="button"
                    onClick={() => setActivePlatform(platform.key)}
                    style={{
                      borderRadius: 999,
                      border: activePlatform === platform.key ? "none" : "1px solid #E5E7EB",
                      background: activePlatform === platform.key ? "#1D4ED8" : "#FFFFFF",
                      color: activePlatform === platform.key ? "#FFFFFF" : "#334155",
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {platform.label}
                  </button>
                ))}
              </div>

              <div style={{ border: "1px solid #EDE8DF", borderRadius: 12, padding: 14, background: "#F8FAFC", marginBottom: 14 }}>
                <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748B" }}>
                  Live Preview
                </p>
                <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, color: "#0F172A" }}>
                  {activeShareText}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleShareNow}
                  style={{ borderRadius: 10, border: "none", background: "#1D4ED8", color: "#FFFFFF", padding: "11px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 7 }}
                >
                  <ExternalLink size={15} />
                  Share Now
                </button>
                <button
                  type="button"
                  onClick={handleCopyText}
                  style={{ borderRadius: 10, border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", padding: "11px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 7 }}
                >
                  <Copy size={15} />
                  Copy Text
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{ borderRadius: 10, border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", padding: "11px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 7 }}
                >
                  <Copy size={15} />
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={handleDownloadVisual}
                  style={{ borderRadius: 10, border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", padding: "11px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 7 }}
                >
                  <Download size={15} />
                  Download Visual
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Creator controls ── */}
        {canManagePetition && (
          <section style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #EDE8DF", padding: "22px 24px" }}>
            <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A8A29E" }}>
              Creator Controls
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Declare victory */}
              {!isClosed && (
                <button
                  type="button"
                  onClick={handleDeclareVictory}
                  disabled={actionLoading}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "11px 0", borderRadius: 50,
                    fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                    background: "#DCFCE7", color: "#16A34A",
                    border: "1px solid #BBF7D0",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <Trophy size={15} />
                  {actionLoading ? "Saving…" : "Declare Victory"}
                </button>
              )}

              {/* Delete */}
              <button
                type="button"
                onClick={handleDeletePetition}
                disabled={actionLoading}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", padding: "11px 0", borderRadius: 50,
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  background: "#FEE2E2", color: "#B91C1C",
                  border: "1px solid #FCA5A5",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                <Trash2 size={15} />
                {actionLoading ? "Please wait…" : "Delete Petition"}
              </button>

              {actionError && (
                <p style={{ margin: 0, fontSize: 13, color: "#B91C1C" }}>{actionError}</p>
              )}
            </div>

            {/* Signers list */}
            <div style={{ marginTop: 20, borderRadius: 14, background: "#FAFAF8", border: "1px solid #EDE8DF", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0D1B2A" }}>
                  Signer List
                  {signers.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "#A8A29E" }}>({signers.length})</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleExportSigners}
                  disabled={signersLoading || signers.length === 0}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 13px", borderRadius: 50, fontSize: 12, fontWeight: 700,
                    background: signers.length === 0 ? "#F1F5F9" : "#EEF2FF",
                    color: signers.length === 0 ? "#A8A29E" : "#4A6FA9",
                    border: "1px solid",
                    borderColor: signers.length === 0 ? "#EDE8DF" : "#C7D2F0",
                    cursor: signers.length === 0 ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <Download size={12} />
                  Export CSV
                </button>
              </div>

              {signersError && (
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#B91C1C" }}>{signersError}</p>
              )}

              <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {signersLoading ? (
                  [1, 2].map((i) => (
                    <div key={i} style={{ height: 60, borderRadius: 10, background: "#EDE8DF", animation: "pulse 1.4s ease-in-out infinite" }} />
                  ))
                ) : signers.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: "#A8A29E" }}>No signatures yet.</p>
                ) : (
                  signers.map((signer) => (
                    <div
                      key={`${signer.id}-${signer.signedAt}`}
                      style={{ borderRadius: 10, padding: "10px 13px", border: "1px solid #EDE8DF", background: "#FFFFFF" }}
                    >
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0D1B2A" }}>{signer.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#78716C" }}>{signer.city}, {signer.state}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#A8A29E" }}>
                        {signer.signedAt ? new Date(signer.signedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {shareToast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0F172A",
            color: "#FFFFFF",
            padding: "9px 14px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 70,
          }}
        >
          {shareToast}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}