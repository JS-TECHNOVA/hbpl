"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { use } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const REFRESH_INTERVAL = 30_000; // 30 seconds

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (mirrors LiveMatchSerializer output)
// ─────────────────────────────────────────────────────────────────────────────

interface BatsmanScore {
  id: number;
  batsman: number;
  name: string;
  role: string;
  is_captain: boolean;
  is_wicketkeeper: boolean;
  batting_position: number;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  is_out: boolean;
  dismissal_type: string;
  bowler_name: string | null;
  fielder_name: string | null;
  dismissal_text: string;
  fall_of_wicket_score: number | null;
  fall_of_wicket_over: string | null;
  is_batting: boolean;
  did_not_bat: boolean;
}

interface BowlerScore {
  id: number;
  bowler: number;
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  no_balls: number;
  economy: number;
}

interface Ball {
  id: number;
  ball_number: number;
  batsman_name: string | null;
  bowler_name: string | null;
  runs_off_bat: number;
  is_extra: boolean;
  extra_type: string;
  extra_runs: number;
  is_wicket: boolean;
  wicket_type: string;
  is_boundary: boolean;
  is_six: boolean;
  commentary: string;
}

interface Over {
  id: number;
  over_number: number;
  bowler_name: string;
  runs: number;
  wickets: number;
  extras: number;
  is_completed: boolean;
  balls: Ball[];
}

interface Innings {
  id: number;
  innings_number: number;
  batting_team_name: string;
  bowling_team_name: string;
  total_runs: number;
  wickets: number;
  overs_completed: string;
  extras: number;
  is_completed: boolean;
  target: number | null;
  run_rate: number;
  required_run_rate: number | null;
  batsman_scores: BatsmanScore[];
  bowler_scores: BowlerScore[];
  overs: Over[];
}

interface LiveMatch {
  id: number;
  stage: string;
  match_type: string;
  date: string;
  time: string;
  venue: string;
  team1: string;
  team2: string;
  season: number;
  match_status: string;
  toss_winner: string;
  toss_decision: string;
  team1_score: string;
  team2_score: string;
  result: string;
  youtube_stream_url: string;
  innings: Innings[];
}

// ─── Mock data for when API is not yet live ────────────────────────────────

