"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Sparkles, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import {
  MAX_IMAGE_SIZE_BYTES,
  assertValidImageFile,
  uploadImageToFirebase,
} from "@/lib/firebase/storage";
import { useUser } from "@/lib/useUser";

function formatSize(bytes) {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export default function NewPetitionPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [grievanceId, setGrievanceId] = useState("");

  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkedIssue, setLinkedIssue] = useState(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [ownerError, setOwnerError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(null);

  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsError, setSuggestionsError] = useState("");
  const [quotaInfo, setQuotaInfo] = useState(null);
  const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState(0);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const cityForPetition = linkedIssue?.city || user?.city || "Jalandhar";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setGrievanceId(params.get("grievanceId") || "");
  }, []);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    async function fetchQuota() {
      try {
        const res = await fetch("/api/petitions?quota=true");
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !isActive) return;

        const quota = json?.quota || null;
        setQuotaInfo(quota);
        setCooldownRemainingSeconds(Math.max(0, Number(quota?.cooldownRemainingSeconds || 0)));
        setDailyLimitReached(Number(quota?.petitionsTodayCount || 0) >= Number(quota?.dailyLimit || 3));
      } catch {
        if (!isActive) return;
      }
    }

    fetchQuota();
    return () => {
      isActive = false;
    };
  }, [user]);

  useEffect(() => {
    if (cooldownRemainingSeconds <= 0) return undefined;

    const timer = setInterval(() => {
      setCooldownRemainingSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [cooldownRemainingSeconds]);

  useEffect(() => {
    if (!grievanceId) {
      setLinkedIssue(null);
      return;
    }

    let isActive = true;

    async function fetchLinkedIssue() {
      setIssueLoading(true);
      try {
        const res = await fetch(`/api/grievances/${grievanceId}`);
        const json = await res.json().catch(() => ({}));
        if (!isActive) return;
        const issue = json?.grievance || json?.data || null;
        setLinkedIssue(issue);
        if (issue?.location) {
          setLocation(issue.location);
        }
      } catch {
        if (!isActive) return;
        setLinkedIssue(null);
      } finally {
        if (!isActive) return;
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
  const canEscalateThisIssue =
    !grievanceId || !linkedIssue || (linkedIssueCreatorId && currentUserId === linkedIssueCreatorId);

  useEffect(() => {
    if (!grievanceId) {
      setOwnerError("");
      return;
    }
    if (issueLoading) return;
    if (linkedIssue && !canEscalateThisIssue) {
      setOwnerError("Only the grievance creator can escalate it to a petition.");
      return;
    }
    setOwnerError("");
  }, [grievanceId, linkedIssue, issueLoading, canEscalateThisIssue]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [thumbnailFile]);

  useEffect(() => {
    if (!showSuggestions) {
      setSuggestions([]);
      setSuggestionsError("");
      return;
    }

    if (title.trim().length < 8) {
      setSuggestions([]);
      setSuggestionsError("");
      return;
    }

    let isActive = true;
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      setSuggestionsError("");

      try {
        const params = new URLSearchParams({
          suggest: "true",
          title: title.trim(),
          city: cityForPetition,
          limit: "5",
        });

        if (location.trim()) {
          params.set("location", location.trim());
        }

        const res = await fetch(`/api/petitions?${params.toString()}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.message || "Unable to fetch suggestions");
        }

        if (!isActive) return;

        const list = Array.isArray(json?.petitions)
          ? json.petitions
          : Array.isArray(json?.data)
            ? json.data
            : [];

        setSuggestions(list);
      } catch (error) {
        if (!isActive) return;
        setSuggestions([]);
        setSuggestionsError(error.message || "Unable to fetch suggestions");
      } finally {
        if (!isActive) return;
        setSuggestionsLoading(false);
      }
    }, 350);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [title, cityForPetition, location, showSuggestions]);

  const topTags = useMemo(() => {
    const ranked = new Map();
    suggestions.forEach((petition) => {
      (petition?.tags || []).forEach((tag) => {
        const key = String(tag || "").trim().toLowerCase();
        if (!key) return;
        ranked.set(key, (ranked.get(key) || 0) + 1);
      });
    });

    return [...ranked.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);
  }, [suggestions]);

  function addTag(rawTag) {
    const tag = String(rawTag || "")
      .trim()
      .toLowerCase();

    if (!tag) return;
    if (tags.includes(tag)) return;
    if (tags.length >= 8) return;
    setTags((prev) => [...prev, tag]);
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((item) => item !== tag));
  }

  function handleTagInputKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (!tagInput.trim()) return;
      addTag(tagInput);
      setTagInput("");
    }
  }

  function handleThumbnailSelect(event) {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setThumbnailFile(null);
      return;
    }

    try {
      assertValidImageFile(file, "Petition thumbnail");
      setThumbnailFile(file);
      setSubmitError("");
    } catch (error) {
      setSubmitError(error.message || "Invalid thumbnail image");
      setThumbnailFile(null);
      event.target.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (dailyLimitReached) {
      setSubmitError("Daily limit reached (3 petitions per day). Try again tomorrow.");
      return;
    }

    if (cooldownRemainingSeconds > 0) {
      const minutes = Math.ceil(cooldownRemainingSeconds / 60);
      setSubmitError(`Please wait ${minutes} minute${minutes === 1 ? "" : "s"} before creating another petition.`);
      return;
    }

    if (!canEscalateThisIssue) {
      setOwnerError("Only the grievance creator can escalate it to a petition.");
      return;
    }

    if (!thumbnailFile) {
      setSubmitError("Petition thumbnail is required.");
      return;
    }

    setSubmitError("");
    setSubmitting(true);

    try {
      assertValidImageFile(thumbnailFile, "Petition thumbnail");
      const thumbnailUrl = await uploadImageToFirebase(thumbnailFile, "petitions/thumbnails");

      const res = await fetch("/api/petitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          thumbnailUrl,
          tags,
          city: cityForPetition,
          location,
          issueId: grievanceId || null,
          type: grievanceId ? "linked" : "independent",
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.code === "PETITION_COOLDOWN") {
          const retryAfterSeconds = Math.max(0, Number(json?.retryAfterSeconds || 0));
          setCooldownRemainingSeconds(retryAfterSeconds);
          setDailyLimitReached(false);
          setQuotaInfo((prev) => ({
            ...(prev || {}),
            dailyLimit: Number(json?.dailyLimit || prev?.dailyLimit || 3),
            petitionsTodayCount: Number(json?.petitionsTodayCount || prev?.petitionsTodayCount || 0),
            remainingToday: Number(json?.remainingToday || prev?.remainingToday || 0),
            cooldownRemainingSeconds: retryAfterSeconds,
          }));
        }

        if (json?.code === "PETITION_DAILY_LIMIT") {
          setDailyLimitReached(true);
          setCooldownRemainingSeconds(0);
          setQuotaInfo((prev) => ({
            ...(prev || {}),
            dailyLimit: Number(json?.dailyLimit || prev?.dailyLimit || 3),
            petitionsTodayCount: Number(json?.petitionsTodayCount || prev?.petitionsTodayCount || 3),
            remainingToday: 0,
            cooldownRemainingSeconds: 0,
          }));
        }

        throw new Error(json?.message || "Unable to create petition");
      }

      if (json?.quota) {
        setQuotaInfo(json.quota);
        setCooldownRemainingSeconds(Math.max(0, Number(json.quota?.cooldownRemainingSeconds || 0)));
        setDailyLimitReached(Number(json.quota?.petitionsTodayCount || 0) >= Number(json.quota?.dailyLimit || 3));
      }

      const newId = json?.petition?._id || json?.petition?.id || json?.id || json?.data?._id || json?.data?.id;
      router.push(newId ? `/petition/${newId}` : "/petition");
    } catch (error) {
      setSubmitError(error.message || "Unable to create petition");
      setSubmitting(false);
    }
  }

  async function handleGenerateDraft(mode = "generate") {
    setAiLoading(true);
    setAiError("");

    try {
      const res = await fetch("/api/ai/petition-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          assistantPrompt,
          currentTitle: title,
          currentDescription: description,
          linkedIssueTitle: linkedIssue?.title || "",
          linkedIssueDescription: linkedIssue?.description || "",
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || "Unable to generate draft");
      }

      const result = json?.result || null;
      if (!result?.title || !result?.description) {
        throw new Error("AI generated an incomplete draft. Try once more.");
      }

      setAiResult(result);
    } catch (error) {
      setAiError(error.message || "AI is unavailable right now. Please try again.");
      setAiResult(null);
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiDraft() {
    if (!aiResult) return;
    setTitle(aiResult.title || "");
    setDescription(aiResult.description || "");
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#FAFAF8" }}>
        <div style={{ height: "32px", width: "32px", borderRadius: "50%", border: "2px solid #4A6FA9", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  const canCreateFromQuota = !dailyLimitReached && cooldownRemainingSeconds <= 0;
  const createButtonDisabled = submitting || !canEscalateThisIssue || !canCreateFromQuota;
  const cooldownMinutes = Math.ceil(cooldownRemainingSeconds / 60);

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "15px",
    border: "1px solid #E8E1D5",
    background: "#F5F2ED",
    color: "#171717",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "DM Sans, sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "72px 24px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px", fontSize: "13px" }}>
          <Link href={dashboardHref} style={{ color: "#4A6FA9", textDecoration: "none" }}>&lt;- Dashboard</Link>
          <span style={{ color: "#D1D5DB" }}>|</span>
          <Link href="/petition" style={{ color: "#4A6FA9", textDecoration: "none" }}>All Petitions</Link>
        </div>

        <h1 style={{ margin: "0 0 6px", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 700, lineHeight: 1.1, color: "#171717", fontFamily: "Fraunces, Georgia, serif" }}>
          Start a Petition
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: "15px", color: "#666666" }}>
          Add a clear title, a meaningful thumbnail, and collaborate by checking similar petitions first.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
          <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
            {grievanceId && (
              <div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "14px 16px", border: "1px solid #E8E1D5" }}>
                <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999999" }}>
                  Linked Issue
                </p>
                {issueLoading ? (
                  <div style={{ height: "36px", borderRadius: "8px", background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
                ) : (
                  <div style={{ borderRadius: "8px", background: "#FAFAF8", padding: "10px 12px", border: "1px solid #E8E1D5" }}>
                    <p style={{ margin: 0, fontSize: "14px", color: "#555555" }}>
                      {linkedIssue?.title || "Linked grievance"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {ownerError && (
              <div style={{ borderRadius: "8px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FCA5A5" }}>
                <p style={{ margin: 0, fontSize: "13px", color: "#B91C1C" }}>{ownerError}</p>
              </div>
            )}

            <section style={{ background: "#FFFFFF", borderRadius: "16px", padding: "20px", border: "1px solid #C7D2F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Sparkles size={16} color="#4A6FA9" />
                <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0D1B2A" }}>AI Petition Assistant</h2>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#666666" }}>
                Describe your intent and get a cleaner petition draft before posting.
              </p>

              <textarea
                value={assistantPrompt}
                onChange={(e) => setAssistantPrompt(e.target.value)}
                placeholder="Explain issue, impact, and expected authority action..."
                style={{ ...fieldStyle, minHeight: "110px", resize: "vertical", background: "#F8FAFC", fontSize: "14px", lineHeight: 1.55 }}
              />

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleGenerateDraft("generate")}
                  disabled={aiLoading || assistantPrompt.trim().length < 15}
                  style={{ borderRadius: "9px", padding: "9px 14px", fontSize: "13px", fontWeight: 700, border: "none", color: "#FFFFFF", background: aiLoading || assistantPrompt.trim().length < 15 ? "#9CA3AF" : "#4A6FA9", cursor: aiLoading || assistantPrompt.trim().length < 15 ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <WandSparkles size={14} />
                  {aiLoading ? "Generating..." : "Generate Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateDraft("improve")}
                  disabled={aiLoading || assistantPrompt.trim().length < 15 || (!title.trim() && !description.trim())}
                  style={{ borderRadius: "9px", padding: "9px 14px", fontSize: "13px", fontWeight: 700, border: "1px solid #4A6FA9", color: "#4A6FA9", background: "#FFFFFF", cursor: aiLoading || assistantPrompt.trim().length < 15 || (!title.trim() && !description.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  Improve Current Draft
                </button>
              </div>

              {aiError && <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#B91C1C" }}>{aiError}</p>}

              {aiResult && (
                <div style={{ marginTop: "12px", borderRadius: "10px", background: "#EEF2FF", border: "1px solid #C7D2F0", padding: "12px" }}>
                  <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4A6FA9" }}>AI Draft Preview</p>
                  <p style={{ margin: "5px 0 0", fontSize: "14px", fontWeight: 700, color: "#0D1B2A" }}>{aiResult.title}</p>
                  <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#555555", whiteSpace: "pre-line", lineHeight: 1.6 }}>{aiResult.description}</p>
                  <button
                    type="button"
                    onClick={applyAiDraft}
                    style={{ marginTop: 10, borderRadius: "8px", padding: "8px 12px", fontSize: "13px", fontWeight: 700, border: "none", color: "#FFFFFF", background: "#4A6FA9", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Use This Draft
                  </button>
                </div>
              )}
            </section>

            <form
              onSubmit={handleSubmit}
              style={{ background: "#FFFFFF", borderRadius: "16px", padding: "24px", border: "1px solid #E8E1D5", display: "flex", flexDirection: "column", gap: "18px" }}
            >
              <div>
                <label htmlFor="petition-title" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#555555" }}>Title</label>
                <input id="petition-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Restore street lighting in Model Town" style={fieldStyle} />
              </div>

              <div>
                <label htmlFor="petition-location" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#555555" }}>
                  Location
                </label>
                <input
                  id="petition-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Model Town, Phase 2"
                  style={fieldStyle}
                />
              </div>

              <div>
                <label htmlFor="petition-tags" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#555555" }}>
                  Tags
                </label>
                <input
                  id="petition-tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) {
                      addTag(tagInput);
                      setTagInput("");
                    }
                  }}
                  placeholder="Type tag and press Enter (e.g. roads, water, safety)"
                  style={fieldStyle}
                />
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tags.map((tag) => (
                    <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 999, fontSize: 12, border: "1px solid #D5DEFA", background: "#EEF2FF", color: "#4A6FA9" }}>
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ border: "none", background: "transparent", padding: 0, margin: 0, cursor: "pointer", color: "#4A6FA9", lineHeight: 1 }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600, color: "#555555" }}>
                  Petition Thumbnail <span style={{ color: "#B91C1C" }}>*</span>
                </p>
                <label htmlFor="petition-thumbnail" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, padding: "18px", border: "1.5px dashed #D1D5DB", background: "#FAFAF8", cursor: "pointer", textAlign: "center", color: "#666666", fontSize: 13 }}>
                  <ImagePlus size={16} />
                  {thumbnailFile ? thumbnailFile.name : "Click to upload thumbnail (JPG/PNG/WEBP)"}
                  <input id="petition-thumbnail" type="file" accept="image/*" style={{ display: "none" }} onChange={handleThumbnailSelect} />
                </label>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#999999" }}>
                  Max size: {formatSize(MAX_IMAGE_SIZE_BYTES)}
                </p>
                {thumbnailPreview && (
                  <img src={thumbnailPreview} alt="Petition thumbnail preview" style={{ marginTop: 10, width: "100%", maxWidth: 280, height: 160, objectFit: "cover", borderRadius: 10, border: "1px solid #E8E1D5" }} />
                )}
              </div>

              <div>
                <label htmlFor="petition-description" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#555555" }}>Description</label>
                <textarea id="petition-description" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain why this matters and what change is needed..." style={{ ...fieldStyle, minHeight: "180px", resize: "vertical", lineHeight: 1.65 }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", borderRadius: "8px", background: "#F5F2ED", border: "1px solid #E8E1D5" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999" }}>Type:</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: grievanceId ? "#4A6FA9" : "#555555" }}>
                  {grievanceId ? "Linked to a grievance" : "Independent petition"}
                </span>
              </div>

              <div style={{ borderRadius: "10px", border: "1px solid #E8E1D5", background: "#FAFAF8", padding: "11px 12px" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999999" }}>
                  Petition Limits
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#555555" }}>
                  Max 3 petitions/day and 10-minute cooldown between two petitions.
                </p>
                {quotaInfo && (
                  <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#4A6FA9", fontWeight: 600 }}>
                    Today: {Number(quotaInfo?.petitionsTodayCount || 0)}/{Number(quotaInfo?.dailyLimit || 3)} used
                    {Number.isFinite(Number(quotaInfo?.remainingToday)) ? ` | Remaining: ${Math.max(0, Number(quotaInfo?.remainingToday || 0))}` : ""}
                  </p>
                )}
                {cooldownRemainingSeconds > 0 && (
                  <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#B45309", fontWeight: 600 }}>
                    Cooldown active: wait {cooldownMinutes} minute{cooldownMinutes === 1 ? "" : "s"}.
                  </p>
                )}
                {dailyLimitReached && (
                  <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#B91C1C", fontWeight: 600 }}>
                    Daily limit reached. You can create new petitions tomorrow.
                  </p>
                )}
              </div>

              {submitError && <p style={{ margin: 0, fontSize: "13px", color: "#B91C1C" }}>{submitError}</p>}

              <button type="submit" disabled={createButtonDisabled} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", borderRadius: "10px", padding: "13px", fontSize: "15px", fontWeight: 700, color: "#FFFFFF", background: createButtonDisabled ? "#9CA3AF" : "#4A6FA9", border: "none", cursor: createButtonDisabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s" }}>
                {submitting ? "Creating..." : cooldownRemainingSeconds > 0 ? `Wait ${cooldownMinutes}m` : dailyLimitReached ? "Daily Limit Reached" : "Create Petition"}
              </button>
            </form>
          </section>

          <aside style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E8E1D5", padding: 16, height: "fit-content" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0D1B2A" }}>Similar Petitions</p>
              <button
                type="button"
                onClick={() => setShowSuggestions((prev) => !prev)}
                style={{ border: "1px solid #E8E1D5", background: showSuggestions ? "#EEF2FF" : "#FFFFFF", color: showSuggestions ? "#4A6FA9" : "#666666", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                {showSuggestions ? "On" : "Off"}
              </button>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#777" }}>
              Avoid duplicate petitions by joining an existing one in your area.
            </p>

            {!showSuggestions ? (
              <p style={{ margin: 0, fontSize: 13, color: "#999" }}>Suggestions are disabled.</p>
            ) : suggestionsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 58, borderRadius: 10, background: "#F3F4F6", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : suggestionsError ? (
              <p style={{ margin: 0, fontSize: 13, color: "#B91C1C" }}>{suggestionsError}</p>
            ) : suggestions.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#999" }}>No close matches yet. Your petition can be unique.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {suggestions.map((petition) => {
                  const id = petition?._id || petition?.id || "";
                  return (
                    <Link
                      key={id || petition?.title}
                      href={`/petition/${id}`}
                      style={{ border: "1px solid #E8E1D5", borderRadius: 10, padding: 10, textDecoration: "none", background: "#FAFAF8", color: "inherit" }}
                    >
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0D1B2A", lineHeight: 1.4 }}>
                        {petition?.title || "Untitled petition"}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#777" }}>
                        {(petition?.city || cityForPetition) + (petition?.location ? ` | ${petition.location}` : "")}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}

            {topTags.length > 0 && showSuggestions && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999" }}>
                  Popular Tags Nearby
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {topTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      style={{ fontSize: 12, borderRadius: 999, padding: "4px 9px", border: "1px solid #D5DEFA", background: "#EEF2FF", color: "#4A6FA9", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      + #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      <style>{`
        @media (min-width: 1024px) {
          main > div:last-child {
            grid-template-columns: minmax(0, 1fr) 330px !important;
            align-items: start;
          }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
      `}</style>
    </div>
  );
}
