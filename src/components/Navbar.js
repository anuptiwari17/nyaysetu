"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useUser } from "@/lib/useUser";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, mutate } = useUser();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "GET" });
      router.push("/");
      await mutate();
    } catch (_error) {
      router.push("/");
      await mutate();
    }
  }

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Issues", href: "/grievances" },
    { label: "Petitions", href: "/petition" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 bg-white"
      style={{ borderBottom: "0.5px solid #E4E8EA", boxShadow: "none" }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span
            className="flex h-8 w-8 items-center justify-center"
            style={{ borderRadius: "12px", background: "#3A7D7B" }}
            aria-hidden="true"
          >
            <span style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "14px" }}>N</span>
          </span>
          <span style={{ color: "#1C2B2B", fontWeight: 600, fontSize: "17px" }}>NagarSeva</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className="no-underline transition-colors hover:text-[#3A7D7B]"
                style={{
                  fontSize: "14px",
                  color: isActive ? "#3A7D7B" : "#4A6060",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && !user ? (
            <Link
              href="/login"
              className="hidden md:inline-flex items-center justify-center"
              style={{
                border: "1.5px solid #3A7D7B",
                color: "#3A7D7B",
                background: "transparent",
                borderRadius: "10px",
                padding: "7px 16px",
                fontSize: "13px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              Login
            </Link>
          ) : null}

          {!isLoading && user ? (
            <>
              <span className="hidden md:inline-block" style={{ color: "#4A6060", fontSize: "13px" }}>
                {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden md:inline-flex items-center justify-center"
                style={{
                  background: "#EEF2F2",
                  border: "0.5px solid #E4E8EA",
                  color: "#8A9BA8",
                  borderRadius: "10px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </>
          ) : null}

          <Link
            href="/grievances/new"
            className="inline-flex items-center justify-center"
            style={{
              border: "1.5px solid #3A7D7B",
              color: "#FFFFFF",
              background: "#3A7D7B",
              borderRadius: "10px",
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            Report Issue
          </Link>
        </div>
      </div>
    </nav>
  );
}