const MOCK: LiveMatch = {
  id: 1,
  stage: "Final",
  match_type: "final",
  date: "2026-05-14",
  time: "14:00",
  venue: "Harpur Ground, Belahi",
  team1: "Harpur XI",
  team2: "Belahi Strikers",
  season: 2026,
  match_status: "live",
  toss_winner: "Belahi Strikers",
  toss_decision: "field",
  team1_score: "200/8",
  team2_score: "120/3",
  result: "",
  youtube_stream_url: "",
  innings: [
    {
      id: 1,
      innings_number: 1,
      batting_team_name: "Harpur XI",
      bowling_team_name: "Belahi Strikers",
      total_runs: 200,
      wickets: 8,
      overs_completed: "20.0",
      extras: 14,
      is_completed: true,
      target: null,
      run_rate: 10.0,
      required_run_rate: null,
      batsman_scores: [
        { id: 1, batsman: 1, name: "Rohit Kumar", role: "batter", is_captain: true, is_wicketkeeper: false, batting_position: 1, runs: 48, balls_faced: 32, fours: 4, sixes: 2, strike_rate: 150.0, is_out: true, dismissal_type: "caught", bowler_name: "A. Siddiqui", fielder_name: "M. Rahman", dismissal_text: "c M. Rahman b A. Siddiqui", fall_of_wicket_score: 61, fall_of_wicket_over: "6.3", is_batting: false, did_not_bat: false },
        { id: 2, batsman: 2, name: "Sunil Yadav", role: "batter", is_captain: false, is_wicketkeeper: false, batting_position: 2, runs: 9, balls_faced: 6, fours: 1, sixes: 0, strike_rate: 150.0, is_out: true, dismissal_type: "caught", bowler_name: "K. Jha", fielder_name: "P. Singh", dismissal_text: "c P. Singh b K. Jha", fall_of_wicket_score: 81, fall_of_wicket_over: "8.5", is_batting: false, did_not_bat: false },
        { id: 3, batsman: 3, name: "Vikash Prasad", role: "batter", is_captain: false, is_wicketkeeper: false, batting_position: 3, runs: 52, balls_faced: 38, fours: 5, sixes: 3, strike_rate: 136.8, is_out: true, dismissal_type: "bowled", bowler_name: "A. Siddiqui", fielder_name: null, dismissal_text: "b A. Siddiqui", fall_of_wicket_score: 142, fall_of_wicket_over: "14.2", is_batting: false, did_not_bat: false },
        { id: 4, batsman: 4, name: "Rajan Tiwari", role: "wicketkeeper", is_captain: false, is_wicketkeeper: true, batting_position: 4, runs: 35, balls_faced: 22, fours: 3, sixes: 2, strike_rate: 159.1, is_out: false, dismissal_type: "", bowler_name: null, fielder_name: null, dismissal_text: "not out", fall_of_wicket_score: null, fall_of_wicket_over: null, is_batting: false, did_not_bat: false },
        { id: 5, batsman: 5, name: "Deepak Verma", role: "batter", is_captain: false, is_wicketkeeper: false, batting_position: 5, runs: 28, balls_faced: 14, fours: 2, sixes: 2, strike_rate: 200.0, is_out: true, dismissal_type: "run_out", bowler_name: null, fielder_name: "K. Jha", dismissal_text: "run out (K. Jha)", fall_of_wicket_score: 185, fall_of_wicket_over: "18.1", is_batting: false, did_not_bat: false },
      ],
      bowler_scores: [
        { id: 1, bowler: 10, name: "A. Siddiqui", overs: "4.0", maidens: 0, runs: 42, wickets: 3, wides: 2, no_balls: 0, economy: 10.5 },
        { id: 2, bowler: 11, name: "K. Jha", overs: "4.0", maidens: 0, runs: 38, wickets: 2, wides: 1, no_balls: 1, economy: 9.5 },
        { id: 3, bowler: 12, name: "M. Rahman", overs: "4.0", maidens: 0, runs: 44, wickets: 1, wides: 3, no_balls: 0, economy: 11.0 },
        { id: 4, bowler: 13, name: "S. Islam", overs: "4.0", maidens: 0, runs: 36, wickets: 1, wides: 0, no_balls: 0, economy: 9.0 },
        { id: 5, bowler: 14, name: "P. Singh", overs: "4.0", maidens: 0, runs: 26, wickets: 1, wides: 1, no_balls: 0, economy: 6.5 },
      ],
      overs: [],
    },
    {
      id: 2,
      innings_number: 2,
      batting_team_name: "Belahi Strikers",
      bowling_team_name: "Harpur XI",
      total_runs: 120,
      wickets: 3,
      overs_completed: "13.4",
      extras: 2,
      is_completed: false,
      target: 201,
      run_rate: 8.78,
      required_run_rate: 12.8,
      batsman_scores: [
        { id: 6, batsman: 20, name: "T. Ali", role: "wicketkeeper", is_captain: false, is_wicketkeeper: true, batting_position: 1, runs: 48, balls_faced: 23, fours: 4, sixes: 2, strike_rate: 208.7, is_out: true, dismissal_type: "caught", bowler_name: "Rohit Kumar", fielder_name: "Vikash Prasad", dismissal_text: "c Vikash Prasad b Rohit Kumar", fall_of_wicket_score: 61, fall_of_wicket_over: "6.3", is_batting: false, did_not_bat: false },
        { id: 7, batsman: 21, name: "N. Ansari", role: "batter", is_captain: false, is_wicketkeeper: false, batting_position: 2, runs: 9, balls_faced: 6, fours: 0, sixes: 1, strike_rate: 150.0, is_out: true, dismissal_type: "caught", bowler_name: "K. Sharma", fielder_name: "Sunil Yadav", dismissal_text: "c Sunil Yadav b K. Sharma", fall_of_wicket_score: 81, fall_of_wicket_over: "8.5", is_batting: false, did_not_bat: false },
        { id: 8, batsman: 22, name: "T. Varma", role: "batter", is_captain: false, is_wicketkeeper: false, batting_position: 3, runs: 25, balls_faced: 14, fours: 3, sixes: 1, strike_rate: 178.57, is_out: false, dismissal_type: "", bowler_name: null, fielder_name: null, dismissal_text: "not out", fall_of_wicket_score: null, fall_of_wicket_over: null, is_batting: true, did_not_bat: false },
        { id: 9, batsman: 23, name: "S. Rutherford", role: "batter", is_captain: false, is_wicketkeeper: false, batting_position: 4, runs: 12, balls_faced: 14, fours: 1, sixes: 0, strike_rate: 85.71, is_out: false, dismissal_type: "", bowler_name: null, fielder_name: null, dismissal_text: "not out", fall_of_wicket_score: null, fall_of_wicket_over: null, is_batting: true, did_not_bat: false },
        { id: 10, batsman: 24, name: "R. Khan", role: "batter", is_captain: true, is_wicketkeeper: false, batting_position: 5, runs: 0, balls_faced: 0, fours: 0, sixes: 0, strike_rate: 0, is_out: false, dismissal_type: "", bowler_name: null, fielder_name: null, dismissal_text: "", fall_of_wicket_score: null, fall_of_wicket_over: null, is_batting: false, did_not_bat: true },
        { id: 11, batsman: 25, name: "H. Sheikh", role: "batter", is_captain: false, is_wicketkeeper: false, batting_position: 6, runs: 0, balls_faced: 0, fours: 0, sixes: 0, strike_rate: 0, is_out: false, dismissal_type: "", bowler_name: null, fielder_name: null, dismissal_text: "", fall_of_wicket_score: null, fall_of_wicket_over: null, is_batting: false, did_not_bat: true },
        { id: 12, batsman: 26, name: "P. Kumar", role: "bowler", is_captain: false, is_wicketkeeper: false, batting_position: 7, runs: 0, balls_faced: 0, fours: 0, sixes: 0, strike_rate: 0, is_out: false, dismissal_type: "", bowler_name: null, fielder_name: null, dismissal_text: "", fall_of_wicket_score: null, fall_of_wicket_over: null, is_batting: false, did_not_bat: true },
      ],
      bowler_scores: [
        { id: 6, bowler: 1, name: "Rohit Kumar", overs: "3.0", maidens: 0, runs: 34, wickets: 1, wides: 0, no_balls: 0, economy: 11.33 },
        { id: 7, bowler: 6, name: "K. Sharma", overs: "2.4", maidens: 0, runs: 32, wickets: 1, wides: 2, no_balls: 0, economy: 11.65 },
        { id: 8, bowler: 7, name: "D. Mishra", overs: "3.0", maidens: 0, runs: 34, wickets: 0, wides: 0, no_balls: 0, economy: 11.33 },
        { id: 9, bowler: 8, name: "A. Gupta", overs: "3.0", maidens: 0, runs: 12, wickets: 1, wides: 0, no_balls: 0, economy: 4.0 },
        { id: 10, bowler: 9, name: "S. Tiwari", overs: "2.0", maidens: 0, runs: 8, wickets: 0, wides: 0, no_balls: 0, economy: 4.0 },
      ],
      overs: [],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LiveMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeInnings, setActiveInnings] = useState(1);
  const [activeTab, setActiveTab] = useState<"batting" | "bowling" | "overs">("batting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/cricket/matches/${id}/live/`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const data: LiveMatch = await res.json();
      setMatch(data);
      setError(false);
      const liveInnings = data.innings.find((i) => !i.is_completed);
      if (liveInnings) setActiveInnings(liveInnings.innings_number);
    } catch {
      // Fall back to mock in dev
      if (process.env.NODE_ENV === "development") {
        setMatch(MOCK);
        const liveI = MOCK.innings.find((i) => !i.is_completed);
        if (liveI) setActiveInnings(liveI.innings_number);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();
    const timer = setInterval(fetchMatch, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchMatch]);

  if (loading) return <LoadingState />;
  if (error || !match) return <ErrorState id={id} />;

  const currentInnings = match.innings.find((i) => i.innings_number === activeInnings);
  const isLive = match.match_status === "live";

  return (
    <div className="bg-[#121826] min-h-screen text-white">
      {/* Top nav */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/cricket" className="flex items-center gap-2 text-white/50 text-[13px] hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-white/30 text-[11px]">
              Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {isLive && (
            <span className="inline-flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-extrabold tracking-widest uppercase px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
              Live
            </span>
          )}
          {match.match_status === "completed" && (
            <span className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-[11px] font-extrabold tracking-widest uppercase px-3 py-1 rounded-full">
              Final
            </span>
          )}
        </div>
      </div>

      {/* ── Match header ─────────────────────────────────────────────────── */}
      <MatchHeader match={match} />

      {/* ── YouTube Live Stream ──────────────────────────────────────────── */}
      {match.youtube_stream_url && (
        <YouTubeEmbed url={match.youtube_stream_url} />
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pb-16">

        {/* Innings selector */}
        {match.innings.length > 1 && (
          <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-xl w-fit">
            {match.innings.map((inn) => (
              <button
                key={inn.innings_number}
                onClick={() => setActiveInnings(inn.innings_number)}
                className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  activeInnings === inn.innings_number
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {inn.batting_team_name}
                <span className="ml-2 text-white/40 font-normal">
                  {inn.total_runs}/{inn.wickets}
                </span>
              </button>
            ))}
          </div>
        )}

        {currentInnings && (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 mb-4 border-b border-white/8 pb-0">
              {(["batting", "bowling", "overs"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-[13px] font-semibold capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-[#fd8b00] text-[#fd8b00]"
                      : "border-transparent text-white/40 hover:text-white/60"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "batting" && (
              <BattingScorecard innings={currentInnings} />
            )}
            {activeTab === "bowling" && (
              <BowlingScorecard innings={currentInnings} />
            )}
            {activeTab === "overs" && (
              <OversView innings={currentInnings} />
            )}
          </>
        )}

        {/* Match info */}
        <MatchInfo match={match} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH HEADER
// ─────────────────────────────────────────────────────────────────────────────

function MatchHeader({ match }: { match: LiveMatch }) {
  const inn1 = match.innings[0];
  const inn2 = match.innings[1];
  const live = match.innings.find((i) => !i.is_completed);

  return (
    <div className="bg-[#1a2235] border-b border-white/8 mb-4">
      <div className="max-w-4xl mx-auto px-4 py-5">
        {/* Stage info */}
        <p className="text-white/40 text-[11px] font-semibold tracking-widest uppercase mb-4">
          HBPL {match.season} · {match.stage}
        </p>

        {/* Teams + scores */}
        <div className="flex items-center justify-between gap-4">
          {/* Team 1 */}
          <div className="flex flex-col items-start gap-1 min-w-0">
            <span className="font-heading font-extrabold text-[13px] text-white/60 uppercase tracking-wider">
              {match.team1}
            </span>
            {inn1 ? (
              <div className="flex items-end gap-2">
                <span className={`font-heading font-extrabold text-[36px] leading-none ${!inn1.is_completed ? "text-white" : "text-white/60"}`}>
                  {inn1.total_runs}/{inn1.wickets}
                </span>
                <span className="text-white/40 text-[14px] mb-1">({inn1.overs_completed})</span>
              </div>
            ) : (
              <span className="font-heading font-extrabold text-[36px] leading-none text-white/30">Yet to bat</span>
            )}
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-white/25 text-[12px] font-semibold">vs</span>
          </div>

          {/* Team 2 */}
          <div className="flex flex-col items-end gap-1 min-w-0">
            <span className="font-heading font-extrabold text-[13px] text-white/60 uppercase tracking-wider">
              {match.team2}
            </span>
            {inn2 ? (
              <div className="flex items-end gap-2">
                <span className={`font-heading font-extrabold text-[36px] leading-none ${!inn2.is_completed ? "text-white" : "text-white/60"}`}>
                  {inn2.total_runs}/{inn2.wickets}
                </span>
                <span className="text-white/40 text-[14px] mb-1">({inn2.overs_completed})</span>
              </div>
            ) : (
              <span className="font-heading font-extrabold text-[36px] leading-none text-white/30">Yet to bat</span>
            )}
          </div>
        </div>

        {/* Required / result */}
        {live && live.target && !live.is_completed && (
          <div className="mt-3 flex flex-col gap-1">
            <p className="text-[#fd8b00] text-[13px] font-semibold">
              {live.batting_team_name} need{" "}
              <strong>{live.target - live.total_runs}</strong> runs in{" "}
              <strong>{Math.round((20 - parseFloat(live.overs_completed)) * 6)}</strong> balls to win
            </p>
            <div className="flex items-center gap-4 text-white/50 text-[12px]">
              <span>CRR: <strong className="text-white/70">{live.run_rate}</strong></span>
              {live.required_run_rate && (
                <span>RRR: <strong className="text-white/70">{live.required_run_rate}</strong></span>
              )}
            </div>
          </div>
        )}
        {match.result && (
          <p className="mt-3 text-green-400 text-[14px] font-semibold">{match.result}</p>
        )}

        {/* Live batsmen / bowler quick view */}
        {live && (
          <div className="mt-4 pt-4 border-t border-white/8 grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/35 text-[10px] font-semibold tracking-widest uppercase mb-2">
                {live.bowling_team_name} bowling
              </p>
              {live.bowler_scores.slice(0, 2).map((b) => (
                <p key={b.id} className="text-white/60 text-[12px]">
                  <span className="text-[#fd8b00] mr-1">›</span>
                  {b.name}: {b.wickets}/{b.runs} ({b.overs})
                </p>
              ))}
            </div>
            <div className="text-right">
              <p className="text-white/35 text-[10px] font-semibold tracking-widest uppercase mb-2">
                {live.batting_team_name} batting
              </p>
              {live.batsman_scores.filter((b) => b.is_batting).map((b) => (
                <p key={b.id} className="text-white/60 text-[12px]">
                  {b.name}: {b.runs}* ({b.balls_faced})
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BATTING SCORECARD
// ─────────────────────────────────────────────────────────────────────────────

function BattingScorecard({ innings }: { innings: Innings }) {
  const batted = innings.batsman_scores.filter((b) => !b.did_not_bat).sort((a, b) => a.batting_position - b.batting_position);
  const yetToBat = innings.batsman_scores.filter((b) => b.did_not_bat).sort((a, b) => a.batting_position - b.batting_position);

  const fallOfWickets = batted
    .filter((b) => b.is_out && b.fall_of_wicket_score !== null)
    .sort((a, b) => (a.fall_of_wicket_score ?? 0) - (b.fall_of_wicket_score ?? 0));

  const wideLegBye = innings.extras;

  return (
    <div className="flex flex-col gap-0">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-3 py-2 text-white/35 text-[11px] font-semibold tracking-wider uppercase border-b border-white/8">
        <span>Batter</span>
        <span className="text-right w-8">R</span>
        <span className="text-right w-6">B</span>
        <span className="text-right w-6">4s</span>
        <span className="text-right w-6">6s</span>
        <span className="text-right w-14">SR</span>
      </div>

      {/* Batsman rows */}
      {batted.map((b) => (
        <div
          key={b.id}
          className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-3 py-3 border-b border-white/5 ${
            b.is_batting ? "bg-white/3" : ""
          }`}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[14px] font-semibold truncate ${b.is_batting ? "text-white" : "text-white/75"}`}>
                {b.name}
              </span>
              {b.is_captain && <Tag label="C" color="text-yellow-400" />}
              {b.is_wicketkeeper && <Tag label="Wk" color="text-blue-400" />}
              {b.is_batting && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />}
            </div>
            <span className="text-white/35 text-[11px] truncate">
              {b.is_out ? b.dismissal_text : "not out"}
            </span>
          </div>
          <span className={`text-right text-[14px] font-extrabold w-8 ${b.is_batting ? "text-white" : "text-white/75"}`}>
            {b.runs}{!b.is_out && "*"}
          </span>
          <span className="text-right text-[13px] text-white/50 w-6">{b.balls_faced}</span>
          <span className="text-right text-[13px] text-white/50 w-6">{b.fours}</span>
          <span className="text-right text-[13px] text-white/50 w-6">{b.sixes}</span>
          <span className="text-right text-[12px] text-white/40 w-14">{b.strike_rate.toFixed(2)}</span>
        </div>
      ))}

      {/* Extras */}
      <div className="grid grid-cols-[1fr_auto] gap-x-4 px-3 py-3 border-b border-white/8">
        <span className="text-white/50 text-[13px]">
          Extras <span className="text-white/30 text-[11px]">(W {Math.floor(wideLegBye / 2)})</span>
        </span>
        <span className="text-white/70 text-[14px] font-semibold">{wideLegBye}</span>
      </div>

      {/* Total */}
      <div className="grid grid-cols-[1fr_auto] gap-x-4 px-3 py-3 bg-white/4 border-b border-white/8">
        <span className="text-white/70 text-[13px] font-semibold">Total runs</span>
        <span className="text-white text-[15px] font-extrabold">
          {innings.total_runs} ({innings.wickets} wkts, {innings.overs_completed} ov)
        </span>
      </div>

      {/* Yet to bat */}
      {yetToBat.length > 0 && (
        <div className="px-3 py-3 border-b border-white/8">
          <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-2">Yet to bat</p>
          <p className="text-white/50 text-[13px]">
            {yetToBat.map((b, i) => (
              <span key={b.id}>
                {b.name}
                {b.is_captain && " (C)"}
                {b.is_wicketkeeper && " (Wk)"}
                {i < yetToBat.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Fall of wickets */}
      {fallOfWickets.length > 0 && (
        <div className="px-3 py-3">
          <p className="text-white/35 text-[11px] font-semibold tracking-widest uppercase mb-2">Fall of Wickets</p>
          <p className="text-white/45 text-[12px] leading-relaxed">
            {fallOfWickets.map((b, i) => (
              <span key={b.id}>
                <span className="text-white/60">{b.fall_of_wicket_score}/{i + 1}</span>
                <span className="text-white/35"> ({b.name}, {b.fall_of_wicket_over} ov)</span>
                {i < fallOfWickets.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOWLING SCORECARD
// ─────────────────────────────────────────────────────────────────────────────

function BowlingScorecard({ innings }: { innings: Innings }) {
  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-3 py-2 text-white/35 text-[11px] font-semibold tracking-wider uppercase border-b border-white/8">
        <span>Bowler</span>
        <span className="text-right w-8">O</span>
        <span className="text-right w-6">M</span>
        <span className="text-right w-8">R</span>
        <span className="text-right w-6">W</span>
        <span className="text-right w-14">Econ</span>
      </div>

      {innings.bowler_scores.map((b) => (
        <div
          key={b.id}
          className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-3 py-3 border-b border-white/5"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-white/80">{b.name}</span>
            {(b.wides > 0 || b.no_balls > 0) && (
              <span className="text-white/30 text-[11px]">
                {b.wides > 0 && `Wd ${b.wides}`}
                {b.wides > 0 && b.no_balls > 0 && " · "}
                {b.no_balls > 0 && `NB ${b.no_balls}`}
              </span>
            )}
          </div>
          <span className="text-right text-[13px] text-white/60 w-8">{b.overs}</span>
          <span className="text-right text-[13px] text-white/60 w-6">{b.maidens}</span>
          <span className="text-right text-[13px] text-white/60 w-8">{b.runs}</span>
          <span className={`text-right text-[14px] font-extrabold w-6 ${b.wickets > 0 ? "text-[#fd8b00]" : "text-white/60"}`}>
            {b.wickets}
          </span>
          <span className="text-right text-[12px] text-white/40 w-14">{b.economy.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERS VIEW
// ─────────────────────────────────────────────────────────────────────────────

function OversView({ innings }: { innings: Innings }) {
  const overs = [...innings.overs].reverse(); // most recent first

  if (overs.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-white/30 text-[14px]">
        Ball-by-ball data not available yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {overs.map((over) => (
        <div key={over.id} className="bg-white/4 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-[13px] font-semibold">Over {over.over_number}</span>
            {over.bowler_name && (
              <span className="text-white/40 text-[12px]">{over.bowler_name}</span>
            )}
            <span className="text-white/70 text-[13px] font-semibold">{over.runs} runs{over.wickets > 0 && `, ${over.wickets}W`}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {over.balls.map((ball) => (
              <BallChip key={ball.id} ball={ball} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BallChip({ ball }: { ball: Ball }) {
  let bg = "bg-white/10 text-white/60";
  let label = String(ball.runs_off_bat);

  if (ball.is_wicket) {
    bg = "bg-red-500/80 text-white font-extrabold";
    label = "W";
  } else if (ball.is_six) {
    bg = "bg-[#fd8b00] text-white font-extrabold";
    label = "6";
  } else if (ball.is_boundary) {
    bg = "bg-[#fd8b00]/30 text-[#fd8b00] font-semibold";
    label = "4";
  } else if (ball.is_extra) {
    bg = "bg-blue-500/20 text-blue-300";
    label = ball.extra_type === "wide" ? "Wd" : ball.extra_type === "no_ball" ? "NB" : ball.extra_type;
  } else if (ball.runs_off_bat === 0) {
    bg = "bg-white/5 text-white/30";
    label = "•";
  }

  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] ${bg}`}
      title={ball.commentary || undefined}
    >
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH INFO
// ─────────────────────────────────────────────────────────────────────────────

function MatchInfo({ match }: { match: LiveMatch }) {
  return (
    <div className="mt-6 bg-white/4 rounded-2xl px-5 py-5 flex flex-col gap-3">
      {match.toss_winner && (
        <InfoRow label="Toss">
          {match.toss_winner} won the toss and decided to {match.toss_decision === "bat" ? "bat" : "bowl"}
        </InfoRow>
      )}
      <InfoRow label="Venue">{match.venue}</InfoRow>
      <InfoRow label="Date">
        {new Date(match.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        {match.time && ` · ${match.time}`}
      </InfoRow>

      {/* Key legend */}
      <div className="pt-3 border-t border-white/8 flex flex-wrap gap-x-6 gap-y-1.5">
        {[
          { label: "C", desc: "Captain" },
          { label: "Wk", desc: "Wicket-keeper" },
          { label: "•", desc: "Dot ball" },
          { label: "4", desc: "Boundary" },
          { label: "6", desc: "Six" },
          { label: "W", desc: "Wicket" },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-1.5">
            <span className="text-[#fd8b00] text-[11px] font-extrabold">{k.label}</span>
            <span className="text-white/30 text-[11px]">{k.desc}</span>
          </div>
        ))}
      </div>

      <p className="text-white/20 text-[10px]">All times are in Indian Standard Time</p>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-white/35 text-[13px] w-14 shrink-0">{label}</span>
      <span className="text-white/65 text-[13px]">{children}</span>
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[10px] font-extrabold ${color} border border-current/30 px-1.5 py-0.5 rounded`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE EMBED
// ─────────────────────────────────────────────────────────────────────────────

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Already an embed URL
    if (u.pathname.startsWith("/embed/")) return url;
    // youtu.be/VIDEO_ID
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}?autoplay=1&mute=1`;
    }
    // youtube.com/live/VIDEO_ID
    const liveMatch = u.pathname.match(/^\/live\/([^/?]+)/);
    if (liveMatch) {
      return `https://www.youtube.com/embed/${liveMatch[1]}?autoplay=1&mute=1`;
    }
    // youtube.com/watch?v=VIDEO_ID
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}?autoplay=1&mute=1`;
    return null;
  } catch {
    return null;
  }
}

function YouTubeEmbed({ url }: { url: string }) {
  const embedUrl = toEmbedUrl(url);
  if (!embedUrl) return null;
  return (
    <div className="max-w-4xl mx-auto px-4 mb-6">
      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1e293b] border-b border-white/8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-red-400 text-[11px] font-extrabold tracking-widest uppercase">Live Stream</span>
          <span className="ml-auto text-white/25 text-[11px]">YouTube</span>
        </div>
        {/* 16:9 iframe */}
        <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
          <iframe
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full bg-black"
            title="Live Cricket Stream"
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY SCREENS
// ─────────────────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="bg-[#121826] min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <svg className="w-8 h-8 animate-spin text-[#fd8b00]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-white/50 text-[14px]">Loading live match…</p>
      </div>
    </div>
  );
}

function ErrorState({ id }: { id: string }) {
  return (
    <div className="bg-[#121826] min-h-screen flex items-center justify-center px-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-white/50 text-[16px]">Match #{id} not found or not yet live.</p>
        <Link href="/cricket" className="text-[#fd8b00] text-[14px] font-semibold hover:underline">
          Back to Cricket
        </Link>
      </div>
    </div>
  );
}
