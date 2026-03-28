"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Inbox, MapPin, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function AuthorityDashboardPage() {
  const router = useRouter();
  const { user, isLoading, mutate } = useUser();
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
      if (issue?.status !== "resolved") {
        return false;
      }

      const date = new Date(issue?.updatedAt || issue?.createdAt || 0);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;

    return {
      assignedIssues,
      inProgress,
      resolvedThisMonth,
    };
  }, [issues]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "authority")) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "authority") {
      return;
    }

    let isActive = true;

    async function fetchAssignedIssues() {
      setIssuesLoading(true);

      try {
        const authorityId = String(user?.authorityId || "");
        const params = new URLSearchParams({ assignedAuthority: "me" });
        if (authorityId) {
          params.set("authorityId", authorityId);
        }

        const response = await fetch(`/api/grievances?${params.toString()}`);
        const json = await response.json().catch(() => ({}));

        if (!isActive) {
          return;
        }

        const grievanceList = Array.isArray(json?.grievances)
          ? json.grievances
          : Array.isArray(json?.data)
            ? json.data
            : [];

        setIssues(grievanceList);
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setIssues([]);
      } finally {
        if (!isActive) {
          return;
        }

        setIssuesLoading(false);
      }
    }

    fetchAssignedIssues();

    return () => {
      isActive = false;
    };
  }, [user]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "GET" });
      router.push("/");
      await mutate();
    } catch (_error) {
      router.push("/");
      await mutate();
    }
  }

  function getPriorityStyle(supportCount) {
    const count = Number(supportCount || 0);
    if (count > 100) {
      return { label: "High Priority", style: { background: "#FEE2E2", color: "#B91C1C" } };
    }

    if (count >= 50) {
      return { label: "Medium", style: { background: "#FEF3C7", color: "#B45309" } };
    }

    return { label: "Low", style: { background: "#F5F2ED", color: "#666666" } };
  }

  function getStatusBadgeStyle(status) {
    if (status === "resolved") {
      return { background: "#E8F5E9", color: "#2E7D32" };
    }

    if (status === "in_progress") {
      return { background: "#ECF0FF", color: "#4A6FA9" };
    }

    return { background: "#FEF3C7", color: "#B45309" };
  }

  function getRelativeTime(inputDate) {
    const date = new Date(inputDate || Date.now());
    const diffMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const mins = Math.max(1, Math.floor(diffMs / minute));
      return `${mins} min ago`;
    }

    if (diffMs < day) {
      const hours = Math.max(1, Math.floor(diffMs / hour));
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    const days = Math.max(1, Math.floor(diffMs / day));
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#FAFAF8" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4A6FA9] border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== "authority") {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      <main className="mx-auto flex min-h-screen w-full max-w-[1360px] pt-16">
        <aside
          className="h-[calc(100vh-64px)] w-[264px] shrink-0 flex-col justify-between p-6 flex"
          style={{
            borderRight: "0.5px solid #E8E1D5",
            background: "#FCFBF8",
            position: "sticky",
            top: "64px",
            alignSelf: "flex-start",
            overflowY: "auto",
          }}
        >
          <div>
            <Link
              href="/"
              className="no-underline"
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#0D1B2A",
                letterSpacing: "-0.03em",
              }}
            >
              Nyay<span style={{ color: "#F5C842" }}>Setu</span>
            </Link>

            <p
              className="mt-6 text-[22px] leading-[1.15]"
              style={{ color: "#0D1B2A", fontFamily: "Fraunces, serif", fontWeight: 700 }}
            >
              Authority Desk
            </p>
            <p className="mt-2 text-[13px]" style={{ color: "#4A5568", lineHeight: 1.6 }}>
              Track assigned grievances, update statuses, and close issues with proof.
            </p>

            <div className="mt-7 flex flex-col gap-2">
              <Link
                href="/dashboard/authority"
                className="rounded-[50px] px-4 py-2.5 text-[14px] font-semibold no-underline"
                style={{ background: "#FFF8DC", color: "#0D1B2A" }}
              >
                Dashboard
              </Link>
              <Link
                href="/grievances"
                className="rounded-[50px] px-4 py-2.5 text-[14px] font-medium no-underline"
                style={{ color: "#4A5568" }}
              >
                Public Grievances
              </Link>
              <Link
                href="/legal-assistant"
                className="rounded-[50px] px-4 py-2.5 text-[14px] font-medium no-underline"
                style={{ color: "#4A5568" }}
              >
                Legal Assistant
              </Link>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center rounded-[50px] px-4 py-3 text-[14px] font-semibold"
              style={{ background: "#F5C842", border: "1px solid #F5C842", color: "#0D1B2A" }}
            >
              Logout
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-5 pb-10 pt-6 md:px-8">
          <div className="mx-auto w-full max-w-[1020px]">
            <section
              className="rounded-[24px] bg-white px-6 py-7 md:px-8"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1
                    className="text-[30px] leading-[1.1] md:text-[34px]"
                    style={{ color: "#0D1B2A", fontFamily: "Fraunces, serif", fontWeight: 700 }}
                  >
                    {departmentName}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-[999px] px-3 py-1 text-[12px] font-semibold"
                      style={{ background: "#FFF8DC", color: "#0D1B2A" }}
                    >
                      {user?.city || "Jalandhar"}
                    </span>
                    <span
                      className="rounded-[999px] px-3 py-1 text-[12px] font-semibold"
                      style={{ background: "#FFF8DC", color: "#0D1B2A" }}
                    >
                      {departmentType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[13px]" style={{ color: "#4A5568" }}>
                    {user?.name}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-[50px] px-4 py-2 text-[13px] font-semibold"
                    style={{ background: "#F5C842", border: "1px solid #F5C842", color: "#0D1B2A" }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </section>

          <section className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-[20px] bg-white px-5 py-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="flex items-start justify-between">
              <p style={{ color: "#4A5568", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Assigned Issues
              </p>
              <Inbox size={20} style={{ color: "#4A6FA9" }} />
            </div>
            <p className="mt-3 text-[38px] leading-none" style={{ color: "#0D1B2A", fontFamily: "Fraunces, serif", fontWeight: 800 }}>
              {stats.assignedIssues}
            </p>
          </article>

          <article className="rounded-[20px] bg-white px-5 py-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="flex items-start justify-between">
              <p style={{ color: "#4A5568", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                In Progress
              </p>
              <span className="rounded-full p-1.5" style={{ background: "#FEF3C7" }}>
                <Clock size={16} style={{ color: "#B45309" }} />
              </span>
            </div>
            <p className="mt-3 text-[38px] leading-none" style={{ color: "#0D1B2A", fontFamily: "Fraunces, serif", fontWeight: 800 }}>
              {stats.inProgress}
            </p>
          </article>

          <article className="rounded-[20px] bg-white px-5 py-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="flex items-start justify-between">
              <p style={{ color: "#4A5568", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Resolved This Month
              </p>
              <CheckCircle size={20} style={{ color: "#2E7D32" }} />
            </div>
            <p className="mt-3 text-[38px] leading-none" style={{ color: "#0D1B2A", fontFamily: "Fraunces, serif", fontWeight: 800 }}>
              {stats.resolvedThisMonth}
            </p>
          </article>
          </section>

          <section className="mt-12 rounded-[24px] bg-white px-5 py-6 md:px-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[30px] leading-[1.05]" style={{ color: "#0D1B2A", fontFamily: "Fraunces, serif", fontWeight: 700 }}>
              Assigned Grievances
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortBy("supported")}
                className="rounded-[50px] px-4 py-2 text-[13px] font-semibold"
                style={
                  sortBy === "supported"
                    ? { background: "#F5C842", color: "#0D1B2A" }
                    : { background: "#F5F2ED", color: "#4A5568" }
                }
              >
                Most Supported
              </button>
              <button
                type="button"
                onClick={() => setSortBy("newest")}
                className="rounded-[50px] px-4 py-2 text-[13px] font-semibold"
                style={
                  sortBy === "newest"
                    ? { background: "#F5C842", color: "#0D1B2A" }
                    : { background: "#F5F2ED", color: "#4A5568" }
                }
              >
                Newest
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["all", "pending", "in_progress", "resolved"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterBy(tab)}
                className="rounded-[50px] px-4 py-2 text-[13px] font-semibold"
                style={
                  filterBy === tab
                    ? { background: "#F5C842", color: "#0D1B2A" }
                    : { background: "#F5F2ED", color: "#4A5568" }
                }
              >
                {tab === "all"
                  ? "All"
                  : tab === "pending"
                    ? "Pending"
                    : tab === "in_progress"
                      ? "In Progress"
                      : "Resolved"}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {issuesLoading ? (
              <>
                <div className="h-[170px] animate-pulse rounded-[20px] bg-gray-100" />
                <div className="h-[170px] animate-pulse rounded-[20px] bg-gray-100" />
                <div className="h-[170px] animate-pulse rounded-[20px] bg-gray-100" />
              </>
            ) : sortedAndFilteredIssues.length === 0 ? (
              <div
                className="rounded-[20px] bg-[#FAFAF8] px-6 py-10 text-center"
                style={{ border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <p className="text-[16px] font-medium" style={{ color: "#0D1B2A" }}>
                  No assigned grievances found
                </p>
                <p className="mt-1 text-[13px]" style={{ color: "#4A5568" }}>
                  Assigned issues will appear here as citizens report them.
                </p>
              </div>
            ) : (
              sortedAndFilteredIssues.map((issue) => {
                const priority = getPriorityStyle(issue?.supportCount);
                return (
                  <article
                    key={issue?._id || issue?.id || issue?.title}
                    className="rounded-[20px] bg-[#FAFAF8] px-5 py-5"
                    style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-[50px] px-[10px] py-[4px] text-[11px] font-medium uppercase"
                          style={{ background: "#FFF8DC", color: "#0D1B2A" }}
                        >
                          {issue?.category || "GENERAL"}
                        </span>

                        <span
                          className="rounded-[50px] px-[10px] py-[4px] text-[11px] font-medium"
                          style={priority.style}
                        >
                          {priority.label}
                        </span>
                      </div>

                      <span
                        className="rounded-[50px] px-[10px] py-[4px] text-[11px] font-medium capitalize"
                        style={getStatusBadgeStyle(issue?.status)}
                      >
                        {String(issue?.status || "reported").replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="mt-3 text-[17px] font-semibold" style={{ color: "#0D1B2A" }}>
                      {issue?.title || "Untitled issue"}
                    </h3>

                    <p className="mt-2 text-[13px] leading-[1.6]" style={{ color: "#4A5568" }}>
                      {String(issue?.description || "No description available").slice(0, 100)}
                      {String(issue?.description || "").length > 100 ? "..." : ""}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <div className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#4A6FA9" }}>
                        <ThumbsUp size={14} />
                        <span>{issue?.supportCount || 0}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: "#4A5568" }}>
                        <MapPin size={14} />
                        <span>{issue?.location || issue?.city || "Jalandhar"}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: "#4A5568" }}>
                        <Clock size={14} />
                        <span>{getRelativeTime(issue?.createdAt)}</span>
                      </div>

                      <Link
                        href={`/dashboard/authority/issue/${issue?._id || issue?.id || ""}`}
                        className="ml-auto inline-flex items-center justify-center rounded-[50px] px-4 py-2 text-[13px] font-semibold no-underline"
                        style={{ border: "1px solid #F5C842", color: "#0D1B2A", background: "#F5C842" }}
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
          </div>
        </section>
      </main>
    </div>
  );
}
