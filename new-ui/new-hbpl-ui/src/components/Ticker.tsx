"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";

interface LiveMatch {
  id: string;
  status: string;
  team1: { name: string; short_name: string };
  team2: { name: string; short_name: string };
  innings1_team: { name: string; short_name: string } | null;
  innings2_team: { name: string; short_name: string } | null;
  innings1_score: number; innings1_wickets: number; innings1_overs: string;
  innings2_score: number; innings2_wickets: number; innings2_overs: string;
  current_innings: number;
}

interface TickerItem { id: number; text: string; link: string }

async function fetchLiveMatch(): Promise<LiveMatch | null> {
  for (const status of ["innings1", "innings2"]) {
    try {
      const res = await fetch(`${API}/api/v1/cricket/matches/?status=${status}`);
      const data = await res.json();
      const results: LiveMatch[] = Array.isArray(data) ? data : (data.results ?? []);
      if (results.length > 0) return results[0];
    } catch { /* continue */ }
  }
  return null;
}

async function fetchTickerItems(): Promise<TickerItem[]> {
  try {
    const res = await fetch(`${API}/api/news-ticker/`);
    const data = await res.json();
    const items: TickerItem[] = Array.isArray(data) ? data : (data.results ?? []);
    return items.filter(i => i.text);
  } catch { return []; }
}

export default function Ticker() {
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [m, items] = await Promise.all([fetchLiveMatch(), fetchTickerItems()]);
      if (cancelled) return;
      setLiveMatch(m);
      setTickerItems(items);
    }
    load();
    const timer = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  // Build ticker text segments
  const segments: string[] = [];

  if (liveMatch) {
    const inn = liveMatch.current_innings;
    const battingTeam = inn === 2
      ? (liveMatch.innings2_team ?? liveMatch.team2)
      : (liveMatch.innings1_team ?? liveMatch.team1);
    const bowlingTeam = battingTeam.name === liveMatch.team1.name ? liveMatch.team2 : liveMatch.team1;
    const score = inn === 2
      ? `${liveMatch.innings2_score}/${liveMatch.innings2_wickets} (${liveMatch.innings2_overs} ov)`
      : `${liveMatch.innings1_score}/${liveMatch.innings1_wickets} (${liveMatch.innings1_overs} ov)`;
    segments.push(`HBPL LIVE  |  ${battingTeam.short_name} ${score}  vs  ${bowlingTeam.short_name}`);
  }

  for (const item of tickerItems) {
    segments.push(item.text);
  }

  if (!segments.length) return null;

  const text = segments.join("          ");

  return (
    <div className="bg-primary-darker text-white text-[12px] font-medium overflow-hidden h-8 flex items-center select-none">
      {liveMatch && (
        <Link
          href={`/match/${liveMatch.id}`}
          className="shrink-0 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-extrabold tracking-widest uppercase px-3 h-full hover:bg-red-700 transition-colors cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </Link>
      )}
      <div className="flex-1 overflow-hidden">
        <div className="ticker-inner whitespace-nowrap inline-block">
          <span className="px-8 text-white/80">{text}</span>
          <span className="px-8 text-white/80">{text}</span>
        </div>
      </div>
      <style>{`
        .ticker-inner { animation: ticker 30s linear infinite; }
        .ticker-inner:hover { animation-play-state: paused; }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
