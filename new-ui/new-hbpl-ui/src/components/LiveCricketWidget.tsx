"use client";

import { useState } from "react";
import Link from "next/link";

const matchData = {
  status: "LIVE",
  tournament: "HBPL Cricket Cup",
  team1: { name: "Harpur XI",      score: "142/4", overs: "18.2" },
  team2: { name: "Belahi Strikers", score: "Yet to bat" },
  session: "1st Innings",
  streamUrl: "/cricket",
};

export default function LiveCricketWidget() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-6 left-6 z-50 w-[300px] bg-[#0f172a] rounded-3xl shadow-[0px_24px_48px_rgba(0,0,0,0.45)] overflow-hidden transition-all duration-300"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#172554] gap-3">
        {/* Live badge */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-red-400 text-[11px] font-extrabold tracking-widest uppercase">Live</span>
        </div>

        <span className="text-white/40 text-[11px] font-medium truncate flex-1 text-center">
          {matchData.tournament}
        </span>

        <div className="flex items-center gap-1">
          {/* Collapse / expand */}
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {expanded
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              }
            </svg>
          </button>
          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Close"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible body */}
      {expanded && (
        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Session label */}
          <span className="text-white/40 text-[11px] font-semibold tracking-widest uppercase">
            {matchData.session}
          </span>

          {/* Batting team score */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-white font-heading font-extrabold text-[15px]">
                {matchData.team1.name}
              </span>
              <span className="text-white/40 text-[11px]">Batting</span>
            </div>
            <div className="text-right">
              <span className="text-accent font-heading font-extrabold text-[22px] leading-none">
                {matchData.team1.score}
              </span>
              <div className="text-white/40 text-[11px] mt-0.5">
                {matchData.team1.overs} overs
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/8" />

          {/* Bowling team */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-white/70 font-semibold text-[14px]">
                {matchData.team2.name}
              </span>
              <span className="text-white/40 text-[11px]">Bowling</span>
            </div>
            <span className="text-white/50 text-[13px] font-medium">
              {matchData.team2.score}
            </span>
          </div>

          {/* Watch Live button */}
          <Link
            href={matchData.streamUrl}
            className="flex items-center justify-center gap-2 bg-accent text-white font-semibold text-[13px] py-2.5 rounded-xl hover:opacity-90 transition-opacity mt-1"
          >
            {/* Play icon */}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Live Stream
          </Link>
        </div>
      )}
    </div>
  );
}
