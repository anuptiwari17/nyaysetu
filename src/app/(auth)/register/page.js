"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signOut,
  signInWithEmailLink,
} from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase/client";

function normalizePhone(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [firebaseEmailToken, setFirebaseEmailToken] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [firebasePhoneToken, setFirebasePhoneToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("Jalandhar");
  const [state, setState] = useState("Punjab");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!emailLinkSent || countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [emailLinkSent, countdown]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const completeEmailLinkSignIn = async () => {
      try {
        if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) {
          return;
        }

        const storedEmail = window.localStorage.getItem("nyaysetuEmailForSignIn");
        const candidateEmail = String(storedEmail || email || "").trim();
        if (!candidateEmail) {
          setError("Missing email context. Please enter your email and request the link again.");
          return;
        }

        const result = await signInWithEmailLink(firebaseAuth, candidateEmail, window.location.href);
        const token = await result.user.getIdToken(true);

        setEmail(candidateEmail);
        setFirebaseEmailToken(token);
        setEmailVerified(true);
        setError("");
        setStep(2);
        await signOut(firebaseAuth).catch(() => {});
        window.localStorage.removeItem("nyaysetuEmailForSignIn");
        router.replace("/register");
      } catch (linkError) {
        setError(linkError.message || "Unable to verify email link. Please try again.");
      }
    };

    completeEmailLinkSignIn();
  }, [email, router]);

  async function sendEmailOtp() {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address first.");
      return;
    }

    setError("");
    setEmailVerified(false);
    setFirebaseEmailToken("");
    setLoading(true);

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/register`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(firebaseAuth, email, actionCodeSettings);
      window.localStorage.setItem("nyaysetuEmailForSignIn", email);
      setEmailLinkSent(true);
      setCountdown(30);
    } catch (emailOtpError) {
      setError(emailOtpError.message || "Unable to send verification link right now.");
    } finally {
      setLoading(false);
    }
  }

  async function initializeRecaptcha() {
    if (typeof window === "undefined") {
      return null;
    }

    if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === "function") {
      try {
        window.recaptchaVerifier.clear();
      } catch (_error) {
        // ignore clear failures
      }
      window.recaptchaVerifier = null;
    }

    const verifier = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        setError("reCAPTCHA expired. Please tap Send Phone OTP again.");
      },
    });

    await verifier.render();
    window.recaptchaVerifier = verifier;
    return verifier;
  }

  async function sendPhoneOtp() {
    const normalizedPhone = normalizePhone(phone);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setError("Phone must be a valid 10-digit number.");
      return;
    }

    setError("");
    setLoading(true);
    setPhoneOtpSent(false);
    setPhoneVerified(false);
    setFirebasePhoneToken("");

    try {
      firebaseAuth.languageCode = "en";
      const appVerifier = await initializeRecaptcha();
      const confirmation = await signInWithPhoneNumber(
        firebaseAuth,
        `+91${normalizedPhone}`,
        appVerifier
      );

      window.confirmationResult = confirmation;
      setPhoneOtpSent(true);
    } catch (phoneOtpError) {
      const code = String(phoneOtpError?.code || "").toLowerCase();
      if (code.includes("operation-not-allowed")) {
        setError("Phone provider is disabled in Firebase Auth. Enable Phone sign-in method.");
      } else if (code.includes("invalid-app-credential") || code.includes("captcha-check-failed")) {
        setError("reCAPTCHA verification failed. Check authorized domains and retry.");
      } else if (code.includes("too-many-requests")) {
        setError("Too many attempts. Please wait and try again.");
      } else if (code.includes("invalid-phone-number")) {
        setError("Please enter a valid phone number in +91 format.");
      } else {
        setError(phoneOtpError.message || "Unable to send phone OTP right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOtp() {
    setError("");
    setLoading(true);

    try {
      if (!window.confirmationResult) {
        throw new Error("Please request phone OTP again.");
      }

      const result = await window.confirmationResult.confirm(phoneOtp);
      const token = await result.user.getIdToken(true);

      setFirebasePhoneToken(token);

      setPhoneVerified(true);
      setStep(3);
    } catch (verifyPhoneError) {
      setError(verifyPhoneError.message || "Invalid phone OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          city,
          state,
          phone: normalizePhone(phone),
          emailVerified: true,
          phoneVerified: true,
          firebaseEmailToken,
          firebasePhoneToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to create account.");
      }

      router.push("/dashboard/citizen");
    } catch (registerError) {
      setError(registerError.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(circle at 86% 12%, rgba(234,244,240,0.9) 0%, rgba(234,244,240,0) 46%), radial-gradient(circle at 12% 16%, rgba(245,200,66,0.16) 0%, rgba(245,200,66,0) 46%), #FAFAF8",
      }}
    >
      <div className="w-full max-w-[460px]">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            style={{
              fontFamily: "Fraunces, serif",
              fontSize: 24,
              fontWeight: 700,
              color: "#0D1B2A",
              letterSpacing: "-0.03em",
              textDecoration: "none",
            }}
          >
            Nyay<span style={{ color: "#F5C842" }}>Setu</span>
          </Link>

          <Link href="/" style={{ fontSize: 12, color: "#4A5568", textDecoration: "none" }}>
            Back to Home
          </Link>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 22,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 12px 46px rgba(13,27,42,0.1)",
            padding: "28px 24px",
          }}
        >
          <h1
            style={{
              fontFamily: "Fraunces, serif",
              fontSize: 36,
              color: "#0D1B2A",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Register
          </h1>

          <p style={{ fontSize: 14, color: "#4A5568", marginBottom: 16 }}>
            Join NyaySetu and report civic issues with confidence.
          </p>

          <div className="mb-5 flex items-center gap-2">
            <span
              style={{
                borderRadius: 999,
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: step === 1 ? "#F5C842" : "#FAFAF8",
                color: step === 1 ? "#0D1B2A" : "#8A9BAA",
              }}
            >
              Verify Email
            </span>
            <span
              style={{
                borderRadius: 999,
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: step === 2 ? "#F5C842" : "#FAFAF8",
                color: step === 2 ? "#0D1B2A" : "#8A9BAA",
              }}
            >
              Verify Phone
            </span>
            <span
              style={{
                borderRadius: 999,
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: step === 3 ? "#F5C842" : "#FAFAF8",
                color: step === 3 ? "#0D1B2A" : "#8A9BAA",
              }}
            >
              Your Details
            </span>
          </div>

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="email" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "#FAFAF8",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    color: "#0D1B2A",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={sendEmailOtp}
                disabled={loading || !isValidEmail(email)}
                className="btn-yellow"
                style={{
                  width: "100%",
                  textAlign: "center",
                  opacity: loading || !isValidEmail(email) ? 0.75 : 1,
                  cursor: loading || !isValidEmail(email) ? "not-allowed" : "pointer",
                  marginTop: 8,
                }}
              >
                {loading ? "Sending link..." : "Send Verification Link"}
              </button>

              {emailLinkSent ? (
                <div
                  style={{
                    background: "#FAFAF8",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: 14,
                    padding: 14,
                    marginTop: 8,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: "#4A5568", lineHeight: 1.6 }}>
                    We sent a verification link to <strong>{email}</strong>. Open your email and click the link.
                    You will be redirected here automatically and verification will complete.
                  </p>

                  {emailVerified ? (
                    <p style={{ marginTop: 10, fontSize: 13, color: "#166534", fontWeight: 700 }}>
                      Email verified successfully.
                    </p>
                  ) : null}

                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    {countdown > 0 ? (
                      <span style={{ fontSize: 12, color: "#8A9BAA" }}>Resend in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={sendEmailOtp}
                        style={{ border: "none", background: "transparent", fontSize: 12, color: "#0D1B2A", fontWeight: 700, cursor: "pointer" }}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="phone" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                  Mobile Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "#FAFAF8",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    color: "#0D1B2A",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={sendPhoneOtp}
                disabled={loading || normalizePhone(phone).length !== 10}
                className="btn-yellow"
                style={{
                  width: "100%",
                  textAlign: "center",
                  opacity: loading || normalizePhone(phone).length !== 10 ? 0.75 : 1,
                  cursor: loading || normalizePhone(phone).length !== 10 ? "not-allowed" : "pointer",
                  marginTop: 8,
                }}
              >
                {loading ? "Sending OTP..." : "Send Phone OTP"}
              </button>

              {phoneOtpSent ? (
                <div
                  style={{
                    background: "#FAFAF8",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: 14,
                    padding: 14,
                    marginTop: 8,
                  }}
                >
                  <div>
                    <label htmlFor="phone-otp" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                      Enter Phone OTP
                    </label>
                    <input
                      id="phone-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={phoneOtp}
                      onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, ""))}
                      style={{
                        width: "100%",
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "white",
                        borderRadius: 10,
                        padding: "10px 12px",
                        fontSize: 20,
                        letterSpacing: "0.2em",
                        textAlign: "center",
                        color: "#0D1B2A",
                        outline: "none",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={verifyPhoneOtp}
                    disabled={loading || phoneOtp.trim().length !== 6}
                    className="btn-dark"
                    style={{
                      width: "100%",
                      textAlign: "center",
                      marginTop: 12,
                      opacity: loading || phoneOtp.trim().length !== 6 ? 0.75 : 1,
                      cursor: loading || phoneOtp.trim().length !== 6 ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Verifying..." : "Verify Phone OTP"}
                  </button>
                </div>
              ) : null}

              <div id="recaptcha-container" />
            </div>
          ) : null}

          {step === 3 ? (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label htmlFor="name" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  style={{
                    width: "100%",
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "#FAFAF8",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    color: "#0D1B2A",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label htmlFor="email" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  required
                  style={{
                    width: "100%",
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "#FAFAF8",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    color: "#0D1B2A",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label htmlFor="password" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    style={{
                      width: "100%",
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "#FAFAF8",
                      borderRadius: 12,
                      padding: "12px 44px 12px 14px",
                      fontSize: 14,
                      color: "#0D1B2A",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      color: "#4A5568",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                    City
                  </label>
                  <select
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    required
                    style={{
                      width: "100%",
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "#FAFAF8",
                      borderRadius: 12,
                      padding: "12px 14px",
                      fontSize: 14,
                      color: "#0D1B2A",
                      outline: "none",
                    }}
                  >
                    <option value="Jalandhar">Jalandhar</option>
                    <option value="Ludhiana">Ludhiana</option>
                    <option value="Amritsar">Amritsar</option>
                    <option value="Chandigarh">Chandigarh</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="state" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                    State
                  </label>
                  <select
                    id="state"
                    value={state}
                    onChange={(event) => setState(event.target.value)}
                    required
                    style={{
                      width: "100%",
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "#FAFAF8",
                      borderRadius: 12,
                      padding: "12px 14px",
                      fontSize: 14,
                      color: "#0D1B2A",
                      outline: "none",
                    }}
                  >
                    <option value="Punjab">Punjab</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Chandigarh">Chandigarh</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !phoneVerified || !emailVerified || !firebaseEmailToken}
                className="btn-yellow"
                style={{
                  width: "100%",
                  textAlign: "center",
                  opacity:
                    loading || !phoneVerified || !emailVerified || !firebaseEmailToken ? 0.75 : 1,
                  cursor:
                    loading || !phoneVerified || !emailVerified || !firebaseEmailToken
                      ? "not-allowed"
                      : "pointer",
                  marginTop: 10,
                }}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          ) : null}

          {error ? <p style={{ marginTop: 12, fontSize: 13, color: "#B91C1C" }}>{error}</p> : null}

          <p style={{ marginTop: 28, fontSize: 13, color: "#4A5568" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#0D1B2A", fontWeight: 700, textDecoration: "none" }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
