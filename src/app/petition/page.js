"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function PetitionsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [petitions, setPetitions] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

  useEffect(() => {
    let isActive = true;

    async function fetchPetitions() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "100");
        const q = search.trim();
        if (q) params.set("q", q);

        const res = await fetch(`/api/petitions?${params.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (!isActive) return;

        const list = Array.isArray(json?.petitions)
          ? json.petitions
          : Array.isArray(json?.data)
          ? json.data
          : [];
        setPetitions(list);
      } catch {
        if (!isActive) return;
        setPetitions([]);
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    }

    fetchPetitions();
    return () => { isActive = false; };
  }, [search]);

  const visiblePetitions = useMemo(() => {
    if (filter === "linked") return petitions.filter((p) => Boolean(p?.issueId));
    if (filter === "independent") return petitions.filter((p) => !p?.issueId);
    return petitions;
  }, [petitions, filter]);

  function sigCount(petition) {
    if (Array.isArray(petition?.signerEntries)) return petition.signerEntries.length;
    if (Number.isFinite(Number(petition?.signatureCount))) return Number(petition.signatureCount);
    return Array.isArray(petition?.signatures) ? petition.signatures.length : 0;
  }

  const FILTERS = [
    { value: "all", label: "All Petitions" },
    { value: "linked", label: "Linked to Grievance" },
    { value: "independent", label: "Independent" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "88px 32px 64px" }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 700, lineHeight: 1.1, color: "#171717", fontFamily: "Fraunces, Georgia, serif" }}>
              Public Petitions
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: "15px", color: "#666666" }}>
              Browse, sign, and track civic petitions.
            </p>
          </div>
          {user && (
            <Link
              href={dashboardHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "10px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                border: "1.5px solid #4A6FA9",
                color: "#4A6FA9",
                background: "transparent",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              ← Dashboard
            </Link>
          )}
        </div>

        {/* ── Search + filter bar ── */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            padding: "16px",
            border: "1px solid #E8E1D5",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <input
              type="text"
              placeholder="Search petitions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: "1",
                minWidth: "200px",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "14px",
                border: "1px solid #E8E1D5",
                background: "#F5F2ED",
                color: "#171717",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                width: "210px",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "14px",
                border: "1px solid #E8E1D5",
                background: "#F5F2ED",
                color: "#171717",
                outline: "none",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <Link
              href="/petition/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "10px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 600,
                background: "#4A6FA9",
                color: "#FFFFFF",
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "background 0.15s",
              }}
            >
              + Start Petition
            </Link>
          </div>

          {/* Filter pills */}
          <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                style={{
                  borderRadius: "20px",
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: filter === f.value ? "none" : "1px solid #E8E1D5",
                  background: filter === f.value ? "#4A6FA9" : "#FFFFFF",
                  color: filter === f.value ? "#FFFFFF" : "#666666",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Petition grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "16px",
          }}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{ height: "210px", borderRadius: "14px", background: "#F5F2ED", animation: "pulse 1.5s ease-in-out infinite" }}
              />
            ))
          ) : visiblePetitions.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                background: "#FFFFFF",
                borderRadius: "14px",
                padding: "48px 24px",
                textAlign: "center",
                border: "1px solid #E8E1D5",
              }}
            >
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#171717" }}>No petitions found</p>
              <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#666666" }}>
                Try a different keyword or{" "}
                <Link href="/petition/new" style={{ color: "#4A6FA9", textDecoration: "none" }}>start a new petition</Link>.
              </p>
            </div>
          ) : (
            visiblePetitions.map((petition) => {
              const id = petition?._id || petition?.id || "";
              const linkedIssueTitle =
                (typeof petition?.issueId === "object" ? petition?.issueId?.title : "") || "";
              const sigs = sigCount(petition);

              return (
                <article
                  key={id || petition?.title}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "14px",
                    padding: "20px",
                    border: "1px solid #E8E1D5",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#4A6FA9";
                    e.currentTarget.style.boxShadow = "0 2px 12px rgba(74,111,169,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#E8E1D5";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Top row: badge + date */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span
                      style={{
                        borderRadius: "20px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        background: linkedIssueTitle ? "#EEF2FF" : "#F5F2ED",
                        color: linkedIssueTitle ? "#4A6FA9" : "#666666",
                      }}
                    >
                      {linkedIssueTitle ? "Linked" : "Independent"}
                    </span>
                    <span style={{ fontSize: "12px", color: "#999999" }}>
                      {new Date(petition?.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      margin: "12px 0 0",
                      fontSize: "18px",
                      fontWeight: 700,
                      lineHeight: 1.3,
                      color: "#171717",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {petition?.title || "Untitled petition"}
                  </h2>

                  {/* Description */}
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "13px",
                      lineHeight: 1.65,
                      color: "#666666",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {petition?.description || "No description available."}
                  </p>

                  {/* Linked issue label */}
                  {linkedIssueTitle && (
                    <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#666666" }}>
                      Linked issue: {linkedIssueTitle}
                    </p>
                  )}

                  {/* Footer: sigs + view */}
                  <div style={{ marginTop: "auto", paddingTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#4A6FA9" }}>
                      {sigs} {sigs === 1 ? "signature" : "signatures"}
                    </span>
                    <Link
                      href={`/petition/${id}`}
                      style={{ fontSize: "13px", fontWeight: 600, color: "#4A6FA9", textDecoration: "none" }}
                    >
                      View →
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </main>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
      `}</style>
    </div>
  );
}