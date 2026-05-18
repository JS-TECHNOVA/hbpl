"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org").replace(/^http/, "ws");

export interface TeamBrief {
  id: string;
  name: string;
  short_name: string;
  logo_url: string;
}

export interface PlayerBrief {
  id: string;
  name: string;
  jersey_number: number | null;
  role: string;
  photo_url: string;
}

export interface BattingEntry {
  id: string;
  player: PlayerBrief;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  out_reason: string;
  wicket_type: string;
  dismissed_by_bowler: PlayerBrief | null;
  fielder: PlayerBrief | null;
  batting_position: number;
  did_not_bat: boolean;
  strike_rate: number;
  is_striker?: boolean;
}

export interface BowlingEntry {
  id: string;
  player: PlayerBrief;
  overs_bowled: string;
  maidens: number;
  runs_given: number;
  wickets: number;
  wides: number;
  no_balls: number;
  economy: number;
}

export interface CommentaryEntry {
  id: string;
  innings_number: number;
  over_number: number;
  ball_number: number;
  over_ball_text: string;
  batsman: PlayerBrief;
  bowler: PlayerBrief;
  runs_scored: number;
  extras: number;
  extra_type: string;
  is_wicket: boolean;
  wicket_type: string;
  is_four: boolean;
  is_six: boolean;
  commentary_text: string;
  total_score_after: number;
  total_wickets_after: number;
}

export interface InningsData {
  batting: BattingEntry[];
  bowling: BowlingEntry[];
  extras: { wides: number; no_balls: number; leg_byes: number; byes: number; penalty: number; total: number } | null;
}

export interface LiveScore {
  id: string;
  title: string;
  match_number: number;
  status: string;
  format: string;
  total_overs: number;
  team1: TeamBrief;
  team2: TeamBrief;
  innings1_team: TeamBrief | null;
  innings2_team: TeamBrief | null;
  batting_team: TeamBrief | null;
  bowling_team: TeamBrief | null;
  innings1_score: number;
  innings1_wickets: number;
  innings1_overs: string;
  innings2_score: number;
  innings2_wickets: number;
  innings2_overs: string;
  current_innings: number;
  current_over: number;
  current_ball: number;
  required_runs: number | null;
  required_balls: number | null;
  run_rate: number;
  required_run_rate: number | null;
  toss_winner: TeamBrief | null;
  toss_decision: string;
  winner: TeamBrief | null;
  result_text: string;
  youtube_live_id: string;
  innings1: InningsData | null;
  innings2: InningsData | null;
  current_batsmen: BattingEntry[];
  current_bowler_stats: BowlingEntry | null;
  recent_commentary: CommentaryEntry[];
  man_of_match: PlayerBrief | null;
  man_of_match_stats: { runs: number; balls_faced: number; fours: number; sixes: number; is_out: boolean; strike_rate: number } | null;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function useMatchSocket(matchId: string) {
  const [liveScore, setLiveScore] = useState<LiveScore | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [matchEnded, setMatchEnded] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attemptsRef = useRef(0);

  const connect = useCallback(() => {
    const ws = new WebSocket(`${WS_URL}/ws/match/${matchId}/`);
    wsRef.current = ws;
    setConnectionStatus("connecting");

    ws.onopen = () => {
      setConnectionStatus("connected");
      attemptsRef.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "initial_state" || msg.type === "score_update") {
          setLiveScore(msg.data as LiveScore);
          if (msg.end_event === "match_end") {
            setMatchEnded(true);
          }
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 30_000);
      attemptsRef.current += 1;
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [matchId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { liveScore, connectionStatus, matchEnded };
}
