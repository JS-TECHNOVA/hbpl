"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const V1 = `${API}/api/v1/cricket`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Tournament {
  id: string; title: string; slug: string; description: string;
  format: string; status: string; city: string; venue: string;
  start_date: string; end_date: string; banner_image: string;
  max_overs: number; youtube_channel: string;
}

interface TeamBrief {
  id: string; name: string; short_name: string; logo_url: string;
}

interface Match {
  id: string; match_number: number; title: string; status: string;
  match_date: string; venue: string; format: string;
  team1: TeamBrief; team2: TeamBrief;
  innings1_score: number; innings1_wickets: number; innings1_overs: string;
  innings2_score: number; innings2_wickets: number; innings2_overs: string;
  innings1_team: TeamBrief | null; innings2_team: TeamBrief | null;
  result_text: string; winner: TeamBrief | null;
}

interface Team {
  id: string; name: string; short_name: string; logo_url: string;
  home_city: string; registration_status: string;
  players: { id: string; name: string; role: string; jersey_number: number | null }[];
}

interface PointsRow {
  team: TeamBrief; played: number; won: number; lost: number;
  tied: number; no_result: number; points: number; nrr: number;
}

interface LeaderBatsman {
  player_id: string; player_name: string;
  team_name: string; team_short: string; team_logo: string;
  runs: number; innings: number; highest: number; balls: number;
  fours: number; sixes: number; strike_rate: number;
}

interface LeaderBowler {
  player_id: string; player_name: string;
  team_name: string; team_short: string; team_logo: string;
  wickets: number; innings: number; overs: string; runs: number;
  economy: number; average: number | null;
}

type Tab = "overview" | "schedule" | "points" | "teams" | "leaderboard";

const STATUS_BADGE: Record<string, string> = {
  registration_open: "bg-green-100 text-green-700",
  registration_closed: "bg-amber-100 text-amber-700",
  ongoing: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-500",
};

const MATCH_STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-500",
  toss_done: "bg-yellow-100 text-yellow-700",
  innings1: "bg-red-100 text-red-700",
  innings2: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
  abandoned: "bg-gray-100 text-gray-500",
};

