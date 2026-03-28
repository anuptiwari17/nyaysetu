"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CitizenSidebar from "@/components/CitizenSidebar";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function CitizenDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [statsLoading, setStatsLoading] = useState(true);
  const [petitionsLoading, setPetitionsLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [publicPetitions, setPublicPetitions] = useState([]);
  const [signedPetitionIds, setSignedPetitionIds] = useState([]);
  const [signingId, setSigningId] = useState("");

  const stats = useMemo(() => {
    return {
      issuesReported: issues.length,
      petitionsSigned: signedPetitionIds.length,
      issuesResolved: issues.filter((item) => item?.status === "resolved").length,
      publicPetitions: publicPetitions.length,
    };
  }, [issues, signedPetitionIds, publicPetitions]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "citizen")) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "citizen") return;
    let isActive = true;

    async function loadCitizenData() {
      setStatsLoading(true);
      setPetitionsLoading(true);
      try {
        const [grievancesRes, signedRes, publicRes] = await Promise.all([
          fetch("/api/grievances"),
          fetch("/api/petitions?signedBy=me&limit=100"),
          fetch("/api/petitions?limit=12"),
        ]);
        const grievancesJson = await grievancesRes.json().catch(() => ({}));
        const signedJson = await signedRes.json().catch(() => ({}));
        const publicJson = await publicRes.json().catch(() => ({}));
        if (!isActive) return;

        const grievancesList = Array.isArray(grievancesJson?.grievances)
          ? grievancesJson.grievances
          : Array.isArray(grievancesJson?.data) ? grievancesJson.data : [];
        const signedList = Array.isArray(signedJson?.petitions)
          ? signedJson.petitions
          : Array.isArray(signedJson?.data) ? signedJson.data : [];
        const publicList = Array.isArray(publicJson?.petitions)
          ? publicJson.petitions
          : Array.isArray(publicJson?.data) ? publicJson.data : [];

        setIssues(grievancesList);
        setPublicPetitions(publicList);
        setSignedPetitionIds(
          signedList.map((item) => String(item?._id || item?.id || "")).filter(Boolean)
        );
      } catch {
        if (!isActive) return;
        setIssues([]);
        setPublicPetitions([]);
        setSignedPetitionIds([]);
      } finally {
        if (!isActive) return;
        setStatsLoading(false);
        setPetitionsLoading(false);
      }
    }

    loadCitizenData();
    return () => { isActive = false; };
  }, [user]);

  async function handleSignPetition(petitionId) {
    const id = String(petitionId || "");
    if (!id || signingId || signedPetitionIds.includes(id)) return;
    setSigningId(id);
    try {
      const response = await fetch(`/api/petitions/${id}/sign`, { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign petition");
      setSignedPetitionIds((prev) => Array.from(new Set([...prev, id])));
      setPublicPetitions((prev) =>
        prev.map((p) => {
          const pid = String(p?._id || p?.id || "");
          if (pid !== id) return p;
          const signatures = Array.isArray(p?.signatures) ? [...p.signatures] : [];
          signatures.push("signed");
          return { ...p, signatures };
        })
      );
    } catch { /* silent */ } finally {
      setSigningId("");
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#FAFAF8" }}>
        <div style={{ height: "32px", width: "32px", borderRadius: "50%", border: "2px solid #0D1B2A", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user || user.role !== "citizen") return null;

  const statCards = [
    { label: "Issues Reported", value: stats.issuesReported },
    { label: "Public Petitions", value: stats.publicPetitions },
    { label: "Petitions Signed", value: stats.petitionsSigned },
    { label: "Issues Resolved", value: stats.issuesResolved },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      {/* Root layout: sidebar + scrollable main */}
      <div style={{ display: "flex", maxWidth: "1380px", margin: "0 auto", paddingTop: "64px" }}>
        <CitizenSidebar user={user} />

        {/* ── Main content ── */}
        <main style={{ flex: 1, minWidth: 0, overflowX: "hidden", padding: "20px 40px 80px" }}>
          <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "36px" }}>

            {/* ── Hero card ── */}
            <section
              style={{
                background: "#FFFFFF",
                borderRadius: "20px",
                padding: "36px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4A5568" }}>
                Citizen Workspace
              </p>
              <h1
                style={{
                  margin: "10px 0 0",
                  fontSize: "clamp(32px, 4vw, 46px)",
                  lineHeight: 1.04,
                  color: "#0D1B2A",
                  fontFamily: "Fraunces, serif",
                  fontWeight: 700,
                }}
              >
                Dashboard
              </h1>
              <p style={{ margin: "14px 0 0", fontSize: "16px", lineHeight: 1.75, color: "#4A5568", maxWidth: "600px" }}>
                Track civic activity in {user?.city || "Jalandhar"}, review petition momentum, and take your next action quickly.
              </p>

              {/* Mobile-only CTAs (hidden on md+, sidebar handles desktop) */}
              <div
                className="md:hidden"
                style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "10px" }}
              >
                {[
                  { href: "/legal-assistant", label: "Ask Legal AI", style: { background: "#FFFFFF", border: "1px solid #D1D5DB", color: "#4A5568" } },
                  { href: "/petition/new", label: "Create Petition", style: { background: "#F5C842", color: "#0D1B2A" } },
                  { href: "/grievances/new", label: "Report an Issue", style: { background: "#FFFFFF", border: "1px solid #D1D5DB", color: "#4A5568" } },
                ].map(({ href, label, style }) => (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50px",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: 600,
                      textDecoration: "none",
                      ...style,
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </section>

            {/* ── Stats grid: 4 columns ── */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "16px",
              }}
            >
              {statsLoading
                ? [1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: "120px",
                        borderRadius: "16px",
                        background: "#F3F4F6",
                        animation: "pulse 1.5s ease-in-out infinite",
                      }}
                    />
                  ))
                : statCards.map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: "16px",
                        padding: "22px 20px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.09em",
                          textTransform: "uppercase",
                          color: "#4A5568",
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: "38px",
                          lineHeight: 1,
                          color: "#0D1B2A",
                          fontFamily: "Fraunces, serif",
                          fontWeight: 800,
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
            </section>

            {/* ── Public Petitions ── */}
            <section>
              {/* Section header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "28px",
                      lineHeight: 1.1,
                      color: "#0D1B2A",
                      fontFamily: "Fraunces, serif",
                      fontWeight: 700,
                    }}
                  >
                    Public petitions
                  </h2>
                  <p style={{ margin: "6px 0 0", fontSize: "15px", color: "#4A5568" }}>
                    Sign ongoing civic campaigns from your city.
                  </p>
                </div>
                <Link
                  href="/petition"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50px",
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #D1D5DB",
                    color: "#4A5568",
                    background: "#FFFFFF",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  View all
                </Link>
              </div>

              {/* Petition cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {petitionsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: "90px",
                        borderRadius: "16px",
                        background: "#F3F4F6",
                        animation: "pulse 1.5s ease-in-out infinite",
                      }}
                    />
                  ))
                ) : publicPetitions.length === 0 ? (
                  <div
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "16px",
                      padding: "48px 24px",
                      textAlign: "center",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "#0D1B2A" }}>
                      No public petitions yet
                    </p>
                    <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#4A5568" }}>
                      Community petitions will appear here.
                    </p>
                  </div>
                ) : (
                  publicPetitions.map((petition) => {
                    const petitionId = String(petition?._id || petition?.id || "");
                    const isSigned = signedPetitionIds.includes(petitionId);
                    const signatureCount = Array.isArray(petition?.signatures)
                      ? petition.signatures.length
                      : Number(petition?.signatureCount || 0);

                    return (
                      <article
                        key={petitionId || petition?.title}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          background: "#FFFFFF",
                          borderRadius: "16px",
                          padding: "18px 20px",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                        }}
                      >
                        {/* Badge */}
                        <span
                          style={{
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: "999px",
                            padding: "3px 10px",
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            background: petition?.issueId ? "#FFF8DC" : "#F3F4F6",
                            color: petition?.issueId ? "#0D1B2A" : "#4A5568",
                          }}
                        >
                          {petition?.issueId ? "Linked" : "Public"}
                        </span>

                        {/* Title + signature count */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "16px",
                              fontWeight: 600,
                              color: "#0D1B2A",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {petition?.title || "Untitled petition"}
                          </p>
                          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#4A5568" }}>
                            {signatureCount} {signatureCount === 1 ? "signature" : "signatures"}
                          </p>
                        </div>

                        {/* Actions */}
                        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => handleSignPetition(petitionId)}
                            disabled={isSigned || signingId === petitionId}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "50px",
                              padding: "8px 18px",
                              fontSize: "13px",
                              fontWeight: 700,
                              cursor: isSigned ? "default" : "pointer",
                              border: isSigned ? "1px solid #BBF7D0" : "1px solid #F5C842",
                              background: isSigned ? "#ECFDF3" : "#F5C842",
                              color: isSigned ? "#166534" : "#0D1B2A",
                              transition: "all 0.15s",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {signingId === petitionId ? "Signing…" : isSigned ? "✓ Signed" : "Sign"}
                          </button>

                          <Link
                            href={`/petition/${petitionId}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "50px",
                              padding: "8px 16px",
                              fontSize: "13px",
                              fontWeight: 600,
                              border: "1px solid #D1D5DB",
                              color: "#4A5568",
                              background: "#FFFFFF",
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            View
                          </Link>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        /* Responsive stat grid */
        @media (max-width: 700px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}