"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CitizenSidebar from "@/components/CitizenSidebar";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function MyPetitionsPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [activeFilter, setActiveFilter] = useState("created");
  const [petitionsLoading, setPetitionsLoading] = useState(true);
  const [petitions, setPetitions] = useState([]);
  const [signingId, setSigningId] = useState("");

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

    async function fetchPetitions() {
      setPetitionsLoading(true);

      try {
        const endpoint =
          activeFilter === "created"
            ? "/api/petitions?createdBy=me"
            : "/api/petitions?signedBy=me";

        const response = await fetch(endpoint);
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

        setPetitionsLoading(false);
      }
    }

    fetchPetitions();

    return () => {
      isActive = false;
    };
  }, [activeFilter, user]);

  const normalizedPetitions = useMemo(() => {
    const userId = String(user?._id || user?.id || "");

    return petitions.map((petition) => {
      const signatures = Array.isArray(petition?.signatures) ? petition.signatures : [];
      const signatureCount = Number.isFinite(Number(petition?.signatureCount))
        ? Number(petition.signatureCount)
        : signatures.length;

      const isSigned = signatures.some((signer) => {
        const signerId = typeof signer === "string" ? signer : signer?._id || signer?.id;
        return String(signerId || "") === userId;
      });

      const progress = Math.max(0, Math.min(100, Math.round((signatureCount / 100) * 100)));

      return {
        ...petition,
        signatureCount,
        isSigned: petition?.isSigned === true || isSigned,
        progress,
        linkedIssueTitle:
          petition?.issueTitle || petition?.grievanceTitle || petition?.issueId?.title || null,
      };
    });
  }, [petitions, user?._id, user?.id]);

  async function handleSign(petitionId) {
    if (!user) {
      router.push("/login");
      return;
    }

    const id = String(petitionId || "");
    if (!id) {
      return;
    }

    setSigningId(id);

    try {
      const response = await fetch(`/api/petitions/${id}/sign`, {
        method: "POST",
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.message || "Unable to sign petition");
      }

      const userId = String(user?._id || user?.id || "");

      setPetitions((previous) =>
        previous.map((item) => {
          const itemId = String(item?._id || item?.id || "");
          if (itemId !== id) {
            return item;
          }

          const signatures = Array.isArray(item?.signatures) ? [...item.signatures] : [];
          if (userId && !signatures.some((signer) => String(signer) === userId)) {
            signatures.push(userId);
          }

          const nextSignatureCount = Number.isFinite(Number(item?.signatureCount))
            ? Number(item.signatureCount) + 1
            : signatures.length;

          return {
            ...item,
            signatures,
            signatureCount: nextSignatureCount,
            isSigned: true,
          };
        })
      );
    } catch (_error) {
      return;
    } finally {
      setSigningId("");
    }
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
          <h1 className="text-[24px] font-medium" style={{ color: "#1C2B2B" }}>
            My Petitions
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter("created")}
              className="rounded-[20px] px-4 py-1.5 text-[13px]"
              style={
                activeFilter === "created"
                  ? { background: "#3A7D7B", color: "#FFFFFF" }
                  : { background: "#EEF2F2", color: "#4A6060" }
              }
            >
              Created by me
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("signed")}
              className="rounded-[20px] px-4 py-1.5 text-[13px]"
              style={
                activeFilter === "signed"
                  ? { background: "#3A7D7B", color: "#FFFFFF" }
                  : { background: "#EEF2F2", color: "#4A6060" }
              }
            >
              Signed by me
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {petitionsLoading ? (
              <>
                <div className="h-[170px] animate-pulse rounded-[14px] bg-gray-100" />
                <div className="h-[170px] animate-pulse rounded-[14px] bg-gray-100" />
              </>
            ) : normalizedPetitions.length === 0 ? (
              <div
                className="rounded-[14px] bg-white px-6 py-10 text-center"
                style={{ border: "0.5px solid #E4E8EA" }}
              >
                <p className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                  No petitions found
                </p>
                <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                  Petitions you create or sign will appear here.
                </p>
              </div>
            ) : (
              normalizedPetitions.map((petition) => (
                <article
                  key={petition?._id || petition?.id || petition?.title}
                  className="rounded-[14px] bg-white px-5 py-[18px]"
                  style={{ border: "0.5px solid #E4E8EA" }}
                >
                  <h2 className="text-[16px] font-medium" style={{ color: "#1C2B2B" }}>
                    {petition?.title || "Untitled petition"}
                  </h2>

                  {petition?.linkedIssueTitle ? (
                    <span
                      className="mt-2 inline-block rounded-[20px] px-[10px] py-[2px] text-[11px]"
                      style={{ background: "#EAF4F4", color: "#3A7D7B" }}
                    >
                      {petition.linkedIssueTitle}
                    </span>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-[13px]" style={{ color: "#8A9BA8" }}>
                      {petition.signatureCount} signatures
                    </p>
                    {petition.isSigned ? (
                      <span className="text-[13px] font-medium" style={{ color: "#2E7D32" }}>
                        Signed ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSign(petition?._id || petition?.id)}
                        disabled={signingId === String(petition?._id || petition?.id || "")}
                        className="rounded-[10px] px-3 py-1.5 text-[13px]"
                        style={{ border: "1.5px solid #3A7D7B", color: "#3A7D7B", background: "transparent" }}
                      >
                        {signingId === String(petition?._id || petition?.id || "") ? "Signing..." : "Sign"}
                      </button>
                    )}
                  </div>

                  <div className="mt-2 h-1 w-full rounded-[2px]" style={{ background: "#EEF2F2" }}>
                    <div
                      className="h-1 rounded-[2px]"
                      style={{ width: `${petition.progress}%`, background: "#3A7D7B" }}
                    />
                  </div>

                  <div className="mt-3 text-right">
                    <Link
                      href={`/petition/${petition?._id || petition?.id || ""}`}
                      className="text-[13px] no-underline"
                      style={{ color: "#3A7D7B" }}
                    >
                      View →
                    </Link>
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
