"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import CitizenSidebar from "@/components/CitizenSidebar";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function MyIssuesPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "citizen")) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "citizen") return;
    let isActive = true;

    async function fetchIssues() {
      setIssuesLoading(true);
      try {
        const res = await fetch("/api/grievances?createdBy=me");
        const json = await res.json().catch(() => ({}));
        if (!isActive) return;
        const list = Array.isArray(json?.grievances) ? json.grievances : Array.isArray(json?.data) ? json.data : [];
        setIssues(list);
      } catch {
        if (!isActive) return;
        setIssues([]);
      } finally {
        if (!isActive) return;
        setIssuesLoading(false);
      }
    }

    fetchIssues();
    return () => { isActive = false; };
  }, [user]);

  const filteredIssues = useMemo(() => {
    if (activeFilter === "resolved") return issues.filter((i) => i?.status === "resolved");
    if (activeFilter === "pending") return issues.filter((i) => i?.status !== "resolved");
    return issues;
  }, [issues, activeFilter]);

  async function handleDelete(issueId) {
    const id = String(issueId || "");
    if (!id || deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/grievances/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete grievance");
      setIssues((prev) => prev.filter((item) => String(item?._id || item?.id || "") !== id));
    } catch { /* silent */ } finally {
      setDeletingId("");
    }
  }

  function statusStyle(status) {
    if (status === "resolved") return { background: "#DCFCE7", color: "#16A34A" };
    if (status === "in_progress") return { background: "#EEF2FF", color: "#4A6FA9" };
    return { background: "#FEF3C7", color: "#B45309" };
  }

  function leftBorderColor(status) {
    if (status === "resolved") return "#16A34A";
    if (status === "in_progress") return "#4A6FA9";
    return "#B45309";
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

  const filterButtons = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      <div style={{ display: "flex", maxWidth: "1380px", margin: "0 auto", paddingTop: "64px" }}>
        <CitizenSidebar user={user} />

        {/* Main content */}
        <section style={{ flex: 1, minWidth: 0, padding: "32px 36px 64px" }}>
          <div style={{ maxWidth: "760px" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, lineHeight: 1.1, color: "#171717", fontFamily: "Fraunces, Georgia, serif" }}>
                  My Issues
                </h1>
                <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#666666" }}>
                  {issues.length} reported · {issues.filter((i) => i?.status === "resolved").length} resolved
                </p>
              </div>
              <Link
                href="/grievances/new"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "10px", padding: "9px 16px", fontSize: "13px", fontWeight: 600, background: "#4A6FA9", color: "#FFFFFF", textDecoration: "none", whiteSpace: "nowrap" }}
              >
                <Plus size={14} />
                Report Issue
              </Link>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px", background: "#F5F2ED", borderRadius: "12px", padding: "4px", width: "fit-content" }}>
              {filterButtons.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  style={{
                    borderRadius: "9px",
                    padding: "7px 14px",
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

            {/* Issues list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {issuesLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} style={{ height: "130px", borderRadius: "12px", background: "#F5F2ED", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))
              ) : filteredIssues.length === 0 ? (
                <div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "36px 24px", textAlign: "center", border: "1px solid #E8E1D5" }}>
                  <p style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#171717" }}>No issues found</p>
                  <p style={{ margin: "5px 0 0", fontSize: "13px", color: "#666666" }}>Try switching filters or report your first issue.</p>
                  <Link
                    href="/grievances/new"
                    style={{ display: "inline-block", marginTop: "12px", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, background: "#4A6FA9", color: "#FFFFFF", textDecoration: "none" }}
                  >
                    Report Issue
                  </Link>
                </div>
              ) : (
                filteredIssues.map((issue) => {
                  const id = String(issue?._id || issue?.id || "");
                  const isDeleting = deletingId === id;

                  return (
                    <article
                      key={id || issue?.title}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: "12px",
                        padding: "16px 18px",
                        border: "1px solid #E8E1D5",
                        borderLeft: `3px solid ${leftBorderColor(issue?.status)}`,
                        transition: "box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      {/* Top row: category + status badges */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", background: "#EEF2FF", color: "#4A6FA9" }}>
                          {issue?.category || "General"}
                        </span>
                        <span style={{ borderRadius: "20px", padding: "3px 10px", fontSize: "11px", fontWeight: 600, ...statusStyle(issue?.status) }}>
                          {issue?.status === "resolved" ? "Resolved ✓" : String(issue?.status || "reported").replace("_", " ")}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 style={{ margin: "8px 0 0", fontSize: "15px", fontWeight: 600, lineHeight: 1.35, color: "#171717" }}>
                        {issue?.title || "Untitled issue"}
                      </h2>

                      {/* Location */}
                      <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#B0BEC5" }}>
                        <MapPin size={11} />
                        {issue?.location || issue?.city || "Jalandhar"}
                      </div>

                      {/* Footer row */}
                      <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #F0EDE8", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#B0BEC5", fontVariantNumeric: "tabular-nums" }}>
                          {new Date(issue?.createdAt || Date.now()).toLocaleDateString()}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Link
                            href={`/grievances/${id}`}
                            style={{ fontSize: "13px", fontWeight: 600, color: "#4A6FA9", textDecoration: "none" }}
                          >
                            View Details →
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(id)}
                            disabled={isDeleting}
                            style={{
                              borderRadius: "7px",
                              padding: "5px 10px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: "#FEE2E2",
                              color: "#B91C1C",
                              border: "none",
                              cursor: isDeleting ? "not-allowed" : "pointer",
                              fontFamily: "inherit",
                              opacity: isDeleting ? 0.6 : 1,
                            }}
                          >
                            {isDeleting ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
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