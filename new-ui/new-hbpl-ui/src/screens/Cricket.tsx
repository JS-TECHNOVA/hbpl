"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { mediaUrl } from "@/src/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const WS_HOST = (process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org").replace(/^http/, "ws");

interface Tournament {
  id: string;
  title: string;
  slug: string;
  format: string;
  status: string;
  start_date: string;
  end_date: string;
}
interface TeamBrief { id: string; name: string; short_name: string; logo_url: string }
interface Match {
  id: string;
  match_number: number;
  title: string;
  team1: TeamBrief;
  team2: TeamBrief;
  match_date: string;
  status: string;
  result_text: string;
  innings1_score: number;
  innings1_wickets: number;
  innings1_overs: string;
  innings2_score: number;
  innings2_wickets: number;
  innings2_overs: string;
  winner: TeamBrief | null;
  youtube_live_id: string;
  batting_team: TeamBrief | null;
  required_runs: number | null;
}
interface LiveWs {
  innings1_score: number; innings1_wickets: number; innings1_overs: string;
  innings2_score: number; innings2_wickets: number; innings2_overs: string;
  batting_team: TeamBrief | null;
  current_batsmen: { player: { name: string }; runs: number; balls_faced: number }[];
  current_bowler_stats: { player: { name: string }; overs_bowled: string; wickets: number } | null;
  recent_commentary: { runs_scored: number; is_wicket: boolean; is_four: boolean; is_six: boolean; extra_type: string }[];
  status: string; result_text: string; required_runs: number | null; current_innings: number;
}
interface PointsRow {
  team: TeamBrief; played: number; won: number; lost: number; tied: number; points: number; nrr: number;
}
interface CricketTeam {
  id: string; name: string; short_name: string; logo_url: string; home_city: string;
  captain: null | { name: string };
}

type Tab = "upcoming" | "live" | "completed";

// ── Icons ──────────────────────────────────────────────────────────────────
const IconLive = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
    <circle cx="10" cy="10" r="8" className="opacity-30" /><circle cx="10" cy="10" r="4" />
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
const IconTV = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
    <rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 20h8M12 18v2" />
  </svg>
);
const IconTeam = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// ── Avatar ─────────────────────────────────────────────────────────────────
function TeamAvatar({ team, size = "sm" }: { team: TeamBrief; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "w-14 h-14 text-xl" : size === "md" ? "w-10 h-10 text-base" : "w-8 h-8 text-sm";
  if (team.logo_url) {
    return <img src={mediaUrl(team.logo_url)} alt={team.name} className={`${s} rounded-full object-cover ring-1 ring-white/10`} />;
  }
  return (
    <div className={`${s} rounded-full bg-linear-to-br from-slate-600 to-slate-800 ring-1 ring-white/10 flex items-center justify-center font-extrabold text-white`}>
      {(team.short_name || team.name).slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Ball chip helper ───────────────────────────────────────────────────────
function ballLabel(c: { runs_scored: number; is_wicket: boolean; is_four: boolean; is_six: boolean; extra_type: string }) {
  if (c.is_wicket) return { label: "W", cls: "bg-red-500 text-white" };
  if (c.is_six) return { label: "6", cls: "bg-orange-500 text-white" };
  if (c.is_four) return { label: "4", cls: "bg-yellow-400 text-slate-900" };
  if (c.extra_type === "wide") return { label: "Wd", cls: "bg-blue-600/50 text-blue-200" };
  if (c.extra_type === "no_ball") return { label: "Nb", cls: "bg-purple-600/50 text-purple-200" };
  return { label: c.runs_scored === 0 ? "·" : String(c.runs_scored), cls: "bg-white/10 text-white/70" };
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isLive = status === "innings1" || status === "innings2";
  if (isLive) return (
    <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live
    </span>
  );
  if (status === "completed") return (
    <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full">
      Final
    </span>
  );
  if (status === "toss_done") return (
    <span className="inline-flex items-center bg-amber-500/10 text-amber-400 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full">Toss</span>
  );
  return (
    <span className="inline-flex items-center bg-slate-700/60 text-slate-400 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full">
      Upcoming
    </span>
  );
}

// ── Match Card ─────────────────────────────────────────────────────────────
function MatchCard({ m }: { m: Match }) {
  const isLive = m.status === "innings1" || m.status === "innings2";
  const isCompleted = m.status === "completed";
  const dt = new Date(m.match_date);
  const dateStr = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const timeStr = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <Link href={`/match/${m.id}`} className={`group block rounded-2xl border transition-all duration-200 cursor-pointer ${
      isLive
        ? "bg-linear-to-br from-red-950/60 via-slate-900 to-slate-900 border-red-500/30 hover:border-red-500/60 shadow-[0_0_24px_rgba(239,68,68,0.12)]"
        : "bg-slate-900/80 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900"
    }`}>
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <IconCalendar />
            <span>{dateStr}</span>
            <IconClock />
            <span>{timeStr}</span>
            {m.youtube_live_id && isLive && (
              <span className="ml-1 flex items-center gap-1 text-red-400"><IconTV /> Stream</span>
            )}
          </div>
          <StatusBadge status={m.status} />
        </div>

        {/* Teams row */}
        <div className="flex items-center gap-3">
          {/* Team 1 */}
          <div className="flex-1 flex items-center gap-2.5">
            <TeamAvatar team={m.team1} />
            <div>
              <p className="font-bold text-white text-[14px] leading-tight">{m.team1.short_name || m.team1.name}</p>
              {isCompleted && (
                <p className={`font-extrabold text-[20px] leading-none mt-0.5 ${m.winner?.id === m.team1.id ? "text-accent" : "text-white/60"}`}>
                  {m.innings1_score}<span className="text-[14px] font-normal text-white/40">/{m.innings1_wickets}</span>
                </p>
              )}
              {isLive && m.batting_team?.id === m.team1.id && (
                <p className="font-extrabold text-[20px] leading-none mt-0.5 text-white">
                  {m.innings1_score}<span className="text-[14px] font-normal text-white/40">/{m.innings1_wickets}</span>
                </p>
              )}
            </div>
          </div>

          {/* VS divider */}
          <div className="text-slate-600 font-semibold text-[11px] tracking-widest shrink-0">VS</div>

          {/* Team 2 */}
          <div className="flex-1 flex items-center justify-end gap-2.5">
            <div className="text-right">
              <p className="font-bold text-white text-[14px] leading-tight">{m.team2.short_name || m.team2.name}</p>
              {isCompleted && (
                <p className={`font-extrabold text-[20px] leading-none mt-0.5 ${m.winner?.id === m.team2.id ? "text-accent" : "text-white/60"}`}>
                  {m.innings2_score}<span className="text-[14px] font-normal text-white/40">/{m.innings2_wickets}</span>
                </p>
              )}
              {isLive && m.batting_team?.id === m.team2.id && (
                <p className="font-extrabold text-[20px] leading-none mt-0.5 text-white">
                  {m.innings2_score}<span className="text-[14px] font-normal text-white/40">/{m.innings2_wickets}</span>
                </p>
              )}
            </div>
            <TeamAvatar team={m.team2} />
          </div>
        </div>

        {/* Result / required */}
        {isCompleted && m.result_text && (
          <p className="mt-3 text-[11px] text-slate-400 border-t border-slate-800 pt-3">{m.result_text}</p>
        )}
        {isLive && m.required_runs != null && (
          <p className="mt-3 text-[11px] text-amber-400 border-t border-slate-800/60 pt-3">
            Need {m.required_runs} more runs
          </p>
        )}
      </div>

      {/* View detail strip */}
      <div className={`flex items-center justify-between px-5 py-2.5 border-t text-[11px] font-semibold transition-colors ${
        isLive ? "border-red-500/20 text-red-400/70 group-hover:text-red-300" : "border-slate-800/60 text-slate-600 group-hover:text-slate-400"
      }`}>
        <span>Match #{m.match_number} · {m.title || "—"}</span>
        <span>View details →</span>
      </div>
    </Link>
  );
}

// ── Points row ─────────────────────────────────────────────────────────────
function NrrBadge({ nrr }: { nrr: number }) {
  const color = nrr > 0 ? "text-green-400" : nrr < 0 ? "text-red-400" : "text-slate-500";
  return <span className={`text-[11px] font-mono ${color}`}>{nrr > 0 ? "+" : ""}{nrr.toFixed(3)}</span>;
}

// ══════════════════════════════════════════════════════════════════════════
export default function Cricket() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTId, setSelectedTId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [liveWs, setLiveWs] = useState<LiveWs | null>(null);
  const [pointsTable, setPointsTable] = useState<PointsRow[]>([]);
  const [teams, setTeams] = useState<CricketTeam[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const wsRef = useRef<WebSocket | null>(null);

  // Initial load
  useEffect(() => {
    fetch(`${API}/api/v1/cricket/tournaments/`)
      .then(r => r.json()).then(d => {
        const list: Tournament[] = Array.isArray(d) ? d : d.results ?? [];
        setTournaments(list);
        const active = list.find(t => ["ongoing", "registration_open"].includes(t.status)) ?? list[0];
        if (active) setSelectedTId(active.id);
      }).catch(() => {});

    fetch(`${API}/api/v1/cricket/teams/`)
      .then(r => r.json()).then(d => setTeams(Array.isArray(d) ? d : d.results ?? [])).catch(() => {});

    fetch(`${API}/api/v1/cricket/matches/?status=innings1`)
      .then(r => r.json()).then(d => {
        const live: Match[] = Array.isArray(d) ? d : d.results ?? [];
        if (live.length) { setLiveMatch(live[0]); setTab("live"); }
      }).catch(() => {});
  }, []);

  // Tournament data
  useEffect(() => {
    if (!selectedTId) return;
    fetch(`${API}/api/v1/cricket/matches/?tournament=${selectedTId}`)
      .then(r => r.json()).then(d => setMatches(Array.isArray(d) ? d : d.results ?? [])).catch(() => {});
    fetch(`${API}/api/v1/cricket/tournaments/${selectedTId}/points-table/`)
      .then(r => r.json()).then(d => setPointsTable(Array.isArray(d) ? d : [])).catch(() => {});
  }, [selectedTId]);

  // WebSocket for live banner
  useEffect(() => {
    wsRef.current?.close(); wsRef.current = null;
    if (!liveMatch) return;
    const ws = new WebSocket(`${WS_HOST}/ws/match/${liveMatch.id}/`);
    wsRef.current = ws;
    ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "score_update" || msg.type === "initial_state") setLiveWs(msg.data as LiveWs);
      } catch {}
    };
    return () => { ws.readyState < 2 && ws.close(); wsRef.current = null; };
  }, [liveMatch?.id]);

  const liveMatches = useMemo(() => matches.filter(m => m.status === "innings1" || m.status === "innings2"), [matches]);
  const completedMatches = useMemo(() => matches.filter(m => m.status === "completed").slice().reverse().slice(0, 20), [matches]);
  const upcomingMatches = useMemo(() => matches.filter(m => m.status === "scheduled" || m.status === "toss_done").slice(0, 20), [matches]);
  const displayedMatches = tab === "live" ? liveMatches : tab === "completed" ? completedMatches : upcomingMatches;

  const currentT = tournaments.find(t => t.id === selectedTId);

  // Live score values
  const ins = liveWs?.current_innings ?? 1;
  const liveScore = ins === 1
    ? `${liveWs?.innings1_score ?? 0}/${liveWs?.innings1_wickets ?? 0}`
    : `${liveWs?.innings2_score ?? 0}/${liveWs?.innings2_wickets ?? 0}`;
  const liveOvers = ins === 1 ? liveWs?.innings1_overs : liveWs?.innings2_overs;
  const recentBalls = useMemo(() =>
    (liveWs?.recent_commentary ?? []).slice(0, 6).reverse().map(ballLabel),
    [liveWs?.recent_commentary]
  );

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "live", label: "Live", count: liveMatches.length },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1600&q=80"
            alt="Cricket stadium"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-b from-[#020617]/85 via-[#020617]/70 to-[#020617]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-slate-400 text-[12px] font-semibold tracking-widest uppercase mb-2">HBPL · Community Cricket</p>
            <h1 className="font-heading font-extrabold text-5xl sm:text-6xl text-white leading-none tracking-tight">
              {currentT?.title ?? "Champions League"}
            </h1>
            <p className="mt-3 text-slate-400 text-[15px]">
              {currentT ? `${currentT.format} · ${new Date(currentT.start_date).getFullYear()}` : "Live scores, stats & standings"}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Link
                href="/cricket/register"
                className="inline-flex items-center gap-2 bg-accent text-white font-bold text-[13px] px-6 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <IconTeam /> Register Team
              </Link>
              {tournaments.length > 1 && (
                <select
                  value={selectedTId ?? ""}
                  onChange={e => setSelectedTId(e.target.value)}
                  className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[13px] font-semibold px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                >
                  {tournaments.map(t => <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.title}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE MATCH BANNER ─────────────────────────────────────────────── */}
      {liveMatch && (
        <div className="bg-linear-to-r from-red-950 via-red-900/80 to-slate-900 border-y border-red-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              {/* Live indicator + teams */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <TeamAvatar team={liveMatch.team1} size="sm" />
                  <span className="font-bold text-white text-[14px] truncate">{liveMatch.team1.short_name || liveMatch.team1.name}</span>
                  <span className="text-slate-600 text-[11px]">vs</span>
                  <span className="font-bold text-white text-[14px] truncate">{liveMatch.team2.short_name || liveMatch.team2.name}</span>
                  <TeamAvatar team={liveMatch.team2} size="sm" />
                </div>
              </div>

              {/* Live score */}
              {liveWs ? (
                <div className="flex items-center gap-5 flex-wrap flex-1">
                  <div>
                    <p className="font-extrabold text-[28px] leading-none text-white">{liveScore}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {liveWs.batting_team?.short_name ?? "—"} · {liveOvers} ov
                      {liveWs.required_runs != null && liveWs.required_runs > 0 && ` · Need ${liveWs.required_runs}`}
                    </p>
                  </div>
                  {liveWs.current_batsmen.map(b => (
                    <div key={b.player.name} className="text-center">
                      <p className="font-semibold text-white text-[12px]">{b.player.name}</p>
                      <p className="text-slate-500 text-[11px]">{b.runs}({b.balls_faced})</p>
                    </div>
                  ))}
                  {liveWs.current_bowler_stats && (
                    <div className="text-center">
                      <p className="font-semibold text-white text-[12px]">{liveWs.current_bowler_stats.player.name}</p>
                      <p className="text-slate-500 text-[11px]">{liveWs.current_bowler_stats.overs_bowled}ov {liveWs.current_bowler_stats.wickets}w</p>
                    </div>
                  )}
                  {recentBalls.length > 0 && (
                    <div className="flex items-center gap-1">
                      {recentBalls.map((b, i) => (
                        <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold ${b.cls}`}>{b.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-[13px] animate-pulse">Connecting…</p>
              )}

              <Link
                href={`/match/${liveMatch.id}`}
                className="shrink-0 flex items-center gap-1.5 bg-white text-red-700 font-bold text-[12px] px-4 py-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
              >
                Full Scorecard →
              </Link>
            </div>

            {/* YouTube embed */}
            {liveMatch.youtube_live_id && (
              <div className="mt-4 aspect-video max-w-3xl rounded-2xl overflow-hidden ring-1 ring-red-500/20">
                <iframe
                  src={`https://www.youtube.com/embed/${liveMatch.youtube_live_id}?autoplay=1&mute=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Matches */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 self-start">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150 cursor-pointer ${
                  tab === t.key
                    ? "bg-accent text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className={`w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center ${
                    tab === t.key ? "bg-white/20 text-white" : "bg-red-500 text-white"
                  }`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Match cards */}
          {displayedMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                <IconCalendar />
              </div>
              <p className="text-slate-400 text-[14px]">
                {tab === "live" ? "No live matches right now." : tab === "upcoming" ? "No upcoming matches scheduled." : "No completed matches yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedMatches.map(m => <MatchCard key={m.id} m={m} />)}
            </div>
          )}
        </div>

        {/* Right: Points Table */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden sticky top-20">
            <div className="px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <IconStar />
                <h3 className="font-extrabold text-[15px] text-white">Points Table</h3>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">{currentT?.title}</p>
            </div>

            {pointsTable.length === 0 ? (
              <div className="py-10 text-center text-slate-600 text-[13px]">No matches completed yet.</div>
            ) : (
              <div>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-5 py-2.5 text-[9px] text-slate-600 font-semibold uppercase tracking-widest border-b border-slate-800/60">
                  <span>Team</span><span>W/L</span><span>NRR</span><span>PTS</span>
                </div>
                {pointsTable.map((row, i) => (
                  <div key={row.team.id} className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-5 py-3 border-b border-slate-800/40 last:border-0 ${
                    i === 0 ? "bg-accent/5" : ""
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] text-slate-600 font-semibold w-4">{i + 1}</span>
                      <TeamAvatar team={row.team} size="sm" />
                      <span className="text-[13px] font-semibold text-white truncate">
                        {row.team.short_name || row.team.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 text-center">{row.won}/{row.lost}</span>
                    <NrrBadge nrr={row.nrr} />
                    <span className={`text-[14px] font-extrabold text-right ${i === 0 ? "text-accent" : "text-white"}`}>
                      {row.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TEAMS SECTION ─────────────────────────────────────────────────── */}
      {teams.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <IconTeam />
            </div>
            <div>
              <h2 className="font-extrabold text-[20px] text-white">Participating Teams</h2>
              <p className="text-slate-500 text-[12px]">{teams.length} teams · {currentT?.title}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {teams.map(team => (
              <div
                key={team.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-3 text-center hover:border-slate-700 hover:bg-slate-800/80 transition-all duration-200 cursor-pointer group"
              >
                {team.logo_url ? (
                  <img src={mediaUrl(team.logo_url)} alt={team.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/5 group-hover:ring-accent/30 transition-all" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-linear-to-br from-slate-700 to-slate-900 ring-2 ring-white/5 group-hover:ring-accent/30 flex items-center justify-center text-white font-extrabold text-[15px] transition-all">
                    {(team.short_name || team.name).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-[13px] text-white group-hover:text-accent transition-colors leading-tight">{team.name}</p>
                  {team.home_city && <p className="text-slate-500 text-[11px] mt-0.5">{team.home_city}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
