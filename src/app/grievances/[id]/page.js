"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function GrievanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const grievanceId = params?.id;

  const [loading, setLoading] = useState(true);
  const [grievance, setGrievance] = useState(null);
  const [showCiteModal, setShowCiteModal] = useState(false);
  const [citeSearch, setCiteSearch] = useState("");
  const [citeLoading, setCiteLoading] = useState(false);
  const [citeSubmittingId, setCiteSubmittingId] = useState("");
  const [citeError, setCiteError] = useState("");
  const [citeCandidates, setCiteCandidates] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!grievanceId) {
      return;
    }

    let isActive = true;

    async function fetchGrievance() {
      setLoading(true);

      try {
        const response = await fetch(`/api/grievances/${grievanceId}`);
        const json = await response.json().catch(() => ({}));

        if (!isActive) {
          return;
        }

        const issue = json?.grievance || json?.data || null;
        setGrievance(issue);
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

    fetchGrievance();

    return () => {
      isActive = false;
    };
  }, [grievanceId]);

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

    if (grievance?.status && grievance.status !== "reported") {
      fallback.push({
        status: grievance.status,
        date: grievance.updatedAt || grievance.createdAt || new Date().toISOString(),
        proof: grievance.resolutionProof || grievance.proof || "",
      });
    }

    return fallback;
  }, [grievance]);

  const grievanceCreatorId = String(
    typeof grievance?.createdBy === "string"
      ? grievance?.createdBy
      : grievance?.createdBy?._id || grievance?.createdBy?.id || ""
  );
  const currentUserId = String(user?._id || user?.id || "");
  const canCitePetition = Boolean(currentUserId && grievanceCreatorId && currentUserId === grievanceCreatorId);
  const canEscalatePetition = canCitePetition;
  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

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

  async function handleDeleteGrievance() {
    if (!grievanceId || deleteLoading) {
      return;
    }

    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/grievances/${grievanceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete grievance");
      }

      router.push("/dashboard/citizen/my-issues");
    } catch (_error) {
      return;
    } finally {
      setDeleteLoading(false);
    }
  }

  async function fetchCiteCandidates(queryText = "") {
    setCiteLoading(true);
    setCiteError("");

    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("unlinked", "true");
      params.set("createdBy", "me");
      const normalized = String(queryText || "").trim();
      if (normalized) {
        params.set("q", normalized);
      }

      const response = await fetch(`/api/petitions?${params.toString()}`);
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Unable to load petitions");
      }

      const list = Array.isArray(json?.petitions)
        ? json.petitions
        : Array.isArray(json?.data)
          ? json.data
          : [];

      setCiteCandidates(list);
    } catch (error) {
      setCiteError(error.message || "Unable to load petitions");
      setCiteCandidates([]);
    } finally {
      setCiteLoading(false);
    }
  }

  async function handleCitePetition(petitionId) {
    if (!userLoading && !user) {
      router.push("/login");
      return;
    }

    if (!grievanceId || !petitionId) {
      return;
    }

    setCiteSubmittingId(String(petitionId));
    setCiteError("");

    try {
      const response = await fetch(`/api/grievances/${grievanceId}/cite-petition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ petitionId }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Unable to cite petition");
      }

      const updated = json?.grievance || json?.data || null;
      if (updated) {
        setGrievance(updated);
      }
      setShowCiteModal(false);
      setCiteSearch("");
      setCiteCandidates([]);
    } catch (error) {
      setCiteError(error.message || "Unable to cite petition");
    } finally {
      setCiteSubmittingId("");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F5F8F8" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!grievance) {
    return (
      <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
        <Navbar />
        <main className="mx-auto max-w-[900px] px-10 pt-20">
          <Link href="/grievances" className="text-[14px] no-underline" style={{ color: "#3A7D7B" }}>
            ← All Issues
          </Link>
          <div
            className="mt-4 rounded-[14px] bg-white px-6 py-10 text-center"
            style={{ border: "0.5px solid #E4E8EA" }}
          >
            <p className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
              Issue not found
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
      <Navbar />

      <main className="mx-auto max-w-[1200px] px-10 pb-10 pt-20">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={dashboardHref} className="text-[14px] no-underline" style={{ color: "#3A7D7B" }}>
            ← Dashboard
          </Link>
          <span className="text-[12px]" style={{ color: "#B0BEC5" }}>
            |
          </span>
          <Link href="/grievances" className="text-[14px] no-underline" style={{ color: "#3A7D7B" }}>
            My Grievances
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section>
            <article
              className="rounded-[14px] bg-white px-8 py-7"
              style={{ border: "0.5px solid #E4E8EA" }}
            >
              <div className="flex flex-wrap items-center gap-2">
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

              <h1 className="mt-3 text-[24px] font-medium leading-[1.3]" style={{ color: "#1C2B2B" }}>
                {grievance?.title || "Untitled issue"}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-5 text-[13px]" style={{ color: "#8A9BA8" }}>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} />
                  {grievance?.location || grievance?.city || "Jalandhar"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} />
                  {new Date(grievance?.createdAt || Date.now()).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={14} />
                  {grievance?.assignedAuthority?.name || grievance?.authorityName || "Not assigned"}
                </span>
              </div>

              <div className="my-5 h-px" style={{ background: "#E4E8EA" }} />

              <p
                className="text-[12px] uppercase tracking-[0.08em]"
                style={{ color: "#B0BEC5" }}
              >
                Description
              </p>
              <p className="mt-2 text-[15px] leading-[1.8]" style={{ color: "#4A6060" }}>
                {grievance?.description || "No description available."}
              </p>

              {Array.isArray(grievance?.evidence) && grievance.evidence.length > 0 ? (
                <div className="mt-5">
                  <p
                    className="text-[12px] uppercase tracking-[0.08em]"
                    style={{ color: "#B0BEC5" }}
                  >
                    Evidence
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {grievance.evidence.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt="Evidence"
                          className="h-[90px] w-[120px] rounded-[10px] object-cover"
                          style={{ border: "0.5px solid #E4E8EA" }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {grievance?.legalContext ? (
                <div
                  className="mt-5 rounded-[12px] px-5 py-4"
                  style={{ background: "#EEF0FB", border: "0.5px solid #C7CFE8" }}
                >
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "#5B6FA6" }}>
                    <Sparkles size={13} />
                    AI Legal Context
                  </div>
                  <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: "#4A6060" }}>
                    {grievance.legalContext}
                  </p>
                </div>
              ) : null}
            </article>

            <section className="mt-5">
              <h2 className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                Status History
              </h2>

              <div
                className="mt-3 rounded-[14px] bg-white px-6 py-5"
                style={{ border: "0.5px solid #E4E8EA" }}
              >
                {statusHistory.map((entry, index) => {
                  const isLatest = index === statusHistory.length - 1;
                  return (
                    <div key={`${entry?.status}-${entry?.date}-${index}`} className="relative flex gap-3 pb-5">
                      <div className="relative flex flex-col items-center">
                        <span
                          className="block h-2 w-2 rounded-full"
                          style={{ background: isLatest ? "#3A7D7B" : "#B0BEC5" }}
                        />
                        {index < statusHistory.length - 1 ? (
                          <span
                            className="mt-1 block w-px"
                            style={{ background: "#E4E8EA", minHeight: "24px" }}
                          />
                        ) : null}
                      </div>

                      <div>
                        <p className="text-[14px] font-medium" style={{ color: "#1C2B2B" }}>
                          {prettyStatus(entry?.status)}
                        </p>
                        <p className="text-[12px]" style={{ color: "#B0BEC5" }}>
                          {new Date(entry?.date || Date.now()).toLocaleString()}
                        </p>

                        {entry?.status === "resolved" && entry?.proof ? (
                          <div className="mt-2">
                            <p className="text-[12px]" style={{ color: "#8A9BA8" }}>
                              Resolution proof
                            </p>
                            <img
                              src={entry.proof}
                              alt="Resolution proof"
                              className="mt-1 h-[90px] w-[120px] rounded-[10px] object-cover"
                              style={{ border: "0.5px solid #E4E8EA" }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </section>

          <aside className="h-fit lg:sticky lg:top-20">
            <div
              className="rounded-[14px] bg-white px-5 py-5"
              style={{ border: "0.5px solid #E4E8EA" }}
            >
              <p className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                Private Grievance
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                Visible only to owner and assigned authority.
              </p>

              <div className="my-4 h-px" style={{ background: "#E4E8EA" }} />

              <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: "#B0BEC5" }}>
                Assigned to
              </p>
              <p className="mt-1 text-[14px] font-medium" style={{ color: "#4A6060" }}>
                {grievance?.assignedAuthority?.name || grievance?.authorityName || "Not assigned"}
              </p>

              {grievance?.petitionId ? (
                <div className="mt-4 rounded-[10px] px-3 py-3" style={{ background: "#EEF0FB", border: "0.5px solid #C7CFE8" }}>
                  <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: "#5B6FA6" }}>
                    Linked Petition
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: "#4A6060" }}>
                    {grievance?.petitionId?.title || "Cited petition"}
                  </p>
                  <Link
                    href={`/petition/${grievance?.petitionId?._id || grievance?.petitionId?.id || grievance?.petitionId}`}
                    className="mt-1 inline-block text-[12px] no-underline"
                    style={{ color: "#3A7D7B" }}
                  >
                    View petition →
                  </Link>
                </div>
              ) : null}

              {grievance?.status !== "resolved" && !grievance?.petitionId ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowCiteModal(true);
                    fetchCiteCandidates(citeSearch);
                  }}
                  disabled={!canCitePetition}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-[10px] px-4 py-2.5 text-[14px]"
                  style={
                    canCitePetition
                      ? { border: "1.5px solid #5B6FA6", background: "transparent", color: "#5B6FA6" }
                      : { border: "1.5px solid #E4E8EA", background: "#EEF2F2", color: "#8A9BA8", cursor: "not-allowed" }
                  }
                >
                  Cite Existing Petition
                </button>
              ) : null}

              {grievance?.status !== "resolved" && !grievance?.petitionId && !canCitePetition ? (
                <p className="mt-2 text-[12px]" style={{ color: "#8A9BA8" }}>
                  Only the grievance creator can cite a petition.
                </p>
              ) : null}

              {grievance?.status !== "resolved" ? (
                <button
                  type="button"
                  onClick={() => router.push(`/petition/new?grievanceId=${grievanceId}`)}
                  disabled={!canEscalatePetition}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-[10px] px-4 py-2.5 text-[14px]"
                  style={
                    canEscalatePetition
                      ? { border: "1.5px solid #3A7D7B", background: "transparent", color: "#3A7D7B" }
                      : { border: "1.5px solid #E4E8EA", background: "#EEF2F2", color: "#8A9BA8", cursor: "not-allowed" }
                  }
                >
                  Escalate to Petition
                </button>
              ) : null}

              {grievance?.status !== "resolved" && !canEscalatePetition ? (
                <p className="mt-2 text-[12px]" style={{ color: "#8A9BA8" }}>
                  Only the grievance creator can escalate it to a petition.
                </p>
              ) : null}

              {canEscalatePetition ? (
                <button
                  type="button"
                  onClick={handleDeleteGrievance}
                  disabled={deleteLoading}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-[10px] px-4 py-2.5 text-[14px]"
                  style={{ background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5" }}
                >
                  {deleteLoading ? "Deleting..." : "Delete Grievance"}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </main>

      {showCiteModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[680px] rounded-[14px] bg-white px-6 py-5" style={{ border: "0.5px solid #E4E8EA" }}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[18px] font-medium" style={{ color: "#1C2B2B" }}>
                Cite a Petition
              </h3>
              <button
                type="button"
                onClick={() => setShowCiteModal(false)}
                className="rounded-[8px] px-2 py-1 text-[13px]"
                style={{ background: "#EEF2F2", color: "#4A6060" }}
              >
                Close
              </button>
            </div>

            <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
              Search among petitions created by you and attach one to this grievance.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={citeSearch}
                onChange={(event) => setCiteSearch(event.target.value)}
                placeholder="Search by title or description"
                className="flex-1 rounded-[10px] px-3 py-2 text-[14px] focus:outline-none"
                style={{ border: "0.5px solid #E4E8EA", background: "#FFFFFF" }}
              />
              <button
                type="button"
                onClick={() => fetchCiteCandidates(citeSearch)}
                className="rounded-[10px] px-4 py-2 text-[13px] font-medium text-white"
                style={{ background: "#3A7D7B" }}
              >
                Search
              </button>
            </div>

            {citeError ? (
              <p className="mt-3 text-[13px]" style={{ color: "#B91C1C" }}>
                {citeError}
              </p>
            ) : null}

            <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {citeLoading ? (
                <>
                  <div className="h-[74px] animate-pulse rounded-[10px] bg-gray-100" />
                  <div className="h-[74px] animate-pulse rounded-[10px] bg-gray-100" />
                </>
              ) : citeCandidates.length === 0 ? (
                <div className="rounded-[10px] px-4 py-6 text-center" style={{ background: "#F5F8F8", border: "0.5px solid #E4E8EA" }}>
                  <p className="text-[13px]" style={{ color: "#8A9BA8" }}>
                    No unlinked petitions created by you found.
                  </p>
                </div>
              ) : (
                citeCandidates.map((petition) => {
                  const petitionKey = String(petition?._id || petition?.id || "");
                  return (
                    <article key={petitionKey} className="rounded-[10px] px-4 py-3" style={{ border: "0.5px solid #E4E8EA" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-medium" style={{ color: "#1C2B2B" }}>
                            {petition?.title || "Untitled petition"}
                          </p>
                          <p className="mt-1 text-[12px]" style={{ color: "#8A9BA8" }}>
                            {String(petition?.description || "").slice(0, 120)}
                            {String(petition?.description || "").length > 120 ? "..." : ""}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={citeSubmittingId === petitionKey}
                          onClick={() => handleCitePetition(petitionKey)}
                          className="shrink-0 rounded-[9px] px-3 py-1.5 text-[12px] font-medium text-white"
                          style={{ background: "#5B6FA6" }}
                        >
                          {citeSubmittingId === petitionKey ? "Citing..." : "Cite"}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
