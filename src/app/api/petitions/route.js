import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import Grievance from "@/models/Grievance";
import Petition from "@/models/Petition";
import User from "@/models/User";

const PETITION_DAILY_LIMIT = 3;
const PETITION_COOLDOWN_MINUTES = 10;
const PETITION_COOLDOWN_MS = PETITION_COOLDOWN_MINUTES * 60 * 1000;

function isAllowedFirebaseImageUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    return (
      host === "firebasestorage.googleapis.com" ||
      host.endsWith(".firebasestorage.app") ||
      host === "storage.googleapis.com"
    );
  } catch (_error) {
    return false;
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8))];
}

function buildTitleRegex(title) {
  const terms = String(title || "")
    .trim()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .slice(0, 6)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (terms.length === 0) return null;
  return new RegExp(terms.join("|"), "i");
}

async function getAuthUserFromRequest(request) {
  const token = request.cookies.get("token")?.value;

  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    return user || null;
  } catch (_error) {
    return null;
  }
}

function getTodayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getQuotaSnapshot(user, now = new Date()) {
  const today = getTodayKey(now);
  const todayCount = user?.lastPetitionDay === today ? Number(user?.petitionsTodayCount || 0) : 0;

  let cooldownRemainingSeconds = 0;
  if (user?.lastPetitionCreatedAt) {
    const elapsedMs = now.getTime() - new Date(user.lastPetitionCreatedAt).getTime();
    if (elapsedMs < PETITION_COOLDOWN_MS) {
      cooldownRemainingSeconds = Math.ceil((PETITION_COOLDOWN_MS - elapsedMs) / 1000);
    }
  }

  return {
    today,
    todayCount,
    remainingToday: Math.max(PETITION_DAILY_LIMIT - todayCount, 0),
    cooldownRemainingSeconds,
    canCreate: todayCount < PETITION_DAILY_LIMIT && cooldownRemainingSeconds === 0,
  };
}

function buildQuotaResponse(user, now = new Date()) {
  const snapshot = getQuotaSnapshot(user, now);
  return {
    canCreate: snapshot.canCreate,
    dailyLimit: PETITION_DAILY_LIMIT,
    petitionsTodayCount: snapshot.todayCount,
    remainingToday: snapshot.remainingToday,
    cooldownMinutes: PETITION_COOLDOWN_MINUTES,
    cooldownRemainingSeconds: snapshot.cooldownRemainingSeconds,
    nextAllowedAt:
      snapshot.cooldownRemainingSeconds > 0
        ? new Date(now.getTime() + snapshot.cooldownRemainingSeconds * 1000).toISOString()
        : null,
  };
}

function createQuotaError(code, message, status, extra = {}) {
  const error = new Error(message);
  error.isQuotaError = true;
  error.code = code;
  error.status = status;
  error.extra = extra;
  return error;
}

