"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  FileText,
  ScrollText,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import CitizenSidebar from "@/components/CitizenSidebar";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function CitizenDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [statsLoading, setStatsLoading] = useState(true);
  const [petitionsLoading, setPetitionsLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [publicPetitions, setPublicPetitions] = useState([]);
  const [signedPetitionIds, setSignedPetitionIds] = useState([]);
  const [signingId, setSigningId] = useState("");

  const firstName = useMemo(() => {
    const value = String(user?.name || "").trim();
    return value ? value.split(/\s+/)[0] : "Citizen";
  }, [user?.name]);

  const stats = useMemo(() => {
    const issuesReported = issues.length;
    const issuesResolved = issues.filter((item) => item?.status === "resolved").length;
    const petitionsSigned = signedPetitionIds.length;

    return {
      issuesReported,
      petitionsSigned,
      issuesResolved,
      publicPetitions: publicPetitions.length,
    };
  }, [issues, signedPetitionIds, publicPetitions]);

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

    async function loadCitizenData() {
      setStatsLoading(true);
      setPetitionsLoading(true);

      try {
        const [grievancesRes, signedRes, publicRes] = await Promise.all([
          fetch("/api/grievances"),
          fetch("/api/petitions?signedBy=me&limit=100"),
          fetch("/api/petitions?limit=12"),
        ]);

        const grievancesJson = await grievancesRes.json().catch(() => ({}));
        const signedJson = await signedRes.json().catch(() => ({}));
        const publicJson = await publicRes.json().catch(() => ({}));

        if (!isActive) {
          return;
        }

        const grievancesList = Array.isArray(grievancesJson?.grievances)
          ? grievancesJson.grievances
          : Array.isArray(grievancesJson?.data)
            ? grievancesJson.data
            : [];

        const signedList = Array.isArray(signedJson?.petitions)
          ? signedJson.petitions
          : Array.isArray(signedJson?.data)
            ? signedJson.data
            : [];

        const publicList = Array.isArray(publicJson?.petitions)
          ? publicJson.petitions
          : Array.isArray(publicJson?.data)
            ? publicJson.data
            : [];

        const signedIds = signedList
          .map((item) => String(item?._id || item?.id || ""))
          .filter(Boolean);

        setIssues(grievancesList);
        setPublicPetitions(publicList);
        setSignedPetitionIds(signedIds);
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setIssues([]);
        setPublicPetitions([]);
        setSignedPetitionIds([]);
      } finally {
        if (!isActive) {
          return;
        }

        setStatsLoading(false);
        setPetitionsLoading(false);
      }
    }

    loadCitizenData();

    return () => {
      isActive = false;
    };
  }, [user]);

  async function handleSignPetition(petitionId) {
    const id = String(petitionId || "");
    if (!id || signingId || signedPetitionIds.includes(id)) {
      return;
    }

    setSigningId(id);

    try {
      const response = await fetch(`/api/petitions/${id}/sign`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to sign petition");
      }

      setSignedPetitionIds((previous) => Array.from(new Set([...previous, id])));
      setPublicPetitions((previous) =>
        previous.map((petition) => {
          const petitionIdValue = String(petition?._id || petition?.id || "");
          if (petitionIdValue !== id) {
            return petition;
          }

          const signatures = Array.isArray(petition?.signatures) ? [...petition.signatures] : [];
          signatures.push("signed");

          return {
            ...petition,
            signatures,
          };
        })
      );
    } catch (_error) {
      return;
    } finally {
      setSigningId("");
    }
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

  return (
    <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
      <Navbar />
      <main className="flex min-h-screen pt-14">
        <CitizenSidebar user={user} />

        <section className="flex-1 px-6 py-8 md:px-10" style={{ paddingTop: "32px" }}>
          <h1 className="text-[26px] font-medium" style={{ color: "#1C2B2B" }}>
            Good morning, {firstName} 👋
          </h1>
          <p className="mt-1 text-[15px]" style={{ color: "#8A9BA8" }}>
            Here&apos;s what&apos;s happening in Jalandhar today.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-4">
            {statsLoading ? (
              <>
                <div className="h-[116px] animate-pulse rounded-[14px] bg-gray-100" />
                <div className="h-[116px] animate-pulse rounded-[14px] bg-gray-100" />
                <div className="h-[116px] animate-pulse rounded-[14px] bg-gray-100" />
                <div className="h-[116px] animate-pulse rounded-[14px] bg-gray-100" />
              </>
            ) : (
              <>
                <div className="rounded-[14px] bg-white px-6 py-5" style={{ border: "0.5px solid #E4E8EA" }}>
                  <div className="flex items-start justify-between">
                    <p
                      className="text-[12px] uppercase tracking-[0.08em]"
                      style={{ color: "#8A9BA8" }}
                    >
                      Issues Reported
                    </p>
                    <FileText size={20} style={{ color: "#3A7D7B" }} />
                  </div>
                  <p className="mt-2 text-[28px] font-medium" style={{ color: "#1C2B2B" }}>
                    {stats.issuesReported}
                  </p>
                </div>

                <div className="rounded-[14px] bg-white px-6 py-5" style={{ border: "0.5px solid #E4E8EA" }}>
                  <div className="flex items-start justify-between">
                    <p
                      className="text-[12px] uppercase tracking-[0.08em]"
                      style={{ color: "#8A9BA8" }}
                    >
                      Public Petitions
                    </p>
                    <Users size={20} style={{ color: "#3A7D7B" }} />
                  </div>
                  <p className="mt-2 text-[28px] font-medium" style={{ color: "#1C2B2B" }}>
                    {stats.publicPetitions}
                  </p>
                </div>

                <div className="rounded-[14px] bg-white px-6 py-5" style={{ border: "0.5px solid #E4E8EA" }}>
                  <div className="flex items-start justify-between">
                    <p
                      className="text-[12px] uppercase tracking-[0.08em]"
                      style={{ color: "#8A9BA8" }}
                    >
                      Petitions Signed
                    </p>
                    <ScrollText size={20} style={{ color: "#3A7D7B" }} />
                  </div>
                  <p className="mt-2 text-[28px] font-medium" style={{ color: "#1C2B2B" }}>
                    {stats.petitionsSigned}
                  </p>
                </div>

                <div className="rounded-[14px] bg-white px-6 py-5" style={{ border: "0.5px solid #E4E8EA" }}>
                  <div className="flex items-start justify-between">
                    <p
                      className="text-[12px] uppercase tracking-[0.08em]"
                      style={{ color: "#8A9BA8" }}
                    >
                      Issues Resolved
                    </p>
                    <CheckCircle size={20} style={{ color: "#2E7D32" }} />
                  </div>
                  <p className="mt-2 text-[28px] font-medium" style={{ color: "#1C2B2B" }}>
                    {stats.issuesResolved}
                  </p>
                </div>
              </>
            )}
          </div>

          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-medium" style={{ color: "#1C2B2B" }}>
                Public petitions to sign
              </h2>
              <Link href="/petition" className="text-[13px] no-underline" style={{ color: "#3A7D7B" }}>
                View all →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {petitionsLoading ? (
                <>
                  <div className="h-[74px] animate-pulse rounded-[12px] bg-gray-100" />
                  <div className="h-[74px] animate-pulse rounded-[12px] bg-gray-100" />
                  <div className="h-[74px] animate-pulse rounded-[12px] bg-gray-100" />
                </>
              ) : publicPetitions.length === 0 ? (
                <div
                  className="flex flex-col items-center rounded-[12px] bg-white px-6 py-10 text-center"
                  style={{ border: "0.5px solid #E4E8EA" }}
                >
                  <p className="mt-3 text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                    No public petitions yet
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                    Public petitions will appear here for community collaboration.
                  </p>
                </div>
              ) : (
                publicPetitions.map((petition) => {
                  const petitionId = String(petition?._id || petition?.id || "");
                  const isSigned = signedPetitionIds.includes(petitionId);
                  const signatureCount = Array.isArray(petition?.signatures)
                    ? petition.signatures.length
                    : Number(petition?.signatureCount || 0);

                  return (
                  <div
                    key={petitionId || petition?.title}
                    className="flex items-center rounded-[12px] bg-white px-[18px] py-[14px]"
                    style={{ border: "0.5px solid #E4E8EA" }}
                  >
                    <span
                      className="mr-4 inline-block rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium uppercase"
                      style={{ background: petition?.issueId ? "#EAF4F4" : "#EEF2F2", color: petition?.issueId ? "#3A7D7B" : "#8A9BA8" }}
                    >
                      {petition?.issueId ? "Linked" : "Public"}
                    </span>

                    <div className="flex-1">
                      <p className="text-[15px] font-medium" style={{ color: "#1C2B2B" }}>
                        {petition?.title || "Untitled petition"}
                      </p>
                      <p className="text-[12px]" style={{ color: "#8A9BA8" }}>
                        {signatureCount} signatures
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSignPetition(petitionId)}
                      disabled={isSigned || signingId === petitionId}
                      className="mr-3 rounded-[8px] px-3 py-1.5 text-[12px]"
                      style={
                        isSigned
                          ? { background: "#E8F5E9", color: "#2E7D32" }
                          : { background: "#3A7D7B", color: "#FFFFFF" }
                      }
                    >
                      {signingId === petitionId ? "Signing..." : isSigned ? "Signed ✓" : "Sign"}
                    </button>

                    <Link
                      href={`/petition/${petitionId}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full no-underline"
                      style={{ color: "#8A9BA8" }}
                    >
                      →
                    </Link>
                  </div>
                );
              })
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
