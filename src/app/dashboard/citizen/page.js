"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ChevronRight,
  FileText,
  Inbox,
  ScrollText,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import CitizenSidebar from "@/components/CitizenSidebar";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function CitizenDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [statsLoading, setStatsLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [petitions, setPetitions] = useState([]);

  const firstName = useMemo(() => {
    const value = String(user?.name || "").trim();
    return value ? value.split(/\s+/)[0] : "Citizen";
  }, [user?.name]);

  const stats = useMemo(() => {
    const issuesReported = issues.length;
    const issuesResolved = issues.filter((item) => item?.status === "resolved").length;

    const supportedFromFlag = issues.filter(
      (item) => item?.supported === true || item?.isSupported === true
    ).length;

    const supportedFromSupporters = issues.filter((item) => {
      if (!Array.isArray(item?.supporters)) {
        return false;
      }

      return item.supporters.some((supporter) => {
        const supportId =
          typeof supporter === "string" ? supporter : supporter?._id || supporter?.id;
        return String(supportId || "") === String(user?._id || user?.id || "");
      });
    }).length;

    const supportedFromApi = Number.isFinite(Number(issues?.supportedCount))
      ? Number(issues.supportedCount)
      : 0;

    const supportedIssues = Math.max(supportedFromFlag, supportedFromSupporters, supportedFromApi);

    const petitionsSigned = Number.isFinite(Number(petitions?.signedCount))
      ? Number(petitions.signedCount)
      : petitions.length;

    return {
      issuesReported,
      supportedIssues,
      petitionsSigned,
      issuesResolved,
    };
  }, [issues, petitions, user?._id, user?.id]);

  const recentIssues = useMemo(() => {
    return [...issues]
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
      .slice(0, 3);
  }, [issues]);

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
      setIssuesLoading(true);

      try {
        const [grievancesRes, petitionsRes] = await Promise.all([
          fetch("/api/grievances?createdBy=me"),
          fetch("/api/petitions?signedBy=me"),
        ]);

        const grievancesJson = await grievancesRes.json().catch(() => ({}));
        const petitionsJson = await petitionsRes.json().catch(() => ({}));

        if (!isActive) {
          return;
        }

        const grievancesList = Array.isArray(grievancesJson?.grievances)
          ? grievancesJson.grievances
          : Array.isArray(grievancesJson?.data)
            ? grievancesJson.data
            : [];

        const petitionsList = Array.isArray(petitionsJson?.petitions)
          ? petitionsJson.petitions
          : Array.isArray(petitionsJson?.data)
            ? petitionsJson.data
            : [];

        const issuesWithMeta = [...grievancesList];
        if (Number.isFinite(Number(grievancesJson?.supportedCount))) {
          issuesWithMeta.supportedCount = Number(grievancesJson.supportedCount);
        }

        const petitionsWithMeta = [...petitionsList];
        if (Number.isFinite(Number(petitionsJson?.signedCount))) {
          petitionsWithMeta.signedCount = Number(petitionsJson.signedCount);
        }

        setIssues(issuesWithMeta);
        setPetitions(petitionsWithMeta);
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setIssues([]);
        setPetitions([]);
      } finally {
        if (!isActive) {
          return;
        }

        setStatsLoading(false);
        setIssuesLoading(false);
      }
    }

    loadCitizenData();

    return () => {
      isActive = false;
    };
  }, [user]);

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
                      Supported Issues
                    </p>
                    <ThumbsUp size={20} style={{ color: "#3A7D7B" }} />
                  </div>
                  <p className="mt-2 text-[28px] font-medium" style={{ color: "#1C2B2B" }}>
                    {stats.supportedIssues}
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
                My recent issues
              </h2>
              <Link href="/dashboard/citizen/my-issues" className="text-[13px] no-underline" style={{ color: "#3A7D7B" }}>
                View all →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {issuesLoading ? (
                <>
                  <div className="h-[74px] animate-pulse rounded-[12px] bg-gray-100" />
                  <div className="h-[74px] animate-pulse rounded-[12px] bg-gray-100" />
                  <div className="h-[74px] animate-pulse rounded-[12px] bg-gray-100" />
                </>
              ) : recentIssues.length === 0 ? (
                <div
                  className="flex flex-col items-center rounded-[12px] bg-white px-6 py-10 text-center"
                  style={{ border: "0.5px solid #E4E8EA" }}
                >
                  <Inbox size={48} style={{ color: "#B0BEC5" }} />
                  <p className="mt-3 text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                    No issues reported yet
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                    Be the first to report a civic issue in your area
                  </p>
                  <Link
                    href="/grievances/new"
                    className="mt-5 inline-flex items-center justify-center rounded-[10px] px-5 py-2.5 text-[14px] font-medium text-white no-underline"
                    style={{ background: "#3A7D7B" }}
                  >
                    Report your first issue
                  </Link>
                </div>
              ) : (
                recentIssues.map((issue) => (
                  <div
                    key={issue?._id || issue?.id || issue?.title}
                    className="flex items-center rounded-[12px] bg-white px-[18px] py-[14px]"
                    style={{ border: "0.5px solid #E4E8EA" }}
                  >
                    <span
                      className="mr-4 inline-block rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium uppercase"
                      style={{ background: "#EAF4F4", color: "#3A7D7B" }}
                    >
                      {issue?.category || "GENERAL"}
                    </span>

                    <div className="flex-1">
                      <p className="text-[15px] font-medium" style={{ color: "#1C2B2B" }}>
                        {issue?.title || "Untitled issue"}
                      </p>
                    </div>

                    <span
                      className="mr-3 rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium"
                      style={getStatusBadgeStyle(issue?.status)}
                    >
                      {String(issue?.status || "reported").replace("_", " ")}
                    </span>

                    <Link
                      href={`/grievances/${issue?._id || issue?.id || ""}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full no-underline"
                      style={{ color: "#8A9BA8" }}
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
