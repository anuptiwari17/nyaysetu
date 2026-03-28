"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  ThumbsUp,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function AuthorityIssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const issueId = params?.id;

  const [grievance, setGrievance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("in_progress");
  const [resolutionNote, setResolutionNote] = useState("");
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    if (!userLoading && (!user || user.role !== "authority")) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!issueId) {
      return;
    }

    let isActive = true;

    async function fetchIssue() {
      setLoading(true);

      try {
        const response = await fetch(`/api/grievances/${issueId}`);
        const json = await response.json().catch(() => ({}));

        if (!isActive) {
          return;
        }

        const issue = json?.grievance || json?.data || null;
        setGrievance(issue);
        setSelectedStatus(issue?.status || "reported");
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setGrievance(null);
      } finally {
        if (!isActive) {
          return;
        }

        setLoading(false);
      }
    }

    fetchIssue();

    return () => {
      isActive = false;
    };
  }, [issueId]);

  const statusHistory = useMemo(() => {
    if (!grievance) {
      return [];
    }

    if (Array.isArray(grievance.statusHistory) && grievance.statusHistory.length > 0) {
      return [...grievance.statusHistory].sort(
        (a, b) => new Date(a?.date || 0).getTime() - new Date(b?.date || 0).getTime()
      );
    }

    const fallback = [
      { status: "reported", date: grievance.createdAt || new Date().toISOString() },
    ];

    if (grievance.status && grievance.status !== "reported") {
      fallback.push({
        status: grievance.status,
        date: grievance.updatedAt || grievance.createdAt || new Date().toISOString(),
      });
    }

    return fallback;
  }, [grievance]);

  function statusBadgeStyle(status) {
    if (status === "resolved") {
      return { background: "#E8F5E9", color: "#2E7D32" };
    }

    if (status === "in_progress") {
      return { background: "#EAF4F4", color: "#3A7D7B" };
    }

    return { background: "#FEF3C7", color: "#B45309" };
  }

  function prettyStatus(status) {
    return String(status || "reported").replace("_", " ");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!issueId || !selectedStatus) {
      return;
    }

    setSubmitLoading(true);

    try {
      const response = await fetch(`/api/grievances/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: selectedStatus,
          resolutionNote,
          proof: proofFile ? proofFile.name : "",
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Unable to update status");
      }

      toast.success("Status updated successfully", {
        style: {
          border: "0.5px solid #D6F2DE",
          background: "#E8F5E9",
          color: "#2E7D32",
        },
      });

      setTimeout(() => {
        router.push("/dashboard/authority");
      }, 600);
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (userLoading || loading) {
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
      <Toaster position="top-center" />

      <main className="px-10 pb-10 pt-20">
        <Link href="/dashboard/authority" className="text-[14px] no-underline" style={{ color: "#3A7D7B" }}>
          ← Back to Dashboard
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2">
            <article
              className="rounded-[14px] bg-white px-7 py-6"
              style={{ border: "0.5px solid #E4E8EA" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium uppercase"
                  style={{ background: "#EAF4F4", color: "#3A7D7B" }}
                >
                  {grievance?.category || "GENERAL"}
                </span>
                <span
                  className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium"
                  style={statusBadgeStyle(grievance?.status)}
                >
                  {prettyStatus(grievance?.status)}
                </span>
              </div>

              <h1 className="mt-2.5 text-[22px] font-medium" style={{ color: "#1C2B2B" }}>
                {grievance?.title || "Untitled issue"}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px]" style={{ color: "#8A9BA8" }}>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} />
                  {grievance?.location || grievance?.city || "Jalandhar"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} />
                  {new Date(grievance?.createdAt || Date.now()).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ThumbsUp size={14} />
                  {grievance?.supportCount || 0}
                </span>
              </div>

              <div className="my-4 h-px" style={{ background: "#E4E8EA" }} />

              <p
                className="text-[12px] uppercase tracking-[0.08em]"
                style={{ color: "#B0BEC5" }}
              >
                Issue Description
              </p>
              <p className="mt-2 text-[15px] leading-[1.7]" style={{ color: "#4A6060" }}>
                {grievance?.description || "No description provided."}
              </p>

              {Array.isArray(grievance?.evidence) && grievance.evidence.length > 0 ? (
                <div className="mt-6">
                  <p
                    className="text-[12px] uppercase tracking-[0.08em]"
                    style={{ color: "#B0BEC5" }}
                  >
                    Evidence
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {grievance.evidence.map((imageUrl) => (
                      <a key={imageUrl} href={imageUrl} target="_blank" rel="noreferrer">
                        <img
                          src={imageUrl}
                          alt="Evidence"
                          className="h-20 w-20 rounded-[8px] object-cover"
                          style={{ border: "0.5px solid #E4E8EA", cursor: "pointer" }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {grievance?.legalContext ? (
                <div className="mt-6">
                  <p
                    className="text-[12px] uppercase tracking-[0.08em]"
                    style={{ color: "#B0BEC5" }}
                  >
                    Legal Context
                  </p>
                  <div
                    className="mt-2 rounded-[10px] px-4 py-3 text-[13px]"
                    style={{ background: "#EEF0FB", border: "0.5px solid #C7CFE8", color: "#4A6060" }}
                  >
                    {grievance.legalContext}
                  </div>
                </div>
              ) : null}

              <div className="mt-7">
                <p className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                  Status History
                </p>

                <div className="mt-4 relative">
                  {statusHistory.map((entry, index) => {
                    const isLatest = index === statusHistory.length - 1;
                    return (
                      <div key={`${entry?.status}-${entry?.date}-${index}`} className="relative flex gap-3 pb-4">
                        <div className="relative flex flex-col items-center">
                          <span
                            className="block h-2 w-2 rounded-full"
                            style={{ background: isLatest ? "#3A7D7B" : "#B0BEC5" }}
                          />
                          {index < statusHistory.length - 1 ? (
                            <span
                              className="mt-1 block w-px flex-1"
                              style={{ background: "#E4E8EA", minHeight: "20px" }}
                            />
                          ) : null}
                        </div>

                        <div>
                          <p className="text-[13px] font-medium" style={{ color: "#1C2B2B" }}>
                            {prettyStatus(entry?.status)}
                          </p>
                          <p className="text-[12px]" style={{ color: "#8A9BA8" }}>
                            {new Date(entry?.date || Date.now()).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          </section>

          <aside>
            <form
              onSubmit={handleSubmit}
              className="rounded-[14px] bg-white px-6 py-6"
              style={{ border: "0.5px solid #E4E8EA" }}
            >
              <h2 className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                Update Status
              </h2>

              <div className="mt-4 space-y-2">
                {[
                  {
                    key: "in_progress",
                    label: "In Progress",
                    border: "#B45309",
                    tint: "#FEF3C7",
                  },
                  {
                    key: "resolved",
                    label: "Resolved",
                    border: "#2E7D32",
                    tint: "#E8F5E9",
                  },
                  {
                    key: "reported",
                    label: "Reported / Reopen",
                    border: "#8A9BA8",
                    tint: "#EEF2F2",
                  },
                ].map((option) => {
                  const isSelected = selectedStatus === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedStatus(option.key)}
                      className="w-full rounded-[10px] px-4 py-3 text-left text-[14px]"
                      style={{
                        border: `0.5px solid ${isSelected ? option.border : "#E4E8EA"}`,
                        borderLeft: `3px solid ${option.border}`,
                        background: isSelected ? option.tint : "#FFFFFF",
                        color: "#1C2B2B",
                        cursor: "pointer",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {selectedStatus === "resolved" ? (
                <>
                  <div className="mt-5">
                    <label
                      htmlFor="resolution-note"
                      className="block text-[13px] font-medium"
                      style={{ color: "#4A6060" }}
                    >
                      Resolution Note
                    </label>
                    <textarea
                      id="resolution-note"
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                      placeholder="Describe how this issue was resolved..."
                      className="mt-1.5 w-full resize-none rounded-[10px] px-[14px] py-[10px] text-[14px] focus:outline-none"
                      style={{
                        border: "0.5px solid #E4E8EA",
                        background: "#EEF2F2",
                        minHeight: "100px",
                      }}
                    />
                  </div>

                  <div className="mt-4">
                    <p className="text-[13px] font-medium" style={{ color: "#4A6060" }}>
                      Upload Proof (optional)
                    </p>
                    <label
                      htmlFor="proof-upload"
                      className="mt-1.5 block cursor-pointer rounded-[10px] px-4 py-5 text-center"
                      style={{ border: "1.5px dashed #E4E8EA", color: "#B0BEC5" }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={18} />
                        <span className="text-[13px]">Click to upload image</span>
                        {proofFile ? (
                          <span className="text-[12px]" style={{ color: "#4A6060" }}>
                            {proofFile.name}
                          </span>
                        ) : null}
                      </div>
                      <input
                        id="proof-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </>
              ) : null}

              <button
                type="submit"
                disabled={submitLoading}
                className="mt-5 inline-flex w-full items-center justify-center rounded-[10px] px-4 py-[11px] text-[14px] font-medium text-white"
                style={{ background: "#3A7D7B" }}
              >
                {submitLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Updating...
                  </span>
                ) : (
                  "Update Status"
                )}
              </button>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
