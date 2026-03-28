"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export default function CitizenSidebar({ user }) {
  const pathname = usePathname();

  const sidebarLinks = [
    { label: "Overview", href: "/dashboard/citizen" },
    { label: "My Issues", href: "/dashboard/citizen/my-issues" },
    { label: "My Petitions", href: "/dashboard/citizen/my-petitions" },
    { label: "Browse Issues", href: "/grievances" },
  ];

  const initials = useMemo(() => {
    const name = String(user?.name || "").trim();
    if (!name) {
      return "U";
    }

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user?.name]);

  return (
    <aside
      className="hidden h-[calc(100vh-56px)] w-[220px] flex-col justify-between bg-white p-4 md:flex"
      style={{ borderRight: "0.5px solid #E4E8EA" }}
    >
      <div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "#EAF4F4", color: "#3A7D7B", fontWeight: 500, fontSize: "15px" }}
        >
          {initials}
        </div>
        <p className="mt-[10px] text-[15px] font-medium" style={{ color: "#1C2B2B" }}>
          {user?.name || "Citizen"}
        </p>
        <span
          className="mt-2 inline-block rounded-[20px] px-[10px] py-[2px] text-[11px]"
          style={{ background: "#EAF4F4", color: "#3A7D7B" }}
        >
          {user?.city || "Jalandhar"}
        </span>

        <nav className="mt-7 flex flex-col gap-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[10px] px-[14px] py-[9px] text-[14px] no-underline"
                style={
                  isActive
                    ? { background: "#EAF4F4", color: "#3A7D7B", fontWeight: 500 }
                    : { color: "#4A6060" }
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Link
        href="/grievances/new"
        className="inline-flex w-full items-center justify-center rounded-[10px] px-4 py-[10px] text-[14px] font-medium text-white no-underline"
        style={{ background: "#3A7D7B" }}
      >
        Report an Issue
      </Link>
    </aside>
  );
}
