"use client";
import { useState } from "react";
import Link from "next/link";

const leaders = [
  {
    rank: "01",
    name: "Arjun Malhotra",
    team: "Titans XI",
    stat1: "492",
    stat1Label: "Runs",
    stat2: "168.5",
    stat2Label: "SR",
    avatar: "AM",
    avatarBg: "bg-primary",
  },
  {
    rank: "02",
    name: "Vikram Singh",
    team: "Warriors XI",
    stat1: "9.2",
    stat1Label: "Economy",
    stat2: null,
    stat2Label: null,
    avatar: "VS",
    avatarBg: "bg-accent",
  },
  {
    rank: "03",
    name: "Siddhai K Ray",
    team: "Champions Valley",
    stat1: "42.1",
    stat1Label: "Overs",
    stat2: "12",
    stat2Label: "Wkts",
    avatar: "SR",
    avatarBg: "bg-primary-light",
  },
];

const pointsTable = [
  { rank: 1, name: "Titans XI", pts: "10 PTS", color: "text-accent" },
  { rank: 2, name: "Warriors XI", pts: "10 PTS", color: "text-primary-light" },
  { rank: 3, name: "Champions Valley", pts: "7 PTS", color: "text-primary-light" },
  { rank: 4, name: "Rising Stars", pts: "6 PTS", color: "text-primary-light" },
];

const recentFixtures = [
  {
    matchday: "May 12\n2025",
    homeTeam: "Titans XI",
    awayTeam: "Falcons",
    round: "Phase 1",
    result: "Titans XI won",
    resultType: "win",
    action: "view",
  },
  {
    matchday: "May 26\n2025",
    homeTeam: "Warriors XI",
    awayTeam: "Sri Rians",
    round: "Round Robin",
    result: "Cancelled",
    resultType: "cancelled",
    action: "view",
  },
  {
    matchday: "June 01\n2025",
    homeTeam: "Titans",
    awayTeam: "Phoenix",
    round: "Quarter Final",
    result: "June 01 03:00",
    resultType: "upcoming",
    action: "notify",
  },
];

const upcomingFixtures = [
  {
    matchday: "June 08\n2025",
    homeTeam: "Warriors XI",
    awayTeam: "Champions Valley",
    round: "Semi Final",
    result: "June 08 04:00",
    resultType: "upcoming",
    action: "notify",
  },
  {
    matchday: "June 15\n2025",
    homeTeam: "Titans XI",
    awayTeam: "Rising Stars",
    round: "Semi Final",
    result: "June 15 04:00",
    resultType: "upcoming",
    action: "notify",
  },
];

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80",
    alt: "Cricket batsman in action",
    wide: true,
  },
  {
    src: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&q=80",
    alt: "Cricket ball",
    wide: false,
  },
  {
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80",
    alt: "Team celebration",
    wide: false,
  },
  {
    src: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=400&q=80",
    alt: "Match moment",
    wide: false,
  },
];

