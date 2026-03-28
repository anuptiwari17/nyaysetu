import Link from "next/link";
import { CheckCircle, FileText, MapPin, Users } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function Home() {
  const sampleIssues = [
    {
      category: "WATER",
      title: "No water supply for 3 days in Model Town",
      city: "Jalandhar",
      supports: 142,
      status: "Pending",
    },
    {
      category: "ROADS",
      title: "Broken streetlights on GT Road",
      city: "Jalandhar",
      supports: 87,
      status: "In Progress",
    },
    {
      category: "SANITATION",
      title: "Garbage not collected for a week",
      city: "Jalandhar",
      supports: 203,
      status: "Resolved",
    },
  ];

  const getStatusStyles = (status) => {
    if (status === "Resolved") {
      return { background: "#E8F5E9", color: "#2E7D32" };
    }

    if (status === "In Progress") {
      return { background: "#EAF4F4", color: "#3A7D7B" };
    }

    return { background: "#FEF3C7", color: "#B45309" };
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F8F8" }}>
      <Navbar />

      <main>
        <section className="w-full px-6 pt-[100px] pb-20 text-center">
          <div className="mx-auto flex max-w-4xl flex-col items-center">
            <span
              className="inline-block rounded-[20px] px-[14px] py-1 text-[12px]"
              style={{ background: "#EAF4F4", color: "#3A7D7B" }}
            >
              Built for Jalandhar · Expanding to all cities
            </span>

            <h1
              className="mx-auto mt-4 max-w-[640px] text-4xl font-medium leading-[1.3]"
              style={{ color: "#1C2B2B" }}
            >
              Report civic issues. Build community pressure. Force resolution.
            </h1>

            <p className="mx-auto mt-4 max-w-[480px] text-[15px]" style={{ color: "#8A9BA8" }}>
              NagarSeva connects citizens with city authorities through AI-structured complaints
              grounded in real laws.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/grievances/new"
                className="btn-primary inline-flex items-center justify-center no-underline"
                style={{ padding: "11px 24px", fontSize: "14px" }}
              >
                Report an Issue
              </Link>
              <Link
                href="/grievances"
                className="btn-outline inline-flex items-center justify-center no-underline"
                style={{ padding: "11px 24px", fontSize: "14px" }}
              >
                Browse Issues
              </Link>
            </div>

            <div className="mt-6 flex w-full max-w-[440px] items-center gap-2 max-[480px]:flex-col">
              <input
                type="text"
                placeholder="Search issues in Jalandhar..."
                className="w-full"
                style={{
                  borderRadius: "10px",
                  border: "0.5px solid #E4E8EA",
                  background: "#FFFFFF",
                  padding: "10px 16px",
                  fontSize: "14px",
                  boxShadow: "none",
                  outline: "none",
                }}
              />
              <button
                type="button"
                className="btn-primary max-[480px]:w-full"
                style={{ padding: "10px 16px", fontSize: "13px" }}
              >
                Search
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white py-5" style={{ borderTop: "0.5px solid #E4E8EA", borderBottom: "0.5px solid #E4E8EA" }}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-12 px-6">
            <div className="text-center">
              <p className="text-[26px] font-semibold" style={{ color: "#3A7D7B" }}>
                247
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                Issues Reported
              </p>
            </div>
            <div className="text-center">
              <p className="text-[26px] font-semibold" style={{ color: "#3A7D7B" }}>
                89
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                Resolved
              </p>
            </div>
            <div className="text-center">
              <p className="text-[26px] font-semibold" style={{ color: "#3A7D7B" }}>
                12k+
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "#8A9BA8" }}>
                Citizens Supported
              </p>
            </div>
          </div>
        </section>

        <section className="px-8 py-16 text-center" style={{ background: "#F5F8F8" }}>
          <p className="text-[11px] font-medium tracking-[0.09em]" style={{ color: "#B0BEC5" }}>
            HOW IT WORKS
          </p>
          <h2 className="mt-2 text-2xl font-medium" style={{ color: "#1C2B2B" }}>
            Three steps to civic change
          </h2>

          <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
            <div
              className="mx-auto w-full max-w-[300px] rounded-[14px] bg-white px-5 py-6 text-left"
              style={{ border: "0.5px solid #E4E8EA" }}
            >
              <p className="text-[11px] font-medium tracking-[0.09em]" style={{ color: "#3A7D7B" }}>
                01
              </p>
              <FileText className="mt-3 h-5 w-5" style={{ color: "#3A7D7B" }} />
              <h3 className="mt-3 text-[15px] font-medium" style={{ color: "#1C2B2B" }}>
                Report
              </h3>
              <p className="mt-1.5 text-[13px] leading-[1.6]" style={{ color: "#8A9BA8" }}>
                Describe your civic issue. Our AI structures it and maps it to the right authority
                with legal context.
              </p>
            </div>

            <div
              className="mx-auto w-full max-w-[300px] rounded-[14px] bg-white px-5 py-6 text-left"
              style={{ border: "0.5px solid #E4E8EA" }}
            >
              <p className="text-[11px] font-medium tracking-[0.09em]" style={{ color: "#3A7D7B" }}>
                02
              </p>
              <Users className="mt-3 h-5 w-5" style={{ color: "#3A7D7B" }} />
              <h3 className="mt-3 text-[15px] font-medium" style={{ color: "#1C2B2B" }}>
                Support
              </h3>
              <p className="mt-1.5 text-[13px] leading-[1.6]" style={{ color: "#8A9BA8" }}>
                Other citizens validate the issue by supporting it. More support = more pressure
                on authorities.
              </p>
            </div>

            <div
              className="mx-auto w-full max-w-[300px] rounded-[14px] bg-white px-5 py-6 text-left"
              style={{ border: "0.5px solid #E4E8EA" }}
            >
              <p className="text-[11px] font-medium tracking-[0.09em]" style={{ color: "#3A7D7B" }}>
                03
              </p>
              <CheckCircle className="mt-3 h-5 w-5" style={{ color: "#3A7D7B" }} />
              <h3 className="mt-3 text-[15px] font-medium" style={{ color: "#1C2B2B" }}>
                Resolve
              </h3>
              <p className="mt-1.5 text-[13px] leading-[1.6]" style={{ color: "#8A9BA8" }}>
                Assigned authority is notified and must update status with proof. Escalate via
                petition if ignored.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white px-8 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-[22px] font-medium" style={{ color: "#1C2B2B" }}>
              What people are reporting
            </h2>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {sampleIssues.map((issue) => (
                <article
                  key={issue.title}
                  className="rounded-[14px] px-5 py-4"
                  style={{ background: "#F5F8F8", border: "0.5px solid #E4E8EA" }}
                >
                  <span className="tag">{issue.category}</span>

                  <h3 className="mt-3 text-[15px] font-medium leading-[1.4]" style={{ color: "#1C2B2B" }}>
                    {issue.title}
                  </h3>

                  <p className="mt-2 flex items-center gap-1.5 text-[12px]" style={{ color: "#B0BEC5" }}>
                    <MapPin className="h-3.5 w-3.5" />
                    {issue.city}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-[13px]" style={{ color: "#4A6060" }}>
                      {issue.supports} supports
                    </p>
                    <span
                      className="rounded-[20px] px-[10px] py-[2px] text-[11px] font-medium"
                      style={getStatusStyles(issue.status)}
                    >
                      {issue.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link href="/grievances" className="text-[14px] no-underline" style={{ color: "#3A7D7B" }}>
                View All Issues →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-8 py-8 text-center" style={{ background: "#1C2B2B" }}>
        <p className="text-base font-semibold text-white">NagarSeva</p>
        <p className="mt-1.5 text-[13px]" style={{ color: "#4A6060" }}>
          AI-powered civic accountability for Indian cities.
        </p>
        <p className="mt-4 text-[12px]" style={{ color: "#4A6060" }}>
          © 2025 NagarSeva · Jalandhar MVP
        </p>
      </footer>
    </div>
  );
}
