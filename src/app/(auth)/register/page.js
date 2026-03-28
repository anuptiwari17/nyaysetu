"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("Jalandhar");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!otpSent || countdown <= 0) {
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
  }, [otpSent, countdown]);

  function getInputStyle() {
    return {
      border: "0.5px solid #E4E8EA",
      background: "#EEF2F2",
      color: "#1C2B2B",
    };
  }

  function handleInputFocus(event) {
    event.target.style.borderColor = "#3A7D7B";
  }

  function handleInputBlur(event) {
    event.target.style.borderColor = "#E4E8EA";
  }

  async function sendOtp() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to send OTP.");
      }

      setOtpSent(true);
      setCountdown(30);
    } catch (otpError) {
      setError(otpError.message || "Unable to send OTP right now.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "OTP verification failed.");
      }

      setPhoneVerified(true);
      setStep(2);
      setError("");
    } catch (verifyError) {
      setError(verifyError.message || "Invalid OTP. Please try again.");
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
          phone,
          phoneVerified: true,
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
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "#F5F8F8" }}
    >
      <div
        className="w-full max-w-[420px] rounded-[14px] bg-white px-9 py-8"
        style={{ border: "0.5px solid #E4E8EA" }}
      >
        <p className="text-center text-[16px] font-semibold" style={{ color: "#3A7D7B" }}>
          NagarSeva
        </p>

        <h1 className="mt-2 text-center text-[22px] font-medium" style={{ color: "#1C2B2B" }}>
          Create your account
        </h1>

        <p className="mt-1 text-center text-[13px]" style={{ color: "#8A9BA8" }}>
          Join thousands reporting civic issues in your city
        </p>

        <div className="mt-5 flex items-center justify-center gap-2">
          <span
            className="rounded-[20px] px-3 py-[3px] text-[12px] font-medium"
            style={
              step === 1
                ? { background: "#3A7D7B", color: "#FFFFFF" }
                : { background: "#EEF2F2", color: "#8A9BA8" }
            }
          >
            Verify Phone
          </span>
          <span
            className="rounded-[20px] px-3 py-[3px] text-[12px] font-medium"
            style={
              step === 2
                ? { background: "#3A7D7B", color: "#FFFFFF" }
                : { background: "#EEF2F2", color: "#8A9BA8" }
            }
          >
            Your Details
          </span>
        </div>

        {step === 1 ? (
          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Mobile Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none focus:ring-0"
                style={getInputStyle()}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <button
              type="button"
              onClick={sendOtp}
              disabled={loading || phone.trim().length < 10}
              className={`inline-flex w-full items-center justify-center rounded-[10px] px-4 py-[11px] text-[14px] font-medium text-white transition-colors ${
                loading ? "" : "hover:bg-[#5DAFAD]"
              }`}
              style={{
                background:
                  loading || phone.trim().length < 10 ? "#5DAFAD" : "#3A7D7B",
              }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden="true"
                  />
                  Sending OTP...
                </span>
              ) : (
                "Send OTP"
              )}
            </button>

            {otpSent ? (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="otp"
                    className="mb-1.5 block text-[12px] font-medium"
                    style={{ color: "#4A6060" }}
                  >
                    Enter OTP
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-[10px] border px-[14px] py-[10px] text-center text-[18px] tracking-[0.2em] focus:outline-none focus:ring-0"
                    style={getInputStyle()}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>

                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={loading || otp.trim().length !== 6}
                  className={`inline-flex w-full items-center justify-center rounded-[10px] px-4 py-[11px] text-[14px] font-medium text-white transition-colors ${
                    loading ? "" : "hover:bg-[#5DAFAD]"
                  }`}
                  style={{
                    background:
                      loading || otp.trim().length !== 6 ? "#5DAFAD" : "#3A7D7B",
                  }}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden="true"
                      />
                      Verifying...
                    </span>
                  ) : (
                    "Verify OTP"
                  )}
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <span className="text-[12px]" style={{ color: "#8A9BA8" }}>
                      Resend in {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={sendOtp}
                      className="text-[12px]"
                      style={{ color: "#3A7D7B" }}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none focus:ring-0"
                style={getInputStyle()}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none focus:ring-0"
                style={getInputStyle()}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-[10px] border px-[14px] py-[10px] pr-10 text-[14px] focus:outline-none focus:ring-0"
                  style={getInputStyle()}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#8A9BA8" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="city"
                className="mb-1.5 block text-[12px] font-medium"
                style={{ color: "#4A6060" }}
              >
                City
              </label>
              <select
                id="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
                className="w-full rounded-[10px] border px-[14px] py-[10px] text-[14px] focus:outline-none focus:ring-0"
                style={getInputStyle()}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              >
                <option value="Jalandhar">Jalandhar</option>
                <option value="Ludhiana">Ludhiana</option>
                <option value="Amritsar">Amritsar</option>
                <option value="Chandigarh">Chandigarh</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !phoneVerified}
              className={`inline-flex w-full items-center justify-center rounded-[10px] px-4 py-[11px] text-[14px] font-medium text-white transition-colors ${
                loading ? "" : "hover:bg-[#5DAFAD]"
              }`}
              style={{ background: loading || !phoneVerified ? "#5DAFAD" : "#3A7D7B" }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden="true"
                  />
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        )}

        {error ? (
          <p className="mt-3 text-[13px]" style={{ color: "#B91C1C" }}>
            {error}
          </p>
        ) : null}

        <p className="mt-5 text-center text-[13px]" style={{ color: "#8A9BA8" }}>
          Already have an account?{" "}
          <Link href="/login" className="no-underline" style={{ color: "#3A7D7B" }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
