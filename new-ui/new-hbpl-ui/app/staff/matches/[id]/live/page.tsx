"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { token } from "../../../layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const V1 = `${API}/api/v1/cricket`;

interface TeamBrief { id: string; name: string; short_name: string }
interface PlayerBrief { id: string; name: string; jersey_number: number | null; role: string }
interface BattingEntry {
  id: string; player: PlayerBrief;
  runs: number; balls_faced: number; fours: number; sixes: number; strike_rate: number;
  is_striker?: boolean;
}
interface BowlingEntry {
  id: string; player: PlayerBrief;
  overs_bowled: string; maidens: number; runs_given: number; wickets: number;
  wides: number; no_balls: number; economy: number;
}
interface CommentaryEntry {
  id: string; over_ball_text: string; runs_scored: number; extras: number;
  extra_type: string; is_wicket: boolean; is_four: boolean; is_six: boolean;
  commentary_text: string;
}
interface InningsBatEntry { player: PlayerBrief; is_out: boolean }
interface InningsData { batting: InningsBatEntry[] }

interface LiveScore {
  id: string; title: string; status: string; format: string; total_overs: number;
  team1: TeamBrief; team2: TeamBrief;
  batting_team: TeamBrief | null; bowling_team: TeamBrief | null;
  innings1_team: TeamBrief | null;
  innings1_score: number; innings1_wickets: number; innings1_overs: string;
  innings2_score: number; innings2_wickets: number; innings2_overs: string;
  current_innings: number; current_over: number; current_ball: number;
  required_runs: number | null; required_balls: number | null;
  run_rate: number; required_run_rate: number | null;
  current_batsmen: BattingEntry[];
  current_bowler_stats: BowlingEntry | null;
  recent_commentary: CommentaryEntry[];
  winner: TeamBrief | null; result_text: string;
  man_of_match: PlayerBrief | null;
  innings1: InningsData | null;
  innings2: InningsData | null;
}

type ExtraType = "none" | "wide" | "no_ball" | "leg_bye" | "bye";

const WICKET_TYPES = ["bowled", "caught", "lbw", "run_out", "stumped", "hit_wicket", "handled_ball", "obstructing_field"];

function ballChip(c: CommentaryEntry) {
  if (c.is_wicket) return { label: "W", cls: "bg-red-500 text-white" };
  if (c.is_six) return { label: "6", cls: "bg-orange-500 text-white" };
  if (c.is_four) return { label: "4", cls: "bg-yellow-400 text-gray-900" };
  if (c.extra_type === "wide") return { label: "Wd", cls: "bg-slate-200 text-slate-700" };
  if (c.extra_type === "no_ball") return { label: "Nb", cls: "bg-slate-200 text-slate-700" };
  return { label: String(c.runs_scored), cls: "bg-slate-100 text-slate-700" };
}

