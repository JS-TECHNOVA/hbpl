"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { token } from "./layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface Stats {
  students: number;
  published: number;
  pending: number;
  teams: number;
  matches: number;
  volunteers: number;
}

export default function StaffDashboard() {
  const [stats, setStats] = useState<Stats>({ students: 0, published: 0, pending: 0, teams: 0, matches: 0, volunteers: 0 });

  useEffect(() => {
    const h = { Authorization: `Token ${token()}` };
    Promise.all([
      fetch(`${API}/api/admin/exam/registrations/?limit=1`, { headers: h }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/api/admin/teams/?limit=1`, { headers: h }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/api/admin/matches/?limit=1`, { headers: h }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/api/admin/volunteers/?limit=1`, { headers: h }).then(r => r.json()).catch(() => ({})),
    ]).then(([students, teams, matches, vols]) => {
      setStats({
        students: students.count ?? 0,
        published: students.published_count ?? 0,
        pending: students.pending_count ?? 0,
        teams: teams.count ?? 0,
        matches: matches.count ?? 0,
        volunteers: vols.count ?? (Array.isArray(vols) ? vols.length : 0),
      });
    });
  }, []);

  const cards = [
    { label: "Exam Students", value: stats.students, sub: `${stats.published} published · ${stats.pending} pending`, href: "/staff/exam-students", color: "bg-blue-50 text-blue-700 border-blue-100" },
    { label: "Teams", value: stats.teams, sub: "Registered cricket teams", href: "/staff/teams", color: "bg-green-50 text-green-700 border-green-100" },
    { label: "Matches", value: stats.matches, sub: "Scheduled & completed", href: "/staff/matches", color: "bg-orange-50 text-orange-700 border-orange-100" },
    { label: "Volunteers", value: stats.volunteers, sub: "Active volunteers", href: "/staff/volunteers", color: "bg-purple-50 text-purple-700 border-purple-100" },
  ];

  const quickLinks = [
    { href: "/staff/exam-students", label: "Manage Students" },
    { href: "/staff/exam-portal", label: "Exam Portal Content" },
    { href: "/staff/tournaments", label: "Tournaments" },
    { href: "/staff/matches", label: "All Matches" },
    { href: "/staff/teams", label: "Team Registrations" },
    { href: "/staff/gallery", label: "Photo Gallery" },
    { href: "/staff/management", label: "Management Team" },
    { href: "/staff/news-ticker", label: "News Ticker" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading font-extrabold text-[28px] text-primary">Dashboard</h1>
        <p className="text-text-muted text-[14px] mt-1">Welcome back. Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1 ${c.color}`}
          >
            <p className="text-[13px] font-semibold opacity-80">{c.label}</p>
            <p className="font-heading font-extrabold text-[36px] leading-none">{c.value}</p>
            <p className="text-[11px] opacity-60 mt-0.5">{c.sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/50">
        <h2 className="font-heading font-extrabold text-[18px] text-primary mb-5">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="bg-section hover:bg-primary hover:text-white rounded-xl px-4 py-3 text-[13px] font-semibold text-text-primary transition-colors text-center border border-border/50"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
