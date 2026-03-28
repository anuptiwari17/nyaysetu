"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export default function CitizenSidebar({ user }) {
  const pathname = usePathname();

  const sidebarLinks = [
    { label: "Dashboard", href: "/dashboard/citizen" },
    { label: "My Grievances", href: "/dashboard/citizen/my-issues" },
    { label: "My Petitions", href: "/dashboard/citizen/my-petitions" },
    { label: "AI Assistant", href: "/legal-assistant" },
    { label: "Public Petitions", href: "/petition" },
  ];

  const initials = useMemo(() => {
    const name = String(user?.name || "").trim();
    if (!name) return "U";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user?.name]);

  return (
    <>
      {/* Inline responsive style — avoids Tailwind display conflicts entirely */}
      <style>{`
        .citizen-sidebar {
          display: none;
        }
        @media (min-width: 768px) {
          .citizen-sidebar {
            display: flex;
          }
        }
        .sidebar-link:hover {
          background: #EEEBE4 !important;
          color: #1F2937 !important;
        }
        .sidebar-btn:hover {
          opacity: 0.85;
        }
      `}</style>

      <aside
        className="citizen-sidebar"
        style={{
          width: "240px",
          minWidth: "240px",
          maxWidth: "240px",
          height: "calc(100vh - 64px)",
          position: "sticky",
          top: "64px",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "28px 16px 24px",
          background: "#FCFBF8",
          borderRight: "1px solid #E8E1D5",
          overflowY: "auto",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {/* ── Top: user info + nav ── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Avatar */}
          <div
            style={{
              height: "42px",
              width: "42px",
              minWidth: "42px",
              borderRadius: "50%",
              background: "#F2EEE7",
              color: "#2F3D53",
              fontWeight: 700,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {initials}
          </div>

          {/* Name */}
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "17px",
              fontWeight: 700,
              lineHeight: 1.25,
              color: "#171717",
              fontFamily: "Fraunces, Georgia, serif",
            }}
          >
            {user?.name || "Citizen"}
          </p>

          {/* City badge */}
          <span
            style={{
              display: "inline-block",
              marginTop: "6px",
              borderRadius: "20px",
              padding: "3px 10px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              background: "#F2EEE7",
              color: "#556070",
              alignSelf: "flex-start",
            }}
          >
            {user?.city || "Jalandhar"}
          </span>

          {/* Nav links */}
          <nav
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {sidebarLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="sidebar-link"
                  style={{
                    display: "block",
                    borderRadius: "10px",
                    padding: "9px 12px",
                    fontSize: "14px",
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#1F2937" : "#5F636A",
                    background: isActive ? "#F2EEE7" : "transparent",
                    textDecoration: "none",
                    transition: "background 0.15s, color 0.15s",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontFamily: isActive
                      ? "Fraunces, Georgia, serif"
                      : "DM Sans, sans-serif",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Bottom: action buttons ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "24px",
          }}
        >
          <Link
            href="/legal-assistant"
            className="sidebar-btn"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#4B5563",
              background: "#FFFFFF",
              border: "1px solid #D9D1C5",
              textDecoration: "none",
              textAlign: "center",
              transition: "opacity 0.15s",
            }}
          >
            Ask Legal AI
          </Link>

          <Link
            href="/petition/new"
            className="sidebar-btn"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#FFFFFF",
              background: "#1F2937",
              textDecoration: "none",
              textAlign: "center",
              transition: "opacity 0.15s",
            }}
          >
            Create Petition
          </Link>

          <Link
            href="/grievances/new"
            className="sidebar-btn"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#4B5563",
              background: "#FFFFFF",
              border: "1px solid #D9D1C5",
              textDecoration: "none",
              textAlign: "center",
              transition: "opacity 0.15s",
            }}
          >
            Report an Issue
          </Link>
        </div>
      </aside>
    </>
  );
}