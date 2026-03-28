"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

const CATEGORY_OPTIONS = [
  "All",
  "Water",
  "Roads",
  "Electricity",
  "Sanitation",
  "Parks",
  "Other",
];

export default function GrievancesFeedPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
      return;
    }

    if (!user) {
      return;
    }

    let isActive = true;

    async function fetchIssues() {
      setLoading(true);

      try {
        const response = await fetch("/api/grievances");
        const json = await response.json().catch(() => ({}));

        if (!isActive) {
          return;
        }

        const list = Array.isArray(json?.grievances)
          ? json.grievances
          : Array.isArray(json?.data)
            ? json.data
            : [];

        setIssues(list);
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setIssues([]);
      } finally {
        if (!isActive) {
          return;
        }

        setLoading(false);
      }
    }

    fetchIssues();

    return () => {
      isActive = false;
    };
  }, [user, userLoading, router]);

  const stats = useMemo(() => {
    return {
      totalCount: issues.length,
      resolvedCount: issues.filter((issue) => issue?.status === "resolved").length,
    };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    let list = [...issues];

    if (category !== "All") {
      list = list.filter((issue) =>
        String(issue?.category || "")
          .toLowerCase()
          .includes(category.toLowerCase())
      );
    }

    if (normalizedSearch) {
      list = list.filter((issue) => {
        const title = String(issue?.title || "").toLowerCase();
        const description = String(issue?.description || "").toLowerCase();
        const location = String(issue?.location || issue?.city || "").toLowerCase();
        return (
          title.includes(normalizedSearch) ||
          description.includes(normalizedSearch) ||
          location.includes(normalizedSearch)
        );
      });
    }

    if (sortBy === "Newest") {
      list.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
    } else {
      list.sort((a, b) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime());
    }

    return list;
  }, [issues, search, category, sortBy]);

  function statusBadgeStyle(status) {
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
      return `${mins}m ago`;
    }

    if (diffMs < day) {
      const hours = Math.max(1, Math.floor(diffMs / hour));
      return `${hours}h ago`;
    }

    const days = Math.max(1, Math.floor(diffMs / day));
    return `${days}d ago`;
  }

  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F5F8F8" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const pageTitle = user?.role === "authority" ? "Assigned Grievances" : "My Grievances";
  const pageSubtitle =
    user?.role === "authority"
      ? `${stats.totalCount} grievances assigned to your department`
      : `${stats.totalCount} grievances reported · ${stats.resolvedCount} resolved`;
  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

  return (
    <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
      <Navbar />

      <main className="px-10 pb-10 pt-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[26px] font-medium" style={{ color: "#1C2B2B" }}>{pageTitle}</h1>
          <Link
            href={dashboardHref}
            className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13px] font-medium no-underline"
            style={{ border: "1.5px solid #3A7D7B", color: "#3A7D7B", background: "transparent" }}
          >
            Back to Dashboard
          </Link>
        </div>
        <p className="mt-1 text-[14px]" style={{ color: "#8A9BA8" }}>
          {pageSubtitle}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px] flex-1 rounded-[10px] px-4 py-2.5 text-[14px] focus:outline-none"
            style={{ border: "0.5px solid #E4E8EA", background: "#FFFFFF" }}
          />

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-[180px] rounded-[10px] px-4 py-2.5 text-[14px] focus:outline-none"
            style={{ border: "0.5px solid #E4E8EA", background: "#FFFFFF" }}
          >
            <option value="All">All Categories</option>
            <option value="Water">Water</option>
            <option value="Roads">Roads</option>
            <option value="Electricity">Electricity</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Parks">Parks</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-[160px] rounded-[10px] px-4 py-2.5 text-[14px] focus:outline-none"
            style={{ border: "0.5px solid #E4E8EA", background: "#FFFFFF" }}
          >
            <option>Newest</option>
            <option>Oldest</option>
          </select>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((item) => {
            const isActive = category.toLowerCase() === item.toLowerCase();

            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className="rounded-[20px] px-4 py-1.5 text-[13px]"
                style={
                  isActive
                    ? { background: "#3A7D7B", color: "#FFFFFF" }
                    : {
                        background: "#FFFFFF",
                        color: "#4A6060",
                        border: "0.5px solid #E4E8EA",
                      }
                }
              >
                {item}
              </button>
            );
          })}
        </div>

        <section
          className="mt-6 grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
        >
          {loading ? (
            Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-[210px] animate-pulse rounded-[14px] bg-gray-100" />
            ))
          ) : filteredIssues.length === 0 ? (
            <div
              className="col-span-full rounded-[14px] bg-white px-6 py-12 text-center"
              style={{ border: "0.5px solid #E4E8EA" }}
            >
              <p className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                No issues match your filters
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                Try changing category, search term, or sort order.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <article
                key={issue?._id || issue?.id || issue?.title}
                onClick={() => router.push(`/grievances/${issue?._id || issue?.id || ""}`)}
                className="rounded-[14px] bg-white px-5 py-[18px] transition-colors"
                style={{ border: "0.5px solid #E4E8EA", cursor: "pointer" }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor = "#3A7D7B";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor = "#E4E8EA";
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium uppercase"
                    style={{ background: "#EAF4F4", color: "#3A7D7B" }}
                  >
                    {issue?.category || "GENERAL"}
                  </span>
                  <span
                    className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium"
                    style={statusBadgeStyle(issue?.status)}
                  >
                    {String(issue?.status || "reported").replace("_", " ")}
                  </span>
                </div>

                <h2
                  className="mt-2.5 overflow-hidden text-[16px] font-medium leading-[1.4]"
                  style={{ color: "#1C2B2B", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                >
                  {issue?.title || "Untitled issue"}
                </h2>

                <p
                  className="mt-1.5 overflow-hidden text-[13px] leading-[1.5]"
                  style={{
                    color: "#8A9BA8",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {issue?.description || "No description available."}
                </p>

                <div className="mt-2.5 flex items-center gap-1.5 text-[12px]" style={{ color: "#B0BEC5" }}>
                  <MapPin size={12} />
                  <span>{issue?.location || issue?.city || "Jalandhar"}</span>
                </div>

                <div
                  className="mt-3 flex items-center justify-between border-t pt-3"
                  style={{ borderTop: "0.5px solid #E4E8EA" }}
                >
                  <span className="text-[11px] font-mono" style={{ color: "#B0BEC5" }}>
                    {getRelativeTime(issue?.createdAt)}
                  </span>

                  <Link
                    href={`/grievances/${issue?._id || issue?.id || ""}`}
                    className="text-[13px] no-underline"
                    style={{ color: "#3A7D7B" }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    View →
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>
      </main>

      <Link
        href="/grievances/new"
        className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center rounded-[10px] px-5 py-3 text-[14px] font-medium text-white no-underline"
        style={{ background: "#3A7D7B", boxShadow: "none" }}
      >
        Report Issue
      </Link>
    </div>
  );
}