export async function GET(request) {
  try {
    await db();

    const params = request.nextUrl.searchParams;
    const createdBy = params.get("createdBy");
    const signedBy = params.get("signedBy");
    const queryText = String(params.get("q") || "").trim();
    const linkedTo = String(params.get("linkedTo") || "").trim();
    const unlinkedOnly = params.get("unlinked") === "true";
    const suggestMode = params.get("suggest") === "true";
    const suggestTitle = String(params.get("title") || "").trim();
    const city = String(params.get("city") || "").trim();
    const location = String(params.get("location") || "").trim();
    const quotaOnly = params.get("quota") === "true";
    const limit = Math.max(1, Math.min(100, Number(params.get("limit") || 50)));

    if (quotaOnly) {
      const authUser = await getAuthUserFromRequest(request);
      if (!authUser) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }

      const quota = buildQuotaResponse(authUser, new Date());
      return NextResponse.json({ success: true, quota }, { status: 200 });
    }

    const query = {};

    if (createdBy === "me" || signedBy === "me") {
      const authUser = await getAuthUserFromRequest(request);
      if (!authUser) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }

      if (createdBy === "me") {
        query.createdBy = authUser._id;
      }

      if (signedBy === "me") {
        query.signatures = { $in: [authUser._id] };
      }
    } else {
      if (createdBy) {
        query.createdBy = createdBy;
      }

      if (signedBy) {
        query.signatures = { $in: [signedBy] };
      }
    }

    if (queryText) {
      const escaped = queryText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
        { city: { $regex: escaped, $options: "i" } },
        { location: { $regex: escaped, $options: "i" } },
      ];
    }

    if (suggestMode && suggestTitle) {
      const titleRegex = buildTitleRegex(suggestTitle);
      const suggestionOr = [];

      if (titleRegex) {
        suggestionOr.push({ title: { $regex: titleRegex } });
        suggestionOr.push({ description: { $regex: titleRegex } });
        suggestionOr.push({ tags: { $regex: titleRegex } });
      }

      if (suggestionOr.length > 0) {
        query.$or = suggestionOr;
      }

      if (city) {
        query.city = city;
      }

      if (location) {
        const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.location = { $regex: escapedLocation, $options: "i" };
      }
    }

    if (linkedTo) {
      query.issueId = linkedTo;
    }

    if (unlinkedOnly) {
      query.issueId = null;
    }

    const petitions = await Petition.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: "issueId", select: "title" });

    return NextResponse.json(
      {
        success: true,
        petitions,
        total: petitions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch petitions" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  let session = null;

  try {
    await db();

    const authUser = await getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { title, description, thumbnailUrl, tags, issueId, type, city, location } = await request.json();

    if (!title || !description || !thumbnailUrl) {
      return NextResponse.json(
        { success: false, message: "title, description and thumbnailUrl are required" },
        { status: 400 }
      );
    }

    if (!isAllowedFirebaseImageUrl(thumbnailUrl)) {
      return NextResponse.json(
        { success: false, message: "thumbnailUrl must be a valid Firebase HTTPS URL" },
        { status: 400 }
      );
    }

    const normalizedTags = normalizeTags(tags);
    const now = new Date();
    let createdPetitionId = null;

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const user = await User.findById(authUser._id).session(session);
      if (!user) {
        throw createQuotaError("UNAUTHORIZED", "Unauthorized", 401);
      }

      const today = getTodayKey(now);
      if (user.lastPetitionDay !== today) {
        user.petitionsTodayCount = 0;
        user.lastPetitionDay = today;
      }

      const petitionsTodayCount = Number(user.petitionsTodayCount || 0);
      if (petitionsTodayCount >= PETITION_DAILY_LIMIT) {
        throw createQuotaError(
          "PETITION_DAILY_LIMIT",
          "Daily limit reached (3 petitions per day)",
          429,
          {
            dailyLimit: PETITION_DAILY_LIMIT,
            petitionsTodayCount,
            remainingToday: 0,
            cooldownRemainingSeconds: 0,
          }
        );
      }

      if (user.lastPetitionCreatedAt) {
        const elapsedMs = now.getTime() - new Date(user.lastPetitionCreatedAt).getTime();
        if (elapsedMs < PETITION_COOLDOWN_MS) {
          const retryAfterSeconds = Math.ceil((PETITION_COOLDOWN_MS - elapsedMs) / 1000);
          const waitMinutes = Math.ceil(retryAfterSeconds / 60);

          throw createQuotaError(
            "PETITION_COOLDOWN",
            `Wait ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"} before creating another petition`,
            429,
            {
              retryAfterSeconds,
              dailyLimit: PETITION_DAILY_LIMIT,
              petitionsTodayCount,
              remainingToday: Math.max(PETITION_DAILY_LIMIT - petitionsTodayCount, 0),
            }
          );
        }
      }

      let linkedGrievance = null;
      if (issueId) {
        linkedGrievance = await Grievance.findById(issueId).session(session);

        if (!linkedGrievance) {
          throw createQuotaError("LINKED_GRIEVANCE_NOT_FOUND", "Linked grievance not found", 404);
        }

        if (String(linkedGrievance.createdBy) !== String(authUser._id)) {
          throw createQuotaError(
            "GRIEVANCE_ESCALATION_FORBIDDEN",
            "Only the grievance creator can escalate it to a petition",
            403
          );
        }

        if (linkedGrievance.petitionId) {
          throw createQuotaError(
            "GRIEVANCE_ALREADY_LINKED",
            "This grievance already has a linked petition",
            409
          );
        }
      }

      const petitionDocs = await Petition.create(
        [
          {
            title: String(title).trim(),
            description: String(description).trim(),
            thumbnailUrl: String(thumbnailUrl).trim(),
            tags: normalizedTags,
            city: String(linkedGrievance?.city || city || user?.city || "").trim(),
            location: String(linkedGrievance?.location || location || "").trim(),
            createdBy: user._id,
            issueId: issueId || null,
            signatures: [],
            signerEntries: [],
            type: type || (issueId ? "linked" : "independent"),
            status: "active",
            victoryDeclaredAt: null,
          },
        ],
        { session }
      );

      const petition = petitionDocs[0];
      createdPetitionId = petition._id;

      if (linkedGrievance) {
        linkedGrievance.petitionId = petition._id;
        await linkedGrievance.save({ session });
      }

      user.lastPetitionCreatedAt = now;
      user.petitionsTodayCount = petitionsTodayCount + 1;
      user.lastPetitionDay = today;
      await user.save({ session });
    });

    const populated = await Petition.findById(createdPetitionId).populate({ path: "issueId", select: "title" });
    const refreshedUser = await User.findById(authUser._id).select("lastPetitionCreatedAt petitionsTodayCount lastPetitionDay");

    return NextResponse.json(
      {
        success: true,
        petition: populated,
        quota: buildQuotaResponse(refreshedUser, now),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error?.isQuotaError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: error.code,
          ...error.extra,
        },
        { status: error.status || 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || "Failed to create petition" },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
