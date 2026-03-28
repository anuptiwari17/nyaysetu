"use client";

/* eslint-disable @next/next/no-img-element */

import { Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

export default function NewGrievancePage() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Water Supply");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const nextUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextUrls);

    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  async function handleEnhance() {
    setAiLoading(true);
    setAiError("");

    try {
      const response = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "AI enhancement unavailable");
      }

      const result = json?.result || json?.data || json;
      setAiResult({
        suggestedCategory: result?.suggestedCategory || result?.category || "",
        assignedAuthority: result?.assignedAuthority || result?.authority || "",
        legalContext: result?.legalContext || "",
        structuredDescription: result?.structuredDescription || result?.description || "",
      });
    } catch (_error) {
      setAiError("AI enhancement unavailable. You can still submit your issue.");
      setAiResult(null);
    } finally {
      setAiLoading(false);
    }
  }

  function handleApplySuggestions() {
    if (!aiResult) {
      return;
    }

    if (aiResult.suggestedCategory) {
      setCategory(aiResult.suggestedCategory);
    }

    if (aiResult.structuredDescription) {
      setDescription(aiResult.structuredDescription);
    } else if (aiResult.legalContext) {
      setDescription((prev) => {
        if (!prev.trim()) {
          return aiResult.legalContext;
        }
        return `${prev}\n\n${aiResult.legalContext}`;
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          city: "Jalandhar",
          location,
          description,
          anonymous,
          evidence: files.map((file) => file.name),
          suggestedCategory: aiResult?.suggestedCategory || "",
          assignedAuthority: aiResult?.assignedAuthority || "",
          legalContext: aiResult?.legalContext || "",
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || "Failed to submit issue");
      }

      const newId =
        json?.grievance?._id ||
        json?.grievance?.id ||
        json?.id ||
        json?.data?._id ||
        json?.data?.id;

      toast.success("Issue reported successfully!");

      setTimeout(() => {
        if (newId) {
          router.push(`/grievances/${newId}`);
        } else {
          router.push("/grievances");
        }
      }, 500);
    } catch (error) {
      toast.error(error.message || "Unable to submit issue");
    } finally {
      setSubmitting(false);
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
      <Toaster position="top-center" />

      <main className="mx-auto max-w-[680px] px-5 pb-10 pt-24">
        <h1 className="text-[26px] font-medium" style={{ color: "#1C2B2B" }}>
          Report a Civic Issue
        </h1>
        <p className="mt-1 text-[14px]" style={{ color: "#8A9BA8" }}>
          Your complaint will be structured by AI and routed to the right authority.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-[14px] bg-white px-8 py-7"
          style={{ border: "0.5px solid #E4E8EA" }}
        >
          <div className="space-y-5">
            <div>
              <label
                htmlFor="title"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Issue Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. No water supply in Model Town for 3 days"
                className="w-full rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none focus:ring-0"
                style={{ border: "0.5px solid #E4E8EA", background: "#EEF2F2", color: "#1C2B2B" }}
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Category
              </label>
              <select
                id="category"
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none focus:ring-0"
                style={{ border: "0.5px solid #E4E8EA", background: "#EEF2F2", color: "#1C2B2B" }}
              >
                <option value="Water Supply">Water Supply</option>
                <option value="Roads & Footpaths">Roads & Footpaths</option>
                <option value="Electricity">Electricity</option>
                <option value="Sanitation & Garbage">Sanitation & Garbage</option>
                <option value="Parks & Green Areas">Parks & Green Areas</option>
                <option value="Street Lighting">Street Lighting</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="location"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Location in Jalandhar
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Model Town, Phase 2"
                className="w-full rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none focus:ring-0"
                style={{ border: "0.5px solid #E4E8EA", background: "#EEF2F2", color: "#1C2B2B" }}
              />
              <p className="mt-1 text-[12px]" style={{ color: "#B0BEC5" }}>
                (optional but helps routing)
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Describe the Issue
              </label>
              <textarea
                id="description"
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Provide details — how long has this been happening, who is affected, what have you tried..."
                className="w-full resize-none rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none focus:ring-0"
                style={{
                  border: "0.5px solid #E4E8EA",
                  background: "#EEF2F2",
                  color: "#1C2B2B",
                  minHeight: "120px",
                }}
              />
            </div>

            <div>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(event) => setAnonymous(event.target.checked)}
                  className="mt-[2px]"
                  style={{ accentColor: "#3A7D7B" }}
                />
                <span>
                  <span className="text-[13px]" style={{ color: "#4A6060" }}>
                    Submit anonymously
                  </span>
                  <span className="ml-1 text-[12px]" style={{ color: "#B0BEC5" }}>
                    (your name won&apos;t be shown publicly)
                  </span>
                </span>
              </label>
            </div>

            <div>
              <p className="mb-1.5 block text-[12px] font-medium" style={{ color: "#4A6060" }}>
                Upload Evidence (optional)
              </p>
              <label
                htmlFor="evidence-upload"
                className="block cursor-pointer rounded-[10px] px-5 py-6 text-center"
                style={{ border: "1.5px dashed #E4E8EA", color: "#B0BEC5" }}
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload size={18} />
                  <span className="text-[13px]">Click to upload photos</span>
                </div>
                <input
                  id="evidence-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => setFiles(Array.from(event.target.files || []))}
                />
              </label>

              {previewUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewUrls.map((url, index) => (
                    <img
                      key={`${url}-${index}`}
                      src={url}
                      alt="Evidence preview"
                      className="h-[60px] w-[60px] rounded-[8px] object-cover"
                      style={{ border: "0.5px solid #E4E8EA" }}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div
              className="rounded-[12px] px-5 py-4"
              style={{ background: "#EEF0FB", border: "0.5px solid #C7CFE8" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#5B6FA6" }}>
                  <Sparkles size={14} />
                  Enhance with AI
                  <span
                    className="rounded-[20px] px-1.5 py-[1px] text-[10px]"
                    style={{ background: "#DCE3F8", color: "#5B6FA6" }}
                  >
                    Beta
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleEnhance}
                  disabled={aiLoading}
                  className="inline-flex items-center justify-center rounded-[8px] px-4 py-1.5 text-[13px] text-white"
                  style={{ background: "#5B6FA6" }}
                >
                  {aiLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Enhancing...
                    </span>
                  ) : (
                    "Enhance"
                  )}
                </button>
              </div>

              <p className="mt-1 text-[12px]" style={{ color: "#8A9BA8" }}>
                AI will structure your complaint and add legal context.
              </p>

              {aiError ? (
                <p className="mt-2 text-[12px]" style={{ color: "#8A9BA8" }}>
                  AI enhancement unavailable. You can still submit your issue.
                </p>
              ) : null}

              {aiResult ? (
                <div className="mt-3 space-y-2 rounded-[10px] bg-white px-4 py-3" style={{ border: "0.5px solid #D6DCF2" }}>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B6FA6" }}>
                      Suggested Category
                    </p>
                    <p className="text-[13px]" style={{ color: "#4A6060" }}>
                      {aiResult.suggestedCategory || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B6FA6" }}>
                      Assigned Authority
                    </p>
                    <p className="text-[13px]" style={{ color: "#4A6060" }}>
                      {aiResult.assignedAuthority || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "#5B6FA6" }}>
                      Legal Context
                    </p>
                    <p className="text-[13px]" style={{ color: "#4A6060" }}>
                      {aiResult.legalContext || "N/A"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplySuggestions}
                    className="rounded-[8px] px-3 py-1.5 text-[12px]"
                    style={{ border: "1px solid #5B6FA6", color: "#5B6FA6", background: "transparent" }}
                  >
                    Apply suggestions
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center rounded-[10px] px-4 py-3 text-[15px] font-medium text-white"
              style={{ background: "#3A7D7B" }}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                "Submit Issue"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
