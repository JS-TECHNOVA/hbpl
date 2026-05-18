"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { token } from "../../../layout";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://myhbpl.org";
const V1 = `${API}/api/v1/cricket`;

interface TeamBrief { id: string; name: string; short_name: string; logo_url: string }
interface Player { id: string; name: string; role: string; jersey_number: number | null }
interface LiveScore {
  id: string; title: string; status: string;
  team1: TeamBrief; team2: TeamBrief;
  match_date: string; venue: string;
  toss_winner: TeamBrief | null; toss_decision: string;
  innings1_team: TeamBrief | null;
}

// Steps: toss → playing_xi → start_innings
type Step = "toss" | "playing_xi" | "start_innings";

export default function MatchSetupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const h = { Authorization: `Token ${token()}`, "Content-Type": "application/json" };
  const hNoJson = { Authorization: `Token ${token()}` };

  const [match, setMatch] = useState<LiveScore | null>(null);
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  // Toss
  const [tossWinnerId, setTossWinnerId] = useState("");
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">("bat");

  // Playing XI — set of selected player IDs per team
  const [xi1, setXi1] = useState<Set<string>>(new Set());
  const [xi2, setXi2] = useState<Set<string>>(new Set());
  const [savingXi, setSavingXi] = useState(false);
  const [xiSaved, setXiSaved] = useState(false);

  // Start innings
  const [opener1Id, setOpener1Id] = useState("");
  const [opener2Id, setOpener2Id] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`${V1}/admin/matches/${id}/`, { headers: hNoJson })
      .then(r => r.json())
      .then(async (m: LiveScore) => {
        setMatch(m);
        const [p1, p2, xi] = await Promise.all([
          fetch(`${V1}/players/?team=${m.team1.id}`, { headers: hNoJson }).then(r => r.json()).catch(() => []),
          fetch(`${V1}/players/?team=${m.team2.id}`, { headers: hNoJson }).then(r => r.json()).catch(() => []),
          fetch(`${V1}/admin/matches/${id}/playing-xi/`, { headers: hNoJson }).then(r => r.json()).catch(() => []),
        ]);
        setTeam1Players(Array.isArray(p1) ? p1 : p1.results ?? []);
        setTeam2Players(Array.isArray(p2) ? p2 : p2.results ?? []);
        if (m.toss_winner) setTossWinnerId(m.toss_winner.id);
        if (m.toss_decision) setTossDecision(m.toss_decision as "bat" | "bowl");

        // Restore existing playing XI
        if (Array.isArray(xi)) {
          const s1 = new Set<string>();
          const s2 = new Set<string>();
          for (const entry of xi) {
            const tid = entry.team_id;
            for (const p of entry.players ?? []) {
              if (tid === m.team1.id) s1.add(p.player.id);
              else s2.add(p.player.id);
            }
          }
          if (s1.size > 0 || s2.size > 0) {
            setXi1(s1); setXi2(s2); setXiSaved(true);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (match && (match.status === "innings1" || match.status === "innings2")) {
      router.replace(`/staff/matches/${id}/live`);
    }
  }, [match, id]);

  if (loading) return <div className="py-20 text-center text-text-muted">Loading…</div>;
  if (!match) return <div className="py-20 text-center text-text-muted">Match not found.</div>;
  if (match.status === "innings1" || match.status === "innings2") return null;

  const tossWinnerTeam = tossWinnerId === match.team1.id ? match.team1 : match.team2;
  const battingTeam = tossDecision === "bat" ? tossWinnerTeam : (tossWinnerId === match.team1.id ? match.team2 : match.team1);
  const bowlingTeam = battingTeam.id === match.team1.id ? match.team2 : match.team1;
  const battingPlayers = battingTeam.id === match.team1.id ? team1Players : team2Players;
  const bowlingPlayers = bowlingTeam.id === match.team1.id ? team1Players : team2Players;

  const battingXi = battingTeam.id === match.team1.id ? xi1 : xi2;
  const bowlingXi = bowlingTeam.id === match.team1.id ? xi1 : xi2;
  const setBattingXi = battingTeam.id === match.team1.id ? setXi1 : setXi2;
  const setBowlingXi = bowlingTeam.id === match.team1.id ? setXi1 : setXi2;

  const tossAlreadyDone = match.status === "toss_done";

  async function recordToss() {
    if (!tossWinnerId) return;
    setPosting(true); setError("");
    try {
      const res = await fetch(`${V1}/admin/matches/${id}/toss/`, {
        method: "POST", headers: h,
        body: JSON.stringify({ toss_winner_id: tossWinnerId, toss_decision: tossDecision }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json() as LiveScore;
      setMatch(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record toss");
    } finally {
      setPosting(false);
    }
  }

  function toggleXiPlayer(teamId: string, playerId: string) {
    const setter = teamId === match!.team1.id ? setXi1 : setXi2;
    const current = teamId === match!.team1.id ? xi1 : xi2;
    setter(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else if (next.size < 11) next.add(playerId);
      return next;
    });
  }

  async function savePlayingXI() {
    setSavingXi(true); setError("");
    try {
      await Promise.all([
        fetch(`${V1}/admin/matches/${id}/playing-xi/`, {
          method: "POST", headers: h,
          body: JSON.stringify({
            team_id: match!.team1.id,
            players: Array.from(xi1).map((pid, i) => ({ player_id: pid, batting_order: i + 1 })),
          }),
        }),
        fetch(`${V1}/admin/matches/${id}/playing-xi/`, {
          method: "POST", headers: h,
          body: JSON.stringify({
            team_id: match!.team2.id,
            players: Array.from(xi2).map((pid, i) => ({ player_id: pid, batting_order: i + 1 })),
          }),
        }),
      ]);
      setXiSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save Playing XI");
    } finally {
      setSavingXi(false);
    }
  }

  async function startInnings() {
    if (!opener1Id || !opener2Id || !bowlerId) {
      setError("Select both openers and the opening bowler.");
      return;
    }
    setPosting(true); setError("");
    try {
      const res = await fetch(`${V1}/admin/matches/${id}/start-innings/`, {
        method: "POST", headers: h,
        body: JSON.stringify({ opener1_id: opener1Id, opener2_id: opener2Id, bowler_id: bowlerId }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(`/staff/matches/${id}/live`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start innings");
    } finally {
      setPosting(false);
    }
  }

  const openerPlayers = battingXi.size > 0
    ? battingPlayers.filter(p => battingXi.has(p.id))
    : battingPlayers;
  const openingBowlers = bowlingXi.size > 0
    ? bowlingPlayers.filter(p => bowlingXi.has(p.id))
    : bowlingPlayers;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <Link href="/staff/matches" className="text-text-muted text-[13px] hover:text-text-primary">← Back to Matches</Link>
        <h1 className="font-heading font-extrabold text-[26px] text-primary mt-2">Match Setup</h1>
        <p className="text-text-muted text-[13px]">
          {match.team1.name} vs {match.team2.name}
          {match.venue ? ` · ${match.venue}` : ""}
          {match.match_date ? ` · ${new Date(match.match_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
        </p>
      </div>

      {/* Step 1: Toss */}
      <div className={`bg-white rounded-3xl p-6 shadow-sm border ${tossAlreadyDone ? "border-green-200 bg-green-50/30" : "border-border/50"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-[16px] text-primary">Step 1 — Toss</h2>
          {tossAlreadyDone && (
            <span className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">Done</span>
          )}
        </div>

        {tossAlreadyDone && match.toss_winner ? (
          <p className="text-text-body text-[14px]">
            <span className="font-semibold">{match.toss_winner.name}</span> won the toss and elected to{" "}
            <span className="font-semibold">{match.toss_decision}</span> first.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={lbl}>Toss Winner</label>
              <div className="flex gap-2">
                {[match.team1, match.team2].map(t => (
                  <button key={t.id} onClick={() => setTossWinnerId(t.id)}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors ${tossWinnerId === t.id ? "bg-primary text-white border-primary" : "bg-page text-text-primary border-border hover:border-primary/40"}`}>
                    {t.short_name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={lbl}>Elected To</label>
              <div className="flex gap-2">
                {(["bat", "bowl"] as const).map(d => (
                  <button key={d} onClick={() => setTossDecision(d)}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border capitalize transition-colors ${tossDecision === d ? "bg-primary text-white border-primary" : "bg-page text-text-primary border-border hover:border-primary/40"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {tossWinnerId && (
              <div className="col-span-2 bg-blue-50 rounded-xl px-4 py-3 text-[13px] text-blue-700">
                <span className="font-bold">{battingTeam.name}</span> will bat first ·{" "}
                <span className="font-bold">{bowlingTeam.name}</span> will bowl first
              </div>
            )}
            <div className="col-span-2">
              <button onClick={recordToss} disabled={posting || !tossWinnerId}
                className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {posting ? "Recording…" : "Record Toss"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Playing XI */}
      {tossAlreadyDone && (
        <div className={`bg-white rounded-3xl p-6 shadow-sm border ${xiSaved ? "border-green-200 bg-green-50/30" : "border-border/50"}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-[16px] text-primary">Step 2 — Select Playing XI</h2>
            {xiSaved && (
              <span className="text-[11px] bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">Saved</span>
            )}
          </div>
          <p className="text-text-muted text-[12px] mb-4">Select 11 players per team. This is used to show "yet to bat" in the scorecard.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Team 1 */}
            <TeamXISelector
              teamName={match.team1.name}
              players={team1Players}
              selected={xi1}
              onToggle={pid => toggleXiPlayer(match.team1.id, pid)}
            />
            {/* Team 2 */}
            <TeamXISelector
              teamName={match.team2.name}
              players={team2Players}
              selected={xi2}
              onToggle={pid => toggleXiPlayer(match.team2.id, pid)}
            />
          </div>

          <button
            onClick={savePlayingXI}
            disabled={savingXi || (xi1.size === 0 && xi2.size === 0)}
            className="mt-4 w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {savingXi ? "Saving…" : xiSaved ? "Update Playing XI" : "Save Playing XI"}
          </button>
        </div>
      )}

      {/* Step 3: Opening batsmen + bowler */}
      {tossAlreadyDone && (
        <>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/50">
            <h2 className="font-heading font-bold text-[16px] text-primary mb-4">
              Step 3 — Opening Batsmen ({battingTeam.name})
            </h2>
            {openerPlayers.length === 0 ? (
              <p className="text-text-muted text-[13px]">No players found. Add players in Cricket Teams first.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={lbl}>Striker (Opener 1)</label>
                  <select value={opener1Id} onChange={e => setOpener1Id(e.target.value)} className={selCls}>
                    <option value="">— Select —</option>
                    {openerPlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.jersey_number ? ` #${p.jersey_number}` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={lbl}>Non-Striker (Opener 2)</label>
                  <select value={opener2Id} onChange={e => setOpener2Id(e.target.value)} className={selCls}>
                    <option value="">— Select —</option>
                    {openerPlayers.filter(p => p.id !== opener1Id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.jersey_number ? ` #${p.jersey_number}` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/50">
            <h2 className="font-heading font-bold text-[16px] text-primary mb-4">
              Opening Bowler ({bowlingTeam.name})
            </h2>
            {openingBowlers.length === 0 ? (
              <p className="text-text-muted text-[13px]">No players found for this team.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className={lbl}>Opening Bowler</label>
                <select value={bowlerId} onChange={e => setBowlerId(e.target.value)} className={selCls}>
                  <option value="">— Select —</option>
                  {openingBowlers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.jersey_number ? ` #${p.jersey_number}` : ""}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-[13px] bg-red-50 px-4 py-3 rounded-xl border border-red-200">{error}</p>}

          <button onClick={startInnings} disabled={posting || !opener1Id || !opener2Id || !bowlerId}
            className="bg-primary text-white font-semibold text-[15px] py-4 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
            {posting ? "Starting…" : "Start Innings & Go to Live Scoring"}
          </button>
        </>
      )}

      {!tossAlreadyDone && error && (
        <p className="text-red-600 text-[13px] bg-red-50 px-4 py-3 rounded-xl border border-red-200">{error}</p>
      )}
    </div>
  );
}

function TeamXISelector({
  teamName, players, selected, onToggle,
}: {
  teamName: string;
  players: { id: string; name: string; role: string; jersey_number: number | null }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-text-primary">{teamName}</p>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${selected.size === 11 ? "bg-green-100 text-green-700" : "bg-section text-text-muted"}`}>
          {selected.size}/11
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto border border-border rounded-xl divide-y divide-border/30">
        {players.length === 0 && (
          <p className="text-text-muted text-[12px] px-3 py-3">No players</p>
        )}
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${selected.has(p.id) ? "bg-primary/5" : "hover:bg-section/40"} ${!selected.has(p.id) && selected.size >= 11 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            disabled={!selected.has(p.id) && selected.size >= 11}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected.has(p.id) ? "bg-primary border-primary" : "border-border"}`}>
              {selected.has(p.id) && (
                <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-[13px] text-text-primary font-medium flex-1">{p.name}</span>
            {p.jersey_number != null && <span className="text-[10px] text-text-muted">#{p.jersey_number}</span>}
            <span className="text-[10px] text-text-muted capitalize">{p.role.replace(/_/g, " ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const lbl = "text-[11px] font-semibold text-text-muted uppercase tracking-wider";
const selCls = "w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-text-primary bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";