const MATCH_STATUS_LABEL: Record<string, string> = {
  scheduled: "Upcoming",
  toss_done: "Toss Done",
  innings1: "LIVE",
  innings2: "LIVE",
  completed: "Completed",
  abandoned: "Abandoned",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("overview");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [points, setPoints] = useState<PointsRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ top_batsmen: LeaderBatsman[]; top_bowlers: LeaderBowler[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${V1}/tournaments/${id}/`).then(r => r.json()),
      fetch(`${V1}/matches/?tournament=${id}`).then(r => r.json()),
      fetch(`${V1}/teams/?tournament=${id}`).then(r => r.json()),
    ]).then(([t, m, te]) => {
      setTournament(t);
      setMatches(Array.isArray(m) ? m : m.results ?? []);
      setTeams(Array.isArray(te) ? te : te.results ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === "points" && points.length === 0) {
      fetch(`${V1}/tournaments/${id}/points-table/`).then(r => r.json()).then(setPoints).catch(() => {});
    }
    if (tab === "leaderboard" && !leaderboard) {
      fetch(`${V1}/tournaments/${id}/leaderboard/`).then(r => r.json()).then(setLeaderboard).catch(() => {});
    }
  }, [tab, id, points.length, leaderboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center text-text-muted">
        Tournament not found.
      </div>
    );
  }

  const live = matches.filter(m => m.status === "innings1" || m.status === "innings2");
  const upcoming = matches.filter(m => m.status === "scheduled" || m.status === "toss_done");
  const completed = matches.filter(m => m.status === "completed");

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "schedule", label: `Schedule (${matches.length})` },
    { key: "points", label: "Points Table" },
    { key: "teams", label: `Teams (${teams.length})` },
    { key: "leaderboard", label: "Top Performers" },
  ];

  return (
    <div className="min-h-screen bg-page">
      {/* Hero */}
      <div className="bg-primary-darker">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <Link href="/cricket" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-[13px] transition-colors mb-5 cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            All Tournaments
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${STATUS_BADGE[tournament.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {tournament.status.replace("_", " ")}
                </span>
                <span className="bg-white/10 text-white/70 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">{tournament.format}</span>
                {live.length > 0 && (
                  <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> {live.length} LIVE
                  </span>
                )}
              </div>
              <h1 className="font-heading font-extrabold text-[36px] md:text-[48px] text-white leading-tight tracking-tight">{tournament.title}</h1>
              <div className="flex items-center gap-4 flex-wrap text-white/60 text-[13px]">
                {tournament.city && <span>{tournament.city}</span>}
                {tournament.venue && <span>· {tournament.venue}</span>}
                {tournament.start_date && (
                  <span>· {new Date(tournament.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {tournament.end_date ? ` – ${new Date(tournament.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                  </span>
                )}
              </div>
            </div>
            {tournament.status === "registration_open" && (
              <Link
                href="/cricket/register"
                className="bg-accent text-white font-semibold text-[14px] px-6 py-3 rounded-xl hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap w-fit"
              >
                Register Your Team
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-white border-b border-border/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-4 text-[13px] font-semibold border-b-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  tab === t.key ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="flex flex-col gap-6 max-w-3xl">
            {tournament.banner_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tournament.banner_image} alt={tournament.title} className="w-full rounded-3xl object-cover max-h-72" />
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Format", value: tournament.format },
                { label: "Overs", value: `${tournament.max_overs} overs` },
                { label: "Teams", value: teams.length.toString() },
                { label: "Matches", value: matches.length.toString() },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl border border-border/60 px-5 py-4 flex flex-col gap-1">
                  <span className="text-text-muted text-[11px] font-semibold uppercase tracking-wider">{stat.label}</span>
                  <span className="font-heading font-extrabold text-[22px] text-primary">{stat.value}</span>
                </div>
              ))}
            </div>
            {tournament.description && (
              <div className="bg-white rounded-3xl border border-border/60 p-7">
                <h3 className="font-heading font-extrabold text-[16px] text-primary mb-3">About</h3>
                <p className="text-text-body text-[14px] leading-relaxed">{tournament.description}</p>
              </div>
            )}
            {live.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="font-heading font-extrabold text-[16px] text-primary">Live Now</h3>
                {live.map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="font-heading font-extrabold text-[16px] text-primary">Upcoming</h3>
                {upcoming.slice(0, 3).map(m => <MatchCard key={m.id} match={m} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Schedule ─────────────────────────────────────────────────────── */}
        {tab === "schedule" && (
          <div className="flex flex-col gap-6">
            {live.length > 0 && (
              <Section title="Live">
                {live.map(m => <MatchCard key={m.id} match={m} />)}
              </Section>
            )}
            {upcoming.length > 0 && (
              <Section title="Upcoming">
                {upcoming.map(m => <MatchCard key={m.id} match={m} />)}
              </Section>
            )}
            {completed.length > 0 && (
              <Section title="Completed">
                {completed.map(m => <MatchCard key={m.id} match={m} />)}
              </Section>
            )}
            {matches.length === 0 && <EmptyState>No matches scheduled yet.</EmptyState>}
          </div>
        )}

        {/* ── Points Table ─────────────────────────────────────────────────── */}
        {tab === "points" && (
          <div className="bg-white rounded-3xl border border-border/50 overflow-hidden shadow-sm">
            {points.length === 0 ? (
              <EmptyState>No completed matches yet. Points table will appear here.</EmptyState>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-section text-text-muted text-[11px] uppercase tracking-wider border-b border-border/30">
                    {["#", "Team", "P", "W", "L", "T", "Pts", "NRR"].map(col => (
                      <th key={col} className={`px-4 py-3 font-semibold ${col === "Team" ? "text-left" : "text-right"}`}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {points.map((row, i) => (
                    <tr key={row.team.id} className={`border-b border-border/20 last:border-0 hover:bg-section/40 transition-colors ${i < 4 ? "bg-green-50/30" : ""}`}>
                      <td className="px-4 py-3 text-text-muted font-semibold text-right">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TeamAvatar team={row.team} size="sm" />
                          <span className="font-semibold text-text-primary">{row.team.short_name || row.team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">{row.played}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">{row.won}</td>
                      <td className="px-4 py-3 text-right text-red-500">{row.lost}</td>
                      <td className="px-4 py-3 text-right text-text-muted">{row.tied}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-primary">{row.points}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${row.nrr >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {row.nrr >= 0 ? "+" : ""}{row.nrr.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Teams ────────────────────────────────────────────────────────── */}
        {tab === "teams" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.length === 0 && <EmptyState>No approved teams yet.</EmptyState>}
            {teams.map(team => (
              <div key={team.id} className="bg-white rounded-3xl border border-border/60 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <TeamAvatar team={team} size="lg" />
                  <div>
                    <p className="font-heading font-extrabold text-[17px] text-primary leading-tight">{team.name}</p>
                    {team.home_city && <p className="text-text-muted text-[12px] mt-0.5">{team.home_city}</p>}
                  </div>
                </div>
                {team.players.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {team.players.slice(0, 8).map(p => (
                      <span key={p.id} className="bg-section text-text-muted text-[11px] px-2 py-0.5 rounded-full">
                        {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.name.split(" ")[0]}
                      </span>
                    ))}
                    {team.players.length > 8 && (
                      <span className="text-primary text-[11px] font-semibold px-2 py-0.5">+{team.players.length - 8} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Leaderboard ──────────────────────────────────────────────────── */}
        {tab === "leaderboard" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Top Batsmen */}
            <div className="bg-white rounded-3xl border border-border/50 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-accent">
                  <path d="M18.5 2L4 16.5l3.5 3.5L22 5.5 18.5 2zM4 21l-1-4 3.5 1.5L4 21z" />
                </svg>
                <h3 className="font-heading font-extrabold text-[16px] text-primary">Top Run Scorers</h3>
              </div>
              {!leaderboard ? (
                <div className="py-12 flex justify-center">
                  <svg className="w-6 h-6 animate-spin text-primary/30" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : leaderboard.top_batsmen.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-[13px]">No batting data yet.</div>
              ) : (
                <>
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-5 py-2 text-[9px] text-text-muted font-bold uppercase tracking-wider border-b border-border/20">
                    <span>#</span><span>Player</span><span className="text-right">Runs</span><span className="text-right">HS</span><span className="text-right">SR</span>
                  </div>
                  {leaderboard.top_batsmen.map((b, i) => (
                    <div key={b.player_id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-5 py-3.5 items-center border-b border-border/10 last:border-0 hover:bg-section/40 transition-colors">
                      <span className={`text-[12px] font-extrabold w-5 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-text-muted"}`}>{i + 1}</span>
                      <div>
                        <p className="font-semibold text-text-primary text-[13px]">{b.player_name}</p>
                        <p className="text-text-muted text-[11px]">{b.team_short || b.team_name}</p>
                      </div>
                      <span className="text-right font-extrabold text-accent text-[16px]">{b.runs}</span>
                      <span className="text-right text-text-muted text-[12px]">{b.highest}</span>
                      <span className="text-right text-text-muted text-[12px]">{b.strike_rate.toFixed(1)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Top Bowlers */}
            <div className="bg-white rounded-3xl border border-border/50 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-accent">
                  <circle cx="12" cy="12" r="9" /><path d="M12 3c2.4 4 2.4 14 0 18M3 12c4-2.4 14-2.4 18 0" />
                </svg>
                <h3 className="font-heading font-extrabold text-[16px] text-primary">Top Wicket Takers</h3>
              </div>
              {!leaderboard ? (
                <div className="py-12 flex justify-center">
                  <svg className="w-6 h-6 animate-spin text-primary/30" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : leaderboard.top_bowlers.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-[13px]">No bowling data yet.</div>
              ) : (
                <>
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-5 py-2 text-[9px] text-text-muted font-bold uppercase tracking-wider border-b border-border/20">
                    <span>#</span><span>Player</span><span className="text-right">Wkts</span><span className="text-right">Overs</span><span className="text-right">Eco</span>
                  </div>
                  {leaderboard.top_bowlers.map((b, i) => (
                    <div key={b.player_id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-3 px-5 py-3.5 items-center border-b border-border/10 last:border-0 hover:bg-section/40 transition-colors">
                      <span className={`text-[12px] font-extrabold w-5 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-text-muted"}`}>{i + 1}</span>
                      <div>
                        <p className="font-semibold text-text-primary text-[13px]">{b.player_name}</p>
                        <p className="text-text-muted text-[11px]">{b.team_short || b.team_name}</p>
                      </div>
                      <span className="text-right font-extrabold text-accent text-[16px]">{b.wickets}</span>
                      <span className="text-right text-text-muted text-[12px]">{b.overs}</span>
                      <span className="text-right text-text-muted text-[12px]">{b.economy.toFixed(2)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TeamAvatar({ team, size = "md" }: { team: { name: string; short_name: string; logo_url: string }; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "w-14 h-14 text-lg" : size === "md" ? "w-9 h-9 text-sm" : "w-6 h-6 text-[10px]";
  if (team.logo_url) return <img src={team.logo_url} alt={team.name} className={`${cls} rounded-full object-cover`} />;
  return (
    <div className={`${cls} rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center shrink-0`}>
      {(team.short_name || team.name).slice(0, 2).toUpperCase()}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "innings1" || match.status === "innings2";
  const isCompleted = match.status === "completed";
  const statusLabel = MATCH_STATUS_LABEL[match.status] ?? match.status;
  const statusCls = MATCH_STATUS_BADGE[match.status] ?? "bg-slate-100 text-slate-500";

  const team1Score = match.innings1_team?.id === match.team1.id
    ? `${match.innings1_score}/${match.innings1_wickets}`
    : match.innings2_team?.id === match.team1.id
      ? `${match.innings2_score}/${match.innings2_wickets}`
      : null;

  const team2Score = match.innings1_team?.id === match.team2.id
    ? `${match.innings1_score}/${match.innings1_wickets}`
    : match.innings2_team?.id === match.team2.id
      ? `${match.innings2_score}/${match.innings2_wickets}`
      : null;

  return (
    <Link
      href={`/match/${match.id}`}
      className={`bg-white rounded-3xl border overflow-hidden hover:shadow-md transition-all cursor-pointer block ${isLive ? "border-red-200 shadow-[0_0_0_2px_rgba(239,68,68,0.1)]" : "border-border/60"}`}
    >
      <div className="px-5 py-3 border-b border-border/30 flex items-center justify-between">
        <span className="text-text-muted text-[11px] font-semibold">Match #{match.match_number}{match.title ? ` · ${match.title}` : ""}</span>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${statusCls}`}>
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
          {statusLabel}
        </span>
      </div>
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <TeamAvatar team={match.team1} size="sm" />
              <span className={`font-semibold text-[14px] ${match.winner?.id === match.team1.id ? "text-green-600" : "text-text-primary"}`}>
                {match.team1.short_name || match.team1.name}
              </span>
            </div>
            {team1Score && <span className="font-extrabold text-[15px] text-text-primary tabular-nums">{team1Score}</span>}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <TeamAvatar team={match.team2} size="sm" />
              <span className={`font-semibold text-[14px] ${match.winner?.id === match.team2.id ? "text-green-600" : "text-text-primary"}`}>
                {match.team2.short_name || match.team2.name}
              </span>
            </div>
            {team2Score && <span className="font-extrabold text-[15px] text-text-primary tabular-nums">{team2Score}</span>}
          </div>
        </div>
      </div>
      <div className="px-5 pb-3 flex items-center gap-3 text-text-muted text-[11px]">
        {match.match_date && (
          <span>{new Date(match.match_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        )}
        {match.venue && <span>· {match.venue}</span>}
        {isCompleted && match.result_text && (
          <span className="text-green-600 font-semibold">· {match.result_text}</span>
        )}
      </div>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading font-extrabold text-[15px] text-primary uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-16 text-center text-text-muted text-[14px] bg-white rounded-3xl border border-border/60">{children}</div>
  );
}
