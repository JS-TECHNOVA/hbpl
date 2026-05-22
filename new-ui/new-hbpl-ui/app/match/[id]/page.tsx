"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useMatchSocket, type LiveScore, type InningsData } from "@/src/hooks/useMatchSocket";
import { mediaUrl } from "@/src/lib/api";

// ── Icons ─────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);
const IconTV = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
    <rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 20h8M12 18v2" />
  </svg>
);
const IconBat = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M18.5 2L4 16.5l3.5 3.5L22 5.5 18.5 2zM4 21l-1-4 3.5 1.5L4 21z" />
  </svg>
);
const IconBall = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3c2.4 4 2.4 14 0 18M3 12c4-2.4 14-2.4 18 0" />
  </svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
    <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M12 12v4" />
  </svg>
);

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface TeamPlayer {
  id: string;
  name: string;
  jersey_number: number | null;
  role: string;
  photo_url: string | null;
}

interface TeamFull {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  captain: TeamPlayer | null;
  vice_captain: TeamPlayer | null;
  wicket_keeper: TeamPlayer | null;
  players: TeamPlayer[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function ballChip(c: { runs_scored: number; is_wicket: boolean; is_four: boolean; is_six: boolean; extra_type: string }) {
  if (c.is_wicket) return { label: "W", cls: "bg-red-600 text-white font-extrabold" };
  if (c.is_six) return { label: "6", cls: "bg-orange-500 text-white font-extrabold" };
  if (c.is_four) return { label: "4", cls: "bg-yellow-400 text-slate-900 font-extrabold" };
  if (c.extra_type === "wide") return { label: "Wd", cls: "bg-blue-700/50 text-blue-200 text-[9px]" };
  if (c.extra_type === "no_ball") return { label: "Nb", cls: "bg-purple-700/50 text-purple-200 text-[9px]" };
  return { label: c.runs_scored === 0 ? "·" : String(c.runs_scored), cls: "bg-white/8 text-white/60" };
}

function commentaryRowCls(c: { is_wicket: boolean; is_six: boolean; is_four: boolean }) {
  if (c.is_wicket) return "bg-red-950/40 border-l-2 border-red-500";
  if (c.is_six) return "bg-orange-950/30 border-l-2 border-orange-500";
  if (c.is_four) return "bg-yellow-950/20 border-l-2 border-yellow-500";
  return "bg-white/[0.02] border-l-2 border-transparent";
}

function commentaryScoreColor(c: { is_wicket: boolean; is_six: boolean; is_four: boolean; runs_scored: number }) {
  if (c.is_wicket) return "text-red-400";
  if (c.is_six) return "text-orange-400";
  if (c.is_four) return "text-yellow-400";
  return "text-white";
}

// ── Sub-components ─────────────────────────────────────────────────────────
function TeamLogo({ name, short_name, logo_url, size = "md" }: { name: string; short_name?: string; logo_url?: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "w-16 h-16 text-xl" : size === "md" ? "w-10 h-10 text-sm" : "w-7 h-7 text-xs";
  if (logo_url) return <img src={mediaUrl(logo_url)} alt={name} className={`${s} rounded-full object-cover ring-1 ring-white/10`} />;
  return (
    <div className={`${s} rounded-full bg-linear-to-br from-slate-600 to-slate-800 ring-1 ring-white/10 flex items-center justify-center font-extrabold text-white`}>
      {(short_name || name).slice(0, 2).toUpperCase()}
    </div>
  );
}

function dismissalText(b: import("@/src/hooks/useMatchSocket").BattingEntry): string {
  if (b.out_reason) return b.out_reason;
  const wt = (b.wicket_type || "").toLowerCase().replace(/_/g, " ");
  if (!wt) return "";
  const bowler = b.dismissed_by_bowler?.name;
  const fielder = b.fielder?.name;
  if (wt === "bowled") return bowler ? `b ${bowler}` : "bowled";
  if (wt === "lbw") return bowler ? `lbw b ${bowler}` : "lbw";
  if (wt === "caught") return `c ${fielder ?? "fielder"} b ${bowler ?? "bowler"}`;
  if (wt === "stumped") return `st ${fielder ?? "wk"} b ${bowler ?? "bowler"}`;
  if (wt === "run out") return fielder ? `run out (${fielder})` : "run out";
  if (wt === "hit wicket") return bowler ? `hit wicket b ${bowler}` : "hit wicket";
  return `${wt}${bowler ? ` b ${bowler}` : ""}`;
}

const COL = "1fr 36px 36px 30px 30px 46px";

function ScorecardTable({
  data, totalScore, totalWickets, totalOvers,
}: {
  data: InningsData;
  totalScore: number;
  totalWickets: number;
  totalOvers: string;
}) {
  const batted     = data.batting.filter(b => !b.did_not_bat);
  const didNotBat  = data.batting.filter(b => b.did_not_bat);
  const bowlers    = data.bowling.filter(b => b.overs_bowled !== "0.0" && b.overs_bowled !== "0");

  return (
    <div className="flex flex-col gap-5">

      {/* ── Batting ── */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900">
          <span className="text-accent"><IconBat /></span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Batting</span>
        </div>

        {/* Column headers */}
        <div className="grid gap-x-2 px-4 py-2 text-[9px] text-slate-600 font-bold uppercase tracking-widest border-b border-slate-800/40"
             style={{ gridTemplateColumns: COL }}>
          <span>Batter</span>
          <span className="text-right">R</span><span className="text-right">B</span>
          <span className="text-right">4s</span><span className="text-right">6s</span>
          <span className="text-right">SR</span>
        </div>

        {batted.map(b => (
          <div key={b.id}
               className={`grid gap-x-2 px-4 py-3 border-b border-slate-800/30 last:border-0 items-start transition-colors ${
                 b.is_out ? "opacity-50 hover:opacity-60" : "hover:bg-white/2"
               }`}
               style={{ gridTemplateColumns: COL }}>
            <div>
              <span className={`font-semibold text-[13px] ${b.is_out ? "text-slate-300" : "text-white"}`}>
                {b.player.name}
                {!b.is_out && <span className="text-green-400 text-[9px] font-extrabold ml-1">*</span>}
              </span>
              {b.is_out
                ? <p className="text-slate-500 text-[10px] mt-0.5 leading-tight">{dismissalText(b)}</p>
                : <p className="text-green-500/70 text-[10px] mt-0.5">not out</p>
              }
            </div>
            <span className={`text-right font-extrabold text-[15px] ${b.is_out ? "text-slate-400" : "text-accent"}`}>{b.runs}</span>
            <span className="text-right text-slate-400 text-[13px]">{b.balls_faced}</span>
            <span className="text-right text-slate-500 text-[12px]">{b.fours}</span>
            <span className="text-right text-slate-500 text-[12px]">{b.sixes}</span>
            <span className="text-right text-slate-500 text-[12px]">{(b.strike_rate ?? 0).toFixed(1)}</span>
          </div>
        ))}

        {didNotBat.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-800/40 flex flex-wrap gap-1 items-baseline">
            <span className="text-slate-600 text-[10px] font-semibold uppercase tracking-wider mr-1">Did not bat:</span>
            <span className="text-slate-500 text-[11px]">{didNotBat.map(b => b.player.name).join(", ")}</span>
          </div>
        )}

        {data.extras && (
          <div className="px-4 py-2.5 bg-slate-800/40 border-t border-slate-800/40">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                <span className="text-slate-400 font-semibold">Extras</span>
                <span>W {data.extras.wides}</span>
                <span>NB {data.extras.no_balls}</span>
                <span>LB {data.extras.leg_byes}</span>
                <span>B {data.extras.byes}</span>
                {data.extras.penalty > 0 && <span>P {data.extras.penalty}</span>}
              </div>
              <span className="text-slate-300 font-bold text-[13px]">{data.extras.total}</span>
            </div>
          </div>
        )}

        <div className="px-4 py-3 bg-slate-900 border-t border-slate-700 flex items-center justify-between">
          <span className="text-slate-400 text-[12px] font-semibold uppercase tracking-wider">Total</span>
          <span className="text-white font-extrabold text-[16px]">
            {totalScore}/{totalWickets}
            <span className="text-slate-500 text-[12px] font-normal ml-1.5">({totalOvers} ov)</span>
          </span>
        </div>
      </div>

      {/* ── Bowling ── */}
      {bowlers.length > 0 && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900">
            <span className="text-accent"><IconBall /></span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Bowling</span>
          </div>
          <div className="grid gap-x-2 px-4 py-2 text-[9px] text-slate-600 font-bold uppercase tracking-widest border-b border-slate-800/40"
               style={{ gridTemplateColumns: "1fr 42px 28px 36px 32px 46px" }}>
            <span>Bowler</span>
            <span className="text-right">O</span><span className="text-right">M</span>
            <span className="text-right">R</span><span className="text-right">W</span>
            <span className="text-right">Eco</span>
          </div>
          {bowlers.map(b => (
            <div key={b.id}
                 className="grid gap-x-2 px-4 py-3 border-b border-slate-800/30 last:border-0 items-center hover:bg-white/2 transition-colors"
                 style={{ gridTemplateColumns: "1fr 42px 28px 36px 32px 46px" }}>
              <span className="text-white font-semibold text-[13px]">{b.player.name}</span>
              <span className="text-right text-slate-300 text-[12px]">{b.overs_bowled}</span>
              <span className="text-right text-slate-500 text-[12px]">{b.maidens}</span>
              <span className="text-right text-slate-300 text-[12px]">{b.runs_given}</span>
              <span className={`text-right font-extrabold text-[14px] ${b.wickets > 0 ? "text-accent" : "text-slate-500"}`}>{b.wickets}</span>
              <span className="text-right text-slate-500 text-[12px]">{(b.economy ?? 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ManOfMatchCard({
  player,
  stats,
}: {
  player: import("@/src/hooks/useMatchSocket").PlayerBrief;
  stats: { runs: number; balls_faced: number; is_out: boolean } | null;
}) {
  const statStr = stats
    ? `${stats.runs}${stats.is_out ? "" : "*"} (${stats.balls_faced})`
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-red-900 to-red-800 border border-red-700/40 px-5 py-4 flex items-center justify-between gap-4">
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-linear-to-br from-red-500/10 to-transparent pointer-events-none" />
      <div className="relative flex flex-col gap-0.5">
        <span className="text-red-300/70 text-[10px] font-bold uppercase tracking-[0.16em]">Player of the Match</span>
        <p className="text-white font-extrabold text-[17px] leading-snug">{player.name}</p>
        {statStr && (
          <p className="text-red-200/80 text-[13px] font-medium">{statStr}</p>
        )}
      </div>
      {player.photo_url ? (
        <img
          src={mediaUrl(player.photo_url)}
          alt={player.name}
          className="relative w-14 h-14 rounded-full object-cover ring-2 ring-red-500/40 shrink-0"
        />
      ) : (
        <div className="relative w-14 h-14 rounded-full bg-red-700/60 ring-2 ring-red-500/30 flex items-center justify-center shrink-0">
          <span className="text-white font-extrabold text-[16px]">{player.name.slice(0, 2).toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}

// ── Players Tab ───────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const label = role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const cls =
    role.includes("wicket_keeper") ? "bg-sky-900/50 text-sky-300 border-sky-700/50" :
    role === "bowler" ? "bg-purple-900/50 text-purple-300 border-purple-700/50" :
    role.includes("allrounder") ? "bg-amber-900/50 text-amber-300 border-amber-700/50" :
    "bg-slate-800 text-slate-400 border-slate-700/50";
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cls} capitalize`}>{label}</span>
  );
}

function PlayerCard({ p, isCapt, isVC, isWK }: { p: TeamPlayer; isCapt: boolean; isVC: boolean; isWK: boolean }) {
  const initials = p.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/40 last:border-0 hover:bg-white/2 transition-colors">
      {p.photo_url ? (
        <img src={mediaUrl(p.photo_url)} alt={p.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-slate-600 to-slate-800 ring-1 ring-white/10 flex items-center justify-center shrink-0">
          <span className="text-white text-[11px] font-extrabold">{initials}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white font-semibold text-[13px] truncate">{p.name}</span>
          {isCapt && <span className="text-[9px] font-extrabold text-amber-400 bg-amber-900/40 border border-amber-700/40 px-1.5 py-0.5 rounded">C</span>}
          {isVC && <span className="text-[9px] font-extrabold text-blue-400 bg-blue-900/40 border border-blue-700/40 px-1.5 py-0.5 rounded">VC</span>}
          {isWK && <span className="text-[9px] font-extrabold text-sky-400 bg-sky-900/40 border border-sky-700/40 px-1.5 py-0.5 rounded">WK</span>}
        </div>
        <RoleBadge role={p.role} />
      </div>
      {p.jersey_number != null && (
        <span className="text-slate-600 font-bold text-[13px] tabular-nums shrink-0">#{p.jersey_number}</span>
      )}
    </div>
  );
}

function PlayersTab({ team1Id, team2Id }: { team1Id: string; team2Id: string }) {
  const [teams, setTeams] = useState<[TeamFull | null, TeamFull | null]>([null, null]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/v1/cricket/teams/${team1Id}/`).then(r => r.json()),
      fetch(`${API}/api/v1/cricket/teams/${team2Id}/`).then(r => r.json()),
    ])
      .then(([t1, t2]) => setTeams([t1, t2]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [team1Id, team2Id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1].map(i => (
          <div key={i} className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden animate-pulse">
            <div className="px-4 py-3 bg-slate-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700" />
              <div className="h-4 w-32 rounded bg-slate-700" />
            </div>
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/40">
                <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="h-3.5 w-28 rounded bg-slate-800" />
                  <div className="h-2.5 w-16 rounded bg-slate-800/60" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {teams.map((team, idx) => {
        if (!team) return null;
        const players = team.players ?? [];
        return (
          <div key={idx} className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900">
              {team.logo_url ? (
                <img src={mediaUrl(team.logo_url)} alt={team.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-slate-600 to-slate-800 ring-1 ring-white/10 flex items-center justify-center">
                  <span className="text-white text-[10px] font-extrabold">{team.short_name?.slice(0, 2)}</span>
                </div>
              )}
              <div>
                <p className="text-white font-bold text-[14px]">{team.name}</p>
                {team.short_name && <p className="text-slate-500 text-[10px]">{team.short_name}</p>}
              </div>
              <span className="ml-auto text-slate-600 text-[11px]">{players.length} players</span>
            </div>
            {players.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-[13px]">No players listed.</div>
            ) : (
              players.map(p => (
                <PlayerCard
                  key={p.id}
                  p={p}
                  isCapt={team.captain?.id === p.id}
                  isVC={team.vice_captain?.id === p.id}
                  isWK={team.wicket_keeper?.id === p.id}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Match Ended Overlay ────────────────────────────────────────────────────
function MatchEndedOverlay({ resultText, onDismiss }: { resultText: string; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="relative bg-linear-to-b from-slate-800 to-slate-900 border border-white/10 rounded-3xl px-8 py-10 max-w-sm w-full text-center shadow-2xl">
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-2">Match Ended</p>
        <p className="text-white font-extrabold text-[20px] leading-snug mb-6">{resultText}</p>
        <button
          onClick={onDismiss}
          className="w-full bg-accent text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
        >
          View Full Scorecard
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { liveScore: s, connectionStatus, matchEnded } = useMatchSocket(id);
  const [activeTab, setActiveTab] = useState<"live" | "scorecard" | "commentary" | "players">("live");
  const [inningsTab, setInningsTab] = useState<1 | 2>(1);
  const [showEndOverlay, setShowEndOverlay] = useState(false);

  useEffect(() => {
    if (matchEnded) setShowEndOverlay(true);
  }, [matchEnded]);

  const isLive = s?.status === "innings1" || s?.status === "innings2";
  const isCompleted = s?.status === "completed";
  const innings = s?.current_innings ?? 1;

  const score1 = `${s?.innings1_score ?? 0}/${s?.innings1_wickets ?? 0}`;
  const score2 = `${s?.innings2_score ?? 0}/${s?.innings2_wickets ?? 0}`;
  const currentScore = innings === 1 ? score1 : score2;
  const currentOvers = innings === 1 ? s?.innings1_overs : s?.innings2_overs;
  const battingTeam = innings === 1 ? s?.innings1_team : s?.innings2_team;
  const bowlingTeam = innings === 1 ? s?.innings2_team : s?.innings1_team;

  const rrr = s?.required_balls && s.required_balls > 0 && s.required_runs != null
    ? (s.required_runs / (s.required_balls / 6)).toFixed(2)
    : null;

  const recentBalls = useMemo(() =>
    (s?.recent_commentary ?? []).slice(0, 6).reverse().map(ballChip),
    [s?.recent_commentary]
  );

  const TABS = [
    { key: "live" as const, label: isLive ? "Live" : "Summary" },
    { key: "scorecard" as const, label: "Scorecard" },
    { key: "commentary" as const, label: "Commentary" },
    { key: "players" as const, label: "Players" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {showEndOverlay && s?.result_text && (
        <MatchEndedOverlay
          resultText={s.result_text}
          onDismiss={() => {
            setShowEndOverlay(false);
            setActiveTab("scorecard");
            setInningsTab(2);
          }}
        />
      )}

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#020617]/90 backdrop-blur-xl border-b border-white/6">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/cricket" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-[13px] font-medium">
            <IconBack /> Cricket
          </Link>
          <div className="flex items-center gap-2">
            {connectionStatus === "connected" && isLive && (
              <span className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live
              </span>
            )}
            {connectionStatus === "disconnected" && (
              <span className="text-slate-600 text-[11px]">Reconnecting…</span>
            )}
            {s?.youtube_live_id && isLive && (
              <span className="flex items-center gap-1 text-red-400 text-[11px]"><IconTV /> Stream</span>
            )}
          </div>
        </div>
      </div>

      {/* ── SCORE HERO ──────────────────────────────────────────────────── */}
      <div className="bg-linear-to-b from-slate-900 to-[#020617]">
        <div className="max-w-3xl mx-auto px-4 pt-6 pb-8">
          {/* Match title */}
          {s?.title && (
            <p className="text-slate-500 text-[11px] font-semibold tracking-widest uppercase mb-4 text-center">
              {s.title}
            </p>
          )}

          {/* Teams + scores */}
          <div className="flex items-center justify-between gap-4">
            {/* Team 1 */}
            <div className={`flex-1 flex flex-col items-center gap-2 text-center transition-opacity ${innings === 2 && isLive ? "opacity-50" : ""}`}>
              <TeamLogo name={s?.team1?.name ?? "—"} short_name={s?.team1?.short_name} logo_url={s?.team1?.logo_url} size="lg" />
              <p className="font-bold text-[13px] text-white leading-tight">{s?.team1?.short_name ?? s?.team1?.name ?? "—"}</p>
              {s && (
                <p className={`font-extrabold leading-none ${innings === 1 && isLive ? "text-[36px] text-white" : "text-[24px] text-slate-400"}`}>
                  {score1}
                  {innings === 1 && <span className="text-[14px] font-normal text-slate-500 ml-1">{s.innings1_overs} ov</span>}
                </p>
              )}
            </div>

            {/* Centre */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-slate-600 text-[11px] font-bold tracking-widest">VS</span>
              {isLive && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-2 py-1 text-center">
                  <p className="text-[10px] text-red-400 font-bold">INN {innings}</p>
                  <p className="text-[11px] text-slate-400">{currentOvers} ov</p>
                </div>
              )}
              {isCompleted && s?.winner && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-2 py-1 text-center">
                  <p className="text-[9px] text-green-400 font-bold uppercase tracking-widest">Winner</p>
                  <p className="text-[11px] text-white font-bold">{s.winner.short_name || s.winner.name}</p>
                </div>
              )}
            </div>

            {/* Team 2 */}
            <div className={`flex-1 flex flex-col items-center gap-2 text-center transition-opacity ${innings === 1 && isLive && (s?.innings2_score === 0) ? "opacity-50" : ""}`}>
              <TeamLogo name={s?.team2?.name ?? "—"} short_name={s?.team2?.short_name} logo_url={s?.team2?.logo_url} size="lg" />
              <p className="font-bold text-[13px] text-white leading-tight">{s?.team2?.short_name ?? s?.team2?.name ?? "—"}</p>
              {s && (
                <p className={`font-extrabold leading-none ${innings === 2 && isLive ? "text-[36px] text-white" : "text-[24px] text-slate-400"}`}>
                  {score2}
                  {innings === 2 && <span className="text-[14px] font-normal text-slate-500 ml-1">{s.innings2_overs} ov</span>}
                </p>
              )}
            </div>
          </div>

          {/* Chase / result bar */}
          {isLive && s?.required_runs != null && s.required_runs > 0 && (
            <div className="mt-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-amber-300 text-[13px] font-semibold">
                {battingTeam?.short_name ?? battingTeam?.name} need{" "}
                <strong className="text-amber-200">{s.required_runs}</strong> runs from{" "}
                <strong className="text-amber-200">{Math.floor((s.required_balls ?? 0) / 6)}.{(s.required_balls ?? 0) % 6}</strong> overs
                {rrr && <span className="text-amber-500/70 ml-2 text-[11px]">(RRR {rrr})</span>}
              </p>
            </div>
          )}
          {isCompleted && s?.result_text && (
            <div className="mt-5 bg-green-500/8 border border-green-500/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-green-300 text-[13px] font-semibold">{s.result_text}</p>
            </div>
          )}

          {/* Recent balls */}
          {recentBalls.length > 0 && isLive && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <span className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest mr-1">This over</span>
              {recentBalls.map((b, i) => (
                <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] ${b.cls}`}>{b.label}</span>
              ))}
            </div>
          )}

          {/* YouTube embed */}
          {s?.youtube_live_id && isLive && (
            <div className="mt-5 aspect-video rounded-2xl overflow-hidden ring-1 ring-red-500/20">
              <iframe
                src={`https://www.youtube.com/embed/${s.youtube_live_id}?autoplay=1&mute=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>

      {/* ── TAB BAR ─────────────────────────────────────────────────────── */}
      <div className="sticky top-14 z-20 bg-[#020617]/95 backdrop-blur-xl border-b border-white/6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-[13px] font-semibold border-b-2 transition-all duration-150 cursor-pointer ${
                  activeTab === t.key
                    ? "border-accent text-accent"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Loading state */}
        {!s && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <svg className="w-8 h-8 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-slate-500">Loading match data…</p>
          </div>
        )}

        {s && (
          <>
            {/* ── LIVE TAB ──────────────────────────────────────────────── */}
            {activeTab === "live" && (
              <div className="flex flex-col gap-5">
                {/* Current batsmen */}
                {s.current_batsmen.length > 0 && (
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900">
                      <span className="text-accent"><IconBat /></span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {battingTeam?.name ?? "Batting"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-4 py-2 text-[9px] text-slate-600 font-bold uppercase tracking-widest border-b border-slate-800/40">
                      <span>Batter</span><span className="text-right">R</span><span className="text-right">B</span><span className="text-right">4s</span><span className="text-right">6s</span><span className="text-right">SR</span>
                    </div>
                    {s.current_batsmen.map((b) => (
                      <div key={b.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-3 px-4 py-3.5 border-b border-slate-800/30 last:border-0 items-center">
                        <div className="flex items-center gap-2">
                          {b.is_striker
                            ? <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                            : <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                          }
                          <span className="text-white font-semibold text-[14px]">{b.player.name}</span>
                        </div>
                        <span className="text-right text-accent font-extrabold text-[18px]">{b.runs}</span>
                        <span className="text-right text-slate-400">{b.balls_faced}</span>
                        <span className="text-right text-slate-500 text-[13px]">{b.fours}</span>
                        <span className="text-right text-slate-500 text-[13px]">{b.sixes}</span>
                        <span className="text-right text-slate-500 text-[13px]">{b.strike_rate.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current bowler */}
                {s.current_bowler_stats && (
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900">
                      <span className="text-accent"><IconBall /></span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {bowlingTeam?.name ?? "Bowling"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 text-[9px] text-slate-600 font-bold uppercase tracking-widest border-b border-slate-800/40">
                      <span>Bowler</span><span className="text-right">O</span><span className="text-right">R</span><span className="text-right">W</span><span className="text-right">Eco</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3.5 items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <span className="text-white font-semibold text-[14px]">{s.current_bowler_stats.player.name}</span>
                      </div>
                      <span className="text-right text-slate-300">{s.current_bowler_stats.overs_bowled}</span>
                      <span className="text-right text-slate-300">{s.current_bowler_stats.runs_given}</span>
                      <span className="text-right text-accent font-extrabold text-[16px]">{s.current_bowler_stats.wickets}</span>
                      <span className="text-right text-slate-500 text-[13px]">{s.current_bowler_stats.economy.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Recent commentary */}
                {s.recent_commentary.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">Recent Balls</p>
                    {s.recent_commentary.slice(0, 8).map(c => {
                      const chip = ballChip(c);
                      return (
                        <div key={c.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl ${commentaryRowCls(c)}`}>
                          <span className="text-slate-600 text-[10px] font-mono w-8 shrink-0 mt-0.5">{c.over_ball_text}</span>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0 ${chip.cls}`}>{chip.label}</span>
                          <div className="flex-1 min-w-0">
                            <span className={`font-bold text-[13px] ${commentaryScoreColor(c)}`}>
                              {c.is_wicket ? "WICKET!" : c.is_six ? "SIX!" : c.is_four ? "FOUR!" : `${c.runs_scored} run${c.runs_scored !== 1 ? "s" : ""}`}
                            </span>
                            {c.commentary_text && (
                              <span className="text-slate-500 text-[12px] ml-2">{c.commentary_text}</span>
                            )}
                          </div>
                          <span className="text-slate-600 text-[11px] shrink-0 font-mono">{c.total_score_after}/{c.total_wickets_after}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Player of the Match */}
                {s.man_of_match && (
                  <ManOfMatchCard player={s.man_of_match} stats={s.man_of_match_stats} />
                )}

                {!isLive && !isCompleted && (
                  <div className="text-center py-16 text-slate-500">Match has not started yet.</div>
                )}
              </div>
            )}

            {/* ── SCORECARD TAB ─────────────────────────────────────────── */}
            {activeTab === "scorecard" && (
              <div className="flex flex-col gap-5">
                {/* Innings tabs */}
                {s.innings1 && (
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 self-start">
                    {([1, 2] as const).filter(n => n === 1 || !!s.innings2).map(n => (
                      <button
                        key={n}
                        onClick={() => setInningsTab(n)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                          inningsTab === n ? "bg-accent text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>{n === 1 ? (s.innings1_team?.short_name ?? s.innings1_team?.name ?? "Inn 1") : (s.innings2_team?.short_name ?? s.innings2_team?.name ?? "Inn 2")}</span>
                        <span className={`text-[11px] font-bold ${inningsTab === n ? "text-white/70" : "text-slate-600"}`}>
                          {n === 1 ? `${s.innings1_score}/${s.innings1_wickets}` : `${s.innings2_score}/${s.innings2_wickets}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {inningsTab === 1 && s.innings1 && (
                  <ScorecardTable
                    data={s.innings1}
                    totalScore={s.innings1_score}
                    totalWickets={s.innings1_wickets}
                    totalOvers={String(s.innings1_overs)}
                  />
                )}
                {inningsTab === 2 && s.innings2 && (
                  <ScorecardTable
                    data={s.innings2}
                    totalScore={s.innings2_score}
                    totalWickets={s.innings2_wickets}
                    totalOvers={String(s.innings2_overs)}
                  />
                )}
                {!s.innings1 && (
                  <div className="text-center py-16 text-slate-500">Scorecard not available yet.</div>
                )}

                {/* ── Match Info ── */}
                {(s.toss_winner || s.format) && (
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900">
                      <span className="text-accent"><IconInfo /></span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Match Info</span>
                    </div>
                    <div className="px-4 py-4 flex flex-col gap-3.5">
                      {s.toss_winner && (
                        <div>
                          <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest mb-0.5">Toss</p>
                          <p className="text-slate-300 text-[13px]">
                            <span className="text-white font-semibold">{s.toss_winner.name}</span>
                            {" "}won the toss and elected to{" "}
                            <span className="text-accent font-semibold">{s.toss_decision}</span> first
                          </p>
                        </div>
                      )}
                      {s.format && (
                        <div>
                          <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest mb-0.5">Format</p>
                          <p className="text-slate-300 text-[13px]">{s.format.toUpperCase()} · {s.total_overs} overs</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── COMMENTARY TAB ────────────────────────────────────────── */}
            {activeTab === "commentary" && (
              <div className="flex flex-col gap-2">
                {s.recent_commentary.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">No commentary available.</div>
                ) : s.recent_commentary.map(c => {
                  const chip = ballChip(c);
                  return (
                    <div key={c.id} className={`flex items-start gap-3 px-4 py-3.5 rounded-xl ${commentaryRowCls(c)}`}>
                      <span className="text-slate-600 text-[10px] font-mono w-8 shrink-0 mt-0.5 tabular-nums">{c.over_ball_text}</span>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] shrink-0 ${chip.cls}`}>{chip.label}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`font-bold text-[13px] ${commentaryScoreColor(c)}`}>
                            {c.is_wicket ? "WICKET!" : c.is_six ? "SIX!" : c.is_four ? "FOUR!" : `${c.runs_scored} run${c.runs_scored !== 1 ? "s" : ""}`}
                          </span>
                          <span className="text-slate-600 text-[11px]">{c.batsman?.name} vs {c.bowler?.name}</span>
                        </div>
                        {c.commentary_text && (
                          <p className="text-slate-400 text-[12px] mt-0.5">{c.commentary_text}</p>
                        )}
                      </div>
                      <span className="text-slate-600 text-[11px] shrink-0 font-mono tabular-nums">{c.total_score_after}/{c.total_wickets_after}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── PLAYERS TAB ───────────────────────────────────────────── */}
            {activeTab === "players" && s.team1 && s.team2 && (
              <PlayersTab team1Id={s.team1.id} team2Id={s.team2.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
