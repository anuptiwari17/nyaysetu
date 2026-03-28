"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
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
    if (!isLoading && (!user || user.role !== "citizen")) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "citizen") {
      return;
    }

    let isActive = true;

    async function fetchIssues() {
      setIssuesLoading(true);

      try {
        const response = await fetch("/api/grievances?createdBy=me");
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

        setIssuesLoading(false);
      }
    }

    fetchIssues();

    return () => {
      isActive = false;
    };
  }, [user]);

  const filteredIssues = useMemo(() => {
    if (activeFilter === "all") {
      return issues;
    }

    if (activeFilter === "resolved") {
      return issues.filter((issue) => issue?.status === "resolved");
    }

    return issues.filter((issue) => issue?.status !== "resolved");
  }, [issues, activeFilter]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F5F8F8" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== "citizen") {
    return null;
  }

  const filterButtons = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "resolved", label: "Resolved" },
  ];

  function getStatusBadgeStyle(status) {
    if (status === "resolved") {
      return { background: "#E8F5E9", color: "#2E7D32" };
    }

    if (status === "in_progress") {
      return { background: "#EAF4F4", color: "#3A7D7B" };
    }

    return { background: "#FEF3C7", color: "#B45309" };
  }

  function getCardBorderStyle(status) {
    if (status === "resolved") {
      return { borderLeft: "3px solid #2E7D32" };
    }

    if (status === "reported") {
      return { borderLeft: "3px solid #B45309" };
    }

    return { borderLeft: "3px solid #3A7D7B" };
  }

  async function handleDelete(issueId) {
    const id = String(issueId || "");
    if (!id || deletingId) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/grievances/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete grievance");
      }

      setIssues((previous) => previous.filter((item) => String(item?._id || item?.id || "") !== id));
    } catch (_error) {
      return;
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
      <Navbar />

      <main className="flex min-h-screen pt-14">
        <CitizenSidebar user={user} />

        <section className="flex-1 px-6 py-8 md:px-10" style={{ paddingTop: "32px" }}>
          <h1 className="text-[24px] font-medium" style={{ color: "#1C2B2B" }}>
            My Issues
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {filterButtons.map((item) => {
              const isActive = activeFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveFilter(item.key)}
                  className="rounded-[20px] px-4 py-1.5 text-[13px]"
                  style={
                    isActive
                      ? { background: "#3A7D7B", color: "#FFFFFF" }
                      : { background: "#EEF2F2", color: "#4A6060" }
                  }
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-3">
            {issuesLoading ? (
              <>
                <div className="h-[140px] animate-pulse rounded-[14px] bg-gray-100" />
                <div className="h-[140px] animate-pulse rounded-[14px] bg-gray-100" />
                <div className="h-[140px] animate-pulse rounded-[14px] bg-gray-100" />
              </>
            ) : filteredIssues.length === 0 ? (
              <div
                className="rounded-[14px] bg-white px-6 py-10 text-center"
                style={{ border: "0.5px solid #E4E8EA" }}
              >
                <p className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                  No issues found
                </p>
                <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                  Try switching filters or report your first issue.
                </p>
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <article
                  key={issue?._id || issue?.id || issue?.title}
                  className="rounded-[14px] bg-white px-5 py-[18px]"
                  style={{ border: "0.5px solid #E4E8EA", ...getCardBorderStyle(issue?.status) }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium uppercase"
                      style={{ background: "#EAF4F4", color: "#3A7D7B" }}
                    >
                      {issue?.category || "GENERAL"}
                    </span>

                    <span
                      className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium"
                      style={getStatusBadgeStyle(issue?.status)}
                    >
                      {issue?.status === "resolved"
                        ? "Resolved ✓"
                        : String(issue?.status || "reported").replace("_", " ")}
                    </span>
                  </div>

                  <h2 className="mt-2 text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                    {issue?.title || "Untitled issue"}
                  </h2>

                  <div className="mt-2 flex items-center gap-1.5 text-[13px]" style={{ color: "#B0BEC5" }}>
                    <MapPin size={14} />
                    <span>{issue?.location || issue?.city || "Jalandhar"}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-[12px] font-mono" style={{ color: "#B0BEC5" }}>
                      {new Date(issue?.createdAt || Date.now()).toLocaleDateString()}
                    </span>

                    <Link
                      href={`/grievances/${issue?._id || issue?.id || ""}`}
                      className="text-[13px] no-underline"
                      style={{ color: "#3A7D7B" }}
                    >
                      View Details →
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(issue?._id || issue?.id)}
                      disabled={deletingId === String(issue?._id || issue?.id || "")}
                      className="rounded-[8px] px-3 py-1 text-[12px]"
                      style={{ background: "#FEE2E2", color: "#B91C1C" }}
                    >
                      {deletingId === String(issue?._id || issue?.id || "") ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