export default function LiveScoringPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const h = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };

  const [match, setMatch] = useState<LiveScore | null>(null);
  const [battingPlayers, setBattingPlayers] = useState<PlayerBrief[]>([]);
  const [bowlingPlayers, setBowlingPlayers] = useState<PlayerBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const postingRef = useRef(false);
  const prevOverRef = useRef(-1);

  // striker = whichever batsman has is_striker: true

  // Ball entry
  const [runs, setRuns] = useState(0);
  const [extraType, setExtraType] = useState<ExtraType>("none");
  const [extraRuns, setExtraRuns] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState("bowled");
  const [dismissedId, setDismissedId] = useState("");
  const [commentary, setCommentary] = useState("");

  // Modals
  const [showNewBatsman, setShowNewBatsman] = useState(false);
  const [newBatsmanId, setNewBatsmanId] = useState("");
  const [newBatsmanSlot, setNewBatsmanSlot] = useState<"batsman1" | "batsman2">("batsman1");

  const [showNewBowler, setShowNewBowler] = useState(false);
  const [newBowlerId, setNewBowlerId] = useState("");

  const [showComplete, setShowComplete] = useState(false);
  const [winnerId, setWinnerId] = useState("");
  const [resultText, setResultText] = useState("");
  const [momPlayerId, setMomPlayerId] = useState("");
  const [allPlayers, setAllPlayers] = useState<PlayerBrief[]>([]);

  useEffect(() => { postingRef.current = posting; }, [posting]);

  const loadPlayers = useCallback(async (m: LiveScore) => {
    const batTeam = m.batting_team ?? m.team1;
    const bowlTeam = m.bowling_team ?? m.team2;
    const [bp, blp] = await Promise.all([
      fetch(`${V1}/players/?team=${batTeam.id}`, { headers: h }).then(r => r.json()).catch(() => []),
      fetch(`${V1}/players/?team=${bowlTeam.id}`, { headers: h }).then(r => r.json()).catch(() => []),
    ]);
    const bat: PlayerBrief[] = Array.isArray(bp) ? bp : bp.results ?? [];
    const bowl: PlayerBrief[] = Array.isArray(blp) ? blp : blp.results ?? [];
    setBattingPlayers(bat);
    setBowlingPlayers(bowl);
    // Deduplicated combined list for POTM dropdown
    const seen = new Set<string>();
    const combined: PlayerBrief[] = [];
    for (const p of [...bat, ...bowl]) {
      if (!seen.has(p.id)) { seen.add(p.id); combined.push(p); }
    }
    setAllPlayers(combined);
  }, []);

  const loadMatch = useCallback(async () => {
    if (!id) return;
    try {
      const m: LiveScore = await fetch(`${V1}/admin/matches/${id}/`, { headers: h }).then(r => r.json());
      setMatch(m);
      return m;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMatch().then(m => {
      if (!m) return;
      loadPlayers(m);
      // Auto-prompt for openers/bowler if innings started but players not set
      if (m.current_batsmen.length === 0) {
        setNewBatsmanSlot("batsman1");
        setNewBatsmanId("");
        setShowNewBatsman(true);
      } else if (!m.current_bowler_stats) {
        setNewBowlerId("");
        setShowNewBowler(true);
      }
    });
  }, [loadMatch, loadPlayers]);

  useEffect(() => {
    const t = setInterval(() => { if (!postingRef.current) loadMatch(); }, 15000);
    return () => clearInterval(t);
  }, [loadMatch]);

  if (loading) return <div className="py-20 text-center text-text-muted">Loading…</div>;
  if (!match) return <div className="py-20 text-center text-text-muted">Match not found.</div>;
  if (!["innings1", "innings2"].includes(match.status)) {
    return (
      <div className="py-20 text-center">
        <p className="text-text-muted mb-4">
          {match.status === "completed" ? "This match is complete." : "Match is not in an active innings."}
        </p>
        <Link href="/staff/matches" className="text-primary hover:underline font-semibold">← Back to Matches</Link>
      </div>
    );
  }

  const striker = match.current_batsmen.find(b => b.is_striker) ?? match.current_batsmen[0] ?? null;
  const nonStriker = match.current_batsmen.find(b => !b.is_striker) ?? match.current_batsmen[1] ?? null;
  const bowler = match.current_bowler_stats;
  const isInnings2 = match.current_innings === 2;

  async function recordBall() {
    if (!striker || !bowler) return;
    setPosting(true); setError("");
    const prevOver = match!.current_over;

    try {
      const body = {
        batsman_id: striker.player.id,
        bowler_id: bowler.player.id,
        runs_scored: runs,
        extra_type: extraType,
        extras: extraType !== "none" ? extraRuns : 0,
        is_wicket: isWicket,
        wicket_type: isWicket ? wicketType : "",
        dismissed_player_id: isWicket ? (dismissedId || striker.player.id) : undefined,
      };
      const res = await fetch(`${V1}/admin/matches/${id}/ball/`, {
        method: "POST", headers: h, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: LiveScore = await res.json();
      setMatch(updated);

      // Reset ball entry
      setRuns(0); setExtraType("none"); setExtraRuns(0);
      setIsWicket(false); setWicketType("bowled"); setDismissedId(""); setCommentary("");

      // Detect wicket → need new batsman (striker is always batsman1 slot)
      if (isWicket) {
        setNewBatsmanSlot("batsman1");
        setNewBatsmanId("");
        setShowNewBatsman(true);
      }

      // Detect over end (over number incremented)
      if (updated.current_over > prevOver || (updated.current_over === 0 && updated.current_innings > match!.current_innings)) {
        prevOverRef.current = updated.current_over;
        if (!isWicket) {
          setNewBowlerId("");
          setShowNewBowler(true);
        }
      }

      // Match ended?
      if (updated.status === "completed") {
        router.push("/staff/matches");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error recording ball");
    } finally {
      setPosting(false);
    }
  }

  async function setNewBatsman() {
    if (!newBatsmanId) return;
    setPosting(true); setError("");
    try {
      const res = await fetch(`${V1}/admin/matches/${id}/set-batsman/`, {
        method: "POST", headers: h,
        body: JSON.stringify({ player_id: newBatsmanId, slot: newBatsmanSlot }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: LiveScore = await res.json();
      setMatch(updated);
      setShowNewBatsman(false);
      // If second opener slot still empty (initial setup), prompt for it
      if (updated.current_batsmen.length < 2) {
        setNewBatsmanSlot("batsman2");
        setNewBatsmanId("");
        setShowNewBatsman(true);
      } else if (!updated.current_bowler_stats) {
        setNewBowlerId("");
        setShowNewBowler(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error setting batsman");
    } finally {
      setPosting(false);
    }
  }

  async function setNewBowler() {
    if (!newBowlerId) return;
    setPosting(true); setError("");
    try {
      const res = await fetch(`${V1}/admin/matches/${id}/set-bowler/`, {
        method: "POST", headers: h,
        body: JSON.stringify({ player_id: newBowlerId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: LiveScore = await res.json();
      setMatch(updated);
      setShowNewBowler(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error setting bowler");
    } finally {
      setPosting(false);
    }
  }

  async function completeMatch() {
    if (!resultText.trim()) { setError("Enter result text."); return; }
    setPosting(true); setError("");
    try {
      const res = await fetch(`${V1}/admin/matches/${id}/complete/`, {
        method: "POST", headers: h,
        body: JSON.stringify({
          winner_id: winnerId || undefined,
          result_text: resultText,
          man_of_match_id: momPlayerId || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/staff/matches");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error completing match");
    } finally {
      setPosting(false);
    }
  }

  async function switchInnings() {
    if (!match) return;
    if (!confirm(`End Innings 1 and start Innings 2? ${match.bowling_team?.name ?? match.team2.name} will bat.`)) return;
    setPosting(true); setError("");
    try {
      const res = await fetch(`${V1}/admin/matches/${id}/switch-innings/`, {
        method: "POST", headers: h,
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: LiveScore = await res.json();
      setMatch(updated);
      await loadPlayers(updated);
      setNewBatsmanSlot("batsman1");
      setNewBatsmanId("");
      setShowNewBatsman(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch innings");
    } finally {
      setPosting(false);
    }
  }

  async function setStrikerPlayer(playerId: string) {
    try {
      const res = await fetch(`${V1}/admin/matches/${id}/set-striker/`, {
        method: "POST", headers: h,
        body: JSON.stringify({ player_id: playerId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMatch(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error setting striker");
    }
  }

  const scoreLabel = isInnings2
    ? `${match.innings2_score}/${match.innings2_wickets} (${match.innings2_overs} ov)`
    : `${match.innings1_score}/${match.innings1_wickets} (${match.innings1_overs} ov)`;

  // Players who have already been dismissed in the current innings
  const currentInningsData = isInnings2 ? match.innings2 : match.innings1;
  const dismissedIds = new Set(
    (currentInningsData?.batting ?? []).filter(b => b.is_out).map(b => b.player.id)
  );
  // Players currently at the crease (exclude from new batsman dropdown)
  const onCreaseIds = new Set(match.current_batsmen.map(b => b.player.id));
  const availableBatsmen = battingPlayers.filter(
    p => !dismissedIds.has(p.id) && !onCreaseIds.has(p.id)
  );

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/staff/matches" className="text-text-muted text-[13px] hover:text-text-primary">← Matches</Link>
          <h1 className="font-heading font-extrabold text-[22px] text-primary mt-1">Live Scoring</h1>
          <p className="text-text-muted text-[12px]">
            {match.batting_team?.name ?? match.team1.name} vs {match.bowling_team?.name ?? match.team2.name}
            {" · "}Innings {match.current_innings}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setShowNewBowler(true); setNewBowlerId(""); }}
            className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-orange-200 transition-colors">
            New Bowler
          </button>
          {!isInnings2 && (
            <button onClick={switchInnings} disabled={posting}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              Start Innings 2
            </button>
          )}
          <button onClick={() => { setShowComplete(true); setError(""); }}
            className="bg-red-600 text-white px-4 py-2 rounded-xl text-[13px] font-semibold hover:bg-red-700 transition-colors">
            End Match
          </button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="bg-primary rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-1">
          <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wider">
            {match.batting_team?.name ?? "—"} batting · {match.bowling_team?.name ?? "—"} bowling
          </p>
          {isInnings2 && (
            <p className="text-white/40 text-[11px]">
              {match.innings1_team?.name ?? "Innings 1"}: {match.innings1_score}/{match.innings1_wickets}
            </p>
          )}
        </div>
        <div className="flex items-end gap-3 mt-1 mb-2">
          <span className="font-heading font-extrabold text-[44px] leading-none">{scoreLabel}</span>
        </div>
        {isInnings2 && match.required_runs != null && (
          <p className="text-white/60 text-[13px]">
            Target {match.innings1_score + 1} · Need <span className="font-bold text-white">{match.required_runs}</span> in{" "}
            {match.required_balls} balls
            {match.required_run_rate != null && ` · RRR ${match.required_run_rate.toFixed(2)}`}
          </p>
        )}
        {!isInnings2 && <p className="text-white/50 text-[12px]">RR {match.run_rate.toFixed(2)}</p>}

        {/* Recent balls */}
        {match.recent_commentary.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <span className="text-white/30 text-[11px] font-semibold shrink-0">This over:</span>
            <div className="flex gap-1.5 flex-wrap">
              {[...match.recent_commentary].reverse().slice(0, 6).map(c => {
                const chip = ballChip(c);
                return (
                  <span key={c.id} className={`min-w-7 h-7 px-1.5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${chip.cls}`}>
                    {chip.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Current Players */}
      <div className="grid grid-cols-2 gap-4">
        {/* Batsmen */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Batsmen</p>
          {match.current_batsmen.length === 0 ? (
            <p className="text-text-muted text-[13px]">No batsmen on crease</p>
          ) : (
            <div className="flex flex-col gap-2">
              {match.current_batsmen.map((b, i) => (
                <button key={`${b.id}-${i}`} onClick={() => setStrikerPlayer(b.player.id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                    b.is_striker ? "bg-primary/10 border border-primary/30" : "bg-section hover:bg-border/40"
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] ${b.is_striker ? "text-primary font-bold" : "text-text-muted"}`}>
                      {b.is_striker ? "★" : "○"}
                    </span>
                    <span className="font-semibold text-text-primary text-[13px]">{b.player.name}</span>
                    {b.player.jersey_number && <span className="text-text-muted text-[11px]">#{b.player.jersey_number}</span>}
                  </div>
                  <span className="text-text-muted text-[12px] shrink-0">
                    {b.runs}({b.balls_faced}) · 4:{b.fours} 6:{b.sixes}
                  </span>
                </button>
              ))}
              <p className="text-text-muted text-[11px] mt-0.5">Tap to set striker (★)</p>
            </div>
          )}
        </div>

        {/* Bowler */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Bowler</p>
          {bowler ? (
            <div className="bg-section rounded-xl px-4 py-3">
              <p className="font-semibold text-text-primary text-[14px]">{bowler.player.name}</p>
              <div className="flex gap-3 mt-1 text-[12px] text-text-muted">
                <span>{bowler.overs_bowled} Ov</span>
                <span>{bowler.maidens} M</span>
                <span>{bowler.runs_given} R</span>
                <span>{bowler.wickets} W</span>
              </div>
              <p className="text-[12px] text-text-muted mt-0.5">Eco: {bowler.economy.toFixed(2)}</p>
            </div>
          ) : (
            <p className="text-text-muted text-[13px]">No active bowler</p>
          )}
        </div>
      </div>

      {/* Ball Entry */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/50">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-4">Record Ball</p>

        {/* Extra type */}
        <div className="flex gap-2 flex-wrap mb-4">
          {(["none", "wide", "no_ball", "bye", "leg_bye"] as ExtraType[]).map(t => {
            const labels = { none: "Normal", wide: "Wide", no_ball: "No Ball", bye: "Bye", leg_bye: "Leg Bye" };
            return (
              <button key={t} onClick={() => setExtraType(t)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  extraType === t ? "bg-primary text-white" : "bg-section text-text-primary hover:bg-border"
                }`}>
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* Runs */}
        <div className="flex gap-2 mb-4">
          {[0, 1, 2, 3, 4, 5, 6].map(r => (
            <button key={r} onClick={() => setRuns(r)}
              className={`w-10 h-10 rounded-full text-[14px] font-extrabold transition-colors ${
                runs === r ? "bg-primary text-white" : "bg-section text-text-primary hover:bg-border"
              }`}>
              {r}
            </button>
          ))}
        </div>

        {/* Extra runs (for wide/no_ball) */}
        {(extraType === "wide" || extraType === "no_ball") && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[13px] text-text-muted">Extra runs:</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map(r => (
                <button key={r} onClick={() => setExtraRuns(r)}
                  className={`w-8 h-8 rounded-full text-[12px] font-bold transition-colors ${
                    extraRuns === r ? "bg-orange-500 text-white" : "bg-section text-text-primary hover:bg-border"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wicket */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => {
              const next = !isWicket;
              setIsWicket(next);
              if (next && striker) setDismissedId(striker.player.id);
              else setDismissedId("");
            }}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-colors ${
              isWicket ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}>
            {isWicket ? "WICKET ✓" : "Wicket?"}
          </button>
          {isWicket && (
            <>
              <select value={wicketType} onChange={e => setWicketType(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 text-[13px] bg-page focus:outline-none">
                {WICKET_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              <select value={dismissedId} onChange={e => setDismissedId(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 text-[13px] bg-page focus:outline-none flex-1 min-w-40">
                {match.current_batsmen.map(b => (
                  <option key={b.id} value={b.player.id}>{b.player.name}{b.player.id === striker?.player.id ? " (striker)" : ""}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Commentary */}
        <input value={commentary} onChange={e => setCommentary(e.target.value)}
          placeholder="Commentary (optional)…"
          className="w-full border border-border rounded-xl px-3 py-2.5 text-[13px] mb-4 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-page" />

        {error && <p className="text-red-600 text-[13px] mb-3 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <button onClick={recordBall} disabled={posting || !striker || !bowler}
          className="w-full bg-primary text-white font-extrabold text-[15px] py-3.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer">
          {posting ? "Recording…" : `Record: ${extraType !== "none" ? extraType.replace(/_/g, " ").toUpperCase() + " +" : ""}${runs} run${runs !== 1 ? "s" : ""}${isWicket ? " + W" : ""}`}
        </button>
      </div>

      {/* New Batsman Modal */}
      {showNewBatsman && (
        <Modal title="Select New Batsman" onClose={() => setShowNewBatsman(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={lbl}>Slot</label>
              <div className="flex gap-2">
                {(["batsman1", "batsman2"] as const).map(s => (
                  <button key={s} onClick={() => setNewBatsmanSlot(s)}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors ${
                      newBatsmanSlot === s ? "bg-primary text-white border-primary" : "bg-page text-text-primary border-border"
                    }`}>
                    {s === "batsman1" ? "Batsman 1 (Striker end)" : "Batsman 2 (Non-striker end)"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={lbl}>New Batsman</label>
              <select value={newBatsmanId} onChange={e => setNewBatsmanId(e.target.value)} className={selCls}>
                <option value="">— Select player —</option>
                {availableBatsmen.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {error && <p className="text-red-600 text-[13px]">{error}</p>}
            <div className="flex gap-3">
              <button onClick={setNewBatsman} disabled={posting || !newBatsmanId}
                className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-50">
                {posting ? "Setting…" : "Set Batsman"}
              </button>
              <button onClick={() => setShowNewBatsman(false)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border">
                Later
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Bowler Modal */}
      {showNewBowler && (
        <Modal title="Select New Bowler" onClose={() => setShowNewBowler(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={lbl}>New Bowler</label>
              <select value={newBowlerId} onChange={e => setNewBowlerId(e.target.value)} className={selCls}>
                <option value="">— Select bowler —</option>
                {bowlingPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {error && <p className="text-red-600 text-[13px]">{error}</p>}
            <div className="flex gap-3">
              <button onClick={setNewBowler} disabled={posting || !newBowlerId}
                className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-50">
                {posting ? "Setting…" : "Set Bowler"}
              </button>
              <button onClick={() => setShowNewBowler(false)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* End Match Modal */}
      {showComplete && (
        <Modal title="End Match & Declare Result" onClose={() => setShowComplete(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={lbl}>Winner (optional)</label>
              <select value={winnerId} onChange={e => setWinnerId(e.target.value)} className={selCls}>
                <option value="">— No result / Tie —</option>
                <option value={match.team1.id}>{match.team1.name}</option>
                <option value={match.team2.id}>{match.team2.name}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={lbl}>Result Text</label>
              <input value={resultText} onChange={e => setResultText(e.target.value)}
                placeholder="e.g. Team A won by 12 runs"
                className={selCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={lbl}>Player of the Match (optional)</label>
              <select value={momPlayerId} onChange={e => setMomPlayerId(e.target.value)} className={selCls}>
                <option value="">— Select player —</option>
                {allPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.jersey_number ? ` #${p.jersey_number}` : ""}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-600 text-[13px]">{error}</p>}
            <div className="flex gap-3">
              <button onClick={completeMatch} disabled={posting || !resultText.trim()}
                className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50">
                {posting ? "Completing…" : "Complete Match"}
              </button>
              <button onClick={() => setShowComplete(false)} className="flex-1 bg-section text-text-primary font-semibold py-2.5 rounded-xl hover:bg-border">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const lbl = "text-[11px] font-semibold text-text-muted uppercase tracking-wider";
const selCls = "w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-extrabold text-[18px] text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-[22px] leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
