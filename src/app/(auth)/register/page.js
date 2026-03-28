"use client";

import {
  RecaptchaVerifier,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { firebaseAuth } from "@/lib/firebaseClient";

const EMAIL_STORAGE_KEY = "nyaysetu_email_for_signin";

function normalizePhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim().toLowerCase());
}

export default function RegisterPage() {
  const router = useRouter();
  const recaptchaVerifierRef = useRef(null);

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneIdToken, setPhoneIdToken] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailIdToken, setEmailIdToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("Jalandhar");
  const [state, setState] = useState("Punjab");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    async function completeEmailLinkSignIn() {
      if (typeof window === "undefined") {
        return;
      }

      const href = window.location.href;

      if (!isSignInWithEmailLink(firebaseAuth, href)) {
        return;
      }

      setLoading(true);
      setError("");
      setInfo("");

      try {
        let emailForSignIn = localStorage.getItem(EMAIL_STORAGE_KEY);

        if (!emailForSignIn) {
          emailForSignIn = window.prompt("Confirm your email to complete verification") || "";
        }

        if (!isValidEmail(emailForSignIn)) {
          throw new Error("A valid email is required to complete verification");
        }

        const result = await signInWithEmailLink(firebaseAuth, emailForSignIn, href);
        const token = await result.user.getIdToken(true);

        localStorage.removeItem(EMAIL_STORAGE_KEY);

        setEmail(String(emailForSignIn).trim().toLowerCase());
        setEmailIdToken(token);
        setEmailVerified(true);
        setStep((previous) => (previous < 3 ? 3 : previous));
        setInfo("Email OTP verified successfully. You can now create your account.");

        window.history.replaceState({}, "", "/register");
      } catch (verifyError) {
        setError(verifyError.message || "Unable to verify email OTP link.");
      } finally {
        setLoading(false);
      }
    }

    completeEmailLinkSignIn();
  }, []);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  function ensureRecaptchaVerifier() {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(firebaseAuth, "firebase-phone-recaptcha", {
        size: "invisible",
      });
    }

    return recaptchaVerifierRef.current;
  }

  async function sendPhoneOtp() {
    setError("");
    setInfo("");

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);

    try {
      const appVerifier = ensureRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(firebaseAuth, `+91${normalizedPhone}`, appVerifier);

      setPhoneConfirmationResult(confirmation);
      setPhoneOtpSent(true);
      setInfo("Phone OTP sent successfully");
    } catch (otpError) {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }

      setError(otpError.message || "Unable to send phone OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyPhoneOtp() {
    setError("");
    setInfo("");

    if (!phoneConfirmationResult) {
      setError("Send OTP first to continue");
      return;
    }

    setLoading(true);

    try {
      const result = await phoneConfirmationResult.confirm(String(phoneOtp || "").trim());
      const token = await result.user.getIdToken(true);

      setPhoneIdToken(token);
      setPhoneVerified(true);
      setStep(2);
      setInfo("Phone OTP verified. Continue with email OTP verification.");
    } catch (verifyError) {
      setError(verifyError.message || "Invalid phone OTP");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmailOtpLink() {
    setError("");
    setInfo("");

    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }

    if (!phoneVerified) {
      setError("Verify mobile OTP first");
      return;
    }

    setLoading(true);

    try {
      await sendSignInLinkToEmail(firebaseAuth, normalizedEmail, {
        url: `${window.location.origin}/register`,
        handleCodeInApp: true,
      });

      localStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail);
      setEmail(normalizedEmail);
      setEmailLinkSent(true);
      setInfo("Email OTP link sent. Open your email and click the verification link.");
    } catch (emailError) {
      setError(emailError.message || "Unable to send email OTP link");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setInfo("");

    const normalizedPhone = normalizePhone(phone);

    if (!phoneVerified || !emailVerified || !phoneIdToken || !emailIdToken) {
      setError("Verify both mobile OTP and email OTP before creating your account");
      return;
    }

    if (!normalizedPhone) {
      setError("Invalid mobile number");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Enter a valid email address");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

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
          confirmPassword,
          city,
          state,
          phone: normalizedPhone,
          phoneIdToken,
          emailIdToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to create account.");
      }

      await signOut(firebaseAuth).catch(() => null);
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
            Complete mobile OTP and email OTP verification before creating your account.
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
              Verify Mobile
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
                background: step === 3 ? "#F5C842" : "#FAFAF8",
                color: step === 3 ? "#0D1B2A" : "#8A9BAA",
              }}
            >
              Create Account
            </span>
          </div>

          {step === 1 ? (
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
                  onChange={(event) => setPhone(event.target.value)}
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
                disabled={loading}
                className="btn-yellow"
                style={{
                  width: "100%",
                  textAlign: "center",
                  opacity: loading ? 0.75 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Sending OTP..." : "Send Mobile OTP"}
              </button>

              {phoneOtpSent ? (
                <div
                  style={{
                    background: "#FAFAF8",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <label htmlFor="phoneOtp" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                    Enter Mobile OTP
                  </label>
                  <input
                    id="phoneOtp"
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

                  <button
                    type="button"
                    onClick={verifyPhoneOtp}
                    disabled={loading || phoneOtp.trim().length < 6}
                    className="btn-dark"
                    style={{
                      width: "100%",
                      marginTop: 12,
                      textAlign: "center",
                      opacity: loading || phoneOtp.trim().length < 6 ? 0.75 : 1,
                      cursor: loading || phoneOtp.trim().length < 6 ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Verifying..." : "Verify Mobile OTP"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
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
                onClick={sendEmailOtpLink}
                disabled={loading}
                className="btn-yellow"
                style={{
                  width: "100%",
                  textAlign: "center",
                  opacity: loading ? 0.75 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Sending Email OTP..." : "Send Email OTP"}
              </button>

              {emailLinkSent && !emailVerified ? (
                <div
                  style={{
                    background: "#FAFAF8",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <p style={{ fontSize: 13, color: "#4A5568" }}>
                    We sent a one-time email OTP link. Open it to verify your email, then come back here.
                  </p>
                </div>
              ) : null}

              {emailVerified ? (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-dark"
                  style={{ width: "100%", textAlign: "center" }}
                >
                  Continue to Create Account
                </button>
              ) : null}
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
                <label htmlFor="finalEmail" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                  Verified Email
                </label>
                <input
                  id="finalEmail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: 7, fontSize: 12, fontWeight: 600, color: "#4A5568" }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
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
                    onClick={() => setShowConfirmPassword((previous) => !previous)}
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
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
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
                disabled={loading || !phoneVerified || !emailVerified}
                className="btn-yellow"
                style={{
                  width: "100%",
                  textAlign: "center",
                  opacity: loading || !phoneVerified || !emailVerified ? 0.75 : 1,
                  cursor: loading || !phoneVerified || !emailVerified ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          ) : null}

          <div id="firebase-phone-recaptcha" />

          {info ? <p style={{ marginTop: 12, fontSize: 13, color: "#0F766E" }}>{info}</p> : null}
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
