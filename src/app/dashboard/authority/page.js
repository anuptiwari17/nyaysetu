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

    return { label: "Low", style: { background: "#EEF2F2", color: "#8A9BA8" } };
  }

  function getStatusBadgeStyle(status) {
    if (status === "resolved") {
      return { background: "#E8F5E9", color: "#2E7D32" };
    }

    if (status === "in_progress") {
      return { background: "#EAF4F4", color: "#3A7D7B" };
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
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F5F8F8" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== "authority") {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
      <Navbar />

      <section
        className="mt-14 flex flex-wrap items-center justify-between gap-3 bg-white px-10 py-5"
        style={{ borderBottom: "0.5px solid #E4E8EA" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[20px] font-medium" style={{ color: "#1C2B2B" }}>
            {departmentName}
          </h1>
          <span
            className="rounded-[20px] px-3 py-[3px] text-[12px]"
            style={{ background: "#EEF0FB", color: "#5B6FA6" }}
          >
            {user?.city || "Jalandhar"}
          </span>
          <span
            className="rounded-[20px] px-3 py-[3px] text-[12px]"
            style={{ background: "#EAF4F4", color: "#3A7D7B" }}
          >
            {departmentType}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[13px]" style={{ color: "#8A9BA8" }}>
            {user?.name}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-[10px] px-[16px] py-[8px] text-[13px]"
            style={{ background: "#EEF2F2", border: "0.5px solid #E4E8EA", color: "#8A9BA8" }}
          >
            Logout
          </button>
        </div>
      </section>

      <main className="px-10 py-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-[14px] bg-white px-6 py-5" style={{ border: "0.5px solid #E4E8EA" }}>
            <div className="flex items-start justify-between">
              <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: "#8A9BA8" }}>
                Assigned Issues
              </p>
              <Inbox size={20} style={{ color: "#3A7D7B" }} />
            </div>
            <p className="mt-2 text-[32px] font-medium" style={{ color: "#1C2B2B" }}>
              {stats.assignedIssues}
            </p>
          </div>

          <div className="rounded-[14px] bg-white px-6 py-5" style={{ border: "0.5px solid #E4E8EA" }}>
            <div className="flex items-start justify-between">
              <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: "#8A9BA8" }}>
                In Progress
              </p>
              <span className="rounded-full p-1.5" style={{ background: "#FEF3C7" }}>
                <Clock size={16} style={{ color: "#B45309" }} />
              </span>
            </div>
            <p className="mt-2 text-[32px] font-medium" style={{ color: "#1C2B2B" }}>
              {stats.inProgress}
            </p>
          </div>

          <div className="rounded-[14px] bg-white px-6 py-5" style={{ border: "0.5px solid #E4E8EA" }}>
            <div className="flex items-start justify-between">
              <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: "#8A9BA8" }}>
                Resolved This Month
              </p>
              <CheckCircle size={20} style={{ color: "#2E7D32" }} />
            </div>
            <p className="mt-2 text-[32px] font-medium" style={{ color: "#1C2B2B" }}>
              {stats.resolvedThisMonth}
            </p>
          </div>
        </div>

        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[20px] font-medium" style={{ color: "#1C2B2B" }}>
              Assigned Grievances
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortBy("supported")}
                className="rounded-[20px] px-4 py-1.5 text-[13px]"
                style={
                  sortBy === "supported"
                    ? { background: "#1C2B2B", color: "#FFFFFF" }
                    : { background: "#EEF2F2", color: "#8A9BA8" }
                }
              >
                Most Supported
              </button>
              <button
                type="button"
                onClick={() => setSortBy("newest")}
                className="rounded-[20px] px-4 py-1.5 text-[13px]"
                style={
                  sortBy === "newest"
                    ? { background: "#1C2B2B", color: "#FFFFFF" }
                    : { background: "#EEF2F2", color: "#8A9BA8" }
                }
              >
                Newest
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {["all", "pending", "in_progress", "resolved"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterBy(tab)}
                className="rounded-[20px] px-4 py-1.5 text-[13px]"
                style={
                  filterBy === tab
                    ? { background: "#3A7D7B", color: "#FFFFFF" }
                    : { background: "#EEF2F2", color: "#4A6060" }
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

          <div className="mt-4 space-y-3">
            {issuesLoading ? (
              <>
                <div className="h-[160px] animate-pulse rounded-[14px] bg-gray-100" />
                <div className="h-[160px] animate-pulse rounded-[14px] bg-gray-100" />
                <div className="h-[160px] animate-pulse rounded-[14px] bg-gray-100" />
              </>
            ) : sortedAndFilteredIssues.length === 0 ? (
              <div
                className="rounded-[14px] bg-white px-6 py-10 text-center"
                style={{ border: "0.5px solid #E4E8EA" }}
              >
                <p className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                  No assigned grievances found
                </p>
                <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                  Assigned issues will appear here as citizens report them.
                </p>
              </div>
            ) : (
              sortedAndFilteredIssues.map((issue) => {
                const priority = getPriorityStyle(issue?.supportCount);
                return (
                  <article
                    key={issue?._id || issue?.id || issue?.title}
                    className="rounded-[14px] bg-white px-5 py-[18px]"
                    style={{ border: "0.5px solid #E4E8EA" }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium uppercase"
                          style={{ background: "#EAF4F4", color: "#3A7D7B" }}
                        >
                          {issue?.category || "GENERAL"}
                        </span>

                        <span
                          className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium"
                          style={priority.style}
                        >
                          {priority.label}
                        </span>
                      </div>

                      <span
                        className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium"
                        style={getStatusBadgeStyle(issue?.status)}
                      >
                        {String(issue?.status || "reported").replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="mt-2 text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                      {issue?.title || "Untitled issue"}
                    </h3>

                    <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                      {String(issue?.description || "No description available").slice(0, 100)}
                      {String(issue?.description || "").length > 100 ? "..." : ""}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <div className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#3A7D7B" }}>
                        <ThumbsUp size={14} />
                        <span>{issue?.supportCount || 0}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: "#8A9BA8" }}>
                        <MapPin size={14} />
                        <span>{issue?.location || issue?.city || "Jalandhar"}</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: "#8A9BA8" }}>
                        <Clock size={14} />
                        <span>{getRelativeTime(issue?.createdAt)}</span>
                      </div>

                      <Link
                        href={`/dashboard/authority/issue/${issue?._id || issue?.id || ""}`}
                        className="ml-auto inline-flex items-center justify-center rounded-[8px] px-3.5 py-1.5 text-[13px] no-underline"
                        style={{ border: "1.5px solid #3A7D7B", color: "#3A7D7B", background: "transparent" }}
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
  );
}
