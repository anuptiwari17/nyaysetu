"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Inbox, MapPin, ThumbsUp, LayoutDashboard, FileText, Scale, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function AuthorityDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [sortBy, setSortBy] = useState("supported");
  const [filterBy, setFilterBy] = useState("all");

  const departmentName = user?.authorityName || user?.name || "Authority Department";
  const departmentType = user?.authorityType || "Municipal Corporation";

  const sortedAndFilteredIssues = useMemo(() => {
    let list = [...issues];

    if (filterBy === "pending") {
      list = list.filter((issue) => issue?.status === "reported");
    } else if (filterBy === "in_progress") {
      list = list.filter((issue) => issue?.status === "in_progress");
    } else if (filterBy === "resolved") {
      list = list.filter((issue) => issue?.status === "resolved");
    }

    if (sortBy === "supported") {
      list.sort((a, b) => Number(b?.supportCount || 0) - Number(a?.supportCount || 0));
    } else {
      list.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
    }

    return list;
  }, [issues, sortBy, filterBy]);

  const stats = useMemo(() => {
    const assignedIssues = issues.length;
    const inProgress = issues.filter((issue) => issue?.status === "in_progress").length;

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const resolvedThisMonth = issues.filter((issue) => {
      if (issue?.status !== "resolved") return false;
      const date = new Date(issue?.updatedAt || issue?.createdAt || 0);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;

    return { assignedIssues, inProgress, resolvedThisMonth };
  }, [issues]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "authority")) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "authority") return;

    let isActive = true;

    async function fetchAssignedIssues() {
      setIssuesLoading(true);
      try {
        const authorityId = String(user?.authorityId || "");
        const params = new URLSearchParams({ assignedAuthority: "me" });
        if (authorityId) params.set("authorityId", authorityId);

        const response = await fetch(`/api/grievances?${params.toString()}`);
        const json = await response.json().catch(() => ({}));

        if (!isActive) return;

        const grievanceList = Array.isArray(json?.grievances)
          ? json.grievances
          : Array.isArray(json?.data)
            ? json.data
            : [];

        setIssues(grievanceList);
      } catch (_error) {
        if (!isActive) return;
        setIssues([]);
      } finally {
        if (!isActive) return;
        setIssuesLoading(false);
      }
    }

    fetchAssignedIssues();
    return () => { isActive = false; };
  }, [user]);

  function getPriorityStyle(supportCount) {
    const count = Number(supportCount || 0);
    if (count > 100) return { label: "High Priority", bg: "#FEE2E2", color: "#B91C1C", dot: "#EF4444" };
    if (count >= 50) return { label: "Medium", bg: "#FEF3C7", color: "#B45309", dot: "#F59E0B" };
    return { label: "Low", bg: "#F1F5F9", color: "#64748B", dot: "#94A3B8" };
  }

  function getStatusStyle(status) {
    if (status === "resolved") return { bg: "#DCFCE7", color: "#16A34A" };
    if (status === "in_progress") return { bg: "#DBEAFE", color: "#1D4ED8" };
    return { bg: "#FEF3C7", color: "#B45309" };
  }

  function getRelativeTime(inputDate) {
    const date = new Date(inputDate || Date.now());
    const diffMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const mins = Math.max(1, Math.floor(diffMs / minute));
      return `${mins}m ago`;
    }
    if (diffMs < day) {
      const hours = Math.max(1, Math.floor(diffMs / hour));
      return `${hours}h ago`;
    }
    const days = Math.max(1, Math.floor(diffMs / day));
    return `${days}d ago`;
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#F8F7F4" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid #F5C842", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user || user.role !== "authority") return null;

  const navLinks = [
    { href: "/dashboard/authority", label: "Dashboard", icon: LayoutDashboard, active: true },
    { href: "/grievances", label: "Public Grievances", icon: FileText, active: false },
    { href: "/legal-assistant", label: "Legal Assistant", icon: Scale, active: false },
  ];

  const filterTabs = [
    { key: "all", label: "All Issues" },
    { key: "pending", label: "Pending" },
    { key: "in_progress", label: "In Progress" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F8F7F4", fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar />

      <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto", paddingTop: 64 }}>
        {/* ── Sidebar ── */}
        <aside style={{
          width: 256,
          flexShrink: 0,
          position: "sticky",
          top: 64,
          height: "calc(100vh - 64px)",
          overflowY: "auto",
          background: "#FDFCF9",
          borderRight: "1px solid #EDE8DF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "28px 16px",
        }}>
          <div>
            {/* User card */}
            <div style={{ background: "#FFF8DC", borderRadius: 14, padding: "14px 16px", marginBottom: 24, marginTop: 8, border: "1px solid #F5E68A" }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B45309" }}>
                Authority Desk
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#0D1B2A", lineHeight: 1.3 }}>
                {departmentName}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#78716C" }}>
                {user?.city || "Jalandhar"} · {departmentType}
              </p>
            </div>

            {/* Nav links */}
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {navLinks.map(({ href, label, icon: Icon, active }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#0D1B2A" : "#78716C",
                    background: active ? "#F5C842" : "transparent",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

        </aside>

        {/* ── Main Content ── */}
        <main style={{ flex: 1, minWidth: 0, padding: "32px 32px 60px", overflowX: "hidden" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A29E" }}>
                Welcome back
              </p>
              <h1 style={{ margin: "6px 0 0", fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(26px, 3vw, 36px)", fontWeight: 800, color: "#0D1B2A", lineHeight: 1.1 }}>
                {departmentName}
              </h1>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
            {[
              {
                label: "Assigned Issues",
                value: stats.assignedIssues,
                icon: <Inbox size={20} color="#4A6FA9" />,
                accent: "#EEF2FF",
              },
              {
                label: "In Progress",
                value: stats.inProgress,
                icon: <Clock size={20} color="#B45309" />,
                accent: "#FEF3C7",
              },
              {
                label: "Resolved This Month",
                value: stats.resolvedThisMonth,
                icon: <CheckCircle size={20} color="#16A34A" />,
                accent: "#DCFCE7",
              },
            ].map(({ label, value, icon, accent }) => (
              <article
                key={label}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  padding: "20px 22px",
                  border: "1px solid #EDE8DF",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A8A29E" }}>
                    {label}
                  </p>
                  <p style={{ margin: "3px 0 0", fontFamily: "Fraunces, Georgia, serif", fontSize: 32, fontWeight: 800, color: "#0D1B2A", lineHeight: 1 }}>
                    {value}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Issues section */}
          <section style={{ background: "#FFFFFF", borderRadius: 20, border: "1px solid #EDE8DF", padding: "24px 24px 28px" }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 800, color: "#0D1B2A" }}>
                Assigned Grievances
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { key: "supported", label: "Most Supported" },
                  { key: "newest", label: "Newest" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSortBy(key)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 50,
                      border: "1px solid",
                      borderColor: sortBy === key ? "#F5C842" : "#EDE8DF",
                      background: sortBy === key ? "#F5C842" : "#FFFFFF",
                      color: sortBy === key ? "#0D1B2A" : "#78716C",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {filterTabs.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterBy(key)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 50,
                    border: "1px solid",
                    borderColor: filterBy === key ? "#0D1B2A" : "#EDE8DF",
                    background: filterBy === key ? "#0D1B2A" : "#FFFFFF",
                    color: filterBy === key ? "#FFFFFF" : "#78716C",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Issue list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {issuesLoading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 140,
                      borderRadius: 14,
                      background: "linear-gradient(90deg, #F1EDE6 25%, #FAF7F2 50%, #F1EDE6 75%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.4s infinite",
                    }}
                  />
                ))
              ) : sortedAndFilteredIssues.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px", borderRadius: 14, background: "#FAFAF8", border: "1px dashed #EDE8DF" }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0D1B2A" }}>No grievances found</p>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#A8A29E" }}>Assigned issues will show up here.</p>
                </div>
              ) : (
                sortedAndFilteredIssues.map((issue) => {
                  const priority = getPriorityStyle(issue?.supportCount);
                  const statusStyle = getStatusStyle(issue?.status);
                  const reporterName = issue?.isAnonymous || issue?.anonymous
                    ? "Anonymous citizen"
                    : issue?.createdBy?.name || "Unknown citizen";

                  return (
                    <article
                      key={issue?._id || issue?.id || issue?.title}
                      style={{
                        borderRadius: 14,
                        border: "1px solid #EDE8DF",
                        background: "#FDFCF9",
                        padding: "18px 20px",
                        transition: "box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.07)"}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                    >
                      {/* Top row: badges + status */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", background: "#F0EBE1", color: "#78716C" }}>
                            {issue?.category || "General"}
                          </span>
                          <span style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600, background: priority.bg, color: priority.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: priority.dot, display: "inline-block" }} />
                            {priority.label}
                          </span>
                        </div>
                        <span style={{ padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, textTransform: "capitalize" }}>
                          {String(issue?.status || "reported").replace("_", " ")}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 style={{ margin: "12px 0 6px", fontSize: 16, fontWeight: 700, color: "#0D1B2A", lineHeight: 1.3 }}>
                        {issue?.title || "Untitled issue"}
                      </h3>

                      {/* Description */}
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "#78716C" }}>
                        {String(issue?.description || "No description available").slice(0, 120)}
                        {String(issue?.description || "").length > 120 ? "…" : ""}
                      </p>

                      {/* Meta row */}
                      <div style={{ marginTop: 14, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#4A6FA9" }}>
                          <ThumbsUp size={13} />
                          {issue?.supportCount || 0} supported
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#A8A29E" }}>
                          <MapPin size={13} />
                          {issue?.location || issue?.city || "Jalandhar"}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#A8A29E" }}>
                          <Clock size={13} />
                          {getRelativeTime(issue?.createdAt)}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#A8A29E" }}>
                          <User size={13} />
                          {reporterName}
                        </span>

                        <Link
                          href={`/dashboard/authority/issue/${issue?._id || issue?.id || ""}`}
                          style={{
                            marginLeft: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 16px",
                            borderRadius: 50,
                            background: "#F5C842",
                            color: "#0D1B2A",
                            fontSize: 13,
                            fontWeight: 700,
                            textDecoration: "none",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#EAB800"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "#F5C842"}
                        >
                          Update Status →
                        </Link>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}