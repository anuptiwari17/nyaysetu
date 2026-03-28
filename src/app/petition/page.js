"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function PetitionsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [petitions, setPetitions] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

  useEffect(() => {
    let isActive = true;

    async function fetchPetitions() {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("limit", "100");
        const normalized = search.trim();
        if (normalized) {
          params.set("q", normalized);
        }

        const response = await fetch(`/api/petitions?${params.toString()}`);
        const json = await response.json().catch(() => ({}));

        if (!isActive) {
          return;
        }

        const list = Array.isArray(json?.petitions)
          ? json.petitions
          : Array.isArray(json?.data)
            ? json.data
            : [];

        setPetitions(list);
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setPetitions([]);
      } finally {
        if (!isActive) {
          return;
        }

        setLoading(false);
      }
    }

    fetchPetitions();

    return () => {
      isActive = false;
    };
  }, [search]);

  const visiblePetitions = useMemo(() => {
    if (filter === "linked") {
      return petitions.filter((petition) => Boolean(petition?.issueId));
    }

    if (filter === "independent") {
      return petitions.filter((petition) => !petition?.issueId);
    }

    return petitions;
  }, [petitions, filter]);

  function signatureCount(petition) {
    if (Number.isFinite(Number(petition?.signatureCount))) {
      return Number(petition.signatureCount);
    }

    return Array.isArray(petition?.signatures) ? petition.signatures.length : 0;
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
      <Navbar />

      <main className="mx-auto max-w-[1100px] px-6 pb-10 pt-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[26px] font-medium" style={{ color: "#1C2B2B" }}>
            Public Petitions
          </h1>
          {user ? (
            <Link
              href={dashboardHref}
              className="inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[13px] font-medium no-underline"
              style={{ border: "1.5px solid #3A7D7B", color: "#3A7D7B", background: "transparent" }}
            >
              Back to Dashboard
            </Link>
          ) : null}
        </div>
        <p className="mt-1 text-[14px]" style={{ color: "#8A9BA8" }}>
          Browse, sign, and track civic petitions.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search petitions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[260px] flex-1 rounded-[10px] px-4 py-2.5 text-[14px] focus:outline-none"
            style={{ border: "0.5px solid #E4E8EA", background: "#FFFFFF" }}
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-[180px] rounded-[10px] px-4 py-2.5 text-[14px] focus:outline-none"
            style={{ border: "0.5px solid #E4E8EA", background: "#FFFFFF" }}
          >
            <option value="all">All Petitions</option>
            <option value="linked">Linked to Grievance</option>
            <option value="independent">Independent</option>
          </select>

          <Link
            href="/petition/new"
            className="inline-flex items-center justify-center rounded-[10px] px-5 py-2.5 text-[14px] font-medium text-white no-underline"
            style={{ background: "#3A7D7B" }}
          >
            Start Petition
          </Link>
        </div>

        <section
          className="mt-6 grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[180px] animate-pulse rounded-[14px] bg-gray-100" />
            ))
          ) : visiblePetitions.length === 0 ? (
            <div
              className="col-span-full rounded-[14px] bg-white px-6 py-10 text-center"
              style={{ border: "0.5px solid #E4E8EA" }}
            >
              <p className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                No petitions found
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                Try a different keyword or start a new petition.
              </p>
            </div>
          ) : (
            visiblePetitions.map((petition) => {
              const id = petition?._id || petition?.id || "";
              const linkedIssueTitle =
                (typeof petition?.issueId === "object" ? petition?.issueId?.title : "") || "";

              return (
                <article
                  key={id || petition?.title}
                  className="rounded-[14px] bg-white px-5 py-[18px]"
                  style={{ border: "0.5px solid #E4E8EA" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-[20px] px-[10px] py-[2px] text-[11px]"
                      style={{
                        background: linkedIssueTitle ? "#EAF4F4" : "#EEF2F2",
                        color: linkedIssueTitle ? "#3A7D7B" : "#8A9BA8",
                      }}
                    >
                      {linkedIssueTitle ? "Linked" : "Independent"}
                    </span>
                    <span className="text-[12px]" style={{ color: "#B0BEC5" }}>
                      {new Date(petition?.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <h2 className="mt-2 text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                    {petition?.title || "Untitled petition"}
                  </h2>

                  <p className="mt-1 text-[13px] leading-[1.6]" style={{ color: "#8A9BA8" }}>
                    {String(petition?.description || "No description available.").slice(0, 140)}
                    {String(petition?.description || "").length > 140 ? "..." : ""}
                  </p>

                  {linkedIssueTitle ? (
                    <p className="mt-2 text-[12px]" style={{ color: "#4A6060" }}>
                      Linked issue: {linkedIssueTitle}
                    </p>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[13px] font-medium" style={{ color: "#3A7D7B" }}>
                      {signatureCount(petition)} signatures
                    </span>
                    <Link
                      href={`/petition/${id}`}
                      className="text-[13px] no-underline"
                      style={{ color: "#3A7D7B" }}
                    >
                      View →
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
