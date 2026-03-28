"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function NewPetitionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useUser();

  const grievanceId = searchParams.get("grievanceId") || "";
  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkedIssue, setLinkedIssue] = useState(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [ownerError, setOwnerError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!grievanceId) {
      setLinkedIssue(null);
      return;
    }

    let isActive = true;

    async function fetchLinkedIssue() {
      setIssueLoading(true);

      try {
        const response = await fetch(`/api/grievances/${grievanceId}`);
        const json = await response.json().catch(() => ({}));

        if (!isActive) {
          return;
        }

        setLinkedIssue(json?.grievance || json?.data || null);
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setLinkedIssue(null);
      } finally {
        if (!isActive) {
          return;
        }

        setIssueLoading(false);
      }
    }

    fetchLinkedIssue();

    return () => {
      isActive = false;
    };
  }, [grievanceId]);

  const linkedIssueCreatorId = String(
    typeof linkedIssue?.createdBy === "string"
      ? linkedIssue?.createdBy
      : linkedIssue?.createdBy?._id || linkedIssue?.createdBy?.id || ""
  );
  const currentUserId = String(user?._id || user?.id || "");
  const canEscalateThisIssue = !grievanceId || !linkedIssue || (linkedIssueCreatorId && currentUserId === linkedIssueCreatorId);

  useEffect(() => {
    if (!grievanceId) {
      setOwnerError("");
      return;
    }

    if (issueLoading) {
      return;
    }

    if (linkedIssue && !canEscalateThisIssue) {
      setOwnerError("Only the grievance creator can escalate it to a petition.");
      return;
    }

    setOwnerError("");
  }, [grievanceId, linkedIssue, issueLoading, canEscalateThisIssue]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canEscalateThisIssue) {
      setOwnerError("Only the grievance creator can escalate it to a petition.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/petitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          issueId: grievanceId || null,
          type: grievanceId ? "linked" : "independent",
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Unable to create petition");
      }

      const newId =
        json?.petition?._id ||
        json?.petition?.id ||
        json?.id ||
        json?.data?._id ||
        json?.data?.id;

      if (newId) {
        router.push(`/petition/${newId}`);
      } else {
        router.push("/petition");
      }
    } catch (_error) {
      setSubmitting(false);
      return;
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F5F8F8" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
      <Navbar />

      <main className="mx-auto max-w-[700px] px-5 pb-10 pt-24">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Link href={dashboardHref} className="text-[14px] no-underline" style={{ color: "#3A7D7B" }}>
            ← Dashboard
          </Link>
          <span className="text-[12px]" style={{ color: "#B0BEC5" }}>
            |
          </span>
          <Link href="/petition" className="text-[14px] no-underline" style={{ color: "#3A7D7B" }}>
            All Petitions
          </Link>
        </div>

        <h1 className="text-[26px] font-medium" style={{ color: "#1C2B2B" }}>
          Start a Petition
        </h1>

        {grievanceId ? (
          <div className="mt-4 rounded-[14px] bg-white px-6 py-4" style={{ border: "0.5px solid #E4E8EA" }}>
            <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: "#B0BEC5" }}>
              Linked Issue
            </p>
            {issueLoading ? (
              <div className="mt-2 h-[42px] animate-pulse rounded-[10px] bg-gray-100" />
            ) : (
              <div
                className="mt-2 rounded-[10px] bg-[#F5F8F8] px-3.5 py-2.5"
                style={{ border: "0.5px solid #E4E8EA" }}
              >
                <p className="text-[13px]" style={{ color: "#4A6060" }}>
                  {linkedIssue?.title || "Linked grievance"}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {ownerError ? (
          <div className="mt-4 rounded-[10px] px-3 py-2" style={{ background: "#FEE2E2", border: "0.5px solid #FCA5A5", color: "#B91C1C" }}>
            <p className="text-[13px]">{ownerError}</p>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-[14px] bg-white px-8 py-7"
          style={{ border: "0.5px solid #E4E8EA" }}
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="petition-title"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Title
              </label>
              <input
                id="petition-title"
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none"
                style={{ border: "0.5px solid #E4E8EA", background: "#EEF2F2", color: "#1C2B2B" }}
              />
            </div>

            <div>
              <label
                htmlFor="petition-description"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Description
              </label>
              <textarea
                id="petition-description"
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full resize-none rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none"
                style={{
                  border: "0.5px solid #E4E8EA",
                  background: "#EEF2F2",
                  color: "#1C2B2B",
                  minHeight: "140px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !canEscalateThisIssue}
              className="inline-flex w-full items-center justify-center rounded-[10px] px-4 py-3 text-[15px] font-medium text-white"
              style={canEscalateThisIssue ? { background: "#3A7D7B" } : { background: "#8A9BA8" }}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </span>
              ) : (
                "Create Petition"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