export default function Cricket() {
  const [activeTab, setActiveTab] = useState<"recent" | "upcoming">("recent");
  const fixtures = activeTab === "recent" ? recentFixtures : upcomingFixtures;

  return (
    <div className="bg-page">

      {/* ══════════════════════════════════════════════
          1. HERO — stadium image + blue gradient overlay
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: "340px" }}>
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1400&q=80"
          alt="Cricket stadium"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Blue gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(0,28,77,0.92) 0%, rgba(0,63,135,0.80) 50%, rgba(0,63,135,0.30) 100%)" }}
        />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-8 py-16">
          <div className="flex flex-col gap-5 max-w-2xl">
          {/* Small badge */}
          <p className="text-white/70 text-[13px] leading-[1.6]">
            The pinnacle of community cricket is back. Register your Registered
            team today and compete for the prestigious Beacon Cup.
          </p>

          {/* Heading */}
          <div>
            <p className="font-heading font-extrabold text-[20px] text-white/80 tracking-tight">
              HBPL Summer
            </p>
            <h1 className="font-heading font-extrabold text-[56px] leading-none text-accent tracking-tight">
              Champions League
            </h1>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mt-2">
            <Link
              href="/cricket/register"
              className="inline-flex items-center gap-2 bg-accent text-white font-semibold text-[14px] px-7 py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Register Your Team
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/cricket/rules"
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white font-semibold text-[14px] px-7 py-3 rounded-xl border border-white/20 hover:bg-white/25 transition-colors"
            >
              Download Rules
            </Link>
          </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          2. TOURNAMENT LEADERS + POINTS TABLE
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Left: Tournament Leaders (2/3 width) */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-extrabold text-[26px] text-primary tracking-tight">
                  Tournament Leaders
                </h2>
                <p className="text-text-muted text-[13px] mt-0.5">
                  Follow the leading performers this season
                </p>
              </div>
              <Link
                href="/cricket/stats"
                className="text-primary font-semibold text-[13px] hover:underline flex items-center gap-1"
              >
                View All Stats
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Player list */}
            <div className="flex flex-col gap-3">
              {leaders.map((p) => (
                <div
                  key={p.name}
                  className="bg-white rounded-2xl px-6 py-4 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-5"
                >
                  {/* Rank */}
                  <span className="font-heading font-extrabold text-[22px] text-text-muted/40 w-10 shrink-0">
                    #{p.rank}
                  </span>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${p.avatarBg} flex items-center justify-center shrink-0`}>
                    <span className={`font-heading font-extrabold text-[12px] ${p.avatarBg === "bg-primary-light" ? "text-primary" : "text-white"}`}>
                      {p.avatar}
                    </span>
                  </div>

                  {/* Name + team */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-primary truncate">{p.name}</p>
                    <p className="text-text-muted text-[12px]">{p.team}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="font-heading font-extrabold text-[18px] text-primary">{p.stat1}</p>
                      <p className="text-text-muted text-[11px] uppercase tracking-wide">{p.stat1Label}</p>
                    </div>
                    {p.stat2 && (
                      <div className="text-right">
                        <p className="font-heading font-extrabold text-[18px] text-primary">{p.stat2}</p>
                        <p className="text-text-muted text-[11px] uppercase tracking-wide">{p.stat2Label}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Points Table (1/3 width) — dark card */}
          <div className="md:col-span-1">
            <div className="bg-primary-darker rounded-3xl p-6 flex flex-col gap-4 h-full">
              <h3 className="font-heading font-extrabold text-[18px] text-white">
                Point Table
              </h3>

              <div className="flex flex-col gap-1">
                {pointsTable.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center justify-between py-2.5 border-b border-white/8 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white/30 text-[12px] font-semibold w-5">
                        {t.rank}.
                      </span>
                      <span className="text-white/80 text-[13px] font-medium">{t.name}</span>
                    </div>
                    <span className={`font-heading font-extrabold text-[13px] ${t.color}`}>
                      {t.pts}
                    </span>
                  </div>
                ))}
              </div>

              {/* Badge */}
              <div className="mt-auto bg-white/8 rounded-xl px-4 py-3">
                <p className="text-white/40 text-[10px] font-semibold tracking-widest uppercase mb-1">
                  Most Wicket Taker
                </p>
                <p className="text-white font-semibold text-[14px]">Siddhai K Ray</p>
                <p className="text-accent font-heading font-extrabold text-[16px]">12 Wkts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. FIXTURES & RESULTS — table with toggle
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 pb-14">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading font-extrabold text-[26px] text-primary tracking-tight">
            Fixtures &amp; Results
          </h2>
          {/* Toggle */}
          <div className="flex items-center bg-white rounded-xl p-1 shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_2px_8px_rgba(0,0,0,0.04)]">
            <button
              onClick={() => setActiveTab("recent")}
              className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                activeTab === "recent"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-muted hover:text-primary"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                activeTab === "upcoming"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-muted hover:text-primary"
              }`}
            >
              Upcoming
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[100px_1fr_1fr_160px_60px] gap-4 px-6 py-3 bg-section border-b border-border/30">
            {["MATCHDAY", "TEAMS", "ROUND", "RESULT / ETA", "ACTIONS"].map((h) => (
              <span key={h} className="text-[10px] font-semibold text-text-muted tracking-widest uppercase">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {fixtures.map((f, i) => (
            <div
              key={i}
              className="grid grid-cols-[100px_1fr_1fr_160px_60px] gap-4 px-6 py-4 border-b border-border/20 last:border-0 items-center hover:bg-section/50 transition-colors"
            >
              {/* Date */}
              <div>
                <p className="text-[13px] font-semibold text-primary whitespace-pre-line leading-[1.4]">
                  {f.matchday}
                </p>
              </div>

              {/* Teams */}
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-semibold text-text-primary">{f.homeTeam}</p>
                <p className="text-[12px] text-text-muted">vs {f.awayTeam}</p>
              </div>

              {/* Round */}
              <span className="text-[13px] text-text-body">{f.round}</span>

              {/* Result */}
              <div>
                {f.resultType === "win" && (
                  <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-[12px] font-semibold px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    {f.result}
                  </span>
                )}
                {f.resultType === "cancelled" && (
                  <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-[12px] font-semibold px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    {f.result}
                  </span>
                )}
                {f.resultType === "upcoming" && (
                  <span className="text-text-muted text-[13px]">{f.result}</span>
                )}
              </div>

              {/* Action */}
              <div>
                {f.action === "view" ? (
                  <button className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                ) : (
                  <button className="w-8 h-8 rounded-lg bg-accent-peach flex items-center justify-center hover:bg-accent hover:text-white transition-colors text-accent-dark">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. MATCH MOMENTS — 4-image horizontal gallery
      ══════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-8 pb-20">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-8">
          <h2 className="font-heading font-extrabold text-[26px] text-primary tracking-tight">
            Match Moments
          </h2>
          <p className="text-text-muted text-[14px]">
            Relive the drama, the skill, and the spirit of HBPL cricket — through the lens.
          </p>
        </div>

        {/* 4-image grid: 1 wide + 3 square */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {galleryImages.map((img, i) => (
            <div
              key={img.alt}
              className={`rounded-3xl overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.07),0px_4px_16px_rgba(0,0,0,0.05)] group ${
                i === 0 ? "md:col-span-2 aspect-4/3" : "aspect-square"
              }`}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
