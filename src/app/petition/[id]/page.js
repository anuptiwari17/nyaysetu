"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function PetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const petitionId = params?.id;

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [petition, setPetition] = useState(null);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    if (!petitionId) {
      return;
    }

    let isActive = true;

    async function fetchPetition() {
      setLoading(true);

      try {
        const response = await fetch(`/api/petitions/${petitionId}`);
        const json = await response.json().catch(() => ({}));

        if (!isActive) {
          return;
        }

        const nextPetition = json?.petition || json?.data || null;
        setPetition(nextPetition);

        const userId = String(user?._id || user?.id || "");
        const signedFromFlag = nextPetition?.hasSigned === true || nextPetition?.isSigned === true;
        const signedFromSignatures = Array.isArray(nextPetition?.signatures)
          ? nextPetition.signatures.some((item) => {
              const id = typeof item === "string" ? item : item?._id || item?.id;
              return String(id || "") === userId;
            })
          : false;

        setHasSigned(Boolean(signedFromFlag || signedFromSignatures));
      } catch (_error) {
        if (!isActive) {
          return;
        }

        setPetition(null);
      } finally {
        if (!isActive) {
          return;
        }

        setLoading(false);
      }
    }

    fetchPetition();

    return () => {
      isActive = false;
    };
  }, [petitionId, user?._id, user?.id]);

  const signatureCount = useMemo(() => {
    if (!petition) {
      return 0;
    }

    if (Number.isFinite(Number(petition?.signatureCount))) {
      return Number(petition.signatureCount);
    }

    return Array.isArray(petition?.signatures) ? petition.signatures.length : 0;
  }, [petition]);

  const progressWidth = Math.max(0, Math.min(100, Math.round((signatureCount / 100) * 100)));

  async function handleSign() {
    if (!userLoading && !user) {
      router.push("/login");
      return;
    }

    if (!petitionId || hasSigned) {
      return;
    }

    setSigning(true);

    try {
      const response = await fetch(`/api/petitions/${petitionId}/sign`, {
        method: "POST",
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Unable to sign petition");
      }

      setHasSigned(true);
      setPetition((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          signatureCount: Number(previous.signatureCount || signatureCount) + 1,
        };
      });
    } catch (_error) {
      if (!user) {
        router.push("/login");
      }
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F5F8F8" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!petition) {
    return (
      <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
        <Navbar />
        <main className="mx-auto max-w-[700px] px-5 pt-24">
          <Link href="/grievances" className="text-[14px] no-underline" style={{ color: "#3A7D7B" }}>
            ← All Issues
          </Link>
          <div className="mt-4 rounded-[14px] bg-white px-6 py-10 text-center" style={{ border: "0.5px solid #E4E8EA" }}>
            <p className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
              Petition not found
            </p>
          </div>
        </main>
      </div>
    );
  }

  const linkedIssueId =
    (typeof petition?.issueId === "object" ? petition?.issueId?._id || petition?.issueId?.id : petition?.issueId) ||
    petition?.grievanceId ||
    "";
  const linkedIssueTitle =
    (typeof petition?.issueId === "object" ? petition?.issueId?.title : "") ||
    petition?.grievanceTitle ||
    petition?.issueTitle ||
    "";

  return (
    <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
      <Navbar />

      <main className="mx-auto max-w-[700px] px-5 pb-10 pt-24">
        <Link href="/grievances" className="text-[14px] no-underline" style={{ color: "#3A7D7B" }}>
          ← All Issues
        </Link>

        <article className="mt-4 rounded-[14px] bg-white px-8 py-7" style={{ border: "0.5px solid #E4E8EA" }}>
          <span
            className="inline-block rounded-[20px] px-[10px] py-[2px] text-[11px] uppercase"
            style={{ background: "#EEF0FB", color: "#5B6FA6" }}
          >
            Petition
          </span>

          <h1 className="mt-2.5 text-[24px] font-medium" style={{ color: "#1C2B2B" }}>
            {petition?.title || "Untitled petition"}
          </h1>

          {linkedIssueId || linkedIssueTitle ? (
            <div className="mt-4">
              <p className="text-[12px]" style={{ color: "#B0BEC5" }}>
                Linked Issue
              </p>
              <div
                className="mt-1.5 rounded-[10px] bg-[#F5F8F8] px-3.5 py-2.5"
                style={{ border: "0.5px solid #E4E8EA" }}
              >
                <p className="text-[13px]" style={{ color: "#4A6060" }}>
                  {linkedIssueTitle || "Linked grievance"}
                </p>
                {linkedIssueId ? (
                  <Link
                    href={`/grievances/${linkedIssueId}`}
                    className="mt-1 inline-block text-[12px] no-underline"
                    style={{ color: "#3A7D7B" }}
                  >
                    View Issue →
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          <p className="mt-4 text-[15px] leading-[1.8]" style={{ color: "#4A6060" }}>
            {petition?.description || "No description provided."}
          </p>

          <section className="mt-6">
            <p className="text-[18px] font-medium" style={{ color: "#1C2B2B" }}>
              {signatureCount} of 100 signatures
            </p>

            <div className="mt-2 h-1.5 w-full rounded-[3px]" style={{ background: "#EEF2F2" }}>
              <div className="h-1.5 rounded-[3px]" style={{ width: `${progressWidth}%`, background: "#3A7D7B" }} />
            </div>

            <button
              type="button"
              onClick={handleSign}
              disabled={hasSigned || signing}
              className="mt-5 inline-flex w-full items-center justify-center rounded-[10px] px-4 py-3 text-[15px] font-medium"
              style={
                hasSigned
                  ? { background: "#EAF4F4", color: "#3A7D7B" }
                  : { background: "#3A7D7B", color: "#FFFFFF" }
              }
            >
              {signing ? "Signing..." : hasSigned ? "You've signed this ✓" : "Sign this Petition"}
            </button>

            <p className="mt-2 text-[13px]" style={{ color: "#8A9BA8" }}>
              {signatureCount} citizens have signed
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
