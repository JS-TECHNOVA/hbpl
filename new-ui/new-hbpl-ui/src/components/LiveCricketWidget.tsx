"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface TeamBrief { id: string; name: string; short_name: string; logo_url: string }
interface LiveMatch {
  id: string;
  title: string;
  status: string;
  current_innings: number;
  team1: TeamBrief;
  team2: TeamBrief;
  innings1_team: TeamBrief | null;
  innings2_team: TeamBrief | null;
  innings1_score: number;
  innings1_wickets: number;
  innings1_overs: string;
  innings2_score: number;
  innings2_wickets: number;
  innings2_overs: string;
  youtube_live_id: string | null;
  tournament: { id: string; title: string } | null;
}

async function fetchLiveMatch(): Promise<LiveMatch | null> {
  for (const status of ["innings1", "innings2"]) {
    try {
      const res = await fetch(`${API}/api/v1/cricket/matches/?status=${status}`);
      const data = await res.json();
      const results: LiveMatch[] = Array.isArray(data) ? data : (data.results ?? []);
      if (results.length > 0) return results[0];
    } catch {
      // continue to next status
    }
  }
  return null;
}

export default function LiveCricketWidget() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const m = await fetchLiveMatch();
      if (!cancelled) { setMatch(m); setLoading(false); }
    }
    load();
    const timer = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  if (loading || !match || dismissed) return null;

  const inningsNum = match.current_innings ?? 1;
  const battingTeam = inningsNum === 2
    ? (match.innings2_team ?? match.team2)
    : (match.innings1_team ?? match.team1);
  const bowlingTeam = inningsNum === 2
    ? (match.innings1_team ?? match.team1)
    : (battingTeam.id === match.team1.id ? match.team2 : match.team1);

  const battingScore = inningsNum === 2
    ? `${match.innings2_score}/${match.innings2_wickets}`
    : `${match.innings1_score}/${match.innings1_wickets}`;
  const battingOvers = inningsNum === 2
    ? String(match.innings2_overs)
    : String(match.innings1_overs);
  const bowlingInfo = inningsNum === 2
    ? `${match.innings1_score}/${match.innings1_wickets} (${match.innings1_overs} ov)`
    : "Yet to bat";

  const tournamentName = match.tournament?.title ?? match.title;

  return (
    <div
      className="fixed bottom-6 left-6 z-50 w-85 bg-[#0f172a] rounded-3xl shadow-[0px_24px_48px_rgba(0,0,0,0.45)] overflow-hidden transition-all duration-300"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary-darker gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-red-400 text-[11px] font-extrabold tracking-widest uppercase">Live</span>
        </div>

        <span className="text-white/40 text-[11px] font-medium truncate flex-1 text-center">
          {tournamentName}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {expanded
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              }
            </svg>
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Close"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col">
          {/* YouTube live embed */}
          {match.youtube_live_id && (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={`https://www.youtube.com/embed/${match.youtube_live_id}?autoplay=1&mute=1`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Live Cricket Stream"
              />
            </div>
          )}

          <div className="px-4 py-4 flex flex-col gap-4">
            <span className="text-white/40 text-[11px] font-semibold tracking-widest uppercase">
              {inningsNum === 2 ? "2nd Innings" : "1st Innings"}
            </span>

            {/* Batting team */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-white font-heading font-extrabold text-[15px]">{battingTeam.name}</span>
                <span className="text-white/40 text-[11px]">Batting</span>
              </div>
              <div className="text-right">
                <span className="text-accent font-heading font-extrabold text-[22px] leading-none">{battingScore}</span>
                <div className="text-white/40 text-[11px] mt-0.5">{battingOvers} overs</div>
              </div>
            </div>

            <div className="h-px bg-white/8" />

            {/* Bowling team */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-white/70 font-semibold text-[14px]">{bowlingTeam.name}</span>
                <span className="text-white/40 text-[11px]">{inningsNum === 2 ? "Bowled" : "Bowling"}</span>
              </div>
              <span className="text-white/50 text-[13px] font-medium">{bowlingInfo}</span>
            </div>

            <Link
              href={`/match/${match.id}`}
              className="flex items-center justify-center gap-2 bg-accent text-white font-semibold text-[13px] py-2.5 rounded-xl hover:opacity-90 transition-opacity mt-1 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Full Scorecard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
