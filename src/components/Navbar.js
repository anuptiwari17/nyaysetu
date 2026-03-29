"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useUser } from "@/lib/useUser";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, mutate } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const dashboardHref = user?.role === "authority" ? "/dashboard/authority" : "/dashboard/citizen";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout");
    router.push("/");
    await mutate();
  }

  const navLinks = [
    { label: "How it works", href: "#how" },
    { label: "Petitions", href: "/grievances" },
    { label: "For Cities", href: "#why" },
  ];

  return (
    <nav
      className="fixed inset-x-0 top-0 z-[200]"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        width: "100vw",
        height: 64,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.07)" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          height: 64,
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "Fraunces, serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#0D1B2A",
            letterSpacing: "-0.03em",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Nyay<span style={{ color: "#F5C842" }}>Setu</span>
        </Link>

        <div className="hidden md:flex" style={{ gap: 32 }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: pathname === link.href ? "#0D1B2A" : "#4A5568",
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center" style={{ gap: 10 }}>
          {isLoading ? null : user ? (
            <>
              <span style={{ fontSize: 13, color: "#4A5568" }}>{user.name}</span>
              <Link
                href={dashboardHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid #D1D5DB",
                  background: "#FFFFFF",
                  color: "#1F2937",
                  textDecoration: "none",
                }}
              >
                Dashboard
              </Link>
              <button type="button" className="btn-outline-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline-sm">
                Log in
              </Link>
              <Link href="/grievances/new" className="btn-yellow-sm">
                Report Issue
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
