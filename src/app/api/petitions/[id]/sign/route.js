import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import db from "@/lib/db";
import Petition from "@/models/Petition";
import User from "@/models/User";

const PETITION_SIGN_DAILY_LIMIT = 5;

function getTodayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function createQuotaError(code, message, status, extra = {}) {
  const error = new Error(message);
  error.isQuotaError = true;
  error.code = code;
  error.status = status;
  error.extra = extra;
  return error;
}

function buildSignQuota(user, now = new Date()) {
  const today = getTodayKey(now);
  const signedToday = user?.lastPetitionSignDay === today
    ? Number(user?.petitionsSignedTodayCount || 0)
    : 0;

  return {
    dailyLimit: PETITION_SIGN_DAILY_LIMIT,
    petitionsSignedTodayCount: signedToday,
    remainingToday: Math.max(PETITION_SIGN_DAILY_LIMIT - signedToday, 0),
  };
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

export async function POST(request, { params }) {
  let session = null;

  try {
    await db();
    const { id } = await Promise.resolve(params);

    const authUser = await getAuthUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();

    session = await mongoose.startSession();
    let nextSignatureCount = 0;
    let signQuota = null;

    await session.withTransaction(async () => {
      const user = await User.findById(authUser._id).session(session);
      if (!user) {
        throw createQuotaError("UNAUTHORIZED", "Unauthorized", 401);
      }

      const petition = await Petition.findById(id).session(session);
      if (!petition) {
        throw createQuotaError("PETITION_NOT_FOUND", "Petition not found", 404);
      }

      if (petition.status === "victory_declared") {
        throw createQuotaError("PETITION_CLOSED", "Petition has been closed by its creator", 409);
      }

      const today = getTodayKey(now);
      if (user.lastPetitionSignDay !== today) {
        user.petitionsSignedTodayCount = 0;
        user.lastPetitionSignDay = today;
      }

      const signedToday = Number(user.petitionsSignedTodayCount || 0);
      if (signedToday >= PETITION_SIGN_DAILY_LIMIT) {
        throw createQuotaError(
          "PETITION_SIGN_DAILY_LIMIT",
          "Daily signing limit reached (5 petitions per day)",
          429,
          {
            signQuota: {
              dailyLimit: PETITION_SIGN_DAILY_LIMIT,
              petitionsSignedTodayCount: signedToday,
              remainingToday: 0,
            },
          }
        );
      }

      const userId = String(authUser._id);
      const alreadySigned = (petition.signatures || []).some(
        (signerId) => String(signerId) === userId
      );

      const alreadySignedInEntries = Array.isArray(petition.signerEntries)
        ? petition.signerEntries.some((entry) => String(entry?.user || "") === userId)
        : false;

      if (alreadySigned || alreadySignedInEntries) {
        throw createQuotaError("ALREADY_SIGNED", "Already signed", 400);
      }

      petition.signatures = Array.isArray(petition.signatures) ? petition.signatures : [];
      petition.signatures.push(authUser._id);
      petition.signerEntries = Array.isArray(petition.signerEntries) ? petition.signerEntries : [];
      petition.signerEntries.push({ user: authUser._id, signedAt: now });
      await petition.save({ session });

      user.petitionsSignedTodayCount = signedToday + 1;
      user.lastPetitionSignDay = today;
      await user.save({ session });

      nextSignatureCount = petition.signatures.length;
      signQuota = buildSignQuota(user, now);
    });

    return NextResponse.json(
      {
        success: true,
        signatureCount: nextSignatureCount,
        signQuota,
      },
      { status: 200 }
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
      { success: false, message: error.message || "Failed to sign petition" },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
